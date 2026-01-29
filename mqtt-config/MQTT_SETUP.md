# MQTT Configuration Guide

## Quick Start with Free Public Broker

### Option 1: HiveMQ Public Broker (Default)
- **Broker:** `broker.hivemq.com`
- **Port:** `1883` (MQTT), `8000` (WebSocket)
- **WebSocket URL:** `wss://broker.hivemq.com:8884/mqtt`
- **Security:** None (public, unencrypted)
- **Best for:** Testing and development

### Option 2: Eclipse Mosquitto Public Broker
- **Broker:** `test.mosquitto.org`
- **Port:** `1883` (MQTT), `8080` (WebSocket)
- **WebSocket URL:** `ws://test.mosquitto.org:8080`
- **Security:** None (public, unencrypted)

---

## MQTT Topic Structure

```
digitaltwin/
├── motor/
│   ├── sensors/
│   │   ├── imu           # MPU-6050 accelerometer + gyroscope
│   │   ├── power         # PZEM-004T voltage, current, power
│   │   └── thermal       # DS18B20 temperature
│   ├── fault/
│   │   └── prediction    # CNN model output
│   └── status            # Motor runtime status
```

---

## For Production: Set Up Your Own Broker

### Option A: HiveMQ Cloud (Free Tier)

1. **Sign up:** https://console.hivemq.cloud/
2. **Create cluster** (Free plan: 100 connections, 10 GB/month)
3. **Get credentials:**
   - Broker URL (e.g., `abc123.s1.eu.hivemq.cloud`)
   - Port: `8883` (TLS)
   - Username & Password
4. **Update simulator:**
   ```python
   simulator = MotorSensorSimulator(
       mqtt_broker="abc123.s1.eu.hivemq.cloud",
       mqtt_port=8883,
       use_tls=True,
       username="your_username",
       password="your_password"
   )
   ```

### Option B: AWS IoT Core

1. **Create Thing** in AWS IoT Console
2. **Download certificates** (device cert, private key, root CA)
3. **Get endpoint** (e.g., `abc123-ats.iot.us-east-1.amazonaws.com`)
4. **Use MQTT over TLS** with certificate authentication

### Option C: Self-Hosted Mosquitto

**On a Cloud VM (AWS EC2, DigitalOcean, etc.):**

```bash
# Install Mosquitto
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Configure Mosquitto
sudo nano /etc/mosquitto/mosquitto.conf
```

**Basic Configuration:**
```conf
# Listener for MQTT
listener 1883
protocol mqtt

# Listener for WebSocket (for web dashboard)
listener 9001
protocol websockets

# Allow anonymous (for testing - disable in production)
allow_anonymous true
```

**Restart Mosquitto:**
```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

**Open firewall ports:**
```bash
sudo ufw allow 1883/tcp
sudo ufw allow 9001/tcp
```

---

## Security Best Practices

### For Development
- ✅ Use public brokers (HiveMQ, Mosquitto)
- ✅ No authentication needed
- ⚠️ Data is public - don't send sensitive info

### For Production
- ✅ Use private broker with TLS/SSL
- ✅ Enable authentication (username/password or certificates)
- ✅ Use access control lists (ACLs) to restrict topics
- ✅ Enable encryption (port 8883 for MQTTS)
- ❌ Never use public brokers
- ❌ Never send credentials in plain text

---

## Testing MQTT Connection

### Using mosquitto_sub (Command Line)

**Install client tools:**
```bash
# Ubuntu/Debian
sudo apt install mosquitto-clients

# macOS
brew install mosquitto

# Windows
# Download from https://mosquitto.org/download/
```

**Subscribe to all topics:**
```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -t "digitaltwin/#" -v
```

**Subscribe to specific sensor:**
```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -t "digitaltwin/motor/sensors/imu"
```

### Using MQTT Explorer (GUI)

1. **Download:** https://mqtt-explorer.com/
2. **Connect:**
   - Host: `broker.hivemq.com`
   - Port: `1883`
   - Protocol: `mqtt://`
3. **Subscribe to:** `digitaltwin/#`
4. **Visualize** real-time data in tree view

---

## Raspberry Pi Configuration

When you get your Raspberry Pi, use the same MQTT topics:

**Install dependencies:**
```bash
sudo apt update
sudo apt install python3-pip
pip3 install paho-mqtt --break-system-packages
```

**Replace mock data with real sensors:**
```python
# Instead of generate_imu_data():
import smbus
mpu = smbus.SMBus(1)
# Read actual MPU-6050 data...

# Publish to same topics:
client.publish("digitaltwin/motor/sensors/imu", real_data)
```

---

## WebSocket Connection for Web Dashboard

Most MQTT brokers support WebSocket for browser connections:

**HiveMQ:**
```javascript
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt')
```

**Self-hosted Mosquitto:**
```javascript
const client = mqtt.connect('ws://your-server-ip:9001')
```

**AWS IoT Core:**
```javascript
// Requires AWS signature authentication
const client = mqtt.connect('wss://your-endpoint.amazonaws.com/mqtt')
```

---

## Troubleshooting

### "Connection Refused"
- ✅ Check broker address and port
- ✅ Verify firewall rules
- ✅ Ensure broker is running

### "No messages received"
- ✅ Verify topic names match exactly
- ✅ Check QoS levels (use QoS 0 for testing)
- ✅ Monitor broker logs

### "Disconnects frequently"
- ✅ Increase keepalive interval
- ✅ Check network stability
- ✅ Verify broker connection limits

---

## Next Steps

1. ✅ Run the Python simulator: `python motor_sensor_simulator.py`
2. ✅ Test with MQTT Explorer or mosquitto_sub
3. ✅ Deploy web dashboard (connects via WebSocket)
4. ✅ Replace with real Raspberry Pi sensors when hardware arrives
