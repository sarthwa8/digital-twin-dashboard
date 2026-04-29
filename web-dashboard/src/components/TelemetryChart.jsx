import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import "./TelemetryChart.css"

const LINES = [
  { key: "temperature", label: "Temp (°C)",    color: "#ef4444" },
  { key: "current",     label: "Current (A)",  color: "#4f8ef7" },
  { key: "speed",       label: "Speed (RPM)",  color: "#22c55e", yAxisId: "right" },
]

function formatTime(t) {
  const d = new Date(t)
  return `${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}`
}

export default function TelemetryChart({ history }) {
  if (history.length < 2) {
    return (
      <div className="chart-card chart-empty">
        <span className="chart-title">LIVE TELEMETRY</span>
        <span className="chart-waiting">Waiting for data…</span>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <span className="chart-title">LIVE TELEMETRY — 60s WINDOW</span>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis
            dataKey="t"
            tickFormatter={formatTime}
            stroke="#8b8fa8"
            tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            stroke="#8b8fa8"
            tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#22c55e"
            tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1d27",
              border: "1px solid #2a2d3a",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "JetBrains Mono",
            }}
            labelFormatter={formatTime}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", fontFamily: "JetBrains Mono", color: "#8b8fa8" }}
          />
          {LINES.map(({ key, label, color, yAxisId = "left" }) => (
            <Line
              key={key}
              yAxisId={yAxisId}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
