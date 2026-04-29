import "./ConfidenceGauge.css"

const R = 80
const STROKE = 12
const CX = 100
const CY = 100
const CIRCUMFERENCE = Math.PI * R  // half circle arc length

function arcColor(value) {
  // 0 → red, 0.5 → amber, 1 → green
  if (value <= 0.5) {
    const t = value * 2
    const r = Math.round(239 + (245 - 239) * t)
    const g = Math.round(68 + (158 - 68) * t)
    const b = Math.round(68 + (11 - 68) * t)
    return `rgb(${r},${g},${b})`
  }
  const t = (value - 0.5) * 2
  const r = Math.round(245 + (34 - 245) * t)
  const g = Math.round(158 + (197 - 158) * t)
  const b = Math.round(11 + (94 - 11) * t)
  return `rgb(${r},${g},${b})`
}

export default function ConfidenceGauge({ value = 0 }) {
  const clamped = Math.min(Math.max(value, 0), 1)
  const dashOffset = CIRCUMFERENCE * (1 - clamped)
  const color = arcColor(clamped)
  const pct = Math.round(clamped * 100)

  return (
    <div className="gauge-card">
      <div className="gauge-label">MODEL CONFIDENCE</div>
      <div className="gauge-wrapper">
        <svg viewBox="0 0 200 110" className="gauge-svg">
          {/* Track arc */}
          <path
            d={`M ${CX - R},${CY} A ${R},${R} 0 0,1 ${CX + R},${CY}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M ${CX - R},${CY} A ${R},${R} 0 0,1 ${CX + R},${CY}`}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="gauge-arc"
          />
        </svg>
        <div className="gauge-value" style={{ color }}>
          {pct}<span className="gauge-unit">%</span>
        </div>
      </div>
    </div>
  )
}
