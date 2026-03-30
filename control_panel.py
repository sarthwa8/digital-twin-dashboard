import time
import csv
import json
from pymodbus.client import ModbusSerialClient

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    print("[WARNING] paho-mqtt not installed. Run: pip install paho-mqtt")
    MQTT_AVAILABLE = False

try:
    from w1thermsensor import W1ThermSensor, SensorNotReadyError
except ImportError:
    print("[WARNING] w1thermsensor library not installed. Run: pip install w1thermsensor")
    W1ThermSensor = None
    SensorNotReadyError = Exception

# --- Configuration ---
PORT = '/dev/ttyUSB0'
BAUD = 9600
SLAVE_ID = 1

# Delta VFD Modbus Registers
CMD_ADDR = 0x2000
FREQ_ADDR = 0x2001
STATUS_ADDR = 0x2103  # Block read: Frequency, Current, DC Bus, Output Voltage

TEMP_THRESHOLD = 45.0

# MQTT Configuration
MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 8083
MQTT_TOPIC = "npl/motor/telemetry"


class MotorController:
    def __init__(self):
        self.client = ModbusSerialClient(
            port=PORT,
            baudrate=BAUD,
            timeout=1,
            parity='N',
            stopbits=1,
            bytesize=8
        )
        self.running = True
        self.current_temp = 25.0
        self.mqtt_client = None

        # Initialize DS18B20
        if W1ThermSensor:
            try:
                self.temp_sensor = W1ThermSensor()
                print("[SUCCESS] DS18B20 initialized.")
            except Exception as e:
                print(f"[WARNING] DS18B20 not found. Defaulting to 25.0C dummy data. {e}")
                self.temp_sensor = None
        else:
            self.temp_sensor = None

        # Initialize MQTT
        if MQTT_AVAILABLE:
            try:
                self.mqtt_client = mqtt.Client(
                    mqtt.CallbackAPIVersion.VERSION2,
                    transport="websockets"
                )
                self.mqtt_client.on_connect = self._on_mqtt_connect
                self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
                self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
                self.mqtt_client.loop_start()  # Background thread — does not block Modbus
            except Exception as e:
                print(f"[WARNING] MQTT connection failed: {e}. Telemetry will not stream.")
                self.mqtt_client = None

    def _on_mqtt_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            print(f"[SUCCESS] Streaming to Dashboard via broker.emqx.io")
        else:
            print(f"[WARNING] MQTT connect failed, reason code: {reason_code}")

    def _on_mqtt_disconnect(self, client, userdata, flags, reason_code, properties):
        print("[WARNING] MQTT disconnected.")

    def connect(self):
        if self.client.connect():
            print("[SUCCESS] RS485 Connection Established.")
            return True
        print("[FAILURE] Could not open Serial Port. Check USB connection.")
        return False

    def get_temp(self):
        """Reads DS18B20 with EMI filtering and error latching."""
        if not self.temp_sensor:
            return self.current_temp

        try:
            temp = self.temp_sensor.get_temperature()
            # Filter out EMI drops (0.0), CRC errors (85.0), and physical extremes
            if temp > 10.0 and temp != 85.0 and temp < 125.0:
                self.current_temp = round(temp, 1)
            else:
                print(f"\n[EMI FILTER] Ignored invalid temp reading: {temp}C")
        except (SensorNotReadyError, Exception):
            pass  # Latch last known good value during bus lockups

        return self.current_temp

    def read_telemetry(self):
        """Block reads Delta VFD registers and returns scaled physical data."""
        try:
            result = self.client.read_holding_registers(
                address=STATUS_ADDR, count=4, device_id=SLAVE_ID
            )

            if result.isError():
                return None

            freq_hz = result.registers[0] / 100.0

            data = {
                # Slip-adjusted RPM for 4-pole motor (27.6 = 1380 RPM / 50 Hz nameplate)
                "speed": round(freq_hz * 27.6, 1),
                "current": result.registers[1] / 100.0,
                "dc_bus": result.registers[2] / 10.0,
                "voltage": result.registers[3] / 10.0,
                "temperature": self.get_temp(),
            }
            return data
        except Exception as e:
            print(f"[MODBUS READ ERROR] {e}")
            return None

    def publish_telemetry(self, data):
        """Publishes telemetry to MQTT broker for dashboard consumption."""
        if not self.mqtt_client:
            return

        payload = {
            "speed": data["speed"],
            "current": data["current"],
            "temperature": data["temperature"],
            "vibration": 0.0,  # Placeholder until MPU-6050 is wired
        }

        try:
            self.mqtt_client.publish(MQTT_TOPIC, json.dumps(payload))
        except Exception as e:
            print(f"[MQTT PUBLISH ERROR] {e}")

    def send_command(self, val):
        """Sends control words to VFD."""
        try:
            response = self.client.write_register(
                address=CMD_ADDR, value=val, device_id=SLAVE_ID
            )
            if response.isError():
                print(f"[VFD ERROR] Command {val} rejected.")
            else:
                print(f"[VFD SUCCESS] Command {val} accepted.")
        except Exception as e:
            print(f"[COMMUNICATION ERROR] {e}")

    def log_data(self, data):
        """Logs to local CSV."""
        with open('motor_delta_log.csv', mode='a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                time.time(),
                data['voltage'],
                data['current'],
                data['speed'],
                data['temperature'],
            ])

    def shutdown(self):
        self.send_command(1)  # Stop motor
        self.client.close()
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()


