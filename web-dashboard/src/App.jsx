import { useTelemetry } from "./hooks/useTelemetry"
import Header from "./components/Header"
import FaultStatus from "./components/FaultStatus"
import ConfidenceGauge from "./components/ConfidenceGauge"
import SensorGrid from "./components/SensorGrid"
import UnityViewer from "./components/UnityViewer"
import "./App.css"

function App() {
  const { telemetry } = useTelemetry(1000)

  return (
    <div className="app">
      <Header online={telemetry.online} vfdTemp={telemetry.vfd_temp} />
      <main className="app-main">
        <div className="top-row">
          <FaultStatus faultClass={telemetry.fault_class} confidence={telemetry.confidence} />
          <ConfidenceGauge value={telemetry.confidence} />
        </div>
        <SensorGrid telemetry={telemetry} />
        <UnityViewer
          faultData={telemetry.fault_class !== "Offline" ? { predicted_class: telemetry.fault_class } : null}
          statusData={{ running: telemetry.online }}
        />
        <div className="chart-placeholder">
          <span>Chart — coming soon</span>
        </div>
      </main>
    </div>
  )
}

export default App
