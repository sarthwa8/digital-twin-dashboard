# 🔧 Complete Hardware Integration Guide
## Digital Twin Motor Fault Detection System

This guide walks you through the **complete physical setup** from unboxing to running system.

---

## 📦 Phase 1: Unboxing & Inventory (Day 1)

### What You Should Have:

**Electronics:**
- [ ] Raspberry Pi 4 Model B (4GB) + power supply + microSD card
- [ ] MPU-6050 IMU sensor module
- [ ] PZEM-004T v3.0 power analyzer + split-core CT
- [ ] DS18B20 waterproof temperature sensor
- [ ] Jumper wires (Male-Female, Female-Female)
- [ ] Breadboard (optional but helpful)
- [ ] 4.7kΩ resistor (for DS18B20)

**Motor Setup:**
- [ ] 0.5 HP 3-phase induction motor
- [ ] Delta MS300 VFD
- [ ] Motor mounting plate/base
- [ ] Power cables (appropriate gauge for motor)

**Tools Needed:**
- [ ] Screwdriver set
- [ ] Wire strippers
- [ ] Multimeter
- [ ] Electrical tape
- [ ] Cable ties
- [ ] Laptop for Pi setup

---

## 🖥️ Phase 2: Raspberry Pi Setup (Day 1-2)

### Step 1: Prepare SD Card

**On Your Laptop:**

1. **Download Raspberry Pi Imager:**
   - Windows/Mac/Linux: https://www.raspberrypi.com/software/

2. **Flash OS:**
   - Insert microSD card (16GB+)
   - Open Raspberry Pi Imager
   - OS: **Raspberry Pi OS Lite (64-bit)** ← No desktop, saves resources
   - Storage: Select your SD card
   - Click gear icon (⚙️) for advanced options:
     ```
     ✅ Enable SSH
     ✅ Set username: pi
     ✅ Set password: [your choice]
     ✅ Configure WiFi (your network SSID & password)
     ✅ Set locale: Asia/Kolkata
     ```
   - Click **WRITE**

3. **First Boot:**
   - Insert SD card into Raspberry Pi
   - Connect power supply
   - Wait 2-3 minutes for first boot
   - Find Pi's IP address:
     ```bash
     # On your laptop
     ping raspberrypi.local
     # Or check your router's connected devices
     ```

### Step 2: Initial Configuration

**SSH into Pi:**
```bash
# From your laptop
ssh pi@raspberrypi.local
# Or: ssh pi@[IP_ADDRESS]
# Enter password you set earlier
```

**Run Setup Commands:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y python3-pip i2c-tools git vim

# Configure interfaces
sudo raspi-config
```

**In raspi-config menu:**
```
1. Interface Options
   → I2C → Enable
   → 1-Wire → Enable  
   → Serial Port → Enable (hardware), Disable (login shell)

