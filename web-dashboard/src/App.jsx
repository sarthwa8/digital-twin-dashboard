import { useState, useEffect } from "react";
import mqtt from "mqtt";
import Header from "./components/Header";
import ConnectionStatus from "./components/ConnectionStatus";
import FaultDetector from "./components/FaultDetector";
import SensorGrid from "./components/SensorGrid";
import UnityViewer from "./components/UnityViewer";
import "./App.css";

const BROKER_URL = "wss://broker.emqx.io:8084/mqtt";
const TOPIC = "npl/motor/telemetry";

function App() {
  const [, setMqttClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState({
    speed: 0,
    current: 0,
    temperature: 0,
    vibration: 0,
  });
  const [dataHistory, setDataHistory] = useState([]);

  useEffect(() => {
    console.log(`Connecting to ${BROKER_URL}...`);

    const client = mqtt.connect(BROKER_URL, {
      clientId: `dashboard-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    client.on("connect", () => {
      console.log("✅ Connected to broker.emqx.io");
      setConnected(true);
      client.subscribe(TOPIC);
    });

    client.on("message", (_topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        setTelemetry(data);
        setDataHistory((prev) => [...prev.slice(-59), data]);
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
      <div className="scanline-effect"></div>
      <Header />
      <div className="app-container">
        <ConnectionStatus connected={connected} speed={telemetry.speed} />
        <div className="main-content">
          <div className="left-column">
            <UnityViewer />
            <FaultDetector faultData={null} />
          </div>
          <div className="right-column">
            <SensorGrid telemetry={telemetry} dataHistory={dataHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
