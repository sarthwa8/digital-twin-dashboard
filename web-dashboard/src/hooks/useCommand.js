import { useState, useEffect, useRef, useCallback } from "react"

export function useCommand(pollMs = 1000) {
  const [lastAck, setLastAck]     = useState(null)
  const [pending, setPending]     = useState(null)
  const [sending, setSending]     = useState(false)
  const intervalRef               = useRef(null)

  // Poll /api/command to keep lastAck fresh
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch("/api/command")
        const data = await res.json()
        setLastAck(data.lastAck)
        setPending(data.pending)
      } catch (_) {}
    }
    poll()
    intervalRef.current = setInterval(poll, pollMs)
    return () => clearInterval(intervalRef.current)
  }, [pollMs])

  const sendCommand = useCallback(async (command, value = null) => {
    setSending(true)
    try {
      const res  = await fetch("/api/command", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ command, value }),
      })
      const data = await res.json()
      setPending(data.pending)
    } catch (_) {}
    setSending(false)
  }, [])

  return { sendCommand, pending, lastAck, sending }
}
