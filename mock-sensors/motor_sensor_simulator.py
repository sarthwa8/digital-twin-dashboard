"""
Digital Twin Motor Sensor Simulator (Firewall Bypass Edition)
Generates realistic sensor data for MPU-6050, PZEM-004T, and DS18B20
Simulates 4 fault conditions: Normal, InnerRace, Ball, OuterRace

UPDATED: Uses Railway Custom Broker (WebSockets on Port 443) to bypass firewalls.
"""

import json
import time
import random
import math
import ssl
from datetime import datetime
from enum import Enum

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    print("⚠️  paho-mqtt not installed. Install with: pip install paho-mqtt")

class FaultType(Enum):
    NORMAL = "Normal"
    INNER_RACE = "InnerRace"
    BALL = "Ball"
    OUTER_RACE = "OuterRace"

class MotorSensorSimulator:
    def __init__(self, mqtt_broker, mqtt_port, username=None, password=None):
        self.broker = mqtt_broker
        self.port = mqtt_port
        self.username = username
        self.password = password
        self.client_id = f"motor-simulator-{random.randint(0, 1000)}"
        
        self.topics = {
            "imu": "digitaltwin/motor/sensors/imu",
            "power": "digitaltwin/motor/sensors/power",
            "thermal": "digitaltwin/motor/sensors/thermal",
            "fault": "digitaltwin/motor/fault/prediction",
            "status": "digitaltwin/motor/status"
        }
        
        self.current_fault = FaultType.NORMAL
        self.simulation_time = 0
        self.motor_rpm = 1440
        self.running = False
        
        self.fault_phases = [
            (FaultType.NORMAL, 60),
            (FaultType.INNER_RACE, 60),
            (FaultType.BALL, 60),
            (FaultType.OUTER_RACE, 60),
        ]
        self.current_phase_index = 0
        self.phase_start_time = 0
        
        if MQTT_AVAILABLE:
            # ✅ CRITICAL FIX: Force 'websockets' transport INSIDE the class
            self.client = mqtt.Client(
                client_id=self.client_id,
                transport="websockets"  # <--- This is the key to port 443
            )
            
            # ✅ Enable TLS for Railway (Port 443 requirement)
            self.client.tls_set(cert_reqs=ssl.CERT_NONE)
            
            # ✅ Set correct path for Mosquitto on Railway
            self.client.ws_set_options(path="/mqtt") 
            
            if self.username and self.password:
                self.client.username_pw_set(self.username, self.password)
                
            self.client.on_connect = self.on_connect
            self.client.on_disconnect = self.on_disconnect
        else:
            self.client = None
    
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"✅ Connected to Railway Broker: {self.broker}")
            self.publish_status("Connected")
        else:
            print(f"❌ Failed to connect, return code {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        print(f"⚠️  Disconnected from MQTT Broker")
    
    def connect_mqtt(self):
        if not MQTT_AVAILABLE or self.client is None:
            print("❌ MQTT not available. Running in offline mode.")
            return False
        
        try:
            print(f"🔐 Connecting to {self.broker}:{self.port} (WebSocket)...")
            self.client.connect(self.broker, self.port, keepalive=60)
            self.client.loop_start()
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def disconnect_mqtt(self):
        if self.client:
            self.publish_status("Disconnected")
            self.client.loop_stop()
            self.client.disconnect()
    
    def publish(self, topic, payload):
        if self.client and MQTT_AVAILABLE:
            try:
                result = self.client.publish(topic, json.dumps(payload))
                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    print(f"⚠️  Failed to publish to {topic}")
            except Exception as e:
                print(f"❌ Publish error: {e}")
        else:
            print(f"📤 [{topic}] {json.dumps(payload, indent=2)}")
    
    def publish_status(self, status):
        payload = {
            "timestamp": datetime.now().isoformat(),
            "status": status,
            "rpm": self.motor_rpm,
            "running": self.running,
            "current_fault": self.current_fault.value
        }
        self.publish(self.topics["status"], payload)
    
    def generate_imu_data(self):
        base_freq = self.motor_rpm / 60.0
        
        fault_characteristics = {
            FaultType.NORMAL: {
                "accel_amplitude": 0.5, "gyro_amplitude": 2.0, "noise_level": 0.1, "harmonics": [1.0]
            },
            FaultType.INNER_RACE: {
                "accel_amplitude": 2.5, "gyro_amplitude": 8.0, "noise_level": 0.4, "harmonics": [1.0, 5.4, 10.8]
            },
            FaultType.BALL: {
                "accel_amplitude": 1.8, "gyro_amplitude": 6.0, "noise_level": 0.3, "harmonics": [1.0, 2.3, 4.6]
            },
            FaultType.OUTER_RACE: {
                "accel_amplitude": 3.0, "gyro_amplitude": 9.0, "noise_level": 0.5, "harmonics": [1.0, 3.6, 7.2]
            }
        }
        
        char = fault_characteristics[self.current_fault]
        
        accel_x, accel_y, accel_z = 0, 0, 9.81
        
        for harmonic in char["harmonics"]:
            freq = base_freq * harmonic
            phase = 2 * math.pi * freq * self.simulation_time
            accel_x += char["accel_amplitude"] * math.sin(phase) / len(char["harmonics"])
            accel_y += char["accel_amplitude"] * math.cos(phase) / len(char["harmonics"])
            accel_z += char["accel_amplitude"] * math.sin(phase + math.pi/4) / len(char["harmonics"])
        
        accel_x += random.gauss(0, char["noise_level"])
        accel_y += random.gauss(0, char["noise_level"])
        accel_z += random.gauss(0, char["noise_level"])
        
        gyro_x = char["gyro_amplitude"] * math.sin(2 * math.pi * base_freq * self.simulation_time)
        gyro_y = char["gyro_amplitude"] * math.cos(2 * math.pi * base_freq * self.simulation_time)
        gyro_z = char["gyro_amplitude"] * math.sin(2 * math.pi * base_freq * self.simulation_time + math.pi/2)
        
        gyro_x += random.gauss(0, char["noise_level"] * 2)
        gyro_y += random.gauss(0, char["noise_level"] * 2)
        gyro_z += random.gauss(0, char["noise_level"] * 2)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "accelerometer": {"x": round(accel_x, 3), "y": round(accel_y, 3), "z": round(accel_z, 3), "unit": "m/s²"},
            "gyroscope": {"x": round(gyro_x, 3), "y": round(gyro_y, 3), "z": round(gyro_z, 3), "unit": "°/s"},
            "sample_rate_hz": 100
        }
    
    def generate_power_data(self):
        base_voltage = 230
        base_current = 2.0
        
        fault_multipliers = {
            FaultType.NORMAL: 1.0,
            FaultType.INNER_RACE: 1.15,
            FaultType.BALL: 1.10,
            FaultType.OUTER_RACE: 1.20
        }
        
        multiplier = fault_multipliers[self.current_fault]
        voltage = base_voltage + random.gauss(0, 2)
        current = base_current * multiplier + random.gauss(0, 0.1)
        power = voltage * current * 0.85
        power_factor = 0.85 + random.gauss(0, 0.02)
        apparent_power = voltage * current
        reactive_power = math.sqrt(abs(apparent_power**2 - power**2))
        
        return {
            "timestamp": datetime.now().isoformat(),
            "voltage": round(voltage, 2),
            "current": round(current, 3),
            "power": round(power, 2),
            "apparent_power": round(apparent_power, 2),
            "reactive_power": round(reactive_power, 2),
            "power_factor": round(power_factor, 3),
            "frequency": round(50 + random.gauss(0, 0.1), 2),
            "units": {"voltage": "V", "current": "A", "power": "W", "frequency": "Hz"}
        }
    
    def generate_thermal_data(self):
        ambient_temp = 25
        base_operating_temp = 45
        
        fault_temp_increase = {
            FaultType.NORMAL: 0,
            FaultType.INNER_RACE: 8,
            FaultType.BALL: 5,
            FaultType.OUTER_RACE: 12
        }
        
        temp_increase = fault_temp_increase[self.current_fault]
        time_factor = min(self.simulation_time / 300, 1.0)
        current_temp = ambient_temp + (base_operating_temp - ambient_temp + temp_increase) * time_factor
        current_temp += random.gauss(0, 0.5)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "temperature": round(current_temp, 2),
            "unit": "°C",
            "location": "Stator Housing"
        }
    
    def generate_fault_prediction(self):
        time_factor = min(self.simulation_time / 30, 1.0)
        
        probabilities = {
            FaultType.NORMAL: 0.25,
            FaultType.INNER_RACE: 0.25,
            FaultType.BALL: 0.25,
            FaultType.OUTER_RACE: 0.25
        }
        
        probabilities[self.current_fault] = 0.70 + (0.15 * time_factor)
        remaining = 1.0 - probabilities[self.current_fault]
        other_faults = [f for f in FaultType if f != self.current_fault]
        for fault in other_faults:
            probabilities[fault] = remaining / len(other_faults)
        
        for fault in FaultType:
            probabilities[fault] += random.gauss(0, 0.02)
        
        total = sum(probabilities.values())
        probabilities = {k: v/total for k, v in probabilities.items()}
        probabilities = {k.value: round(v * 100, 1) for k, v in probabilities.items()}
        
        predicted_class = self.current_fault.value
        confidence = probabilities[predicted_class]
        
        return {
            "timestamp": datetime.now().isoformat(),
            "model": "CNN",
            "classes": 4,
            "predicted_class": predicted_class,
            "confidence": confidence,
            "probabilities": probabilities,
            "threshold": 70.0
        }
    
    def update_fault_phase(self):
        elapsed = self.simulation_time - self.phase_start_time
        current_phase_duration = self.fault_phases[self.current_phase_index][1]
        
        if elapsed >= current_phase_duration:
            self.current_phase_index = (self.current_phase_index + 1) % len(self.fault_phases)
            self.current_fault = self.fault_phases[self.current_phase_index][0]
            self.phase_start_time = self.simulation_time
            print(f"\n🔄 Phase Change: {self.current_fault.value} (Duration: {self.fault_phases[self.current_phase_index][1]}s)")
            print(f"{'='*60}")
    
    def run_simulation(self, duration=240, sample_rate=1.0):
        print(f"\n{'='*60}")
        print("🚀 Starting Digital Twin Motor Sensor Simulation (Secure Cloud)")
        print(f"{'='*60}")
        print(f"Duration: {'INFINITE' if duration == float('inf') else duration}s | Sample Rate: {sample_rate} Hz")
        print(f"Fault Cycle: {' → '.join([f.value for f, _ in self.fault_phases])}")
        print(f"{'='*60}\n")
        
        connected = self.connect_mqtt()
        if not connected:
            print("⚠️  Running in offline mode (output to console only)")
        
        self.running = True
        self.simulation_time = 0
        self.phase_start_time = 0
        self.current_phase_index = 0
        self.current_fault = self.fault_phases[0][0]
        
        time.sleep(2)
        
        try:
            interval = 1.0 / sample_rate
            
            while self.simulation_time < duration:
                loop_start = time.time()
                self.update_fault_phase()
                
                imu_data = self.generate_imu_data()
                power_data = self.generate_power_data()
                thermal_data = self.generate_thermal_data()
                fault_data = self.generate_fault_prediction()
                
                self.publish(self.topics["imu"], imu_data)
                self.publish(self.topics["power"], power_data)
                self.publish(self.topics["thermal"], thermal_data)
                self.publish(self.topics["fault"], fault_data)
                
                elapsed_phase = self.simulation_time - self.phase_start_time
                phase_duration = self.fault_phases[self.current_phase_index][1]
                progress = (elapsed_phase / phase_duration) * 100
                
                print(f"[{self.simulation_time:04.0f}s] {self.current_fault.value:12s} | "
                      f"Temp: {thermal_data['temperature']:5.1f}°C | "
                      f"Current: {power_data['current']:5.2f}A | "
                      f"Vib: {abs(imu_data['accelerometer']['x']):5.2f} | "
                      f"Conf: {fault_data['confidence']:5.1f}%")
                
                self.simulation_time += interval
                elapsed = time.time() - loop_start
                sleep_time = max(0, interval - elapsed)
                time.sleep(sleep_time)
                
        except KeyboardInterrupt:
            print("\n\n⏸️  Simulation stopped by user")
            raise KeyboardInterrupt 
        finally:
            self.running = False
            if connected:
                self.disconnect_mqtt()

def main():
    # -------------------------------------------------------------
    # 🔒 FIREWALL BYPASS CONFIGURATION (Railway Backend)
    # -------------------------------------------------------------
    # 1. YOUR RAILWAY DOMAIN (Copy from your Dashboard)
    # Example: "mqtt-production-b67c.up.railway.app"
    MQTT_BROKER = "custom-mqtt-broker-production.up.railway.app" 
    
    # 2. Port 443 (Firewall Bypass)
    MQTT_PORT = 443
    # -------------------------------------------------------------
    
    SIMULATION_DURATION = float('inf') 
    SAMPLE_RATE = 1.0
    
    while True:
        try:
            simulator = MotorSensorSimulator(
                mqtt_broker=MQTT_BROKER, 
                mqtt_port=MQTT_PORT
            )
            simulator.run_simulation(duration=SIMULATION_DURATION, sample_rate=SAMPLE_RATE)
        except KeyboardInterrupt:
            print("🛑 Manual Stop Detected. Exiting...")
            break
        except Exception as e:
            print(f"❌ CRASH DETECTED: {e}")
            print("🔄 Restarting simulation in 5 seconds...")
            time.sleep(5)


if __name__ == "__main__":
    main()