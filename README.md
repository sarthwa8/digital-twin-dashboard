# Digital Twin Dashboard - Motor Fault Detection System

A complete real-time monitoring system for industrial motor fault detection using Digital Twin technology, IoT sensors, and Machine Learning.

![Dashboard](https://img.shields.io/badge/Status-Demo%20Ready-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![React](https://img.shields.io/badge/React-18-blue)
![MQTT](https://img.shields.io/badge/MQTT-5.0-orange)

## 🎯 Project Overview

This system provides real-time visualization and fault detection for a 0.5 HP 3-phase induction motor using:
- **IoT Sensors**: MPU-6050 (vibration), PZEM-004T (power), DS18B20 (temperature)
- **Edge Computing**: Raspberry Pi 4 for local data processing
- **Machine Learning**: CNN-based fault classification (CWRU dataset)
- **Digital Twin**: Unity 3D visualization + Web dashboard

### Detected Fault Types
- ✅ Normal operation
- ⚠️ Inner Race bearing fault
- ⚠️ Ball bearing fault
- 🔴 Outer Race bearing fault

---

## 📁 Project Structure

```
digital-twin-dashboard/
├── mock-sensors/                    # Python sensor simulator
│   ├── motor_sensor_simulator.py   # Main simulator script
│   └── requirements.txt            # Python dependencies
│
├── web-dashboard/                   # React web interface
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── Header.jsx
│   │   │   ├── ConnectionStatus.jsx
│   │   │   ├── FaultDetector.jsx
│   │   │   ├── UnityViewer.jsx
│   │   │   └── SensorGrid.jsx
│   │   ├── App.jsx                 # Main app component
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── public/                     # Static assets
│   ├── package.json
│   └── vite.config.js
│
└── mqtt-config/                     # MQTT setup guides
    └── MQTT_SETUP.md

```

---

## 🚀 Quick Start

### Prerequisites

**For Python Simulator:**
- Python 3.8 or higher
- pip package manager

**For Web Dashboard:**
- Node.js 16+ and npm
- Modern web browser

### Step 1: Set Up Python Simulator

```bash
cd mock-sensors

# Install dependencies
pip install -r requirements.txt

# Run simulator (connects to public MQTT broker)
python motor_sensor_simulator.py
```

The simulator will:
- Connect to HiveMQ public MQTT broker
- Cycle through all 4 fault types (60 seconds each)
- Publish sensor data at 1 Hz
- Display real-time console output

### Step 2: Set Up Web Dashboard

```bash
cd web-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Step 3: View Real-Time Data

1. Open `http://localhost:3000` in your browser
2. Wait for MQTT connection (should be automatic)
3. Watch live sensor data and fault predictions update

---

## 📊 System Architecture

```
┌─────────────────┐
│  Physical Motor │
│   (Real/Mock)   │
└────────┬────────┘
         │ Sensors (I²C, 1-Wire, UART)
         ▼
┌─────────────────┐
│  Raspberry Pi 4 │
│  Edge Computer  │
│  - Data Collect │
│  - ML Inference │
└────────┬────────┘
         │ MQTT Protocol
         ▼
┌─────────────────┐
│   MQTT Broker   │
│   (HiveMQ)      │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Web Dashboard  │
│  - React UI     │
│  - Unity 3D     │
│  - Real-time    │
│    Charts       │
└─────────────────┘
```

---

## 🔌 Hardware Specifications

| Component | Model | Specification | Purpose |
|-----------|-------|---------------|---------|
| **Edge Node** | Raspberry Pi 4 Model B | 4GB RAM | Data aggregation, MQTT broker, ML inference |
| **IMU Sensor** | MPU-6050 | 6-DoF | High-frequency vibration & rotational dynamics |
| **Power Analyzer** | PZEM-004T v3.0 | Split-Core CT | Real-time electrical parameters (V, I, P, pf) |
| **Thermal Probe** | DS18B20 | Waterproof 1-Wire | Stator housing temperature monitoring |
| **Test Motor** | Generic | 0.5 HP, 3-Phase, 4-Pole, 1440 RPM | Physical plant for fault data generation |
| **VFD** | Delta MS300 | Single-Phase Input | Motor speed control and protection |

**Total Budget**: ₹20,850 (~$250 USD)

---

## 📡 MQTT Topics

All data is published to the following topics:

```
digitaltwin/motor/sensors/imu        # MPU-6050 accelerometer + gyroscope
digitaltwin/motor/sensors/power      # PZEM-004T voltage, current, power
digitaltwin/motor/sensors/thermal    # DS18B20 temperature
digitaltwin/motor/fault/prediction   # CNN model classification output
digitaltwin/motor/status             # Motor runtime status
```

### Example Payloads

**IMU Data:**
```json
{
  "timestamp": "2025-01-27T12:00:00",
  "accelerometer": {
    "x": 2.45,
    "y": -1.23,
    "z": 10.15,
    "unit": "m/s²"
  },
  "gyroscope": {
    "x": 8.32,
    "y": -3.12,
    "z": 1.45,
    "unit": "°/s"
  },
  "sample_rate_hz": 100
}
```

**Fault Prediction:**
```json
{
  "timestamp": "2025-01-27T12:00:00",
  "model": "CNN",
  "classes": 4,
  "predicted_class": "InnerRace",
  "confidence": 85.2,
  "probabilities": {
    "Normal": 10.0,
    "InnerRace": 85.0,
    "Ball": 2.0,
    "OuterRace": 3.0
  }
}
```

---

## 🎨 Features

### Current Features (Demo Ready)
- ✅ Real-time MQTT data streaming
- ✅ Mock sensor data generator with realistic fault patterns
- ✅ Live sensor visualization (vibration, power, temperature)
- ✅ CNN-based fault classification with confidence scores
- ✅ Responsive web dashboard
- ✅ Connection status monitoring
- ✅ Historical data charts (60-second window)

### Upcoming Features (When Hardware Arrives)
- 🔄 Unity WebGL 3D motor visualization
- 🔄 Real Raspberry Pi sensor integration
- 🔄 Historical data logging (InfluxDB)
- 🔄 Alert system for fault detection
- 🔄 Mobile app (React Native)
- 🔄 Multi-motor monitoring

---

## 🧪 Testing Without Hardware

The mock simulator generates realistic sensor data:

1. **Normal Operation** (0-60s): Low vibration, stable power consumption
2. **Inner Race Fault** (60-120s): Increased vibration at 5.4× harmonic
3. **Ball Fault** (120-180s): Moderate vibration at 2.3× harmonic
4. **Outer Race Fault** (180-240s): High vibration at 3.6× harmonic

Each fault pattern affects:
- Vibration amplitude and frequency content
- Power consumption (increased current draw)
- Temperature (increased heat generation)
- ML model confidence (gradually increases over time)

---

## 🔧 Integrating Real Hardware

### Raspberry Pi Setup

1. **Install Raspbian OS** on your Pi 4
2. **Connect sensors:**
   - MPU-6050 → I²C (GPIO 2/3)
   - PZEM-004T → UART (GPIO 14/15)
   - DS18B20 → 1-Wire (GPIO 4)

3. **Install dependencies:**
```bash
sudo apt update
sudo apt install python3-pip i2c-tools
pip3 install paho-mqtt smbus RPi.GPIO --break-system-packages
```

4. **Replace mock data with real sensor code:**
```python
# Instead of generate_imu_data(), read from MPU-6050:
import smbus
bus = smbus.SMBus(1)
MPU6050_ADDR = 0x68

def read_imu():
    # Read accelerometer registers
    accel_x = read_word_2c(bus, MPU6050_ADDR, 0x3B)
    # ... (implement MPU-6050 protocol)
    return {"accelerometer": {...}, "gyroscope": {...}}
```

5. **Update MQTT broker** to your own (see mqtt-config/MQTT_SETUP.md)

---

## 🌐 Unity WebGL Integration

To embed your Unity motor simulation:

1. **Export Unity Project as WebGL:**
   - In Unity: File → Build Settings → WebGL → Build
   - Name the build folder "unity-build"

2. **Place build in web dashboard:**
```bash
cp -r /path/to/unity-build web-dashboard/public/unity/
```

3. **Update UnityViewer.jsx:**
```jsx
// Uncomment the iframe in UnityViewer.jsx
<iframe 
  src="/unity/index.html" 
  title="Motor Digital Twin"
  style={{ width: '100%', height: '100%', border: 'none' }}
  allow="autoplay; fullscreen"
/>
```

4. **Add MQTT plugin to Unity** (optional):
   - Install [M2MqttUnity](https://github.com/gpvigano/M2MqttUnity)
   - Subscribe to `digitaltwin/motor/fault/prediction` topic
   - Animate motor based on fault type

---

## 📈 Performance Considerations

### Simulator
- **Data Rate**: 1 Hz (adjustable via `sample_rate` parameter)
- **CPU Usage**: ~5% on modern systems
- **Network**: ~1 KB/s MQTT traffic

### Web Dashboard
- **Update Rate**: Real-time (as fast as MQTT messages arrive)
- **Memory**: ~50 MB for 60-second data window
- **Recommended**: Chrome/Edge for best performance

### Production Recommendations
- Use dedicated MQTT broker (not public)
- Implement TLS/SSL encryption
- Add authentication and access control
- Use time-series database for historical data (InfluxDB)
- Deploy dashboard on cloud (Vercel, Netlify, AWS)

---

## 🐛 Troubleshooting

### Simulator Issues

**"paho-mqtt not installed"**
```bash
pip install paho-mqtt
```

**"Connection refused"**
- Check internet connection
- Try alternative broker: `test.mosquitto.org`
- Check firewall settings

### Dashboard Issues

**"npm install fails"**
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**"MQTT connection fails"**
- Check browser console for errors
- Verify WebSocket connection (wss://broker.hivemq.com:8884/mqtt)
- Try opening in incognito mode (disable extensions)

**"No data appearing"**
- Ensure simulator is running
- Check MQTT topics match exactly
- Open browser DevTools → Network tab → WS to inspect WebSocket messages

---

## 📚 Additional Resources

- **MQTT Setup Guide**: `mqtt-config/MQTT_SETUP.md`
- **CWRU Bearing Dataset**: https://engineering.case.edu/bearingdatacenter
- **Unity WebGL Documentation**: https://docs.unity3d.com/Manual/webgl-building.html
- **React Recharts**: https://recharts.org/
- **MQTT Protocol**: https://mqtt.org/

---

## 🤝 Contributing

This is a thesis project, but suggestions are welcome:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## 📄 License

This project is for educational and research purposes.

---

## 👨‍🎓 Author

**Digital Twin Thesis Project**  
Department of Mechanical/Electrical Engineering  
Focus: Predictive Maintenance using IoT and Machine Learning

---

## 🎯 Next Steps

1. ✅ Run the mock simulator
2. ✅ Test the web dashboard
3. 🔄 Integrate real Raspberry Pi hardware
4. 🔄 Add Unity 3D visualization
5. 🔄 Deploy to production
6. 🔄 Collect real fault data
7. 🔄 Train improved ML models

---

**Status**: Ready for demonstration and hardware integration  
**Last Updated**: January 2026
