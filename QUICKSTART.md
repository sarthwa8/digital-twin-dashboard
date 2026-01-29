# 🚀 Quick Start Guide

Get your Digital Twin Dashboard running in 5 minutes!

## ⚡ Fastest Start

### 1️⃣ Python Simulator (Terminal 1)

```bash
cd mock-sensors
pip install -r requirements.txt
python motor_sensor_simulator.py
```

You should see:
```
✅ Connected to MQTT Broker: broker.hivemq.com
🚀 Starting Digital Twin Motor Sensor Simulation
...
[0000s] Normal      | Temp:  25.2°C | Current:  2.01A | ...
```

### 2️⃣ Web Dashboard (Terminal 2)

```bash
cd web-dashboard
npm install
npm run dev
```

Open browser: **http://localhost:3000**

---

## 📱 What You'll See

1. **Connection Status** - Green ✅ when MQTT connected
2. **3D Motor View** - Placeholder (replace with your Unity build)
3. **Fault Detector** - Real-time CNN predictions
4. **Sensor Charts** - Live vibration, power, temperature data

---

## 🎬 Demo Flow

The simulator automatically cycles through faults every 60 seconds:

| Time | Fault Type | What to Watch |
|------|------------|---------------|
| 0-60s | **Normal** | Low vibration, green indicators |
| 60-120s | **InnerRace** | Increased vibration, orange warning |
| 120-180s | **Ball** | Medium vibration, yellow warning |
| 180-240s | **OuterRace** | High vibration, red alert |

Watch the dashboard as:
- ✅ Confidence increases from ~25% → 85%
- ✅ Temperature rises with faults
- ✅ Current draw increases
- ✅ Vibration patterns change

---

## 🐛 Troubleshooting

### "Connection Refused" in simulator
- **Fix**: Check internet connection
- **Alternative**: Use `test.mosquitto.org` broker

### "npm install fails"
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### No data in dashboard
1. Check simulator is running
2. Check browser console (F12) for errors
3. Refresh page

---

## 📚 Next Steps

1. ✅ **See it working** - Run both scripts, view in browser
2. 📖 **Read README.md** - Full documentation
3. 🔧 **Hardware Setup** - See RASPBERRY_PI_SETUP.md (when components arrive)
4. 🎮 **Unity Integration** - See UNITY_INTEGRATION.md
5. 🌐 **MQTT Config** - See mqtt-config/MQTT_SETUP.md

---

## 💡 Quick Tips

**Change simulation speed:**
```python
# In motor_sensor_simulator.py
simulator.run_simulation(duration=240, sample_rate=2.0)  # 2 Hz instead of 1 Hz
```

**Skip to specific fault:**
```python
# Modify fault_phases list to start at desired fault
self.fault_phases = [
    (FaultType.INNER_RACE, 120),  # Start directly at InnerRace
]
```

**Test with MQTT Explorer:**
1. Download from https://mqtt-explorer.com/
2. Connect to `broker.hivemq.com`
3. Subscribe to `digitaltwin/#`
4. See all messages visually

---

**Need Help?** Check the comprehensive README.md for detailed guides!

**Status**: ✅ Ready to Demo  
**Hardware Required**: ❌ None (works with mock data)  
**Internet Required**: ✅ Yes (for MQTT broker)
