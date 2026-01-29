"""
Digital Twin Motor Sensor Simulator
Generates realistic sensor data for MPU-6050, PZEM-004T, and DS18B20
Simulates 4 fault conditions: Normal, InnerRace, Ball, OuterRace
"""

import json
import time
import random
import math
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
    def __init__(self, mqtt_broker="broker.hivemq.com", mqtt_port=1883):
        """
        Initialize the motor sensor simulator
        
        Args:
            mqtt_broker: MQTT broker address (default: free HiveMQ public broker)
            mqtt_port: MQTT broker port (default: 1883)
        """
        self.broker = mqtt_broker
        self.port = mqtt_port
        self.client_id = f"motor-simulator-{random.randint(0, 1000)}"
        
        # MQTT Topics
        self.topics = {
            "imu": "digitaltwin/motor/sensors/imu",
            "power": "digitaltwin/motor/sensors/power",
            "thermal": "digitaltwin/motor/sensors/thermal",
            "fault": "digitaltwin/motor/fault/prediction",
            "status": "digitaltwin/motor/status"
        }
        
        # Simulation parameters
        self.current_fault = FaultType.NORMAL
        self.simulation_time = 0
        self.motor_rpm = 1440  # Base RPM
        self.running = False
        
        # Fault simulation phase tracking
        self.fault_phases = [
            (FaultType.NORMAL, 60),      # 60 seconds normal
            (FaultType.INNER_RACE, 60),  # 60 seconds inner race fault
            (FaultType.BALL, 60),        # 60 seconds ball fault
            (FaultType.OUTER_RACE, 60),  # 60 seconds outer race fault
        ]
        self.current_phase_index = 0
        self.phase_start_time = 0
        
        # Initialize MQTT client
        if MQTT_AVAILABLE:
            self.client = mqtt.Client(client_id=self.client_id)
            self.client.on_connect = self.on_connect
            self.client.on_disconnect = self.on_disconnect
        else:
            self.client = None
    
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"✅ Connected to MQTT Broker: {self.broker}")
            # Publish initial status
            self.publish_status("Connected")
        else:
            print(f"❌ Failed to connect, return code {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        print(f"⚠️  Disconnected from MQTT Broker")
    
    def connect_mqtt(self):
        """Connect to MQTT broker"""
        if not MQTT_AVAILABLE or self.client is None:
            print("❌ MQTT not available. Running in offline mode.")
            return False
        
        try:
            print(f"🔌 Connecting to {self.broker}:{self.port}...")
            self.client.connect(self.broker, self.port, keepalive=60)
            self.client.loop_start()
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def disconnect_mqtt(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.publish_status("Disconnected")
            self.client.loop_stop()
            self.client.disconnect()
    
    def publish(self, topic, payload):
        """Publish message to MQTT topic"""
        if self.client and MQTT_AVAILABLE:
            try:
                result = self.client.publish(topic, json.dumps(payload))
                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    print(f"⚠️  Failed to publish to {topic}")
            except Exception as e:
                print(f"❌ Publish error: {e}")
        else:
            # Offline mode - just print
            print(f"📤 [{topic}] {json.dumps(payload, indent=2)}")
    
    def publish_status(self, status):
        """Publish motor status"""
        payload = {
            "timestamp": datetime.now().isoformat(),
            "status": status,
            "rpm": self.motor_rpm,
            "running": self.running,
            "current_fault": self.current_fault.value
        }
        self.publish(self.topics["status"], payload)
    
    def generate_imu_data(self):
        """
        Generate MPU-6050 IMU data (accelerometer + gyroscope)
        Frequency characteristics vary by fault type
        """
        base_freq = self.motor_rpm / 60.0  # Convert RPM to Hz
        
        # Fault-specific vibration patterns
        fault_characteristics = {
            FaultType.NORMAL: {
                "accel_amplitude": 0.5,
                "gyro_amplitude": 2.0,
                "noise_level": 0.1,
                "harmonics": [1.0]  # Only fundamental frequency
            },
            FaultType.INNER_RACE: {
                "accel_amplitude": 2.5,
                "gyro_amplitude": 8.0,
                "noise_level": 0.4,
                "harmonics": [1.0, 5.4, 10.8]  # Inner race fault frequencies
            },
            FaultType.BALL: {
                "accel_amplitude": 1.8,
                "gyro_amplitude": 6.0,
                "noise_level": 0.3,
                "harmonics": [1.0, 2.3, 4.6]  # Ball fault frequencies
            },
            FaultType.OUTER_RACE: {
                "accel_amplitude": 3.0,
                "gyro_amplitude": 9.0,
                "noise_level": 0.5,
                "harmonics": [1.0, 3.6, 7.2]  # Outer race fault frequencies
            }
        }
        
        char = fault_characteristics[self.current_fault]
        
        # Generate vibration with harmonics
        accel_x = 0
        accel_y = 0
        accel_z = 9.81  # Gravity
        
        for harmonic in char["harmonics"]:
            freq = base_freq * harmonic
            phase = 2 * math.pi * freq * self.simulation_time
            accel_x += char["accel_amplitude"] * math.sin(phase) / len(char["harmonics"])
            accel_y += char["accel_amplitude"] * math.cos(phase) / len(char["harmonics"])
            accel_z += char["accel_amplitude"] * math.sin(phase + math.pi/4) / len(char["harmonics"])
        
        # Add noise
        accel_x += random.gauss(0, char["noise_level"])
        accel_y += random.gauss(0, char["noise_level"])
        accel_z += random.gauss(0, char["noise_level"])
        
        # Gyroscope (angular velocity)
        gyro_x = char["gyro_amplitude"] * math.sin(2 * math.pi * base_freq * self.simulation_time)
        gyro_y = char["gyro_amplitude"] * math.cos(2 * math.pi * base_freq * self.simulation_time)
        gyro_z = char["gyro_amplitude"] * math.sin(2 * math.pi * base_freq * self.simulation_time + math.pi/2)
        
        gyro_x += random.gauss(0, char["noise_level"] * 2)
        gyro_y += random.gauss(0, char["noise_level"] * 2)
        gyro_z += random.gauss(0, char["noise_level"] * 2)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "accelerometer": {
                "x": round(accel_x, 3),
                "y": round(accel_y, 3),
                "z": round(accel_z, 3),
                "unit": "m/s²"
            },
            "gyroscope": {
                "x": round(gyro_x, 3),
                "y": round(gyro_y, 3),
                "z": round(gyro_z, 3),
                "unit": "°/s"
            },
            "sample_rate_hz": 100
        }
    
    def generate_power_data(self):
        """
        Generate PZEM-004T power analyzer data
        Current and power increase with fault severity
        """
        base_voltage = 230  # Volts (single phase)
        base_current = 2.0  # Amperes at normal condition
        
        # Fault increases current draw due to increased friction/imbalance
        fault_multipliers = {
            FaultType.NORMAL: 1.0,
            FaultType.INNER_RACE: 1.15,
            FaultType.BALL: 1.10,
            FaultType.OUTER_RACE: 1.20
        }
        
        multiplier = fault_multipliers[self.current_fault]
        
        # Add some variation
        voltage = base_voltage + random.gauss(0, 2)
        current = base_current * multiplier + random.gauss(0, 0.1)
        power = voltage * current * 0.85  # Power factor ~0.85
        power_factor = 0.85 + random.gauss(0, 0.02)
        
        # Calculate apparent power and reactive power
        apparent_power = voltage * current
        reactive_power = math.sqrt(apparent_power**2 - power**2)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "voltage": round(voltage, 2),
            "current": round(current, 3),
            "power": round(power, 2),
            "apparent_power": round(apparent_power, 2),
            "reactive_power": round(reactive_power, 2),
            "power_factor": round(power_factor, 3),
            "frequency": round(50 + random.gauss(0, 0.1), 2),
            "units": {
                "voltage": "V",
                "current": "A",
                "power": "W",
                "frequency": "Hz"
            }
        }
    
    def generate_thermal_data(self):
        """
        Generate DS18B20 thermal probe data
        Temperature increases with fault severity
        """
        ambient_temp = 25  # Celsius
        base_operating_temp = 45  # Normal operating temperature
        
        # Fault increases heat generation
        fault_temp_increase = {
            FaultType.NORMAL: 0,
            FaultType.INNER_RACE: 8,
            FaultType.BALL: 5,
            FaultType.OUTER_RACE: 12
        }
        
        temp_increase = fault_temp_increase[self.current_fault]
        
        # Temperature rises gradually with time
        time_factor = min(self.simulation_time / 300, 1.0)  # Reaches steady state in 5 min
        current_temp = ambient_temp + (base_operating_temp - ambient_temp + temp_increase) * time_factor
        
        # Add noise
        current_temp += random.gauss(0, 0.5)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "temperature": round(current_temp, 2),
            "unit": "°C",
            "location": "Stator Housing"
        }
    
    def generate_fault_prediction(self):
        """
        Generate CNN fault classification predictions
        Simulates the output from your trained model
        """
        # Confidence increases over time as more data is collected
        time_factor = min(self.simulation_time / 30, 1.0)  # Full confidence after 30 seconds
        
        # Base probabilities for each fault type
        probabilities = {
            FaultType.NORMAL: 0.25,
            FaultType.INNER_RACE: 0.25,
            FaultType.BALL: 0.25,
            FaultType.OUTER_RACE: 0.25
        }
        
        # Increase probability of current fault
        probabilities[self.current_fault] = 0.70 + (0.15 * time_factor)
        
        # Distribute remaining probability
        remaining = 1.0 - probabilities[self.current_fault]
        other_faults = [f for f in FaultType if f != self.current_fault]
        for fault in other_faults:
            probabilities[fault] = remaining / len(other_faults)
        
        # Add some noise
        for fault in FaultType:
            probabilities[fault] += random.gauss(0, 0.02)
        
        # Normalize
        total = sum(probabilities.values())
        probabilities = {k: v/total for k, v in probabilities.items()}
        
        # Convert to percentage and round
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
        """Update the current fault phase based on time"""
        elapsed = self.simulation_time - self.phase_start_time
        current_phase_duration = self.fault_phases[self.current_phase_index][1]
        
        if elapsed >= current_phase_duration:
            # Move to next phase
            self.current_phase_index = (self.current_phase_index + 1) % len(self.fault_phases)
            self.current_fault = self.fault_phases[self.current_phase_index][0]
            self.phase_start_time = self.simulation_time
            
            print(f"\n🔄 Phase Change: {self.current_fault.value} (Duration: {self.fault_phases[self.current_phase_index][1]}s)")
            print(f"{'='*60}")
    
    def run_simulation(self, duration=240, sample_rate=1.0):
        """
        Run the sensor simulation
        
        Args:
            duration: Total simulation time in seconds (default: 240s = 4 minutes)
            sample_rate: Data publishing rate in Hz (default: 1 Hz)
        """
        print(f"\n{'='*60}")
        print("🚀 Starting Digital Twin Motor Sensor Simulation")
        print(f"{'='*60}")
        print(f"Duration: {'INFINITE' if duration == float('inf') else duration}s | Sample Rate: {sample_rate} Hz")
        print(f"Fault Cycle: {' → '.join([f.value for f, _ in self.fault_phases])}")
        print(f"{'='*60}\n")
        
        # Connect to MQTT
        connected = self.connect_mqtt()
        if not connected:
            print("⚠️  Running in offline mode (output to console only)")
        
        self.running = True
        self.simulation_time = 0
        self.phase_start_time = 0
        self.current_phase_index = 0
        self.current_fault = self.fault_phases[0][0]
        
        time.sleep(2)  # Wait for connection to stabilize
        
        try:
            interval = 1.0 / sample_rate
            start_time = time.time()
            
            # Loop runs as long as time is less than duration (which is now infinity)
            while self.simulation_time < duration:
                loop_start = time.time()
                
                # Update fault phase
                self.update_fault_phase()
                
                # Generate and publish sensor data
                imu_data = self.generate_imu_data()
                power_data = self.generate_power_data()
                thermal_data = self.generate_thermal_data()
                fault_data = self.generate_fault_prediction()
                
                self.publish(self.topics["imu"], imu_data)
                self.publish(self.topics["power"], power_data)
                self.publish(self.topics["thermal"], thermal_data)
                self.publish(self.topics["fault"], fault_data)
                
                # Console output
                elapsed_phase = self.simulation_time - self.phase_start_time
                phase_duration = self.fault_phases[self.current_phase_index][1]
                progress = (elapsed_phase / phase_duration) * 100
                
                print(f"[{self.simulation_time:04.0f}s] "
                      f"{self.current_fault.value:12s} | "
                      f"Temp: {thermal_data['temperature']:5.1f}°C | "
                      f"Current: {power_data['current']:5.2f}A | "
                      f"Vibration: {abs(imu_data['accelerometer']['x']):5.2f} m/s² | "
                      f"Confidence: {fault_data['confidence']:5.1f}% | "
                      f"Progress: {progress:3.0f}%")
                
                # Update simulation time
                self.simulation_time += interval
                
                # Sleep to maintain sample rate
                elapsed = time.time() - loop_start
                sleep_time = max(0, interval - elapsed)
                time.sleep(sleep_time)
                
        except KeyboardInterrupt:
            print("\n\n⏸️  Simulation stopped by user")
            # Re-raise so the outer loop knows to stop on Ctrl+C
            raise KeyboardInterrupt 
        finally:
            self.running = False
            print(f"\n{'='*60}")
            print("✅ Simulation Ended (for this session)")
            print(f"{'='*60}\n")
            
            if connected:
                self.disconnect_mqtt()


def main():
    """Main entry point"""
    # Configuration
    MQTT_BROKER = "broker.hivemq.com"  # Free public broker
    MQTT_PORT = 1883
    
    # === CHANGED: Duration is now infinite for always-on deployment ===
    SIMULATION_DURATION = float('inf') 
    SAMPLE_RATE = 1.0  # 1 Hz (1 sample per second)
    
    # === CHANGED: Added Outer Retry Loop ===
    # This ensures that if the script crashes (e.g. MQTT connection loss),
    # it automatically restarts itself after 5 seconds.
    while True:
        try:
            simulator = MotorSensorSimulator(mqtt_broker=MQTT_BROKER, mqtt_port=MQTT_PORT)
            simulator.run_simulation(duration=SIMULATION_DURATION, sample_rate=SAMPLE_RATE)
        except KeyboardInterrupt:
            # Allow manual stop via Ctrl+C without restarting
            print("🛑 Manual Stop Detected. Exiting...")
            break
        except Exception as e:
            print(f"❌ CRASH DETECTED: {e}")
            print("🔄 Restarting simulation in 5 seconds...")
            time.sleep(5)


if __name__ == "__main__":
    main()