2. Performance Options
   → GPU Memory → Set to 16 (we don't need graphics)

3. Finish → Reboot? Yes
```

**After reboot, SSH back in:**
```bash
ssh pi@raspberrypi.local

# Install Python libraries
pip3 install paho-mqtt smbus2 pyserial --break-system-packages

# Create project directory
mkdir -p ~/digital-twin
cd ~/digital-twin
```

---

## 🔌 Phase 3: Sensor Wiring (Day 2-3)

### Safety First! ⚠️
- **Disconnect all power** before wiring
- **Double-check connections** before powering on
- **Use proper wire gauges** for motor power
- **Get help from an electrician** for AC wiring

---

### 🎯 Sensor 1: MPU-6050 (Vibration Sensor)

**What it does:** Measures motor vibration (accelerometer) and rotation (gyroscope)

**Physical Mounting:**
1. Position sensor **directly on motor housing**
2. Use strong adhesive or mounting bracket
3. Orient sensor so axes align with motor (X=axial, Y=radial, Z=tangential)
4. Secure wiring so it doesn't vibrate loose

**Wiring to Raspberry Pi:**

```
MPU-6050 Module    →    Raspberry Pi 4
┌─────────────┐         ┌──────────────┐
│    VCC      │────────→│ Pin 1 (3.3V) │
│    GND      │────────→│ Pin 6 (GND)  │
│    SCL      │────────→│ Pin 5 (SCL)  │
│    SDA      │────────→│ Pin 3 (SDA)  │
└─────────────┘         └──────────────┘
```

**Pin Location on Pi:**
```
  3.3V  [1] [2]  5V
  SDA   [3] [4]  5V
  SCL   [5] [6]  GND
        [7] [8]
  GND   [9] [10]
        ... etc
```

**Testing:**
```bash
# Verify I2C is working
sudo i2cdetect -y 1

# Should see something like:
#      0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
# 00:          -- -- -- -- -- -- -- -- -- -- -- -- -- 
# ...
# 60: -- -- -- -- -- -- -- -- 68 -- -- -- -- -- -- --
#                              ^^
#                         MPU-6050 detected!
```

---

### ⚡ Sensor 2: PZEM-004T (Power Analyzer)

**What it does:** Measures voltage, current, power, power factor of motor

**Physical Setup:**

1. **Current Transformer (CT) Placement:**
   - Open the split-core CT clamp
   - Clamp around **ONE phase wire** going to motor
   - Close CT firmly (should click)
   - Arrow on CT should point toward motor (load direction)
   
2. **Voltage Sensing:**
   - Connect PZEM voltage input to **same phase** as CT
   - Use proper AC-rated wire (230V)
   - **⚠️ HIGH VOLTAGE - Get electrician help!**

**Wiring to Raspberry Pi (for communication):**

```
PZEM-004T Module   →    Raspberry Pi 4
┌─────────────┐         ┌──────────────┐
│    VCC      │────────→│ Pin 2 (5V)   │
│    GND      │────────→│ Pin 14 (GND) │
│    TX       │────────→│ Pin 10 (RX)  │
│    RX       │────────→│ Pin 8 (TX)   │
└─────────────┘         └──────────────┘
```

**IMPORTANT:** TX → RX and RX → TX (crossover!)

**Testing:**
```bash
# Check serial port
ls -l /dev/serial0
# Should show: /dev/serial0 -> ttyAMA0

# Test with Python (later section has full code)
```

---

### 🌡️ Sensor 3: DS18B20 (Temperature Sensor)

**What it does:** Measures motor housing temperature

**Physical Mounting:**
1. Attach sensor probe to motor housing with thermal paste or epoxy
2. Position near bearing or hottest area
3. Secure with cable tie or tape

**Wiring with Pull-up Resistor:**

```
DS18B20            4.7kΩ Resistor      Raspberry Pi 4
┌────────┐         
│  VCC   │─────┬──────────────────→│ Pin 1 (3.3V) │
│ (Red)  │     │                    
│        │     └──[4.7kΩ]───┐       
│  DATA  │──────────────────┴────→│ Pin 7 (GPIO4)│
│ (Yel)  │                         
│  GND   │────────────────────────→│ Pin 9 (GND)  │
│ (Blk)  │                         
└────────┘                         
```

**The 4.7kΩ resistor connects between VCC and DATA lines (pull-up resistor)**

**Enable 1-Wire:**
```bash
# Edit boot config
sudo nano /boot/config.txt

# Add this line:
dtoverlay=w1-gpio,gpiopin=4

# Save (Ctrl+X, Y, Enter)
sudo reboot

# After reboot, test:
ls /sys/bus/w1/devices/
# Should show: 28-xxxxxxxxxxxx (your sensor ID)

# Read temperature:
cat /sys/bus/w1/devices/28-*/w1_slave
# Should show temperature reading
```

---

## ⚙️ Phase 4: Motor & VFD Setup (Day 3-4)

### VFD to Motor Wiring

**⚠️ DANGER: HIGH VOLTAGE - Get Professional Help!**

**Delta MS300 VFD Connections:**

```
AC INPUT (Single Phase):
L (Live)  ──→ From 230V AC supply
N (Neutral)──→ From 230V AC supply  
G (Ground)──→ Earth ground

AC OUTPUT (3-Phase to Motor):
U ──→ Motor Terminal U (Phase 1)
V ──→ Motor Terminal V (Phase 2)
W ──→ Motor Terminal W (Phase 3)
```

**Motor Terminal Connections:**
```
Motor Junction Box:
┌─────────────────┐
│  U1    V1    W1 │  ← Connect to VFD U, V, W
│                 │
│  U2    V2    W2 │  ← Internal connections (check motor nameplate)
└─────────────────┘
Ground terminal → Earth
```

**VFD Programming (Basic):**
```
Parameter  | Setting | Description
-----------|---------|---------------------------
P0-00      | 0       | V/F control mode
P0-01      | 50Hz    | Maximum frequency
P0-02      | 230V    | Rated voltage
P0-03      | 50Hz    | Base frequency
P0-04      | 1.5A    | Rated current (check motor)
P1-00      | 10s     | Acceleration time
P1-01      | 10s     | Deceleration time
```

### Motor Mounting & Alignment

1. **Secure motor to rigid base**
   - Bolt down firmly
   - Use vibration dampening pads (optional but good)

2. **Sensor placement on motor:**
   ```
   Top View:
        ┌──────────────────┐
        │                  │
        │      MOTOR       │
   MPU-6050 →│   🏷️ [sensor]   │
        │                  │
        │   DS18B20 probe  │← Near bearing
        └──────────────────┘
   ```

3. **Cable management:**
   - Route sensor cables away from motor power cables
   - Use cable ties
   - Leave some slack for vibration

---

## 🔬 Phase 5: System Integration & Testing (Day 4-5)

### Complete System Diagram

```
┌────────────────────────────────────────────────────────┐
│                    230V AC Supply                       │
└────┬───────────────────────────────────────────────────┘
     │
     ├─→ PZEM-004T (voltage sensing)
     │       │
     │       └─→ Split-Core CT ──→ Motor Phase A
     │
     └─→ VFD Input
             │
             ├─→ VFD Output (3-phase) ──→ Motor
             │
        [Motor Running]
             │
             ├─→ MPU-6050 (mounted on housing) ──→ RPi (I2C)
             ├─→ DS18B20 (on housing) ──→ RPi (1-Wire)
             └─→ PZEM-004T data ──→ RPi (UART)
                      │
                 [Raspberry Pi 4]
                      │
                      ├─→ WiFi ──→ MQTT Broker (Internet)
                      │                │
                      │                ▼
                      │         [Cloud Dashboard]
                      │         (Vercel Website)
                      └─→ Local ML Inference
```

### Software Installation

**Transfer your code to Pi:**
```bash
# On your laptop, in project directory:
scp -r digital-twin-dashboard/mock-sensors/* pi@raspberrypi.local:~/digital-twin/

# Or use git:
ssh pi@raspberrypi.local
cd ~/digital-twin
git clone https://github.com/sarthwa8/digital-twin-dashboard.git
cd digital-twin-dashboard/mock-sensors
```

**Install sensor libraries:**
```bash
# Copy the code from RASPBERRY_PI_SETUP.md
# You already have the sensor driver code there

# Make sure all Python files are present:
ls -la
# Should see:
# - motor_monitor.py (main script)
# - sensors/mpu6050.py
# - sensors/pzem004t.py
# - sensors/ds18b20.py
# - requirements.txt
```

---

## ✅ Phase 6: Testing & Calibration (Day 5-6)

### Test Each Sensor Individually

**1. Test MPU-6050:**
```bash
cd ~/digital-twin/sensors
python3 mpu6050.py

# Should output:
# Accel: {'x': 0.12, 'y': -0.05, 'z': 9.81}
# Gyro: {'x': 0.01, 'y': 0.02, 'z': -0.01}
```

**2. Test PZEM-004T:**
```bash
python3 pzem004t.py

# Should output (motor must be running):
# Voltage: 230.5 V
# Current: 1.23 A
# Power: 245.2 W
```

**3. Test DS18B20:**
```bash
python3 ds18b20.py

# Should output:
# Temperature: 28.5 °C
```

### Run Complete System

```bash
cd ~/digital-twin
python3 motor_monitor.py

# Should see:
# ✅ Sensors initialized
# ✅ Connected to MQTT broker
# 📊 [timestamp] Data published
```

### Check Dashboard

1. Open your Vercel dashboard: `digital-twin-dashboard-five.vercel.app`
2. Should see real sensor data appearing!
3. All charts updating in real-time

---

## 🎯 Phase 7: Fault Testing (Day 7+)

### Create Fault Conditions

**For thesis research, you need actual faults:**

**1. Normal Baseline:**
- Run motor at rated speed (1440 RPM)
- Collect 5-10 minutes of data
- Label as "Normal"

**2. Inner Race Fault:**
- Method 1: Remove motor, carefully scratch bearing inner race with file
- Method 2: Run bearing dry (no lubrication) for extended period
- Reinstall, collect data

**3. Ball Fault:**
- Indent one or more balls with center punch
- Or use bearing with damaged balls

**4. Outer Race Fault:**
- Score outer race with file
- Or use pre-damaged bearing

**⚠️ Safety:**
- Always supervise faulty motor operation
- Monitor temperature closely
- Have emergency stop ready
- Don't let faults progress too far

### Data Collection Protocol

For each fault condition:
```bash
# Start data collection
python3 motor_monitor.py > logs/fault_innerrace_$(date +%Y%m%d_%H%M%S).log

# Run for 10 minutes
# Stop motor
# Change fault condition
# Repeat
```

---

## 📊 Phase 8: Production Deployment

### Set Up Auto-Start

```bash
# Create systemd service
sudo nano /etc/systemd/system/digital-twin.service
```

**Add this content:**
```ini
[Unit]
Description=Digital Twin Motor Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/digital-twin
ExecStart=/usr/bin/python3 motor_monitor.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable digital-twin
sudo systemctl start digital-twin

# Check status
sudo systemctl status digital-twin

# View logs
sudo journalctl -u digital-twin -f
```

---

## 🔧 Troubleshooting Guide

### Sensor Not Detected

**MPU-6050:**
```bash
# Check I2C
sudo i2cdetect -y 1
# If 0x68 missing:
- Check wiring
- Verify 3.3V power (not 5V!)
- Try different I2C address (0x69 if AD0 is high)
```

**PZEM-004T:**
```bash
# Check serial
ls -l /dev/serial0
# Should link to ttyAMA0

# If not working:
sudo raspi-config
# Interface → Serial → Enable hardware, Disable login shell
```

**DS18B20:**
```bash
# Check 1-Wire
ls /sys/bus/w1/devices/
# Should show 28-xxxxxxxxxxxx

# If missing:
- Check 4.7kΩ resistor
- Verify wiring
- Check /boot/config.txt has: dtoverlay=w1-gpio,gpiopin=4
```

### Motor Won't Start

- Check VFD error codes (display shows error number)
- Verify all 3 phases connected
- Check VFD parameters match motor specs
- Ensure emergency stop not engaged

### No Data on Dashboard

- Check Pi internet connection: `ping google.com`
- Verify MQTT broker: Check console logs in browser
- Check topic names match exactly
- Restart motor_monitor.py

---

## 📸 Documentation for Thesis

### Photos to Take:

1. ✅ Complete setup (wide shot)
2. ✅ Each sensor mounted on motor (close-up)
3. ✅ Wiring connections to Pi
4. ✅ VFD control panel
5. ✅ Dashboard running on screen
6. ✅ Pi setup with all connections

### Videos to Record:

1. ✅ Motor startup sequence
2. ✅ Live dashboard updating
3. ✅ Fault transition (normal → fault)
4. ✅ System operation walkthrough

---

## ✅ Final Checklist

**Hardware:**
- [ ] All sensors wired correctly
- [ ] Motor securely mounted
- [ ] VFD programmed
- [ ] Pi configured and online
- [ ] All connections tested

**Software:**
- [ ] Python scripts working
- [ ] MQTT connection stable
- [ ] Dashboard receiving data
- [ ] Auto-start configured

**Safety:**
- [ ] Emergency stop accessible
- [ ] Proper grounding
- [ ] Fire extinguisher nearby
- [ ] No loose wiring

**Research:**
- [ ] Baseline data collected
- [ ] Fault data collected
- [ ] System documented
- [ ] Photos/videos taken

---

## 🎓 Tips for Thesis Success

1. **Document Everything:**
   - Take photos at each step
   - Keep a lab notebook
   - Save all error messages

2. **Version Control:**
   - Git commit after each working change
   - Tag stable versions

3. **Backup Data:**
   - Copy sensor logs regularly
   - Store on cloud (Google Drive)
   - Keep multiple copies

4. **Plan Demonstrations:**
   - Test everything before demo day
   - Have backup plans
   - Prepare spare sensors

---

**Good luck with your thesis! 🎓🚀**

You now have a complete guide from unboxing to running system. Follow it step-by-step and you'll have a professional Digital Twin setup!
