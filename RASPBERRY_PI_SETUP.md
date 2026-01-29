# Raspberry Pi Hardware Integration Guide

This guide will help you integrate real sensors with your Raspberry Pi once hardware arrives.

## 📋 Hardware Checklist

Before starting, ensure you have:
- ✅ Raspberry Pi 4 Model B (4GB)
- ✅ MPU-6050 IMU sensor module
- ✅ PZEM-004T power analyzer module
- ✅ DS18B20 waterproof temperature sensor
- ✅ 0.5 HP 3-phase induction motor
- ✅ Delta MS300 VFD
- ✅ Jumper wires, breadboard
- ✅ 5V power supply for Pi
- ✅ microSD card (16GB+) with Raspbian OS

---

## 🔌 Wiring Diagram

### MPU-6050 (I²C Connection)
```
MPU-6050    →    Raspberry Pi
VCC         →    Pin 1 (3.3V)
GND         →    Pin 6 (Ground)
SCL         →    Pin 5 (GPIO 3 / SCL)
SDA         →    Pin 3 (GPIO 2 / SDA)
```

### PZEM-004T (UART Connection)
```
PZEM-004T   →    Raspberry Pi
VCC         →    Pin 2 (5V)
GND         →    Pin 14 (Ground)
TX          →    Pin 10 (GPIO 15 / RXD)
RX          →    Pin 8 (GPIO 14 / TXD)
```

**Power Connections:**
- Split-core CT clamps around one phase of motor supply
- Connect PZEM-004T to motor terminal voltage (230V AC)
- ⚠️ **WARNING**: Work with a qualified electrician for AC connections

### DS18B20 (1-Wire Connection)
```
DS18B20     →    Raspberry Pi
VCC (Red)   →    Pin 1 (3.3V)
GND (Black) →    Pin 9 (Ground)
DATA (Yel)  →    Pin 7 (GPIO 4)
```

**Important**: Add 4.7kΩ pull-up resistor between DATA and VCC

---

## 🛠️ Raspberry Pi Setup

### 1. Install Raspbian OS

```bash
# Download Raspberry Pi Imager
# Flash Raspbian OS Lite (64-bit) to microSD card
# Enable SSH before first boot (create empty file named 'ssh' in boot partition)
```

### 2. Initial Configuration

```bash
# SSH into Pi (default password: raspberry)
ssh pi@raspberrypi.local

# Update system
sudo apt update && sudo apt upgrade -y

# Change default password
passwd

# Configure Pi
sudo raspi-config
```

**In raspi-config, enable:**
- Interface Options → I2C → Enable
- Interface Options → 1-Wire → Enable
- Interface Options → Serial Port → Enable (hardware), Disable (login shell)
- Performance Options → GPU Memory → Set to 16

### 3. Install Python Dependencies

```bash
# Install system packages
sudo apt install -y python3-pip i2c-tools git

# Install Python libraries
pip3 install paho-mqtt smbus2 pyserial --break-system-packages

# Verify I2C
sudo i2cdetect -y 1
# Should show 0x68 if MPU-6050 is connected
```

---

## 📝 Sensor Code Implementation

### MPU-6050 IMU Sensor

Create `/home/pi/sensors/mpu6050.py`:

```python
import smbus
import time
import math

class MPU6050:
    # MPU-6050 Registers
    PWR_MGMT_1 = 0x6B
    ACCEL_XOUT_H = 0x3B
    GYRO_XOUT_H = 0x43
    
    def __init__(self, address=0x68, bus=1):
        self.address = address
        self.bus = smbus.SMBus(bus)
        # Wake up MPU-6050
        self.bus.write_byte_data(self.address, self.PWR_MGMT_1, 0)
        time.sleep(0.1)
    
    def read_word_2c(self, reg):
        """Read two bytes and convert to signed integer"""
        high = self.bus.read_byte_data(self.address, reg)
        low = self.bus.read_byte_data(self.address, reg + 1)
        val = (high << 8) + low
        if val >= 0x8000:
            return -((65535 - val) + 1)
        return val
    
    def read_accelerometer(self):
        """Read accelerometer data in m/s²"""
        accel_x = self.read_word_2c(self.ACCEL_XOUT_H) / 16384.0 * 9.81
        accel_y = self.read_word_2c(self.ACCEL_XOUT_H + 2) / 16384.0 * 9.81
        accel_z = self.read_word_2c(self.ACCEL_XOUT_H + 4) / 16384.0 * 9.81
        return {"x": accel_x, "y": accel_y, "z": accel_z, "unit": "m/s²"}
    
    def read_gyroscope(self):
        """Read gyroscope data in °/s"""
        gyro_x = self.read_word_2c(self.GYRO_XOUT_H) / 131.0
        gyro_y = self.read_word_2c(self.GYRO_XOUT_H + 2) / 131.0
        gyro_z = self.read_word_2c(self.GYRO_XOUT_H + 4) / 131.0
        return {"x": gyro_x, "y": gyro_y, "z": gyro_z, "unit": "°/s"}
    
    def read_all(self):
        """Read all sensor data"""
        return {
            "accelerometer": self.read_accelerometer(),
            "gyroscope": self.read_gyroscope(),
            "sample_rate_hz": 100
        }

# Test
if __name__ == "__main__":
    mpu = MPU6050()
    while True:
        data = mpu.read_all()
        print(f"Accel: {data['accelerometer']}")
        print(f"Gyro: {data['gyroscope']}")
        time.sleep(0.5)
```

