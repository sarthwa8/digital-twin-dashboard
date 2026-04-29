let latest = {
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
  timestamp: null,
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()

  if (req.method === "POST") {
    latest = { ...req.body, timestamp: Date.now() }
    return res.status(200).json({ ok: true })
  }

  if (req.method === "GET") {
    const age = latest.timestamp ? Date.now() - latest.timestamp : Infinity
    return res.status(200).json({ ...latest, online: age < 10000 })
  }

  return res.status(405).json({ error: "Method not allowed" })
}
