import SensorTile from "./SensorTile"
import "./SensorGrid.css"

function tempColor(v) {
  if (v > 45) return "#ef4444"
  if (v > 40) return "#f59e0b"
  return undefined
}

function vibColor(v) {
  if (v > 0.5) return "#ef4444"
  if (v >= 0.1) return "#f59e0b"
  return "#22c55e"
}

export default function SensorGrid({ telemetry }) {
  const { speed, voltage, current, power_w, temperature, vibration } = telemetry

  return (
    <div className="sensor-grid">
      <SensorTile label="Speed"       value={speed.toFixed(1)}        unit="RPM" />
      <SensorTile label="Voltage"     value={voltage.toFixed(1)}      unit="V" />
      <SensorTile label="Current"     value={current.toFixed(1)}      unit="A" />
      <SensorTile label="Power"       value={power_w.toFixed(1)}      unit="W" />
      <SensorTile label="Temperature" value={temperature.toFixed(1)}  unit="°C"  color={tempColor(temperature)} />
      <SensorTile label="Vibration"   value={vibration.toFixed(4)}    unit="g"   color={vibColor(vibration)} />
    </div>
  )
}
