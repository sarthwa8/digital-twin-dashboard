import "./SensorTile.css"

export default function SensorTile({ label, value, unit, color }) {
  return (
    <div className="sensor-tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value" style={color ? { color } : undefined}>{value}</span>
      <span className="tile-unit">{unit}</span>
    </div>
  )
}
