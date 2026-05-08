# Digital Twin Motor Dashboard

Real-time monitoring and control dashboard for the NPL Motor Digital Twin system.

**Live:** https://digital-twin-dashboard-psi.vercel.app

---

## Overview

The dashboard receives live motor telemetry from a Raspberry Pi every second, displays bearing fault classification results, and sends motor control commands back to the Pi. State is stored in Vercel KV — no external database required.

**Stack:** React 18 · Vercel Serverless Functions · Vercel KV

---

## Panels

| Panel | Description |
|---|---|
| Fault Status | Colour-coded fault display — green (Normal), amber (Ball), orange (Outer Race), red (Inner Race) |
| Confidence Gauge | Arc gauge 0–100% showing model confidence |
| Sensor Grid | Voltage, Current, Speed, Temperature, Vibration, Power |
| Live Chart | 60-second scrolling window — temperature, current, speed |
| Motor Control | Start, Stop, E-Stop, speed input (RPM) |
| Connection Status | LIVE / OFFLINE — goes offline if no data received for 5+ seconds |
| Last Ack | Last command acknowledged by the Pi and its result |

---

## API

### `POST /api/telemetry`
Called by the Pi every second to push sensor data.

```json
{
  "speed": 1380.0,
  "current": 1.2,
  "voltage": 230.0,
  "power_w": 478.5,
  "temperature": 27.3,
  "vibration": 0.029,
  "fault_class": "Normal",
  "confidence": 0.94
}
```

| Field | Unit | Notes |
|---|---|---|
| `speed` | RPM | VFD frequency × 27.6 (measured slip ratio) |
| `current` | A | VFD output current |
| `voltage` | V | VFD output voltage |
| `power_w` | VA | Apparent power — V × I × 1.732 |
| `temperature` | °C | DS18B20 motor casing reading |
| `vibration` | g | MPU-6050 RMS over 2048-sample window |
| `fault_class` | — | `Normal` · `Ball` · `InnerRace` · `OuterRace` · `Initialising` · `Unknown` |
| `confidence` | 0.0–1.0 | Stacked ensemble score |

---

### `GET /api/telemetry`
Polled by the dashboard every second. Returns the latest telemetry plus a `last_updated` timestamp in milliseconds. If `Date.now() - last_updated > 5000`, the dashboard shows OFFLINE.

---

### `POST /api/command`

**Issue a command** (called by dashboard):
```json
{ "command": "set_speed", "value": { "rpm": 1200 } }
```

**Acknowledge a command** (called by Pi after execution):
```json
{ "ack": true, "command": "set_speed", "value": { "rpm": 1200 }, "result": "ok" }
```

The `ack` field distinguishes the two. Acknowledgment clears `pending` and updates `lastAck`.

**Supported commands:**

| Command | Value | Effect |
|---|---|---|
| `start` | `null` | Motor runs forward |
| `stop` | `null` | Motor stops |
| `e_stop` | `null` | Emergency stop — frequency set to 0 before stopping |
| `set_speed` | `{ "rpm": 1200 }` | Changes motor speed |
| `set_mode` | `{ "mode": "manual" \| "auto" }` | Sets operation mode flag |

Pending commands expire after **10 seconds** if not acknowledged.

---

### `GET /api/command`
Polled by the Pi every second.

```json
{
  "pending": { "command": "start", "value": null, "issued_at": 1714000000000 },
  "lastAck": { "command": "stop", "value": null, "result": "ok", "acked_at": 1713999990000 }
}
```

`pending` is `null` when the queue is empty.

---

## Command Flow

```
Dashboard  ──POST /api/command──►  Vercel KV  ◄──GET /api/command──  Pi
                                      │                                │
                                 pending = cmd                    executes on VFD
                                      │                                │
                                      └──────────◄──POST ack──────────┘
                                   pending = null
                                   lastAck updated
```

Round-trip time: **under 2 seconds** on a normal network.

---

## Local Development

```bash
npm install
cp .env.example .env.local   # add Vercel KV credentials
npm run dev                  # runs at http://localhost:3000
```

**Test without the Pi:**
```bash
# Push fake telemetry
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"speed":1380,"current":1.2,"temperature":27.5,"vibration":0.031,"voltage":230,"power_w":478.5,"fault_class":"Normal","confidence":0.94}'

# Issue a command
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command":"start","value":null}'

# Check state
curl http://localhost:3000/api/command
```

---

## Deployment

Deploys automatically to Vercel on push to `main`.

Required environment variables (auto-provisioned with Vercel KV):

```
KV_URL
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
```

---

## Related

- **Pi control script:** `control_panel.py` — pushes telemetry, polls and executes commands
- **Inference server:** FastAPI on lab PC — classifies fault from vibration window, returns `fault_class` and `confidence` to the Pi
