import { useState, useEffect, useRef } from "react"

const DEFAULT_STATE = {
  speed: 0,
  current: 0,
  temperature: 0,
  vibration: 0,
  voltage: 0,
  power_w: 0,
  fault_class: "Offline",
  confidence: 0,
  vib_peak: 0,
  freq_hz: 0,
  vfd_temp: 0,
  online: false,
  timestamp: null,
}

export function useTelemetry(intervalMs = 1000, historyLength = 60) {
  const [telemetry, setTelemetry] = useState(DEFAULT_STATE)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/telemetry")
        const data = await res.json()
        setTelemetry(data)
        setError(null)
        if (data.online) {
          setHistory(prev => [
            ...prev.slice(-(historyLength - 1)),
            {
              t: Date.now(),
              speed: data.speed,
              current: data.current,
              temperature: data.temperature,
              vibration: data.vibration,
            },
          ])
        }
      } catch (e) {
        setError(e.message)
        setTelemetry(prev => ({ ...prev, online: false }))
      }
    }
    poll()
    intervalRef.current = setInterval(poll, intervalMs)
    return () => clearInterval(intervalRef.current)
  }, [intervalMs, historyLength])

  return { telemetry, history, error }
}
