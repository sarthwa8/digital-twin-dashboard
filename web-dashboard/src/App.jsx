import { useTelemetry } from "./hooks/useTelemetry"
import { useCommand }   from "./hooks/useCommand"
import Header           from "./components/Header"
import FaultStatus      from "./components/FaultStatus"
import ConfidenceGauge  from "./components/ConfidenceGauge"
import SensorGrid       from "./components/SensorGrid"
import TelemetryChart   from "./components/TelemetryChart"
import ControlPanel     from "./components/ControlPanel"
import UnityViewer      from "./components/UnityViewer"
import "./App.css"

function App() {
  const { telemetry, history }                    = useTelemetry(1000)
  const { sendCommand, pending, lastAck, sending } = useCommand(1000)

  return (
    <div className="app">
      <Header online={telemetry.online} vfdTemp={telemetry.vfd_temp} />
      <main className="app-main">

        {/* Row 1 — Fault status + confidence */}
        <div className="top-row">
          <FaultStatus faultClass={telemetry.fault_class} confidence={telemetry.confidence} />
          <ConfidenceGauge value={telemetry.confidence} />
        </div>

        {/* Row 2 — 6 sensor tiles */}
        <SensorGrid telemetry={telemetry} />

        {/* Row 3 — Chart + Control panel side by side */}
        <div className="mid-row">
          <TelemetryChart history={history} />
          <ControlPanel
            telemetry={telemetry}
            sendCommand={sendCommand}
            pending={pending}
            lastAck={lastAck}
            sending={sending}
          />
        </div>

        {/* Row 4 — 3D viewer */}
        <UnityViewer
          faultData={telemetry.fault_class !== "Offline" ? { predicted_class: telemetry.fault_class } : null}
          statusData={{ running: telemetry.motor_running }}
        />

      </main>
    </div>
  )
}

export default App
