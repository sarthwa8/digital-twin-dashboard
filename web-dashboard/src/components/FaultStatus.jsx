import "./FaultStatus.css"

const FAULT_COLORS = {
  Normal:     "#22c55e",
  Ball:       "#f59e0b",
  OuterRace:  "#f97316",
  InnerRace:  "#ef4444",
}

function getFaultColor(faultClass) {
  return FAULT_COLORS[faultClass] ?? "#8b8fa8"
}

function isAlert(faultClass) {
  return faultClass && faultClass !== "Normal" && faultClass !== "Offline" && faultClass !== "Initialising"
}

export default function FaultStatus({ faultClass, confidence }) {
  const color = getFaultColor(faultClass)
  const alert = isAlert(faultClass)
  const pct = confidence != null ? Math.round(confidence * 100) : 0

  return (
    <div className={`fault-status-card ${alert ? "fault-alert" : ""}`}>
      <div className="fault-label">FAULT STATUS</div>
      <div className="fault-class-row">
        <span className="fault-dot" style={{ background: color }} />
        <span className="fault-class-text" style={{ color }}>{faultClass || "Offline"}</span>
      </div>
      <div className="fault-confidence">{pct}% confidence</div>
    </div>
  )
}
