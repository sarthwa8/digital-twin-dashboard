"""
pi_controller.py — Digital Twin bidirectional control loop
Runs on Raspberry Pi 4 alongside your sensor/telemetry script.

What it does every loop tick (1s):
  1. POST telemetry (sensor readings + CNN prediction) to /api/telemetry
  2. GET /api/command for any pending dashboard command → execute it
  3. Run auto fault-response rules if mode == "auto"
  4. ACK the command back to the dashboard

Requires:
  pip install requests minimalmodbus  (pymodbus also works)

Adjust VFD_PORT, VFD_SLAVE, MAX_HZ, RATED_RPM for your Delta MS300 setup.
"""

import time
import requests
import minimalmodbus  # for Modbus RTU over RS-485

# ─── Config ──────────────────────────────────────────────────────────────────
DASHBOARD_URL = "https://digital-twin-dashboard-psi.vercel.app"
POLL_INTERVAL = 1.0   # seconds

VFD_PORT  = "/dev/ttyUSB0"   # RS-485 adapter
VFD_SLAVE = 1                # Delta MS300 default slave address
MAX_HZ    = 50.0             # motor rated frequency
RATED_RPM = 1440             # motor rated speed at 50 Hz (4-pole)

# Fault auto-response thresholds
AUTO_RULES = {
    # (fault_class, min_confidence) → action
    ("Ball",       0.80): ("reduced_speed_70pct", 0.70),
    ("OuterRace",  0.80): ("reduced_speed_50pct", 0.50),
    ("InnerRace",  0.80): ("emergency_stop",       0.00),
}
LOCK_THRESHOLD_CONFIDENCE = 0.95
LOCK_THRESHOLD_SECONDS    = 5

# ─── VFD helpers (Delta MS300 Modbus RTU) ────────────────────────────────────
def _vfd():
    inst = minimalmodbus.Instrument(VFD_PORT, VFD_SLAVE)
    inst.serial.baudrate = 9600
    inst.serial.timeout  = 0.5
    return inst

def vfd_set_frequency(hz: float):
    """Write frequency command register (0x2001 = 8193 in decimal)."""
    hz = max(0.0, min(hz, MAX_HZ))
    vfd = _vfd()
    vfd.write_register(0x2001, int(hz * 100), functioncode=6)  # unit: 0.01 Hz

def vfd_start():
    """Send RUN command (register 0x2000, bit 0x0002 = forward run)."""
    _vfd().write_register(0x2000, 0x0002, functioncode=6)

def vfd_stop():
    """Send STOP command."""
    _vfd().write_register(0x2000, 0x0001, functioncode=6)

def vfd_estop():
    """Emergency stop — write 0x0000 to control word."""
    _vfd().write_register(0x2000, 0x0000, functioncode=6)

def rpm_to_hz(rpm: float) -> float:
    return (rpm / RATED_RPM) * MAX_HZ


# ─── State ───────────────────────────────────────────────────────────────────
state = {
    "motor_running": False,
    "mode":          "manual",
    "auto_action":   None,
    "target_hz":     MAX_HZ,
}

fault_high_since = {}   # fault_class → timestamp when high confidence started

# ─── Telemetry POST ──────────────────────────────────────────────────────────
def post_telemetry(sensor_data: dict):
    payload = {
        **sensor_data,
        "motor_running": state["motor_running"],
        "mode":          state["mode"],
        "auto_action":   state["auto_action"],
    }
    requests.post(f"{DASHBOARD_URL}/api/telemetry", json=payload, timeout=5)

# ─── Command execution ───────────────────────────────────────────────────────
def execute_command(cmd: dict):
    command = cmd.get("command")
    value   = cmd.get("value") or {}
    result  = "ok"

    try:
        if command == "start":
            vfd_start()
            state["motor_running"] = True

        elif command == "stop":
            vfd_stop()
            state["motor_running"] = False

        elif command == "e_stop":
            vfd_estop()
            state["motor_running"] = False
            state["auto_action"]   = None

        elif command == "set_speed":
            rpm = float(value.get("rpm", RATED_RPM))
            hz  = rpm_to_hz(rpm)
            vfd_set_frequency(hz)
            state["target_hz"] = hz

        elif command == "set_mode":
            state["mode"]        = value.get("mode", "manual")
            state["auto_action"] = None   # clear any auto banner on mode switch

        else:
            result = f"unknown_command:{command}"

    except Exception as e:
        result = f"error:{e}"

    # ACK back to dashboard
    requests.post(f"{DASHBOARD_URL}/api/command", json={
        "ack":     True,
        "command": command,
        "value":   value,
        "result":  result,
    }, timeout=5)


# ─── Auto fault-response rules ───────────────────────────────────────────────
def run_auto_rules(fault_class: str, confidence: float):
    if state["mode"] != "auto":
        return

    now = time.time()

    # Track how long each fault has been high-confidence
    if confidence >= LOCK_THRESHOLD_CONFIDENCE:
        fault_high_since.setdefault(fault_class, now)
        duration = now - fault_high_since[fault_class]
        if duration >= LOCK_THRESHOLD_SECONDS:
            # Lock out manual control until operator resets via dashboard
            state["auto_action"] = "fault_locked"
            vfd_estop()
            state["motor_running"] = False
            return
    else:
        fault_high_since.pop(fault_class, None)

    # Apply fault-severity rules
    for (fc, min_conf), (action, speed_frac) in AUTO_RULES.items():
        if fault_class == fc and confidence >= min_conf:
            state["auto_action"] = action
            if speed_frac == 0.0:
                vfd_estop()
                state["motor_running"] = False
            else:
                vfd_set_frequency(MAX_HZ * speed_frac)
            return

    # No active fault — if we previously took auto action, restore full speed
    if state["auto_action"] not in (None, "fault_locked"):
        vfd_set_frequency(state["target_hz"])
        state["auto_action"] = "cleared"


# ─── Main loop ───────────────────────────────────────────────────────────────
def main():
    print("Pi controller started — polling dashboard every 1s")

    while True:
        loop_start = time.time()

        # ── 1. Collect sensor readings (replace with your real sensor code) ──
        sensor_data = collect_sensors()   # returns dict with speed, current, etc.

        # ── 2. POST telemetry ──
        try:
            post_telemetry(sensor_data)
        except Exception as e:
            print(f"[telemetry] {e}")

        # ── 3. Poll for dashboard commands ──
        try:
            resp = requests.get(f"{DASHBOARD_URL}/api/command", timeout=5)
            cmd_data = resp.json()
            if cmd_data.get("pending"):
                execute_command(cmd_data["pending"])
        except Exception as e:
            print(f"[command] {e}")

        # ── 4. Auto fault rules ──
        try:
            run_auto_rules(
                sensor_data.get("fault_class", "Normal"),
                sensor_data.get("confidence", 0.0),
            )
        except Exception as e:
            print(f"[auto] {e}")

        # ── 5. Sleep remainder of interval ──
        elapsed = time.time() - loop_start
        time.sleep(max(0, POLL_INTERVAL - elapsed))


# ── Stub — replace with your real DS18B20 / Modbus / CNN code ────────────────
def collect_sensors() -> dict:
    """
    Return a dict matching the telemetry schema.
    Replace each value with your actual sensor read.
    """
    return {
        "speed":       1380.0,
        "current":     1.1,
        "temperature": 28.5,
        "vibration":   0.029,
        "voltage":     230.0,
        "power_w":     438.0,
        "fault_class": "Normal",
        "confidence":  0.96,
        "vib_peak":    0.11,
        "freq_hz":     46.0,
        "vfd_temp":    88.0,
    }


if __name__ == "__main__":
    main()