# --- Main Execution ---
controller = MotorController()

if controller.connect():
    try:
        print("=============================================")
        print("   INDUSTRIAL MOTOR DIGITAL TWIN - NPL LAB")
        print("=============================================")
        print("Commands: run, rev, stop, set <hz>, monitor, exit")

        while controller.running:
            user_input = input("Command > ").lower().split()
            if not user_input:
                continue

            cmd = user_input[0]

            if cmd == "run":
                controller.send_command(18)  # 0x12 Forward
            elif cmd == "rev":
                controller.send_command(34)  # 0x22 Reverse
            elif cmd == "stop":
                controller.send_command(1)   # 0x01 Stop
            elif cmd == "set" and len(user_input) > 1:
                try:
                    freq = min(int(user_input[1]), 60)  # Capped at 60 Hz for safety
                    response = controller.client.write_register(
                        address=FREQ_ADDR, value=freq * 100, device_id=SLAVE_ID
                    )
                    if response.isError():
                        print("[VFD ERROR] Frequency write failed.")
                    else:
                        print(f"[VFD SUCCESS] Frequency set to {freq}Hz.")
                except ValueError:
                    print("[INPUT ERROR] Please provide a valid integer for frequency.")
                except Exception as e:
                    print(f"[COMMUNICATION ERROR] {e}")
            elif cmd == "monitor":
                print("[INFO] Monitoring telemetry. Press Ctrl+C to return to command prompt.")
                try:
                    while True:
                        stats = controller.read_telemetry()
                        if stats:
                            print(
                                f"Telemetry -> V: {stats['voltage']}V | "
                                f"I: {stats['current']}A | "
                                f"RPM: {stats['speed']} | "
                                f"Temp: {stats['temperature']}C"
                            )

                            # Emergency Stop Logic
                            if stats['temperature'] > TEMP_THRESHOLD:
                                print(
                                    f"[CRITICAL ALARM] Temp {stats['temperature']}C "
                                    f"exceeds threshold! EMERGENCY STOP."
                                )
                                controller.send_command(1)
                                break

                            controller.log_data(stats)
                            controller.publish_telemetry(stats)
                        else:
                            print("[WARNING] Telemetry read failed. No response from VFD.")
                        time.sleep(1)
                except KeyboardInterrupt:
                    print("\n[INFO] Exited monitor mode.")
                    continue
            elif cmd == "exit":
                controller.running = False
            else:
                print("[ERROR] Unknown command.")

    except KeyboardInterrupt:
        pass
    finally:
        print("\n[INFO] Shutting down...")
        controller.shutdown()
        print("[INFO] Serial closed.")
