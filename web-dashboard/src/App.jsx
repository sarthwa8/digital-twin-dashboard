import React, { useState, useEffect } from "react";
import mqtt from "mqtt";
import Header from "./components/Header";
import ConnectionStatus from "./components/ConnectionStatus";
import FaultDetector from "./components/FaultDetector";
import SensorGrid from "./components/SensorGrid";
import UnityViewer from "./components/UnityViewer";
import "./App.css";

// ------------------------------------------------------------------
// 🔒 FIREWALL BYPASS CONFIGURATION (HiveMQ Cloud)
// ------------------------------------------------------------------
// 1. Cluster URL (Keep 'wss://' and ':443/mqtt')
const CLUSTER_URL =
  "wss://custom-mqtt-broker-production.up.railway.app:443/mqtt";
// ------------------------------------------------------------------

const TOPICS = {
  imu: "digitaltwin/motor/sensors/imu",
  power: "digitaltwin/motor/sensors/power",
  thermal: "digitaltwin/motor/sensors/thermal",
  fault: "digitaltwin/motor/fault/prediction",
  status: "digitaltwin/motor/status",
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
    console.log("Connecting to HiveMQ Cloud (Secure)...");

    // ✅ Updated Connection Logic (Secure Port 443)
    const client = mqtt.connect(CLUSTER_URL, {
      clientId: `dashboard-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      username: MQTT_USERNAME, // Required for Cloud
      password: MQTT_PASSWORD, // Required for Cloud
    });

    client.on("connect", () => {
      console.log("✅ Connected to HiveMQ Cloud");
      setConnected(true);

      Object.values(TOPICS).forEach((topic) => {
        client.subscribe(topic);
      });
    });

    client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());

        if (topic === TOPICS.imu) {
          setSensorData((prev) => ({ ...prev, imu: data }));
          setDataHistory((prev) => ({
            ...prev,
            imu: [...prev.imu.slice(-59), data].slice(-60),
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
        console.error("Error parsing MQTT message:", error);
      }
    });

    client.on("error", (error) => {
      console.error("MQTT error:", error);
      setConnected(false);
    });

    client.on("close", () => {
      setConnected(false);
    });

    setMqttClient(client);

    return () => {
      if (client) client.end();
    };
  }, []);

  return (
    <div className="app">
      {/* ✅ KEEPS YOUR CYBERPUNK SCANLINES */}
      <div className="scanline-effect"></div>

      <Header />

      <div className="app-container">
        <ConnectionStatus connected={connected} status={sensorData.status} />

        <div className="main-content">
          <div className="left-column">
            <UnityViewer
              faultData={sensorData.fault}
              statusData={sensorData.status}
            />
            <FaultDetector faultData={sensorData.fault} />
          </div>

          <div className="right-column">
            <SensorGrid sensorData={sensorData} dataHistory={dataHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
