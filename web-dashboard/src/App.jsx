import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';
import FaultDetector from './components/FaultDetector';
import SensorGrid from './components/SensorGrid';
import UnityViewer from './components/UnityViewer';
import './App.css';

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const TOPICS = {
  imu: 'digitaltwin/motor/sensors/imu',
  power: 'digitaltwin/motor/sensors/power',
  thermal: 'digitaltwin/motor/sensors/thermal',
  fault: 'digitaltwin/motor/fault/prediction',
  status: 'digitaltwin/motor/status',
};

function App() {
  const [mqttClient, setMqttClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState({
    imu: null,
    power: null,
    thermal: null,
    fault: null,
    status: null,
  });
  const [dataHistory, setDataHistory] = useState({
    imu: [],
    power: [],
    thermal: [],
  });

  useEffect(() => {
    // Connect to MQTT broker
    console.log('Connecting to MQTT broker...');
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `dashboard-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnected(true);
      
      // Subscribe to all topics
      Object.values(TOPICS).forEach((topic) => {
        client.subscribe(topic, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err);
          } else {
            console.log(`Subscribed to ${topic}`);
          }
        });
      });
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Update sensor data based on topic
        if (topic === TOPICS.imu) {
          setSensorData((prev) => ({ ...prev, imu: data }));
          setDataHistory((prev) => ({
            ...prev,
            imu: [...prev.imu.slice(-59), data].slice(-60), // Keep last 60 data points
          }));
        } else if (topic === TOPICS.power) {
          setSensorData((prev) => ({ ...prev, power: data }));
          setDataHistory((prev) => ({
            ...prev,
            power: [...prev.power.slice(-59), data].slice(-60),
          }));
        } else if (topic === TOPICS.thermal) {
          setSensorData((prev) => ({ ...prev, thermal: data }));
          setDataHistory((prev) => ({
            ...prev,
            thermal: [...prev.thermal.slice(-59), data].slice(-60),
          }));
        } else if (topic === TOPICS.fault) {
          setSensorData((prev) => ({ ...prev, fault: data }));
        } else if (topic === TOPICS.status) {
          setSensorData((prev) => ({ ...prev, status: data }));
        }
      } catch (error) {
        console.error('Error parsing MQTT message:', error);
      }
    });

    client.on('error', (error) => {
      console.error('MQTT error:', error);
      setConnected(false);
    });

    client.on('close', () => {
      console.log('MQTT connection closed');
      setConnected(false);
    });

    setMqttClient(client);

    // Cleanup on unmount
    return () => {
      if (client) {
        client.end();
      }
    };
  }, []);

  return (
    <div className="app">
      {/* Scanline Effect */}
      <div className="scanline-effect"></div>
      
      <Header />
      
      <div className="app-container">
        <ConnectionStatus connected={connected} status={sensorData.status} />
        
        <div className="main-content">
          {/* Left column - Unity viewer and fault detection */}
          <div className="left-column">
            <UnityViewer 
              faultData={sensorData.fault}
              statusData={sensorData.status}
            />
            <FaultDetector faultData={sensorData.fault} />
          </div>

          {/* Right column - Sensor data */}
          <div className="right-column">
            <SensorGrid 
              sensorData={sensorData}
              dataHistory={dataHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
