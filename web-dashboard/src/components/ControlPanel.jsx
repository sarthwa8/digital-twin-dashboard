import { useState } from "react"
import "./ControlPanel.css"

const MODE_LABELS = { manual: "MANUAL", auto: "AUTO" }

const AUTO_ACTION_LABELS = {
  reduced_speed_70pct:  "Auto: speed → 70% (Ball fault)",
  reduced_speed_50pct:  "Auto: speed → 50% (OuterRace fault)",
  emergency_stop:       "Auto: E-STOP triggered (InnerRace fault)",
  fault_locked:         "Auto: locked — sustained high-confidence fault",
  cleared:              "Auto: fault cleared, normal operation resumed",
}

export default function ControlPanel({ telemetry, sendCommand, pending, lastAck, sending }) {
  const [targetRpm, setTargetRpm] = useState(1380)

  const { motor_running = false, mode = "manual", auto_action = null } = telemetry

  const busy = sending || !!pending

  function handleModeToggle() {
    const next = mode === "manual" ? "auto" : "manual"
    sendCommand("set_mode", { mode: next })
  }

  return (
    <div className="control-panel">
      <div className="cp-header">
        <span className="cp-title">MOTOR CONTROL</span>
        <button
          className={`mode-toggle ${mode === "auto" ? "mode-auto" : "mode-manual"}`}
          onClick={handleModeToggle}
          disabled={busy}
        >
          {MODE_LABELS[mode] ?? mode}
        </button>
      </div>

      {/* Auto action banner */}
      {auto_action && (
        <div className="auto-banner">
          ⚡ {AUTO_ACTION_LABELS[auto_action] ?? auto_action}
        </div>
      )}

      <div className="cp-body">
        {/* Start / Stop */}
        <div className="cp-row">
          <button
            className={`cp-btn btn-start ${motor_running ? "active" : ""}`}
            disabled={busy || motor_running || mode === "auto"}
            onClick={() => sendCommand("start")}
          >
            ▶ START
          </button>
          <button
            className={`cp-btn btn-stop ${!motor_running ? "active" : ""}`}
            disabled={busy || !motor_running || mode === "auto"}
            onClick={() => sendCommand("stop")}
          >
            ■ STOP
          </button>
          <button
            className="cp-btn btn-estop"
            disabled={busy}
            onClick={() => sendCommand("e_stop")}
          >
            ⚠ E-STOP
          </button>
        </div>

        {/* Speed control */}
        <div className="cp-speed">
          <div className="cp-speed-header">
            <span className="cp-label">TARGET SPEED</span>
            <span className="cp-speed-value">{targetRpm} RPM</span>
          </div>
          <input
            type="range"
            min={0}
            max={1500}
            step={10}
            value={targetRpm}
            disabled={mode === "auto"}
            onChange={e => setTargetRpm(Number(e.target.value))}
            className="speed-slider"
          />
          <div className="cp-speed-labels">
            <span>0</span><span>750</span><span>1500</span>
          </div>
          <button
            className="cp-btn btn-set-speed"
            disabled={busy || mode === "auto"}
            onClick={() => sendCommand("set_speed", { rpm: targetRpm })}
          >
            SET SPEED
          </button>
        </div>

        {/* Status row */}
        <div className="cp-status-row">
          <div className="cp-status-item">
            <span className="cp-label">MOTOR</span>
            <span className={`cp-status-val ${motor_running ? "val-green" : "val-gray"}`}>
              {motor_running ? "RUNNING" : "STOPPED"}
            </span>
          </div>
          <div className="cp-status-item">
            <span className="cp-label">LAST ACK</span>
            <span className="cp-status-val val-gray">
              {lastAck ? lastAck.command.toUpperCase() : "—"}
            </span>
          </div>
          <div className="cp-status-item">
            <span className="cp-label">PENDING</span>
            <span className={`cp-status-val ${pending ? "val-amber" : "val-gray"}`}>
              {pending ? pending.command.toUpperCase() : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
