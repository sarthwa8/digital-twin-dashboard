// Single pending command + last ack — resets on cold start (acceptable for live control)
let pending = null   // { command, value, issued_at }
let lastAck  = null  // { command, value, result, acked_at }

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()

  // Dashboard issues a command
  if (req.method === "POST" && !req.body.ack) {
    const { command, value } = req.body
    if (!command) return res.status(400).json({ error: "command required" })
    pending = { command, value: value ?? null, issued_at: Date.now() }
    return res.status(200).json({ ok: true, pending })
  }

  // Pi acknowledges a command was executed
  if (req.method === "POST" && req.body.ack) {
    const { command, value, result } = req.body
    lastAck  = { command, value, result: result ?? "ok", acked_at: Date.now() }
    pending  = null   // clear the queue
    return res.status(200).json({ ok: true, lastAck })
  }

  // Pi polls for pending commands (GET)
  if (req.method === "GET") {
    // Expire commands older than 10s so stale commands don't fire
    if (pending && Date.now() - pending.issued_at > 10000) pending = null
    return res.status(200).json({ pending, lastAck })
  }

  return res.status(405).json({ error: "Method not allowed" })
}