### PZEM-004T Power Analyzer

Create `/home/pi/sensors/pzem004t.py`:

```python
import serial
import time
import struct

class PZEM004T:
    def __init__(self, port='/dev/serial0', address=0xF8):
        self.address = address
        self.ser = serial.Serial(
            port=port,
            baudrate=9600,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=1.0
        )
        time.sleep(0.5)
    
    def _checksum(self, data):
        """Calculate checksum"""
        return sum(data) & 0xFF
    
    def _send_command(self, cmd, data=[]):
        """Send command to PZEM"""
        packet = [self.address, cmd] + data
        checksum = self._checksum(packet)
        packet.append(checksum)
        self.ser.write(bytes(packet))
        time.sleep(0.1)
    
    def read_data(self):
        """Read all electrical parameters"""
        # Command to read registers
        self._send_command(0x04, [0x00, 0x00, 0x00, 0x0A])
        
        # Read response (25 bytes)
        response = self.ser.read(25)
        
        if len(response) < 25:
            return None
        
        # Parse data (refer to PZEM-004T datasheet)
        voltage = struct.unpack('>H', response[3:5])[0] / 10.0  # V
        current = struct.unpack('>I', response[5:9])[0] / 1000.0  # A
        power = struct.unpack('>I', response[9:13])[0] / 10.0  # W
        energy = struct.unpack('>I', response[13:17])[0]  # Wh
        frequency = struct.unpack('>H', response[17:19])[0] / 10.0  # Hz
        pf = struct.unpack('>H', response[19:21])[0] / 100.0  # Power factor
        
        return {
            "voltage": round(voltage, 2),
            "current": round(current, 3),
            "power": round(power, 2),
            "energy": energy,
            "frequency": round(frequency, 2),
            "power_factor": round(pf, 3),
            "units": {
                "voltage": "V",
                "current": "A",
                "power": "W",
                "frequency": "Hz"
            }
        }

# Test
if __name__ == "__main__":
    pzem = PZEM004T()
    while True:
        data = pzem.read_data()
        if data:
            print(f"Voltage: {data['voltage']} V")
            print(f"Current: {data['current']} A")
            print(f"Power: {data['power']} W")
        time.sleep(1.0)
```

### DS18B20 Temperature Sensor

Create `/home/pi/sensors/ds18b20.py`:

```python
import glob
import time

class DS18B20:
    def __init__(self):
        # Enable 1-Wire interface
        base_dir = '/sys/bus/w1/devices/'
        device_folders = glob.glob(base_dir + '28*')
        if not device_folders:
            raise RuntimeError("No DS18B20 sensor found!")
        self.device_file = device_folders[0] + '/w1_slave'
    
    def _read_temp_raw(self):
        """Read raw temperature data"""
        with open(self.device_file, 'r') as f:
            return f.readlines()
    
    def read_temperature(self):
        """Read temperature in Celsius"""
        lines = self._read_temp_raw()
        
        # Wait for valid reading
        while lines[0].strip()[-3:] != 'YES':
            time.sleep(0.2)
            lines = self._read_temp_raw()
        
        # Extract temperature
        equals_pos = lines[1].find('t=')
        if equals_pos != -1:
            temp_string = lines[1][equals_pos+2:]
            temp_c = float(temp_string) / 1000.0
            return {
                "temperature": round(temp_c, 2),
                "unit": "°C",
                "location": "Stator Housing"
            }
        return None

# Test
if __name__ == "__main__":
    sensor = DS18B20()
    while True:
        data = sensor.read_temperature()
        print(f"Temperature: {data['temperature']} °C")
        time.sleep(2.0)
```

---

## 🚀 Complete Integration Script

Create `/home/pi/motor_monitor.py`:

```python
#!/usr/bin/env python3
"""
Real-time motor monitoring with MQTT publishing
Integrates MPU-6050, PZEM-004T, and DS18B20 sensors
"""

import paho.mqtt.client as mqtt
import time
import json
from datetime import datetime
from sensors.mpu6050 import MPU6050
from sensors.pzem004t import PZEM004T
from sensors.ds18b20 import DS18B20

# MQTT Configuration
MQTT_BROKER = "your-broker.com"  # Replace with your broker
MQTT_PORT = 1883
MQTT_USER = "your-username"  # Optional
MQTT_PASS = "your-password"  # Optional

TOPICS = {
    "imu": "digitaltwin/motor/sensors/imu",
    "power": "digitaltwin/motor/sensors/power",
    "thermal": "digitaltwin/motor/sensors/thermal",
    "status": "digitaltwin/motor/status"
}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to MQTT broker")
    else:
        print(f"❌ Connection failed: {rc}")

def main():
    # Initialize sensors
    print("🔧 Initializing sensors...")
    mpu = MPU6050()
    pzem = PZEM004T()
    ds18b20 = DS18B20()
    print("✅ Sensors initialized")
    
    # Initialize MQTT
    client = mqtt.Client(client_id="raspberrypi-motor")
    client.on_connect = on_connect
    
    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASS)
    
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()
    
    print("🚀 Starting data collection...")
    
    try:
        while True:
            timestamp = datetime.now().isoformat()
            
            # Read IMU data
            imu_data = mpu.read_all()
            imu_data["timestamp"] = timestamp
            client.publish(TOPICS["imu"], json.dumps(imu_data))
            
            # Read power data
            power_data = pzem.read_data()
            if power_data:
                power_data["timestamp"] = timestamp
                client.publish(TOPICS["power"], json.dumps(power_data))
            
            # Read temperature data
            temp_data = ds18b20.read_temperature()
            if temp_data:
                temp_data["timestamp"] = timestamp
                client.publish(TOPICS["thermal"], json.dumps(temp_data))
            
            # Publish status
            status_data = {
                "timestamp": timestamp,
                "status": "Connected",
                "rpm": 1440,
                "running": True
            }
            client.publish(TOPICS["status"], json.dumps(status_data))
            
            print(f"📊 [{timestamp}] Data published")
            time.sleep(1.0)  # 1 Hz sampling
            
    except KeyboardInterrupt:
        print("\n⏸️  Stopped by user")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
```

---

## 🎯 Running on Startup

Create systemd service to run automatically:

```bash
sudo nano /etc/systemd/system/motor-monitor.service
```

Add:
```ini
[Unit]
Description=Motor Digital Twin Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 /home/pi/motor_monitor.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable motor-monitor.service
sudo systemctl start motor-monitor.service

# Check status
sudo systemctl status motor-monitor.service

# View logs
sudo journalctl -u motor-monitor.service -f
```

---

## 🔍 Testing & Troubleshooting

### Test I2C (MPU-6050)
```bash
sudo i2cdetect -y 1
# Should show 0x68
```

### Test 1-Wire (DS18B20)
```bash
ls /sys/bus/w1/devices/
# Should show 28-xxxxxxxxxxxx folder

cat /sys/bus/w1/devices/28-*/w1_slave
# Should show temperature reading
```

### Test UART (PZEM-004T)
```bash
# Check serial port
ls -l /dev/serial0

# Monitor serial data
sudo cat /dev/serial0
```

### Common Issues

**MPU-6050 not detected:**
- Check wiring (especially GND)
- Verify 3.3V power supply
- Try different I2C address (0x69 if AD0 pin is high)

**PZEM-004T no data:**
- Ensure UART is enabled in raspi-config
- Check TX/RX are not swapped
- Verify baud rate (9600)
- Ensure motor is powered on

**DS18B20 no reading:**
- Check 4.7kΩ pull-up resistor
- Ensure 1-Wire interface is enabled
- Wait ~750ms between readings

---

## 📊 Next Steps

1. ✅ Wire all sensors to Raspberry Pi
2. ✅ Test each sensor individually
3. ✅ Run integrated motor_monitor.py script
4. ✅ Verify data appears in web dashboard
5. 🔄 Calibrate sensors with known references
6. 🔄 Collect training data for ML model
7. 🔄 Deploy CNN model on Raspberry Pi for edge inference

---

## 🔗 Useful Resources

- [MPU-6050 Datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf)
- [PZEM-004T Manual](https://innovatorsguru.com/pzem-004t/)
- [DS18B20 Datasheet](https://datasheets.maximintegrated.com/en/ds/DS18B20.pdf)
- [Raspberry Pi Pinout](https://pinout.xyz/)

---

**Last Updated**: January 2026  
**Status**: Ready for hardware integration
