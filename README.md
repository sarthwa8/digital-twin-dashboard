# Real-Time Digital Twin System for Motor Fault Detection

A complete bidirectional digital twin for a 0.5 HP three-phase induction motor, built during an internship at **National Physical Laboratory (CSIR), New Delhi**. The system fuses vibration, thermal, and electrical sensor data in real time, classifies bearing faults using a stacked deep learning ensemble, and enables remote motor control from a cloud dashboard.

![Status](https://img.shields.io/badge/Status-Live%20%26%20Tested-brightgreen)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Accuracy](https://img.shields.io/badge/Fault%20Classification-97.1%25-success)
![License](https://img.shields.io/badge/License-Research-lightgrey)

---

## What This System Does

- **Reads live sensor data** from a real running motor — vibration (MPU-6050 at 1 kHz), temperature (DS18B20), and electrical parameters (VFD Modbus RS-485)
- **Classifies bearing faults** in real time using a stacked ensemble of four deep learning models (CNN, LSTM, Transformer, Hybrid) achieving **97.1% accuracy** on the CWRU dataset
- **Streams telemetry** to a cloud dashboard every second via HTTPS
- **Accepts remote commands** from the dashboard — start, stop, e-stop, set speed, set mode — with under 2-second round-trip response
- **Logs all data** to CSV for offline analysis and future model training

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NPL Lab Network                       │
│                                                          │
│  ┌─────────────────┐          ┌──────────────────────┐  │
│  │  Raspberry Pi 4 │◄────────►│   Inference Server   │  │
│  │                 │  LAN     │   (Lab PC)           │  │
│  │  MPU-6050       │  HTTP    │   FastAPI :8000      │  │
│  │  DS18B20        │  :8000   │   4× ONNX models     │  │
│  │  RS-485 / VFD   │          │   Stacked ensemble   │  │
│  └────────┬────────┘          └──────────────────────┘  │
│           │ HTTPS :443                                   │
└───────────┼─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│                   Vercel Cloud                          │
│                                                          │
│   POST /api/telemetry   ◄──── Pi pushes every second   │
│   GET  /api/telemetry   ────► Dashboard polls every 1s  │
│   POST /api/command     ◄──── Dashboard sends commands  │
│   GET  /api/command     ────► Pi polls every second     │
│   Vercel KV             ──── Stores state               │
└─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│              React Dashboard (Vercel)                   │
│   Fault Status · Confidence Gauge · Sensor Grid        │
│   Motor Control Panel · Offline Detection              │
└─────────────────────────────────────────────────────────┘
```

> **Why HTTPS and not MQTT?** The NPL lab firewall blocks MQTT ports 1883 and 8083. Port 443 is always open. All telemetry and commands route over HTTPS — no network configuration changes required.

---

## Hardware

| Component | Model | Purpose |
|---|---|---|
| Edge controller | Raspberry Pi 4 (4GB) | Sensor reading, inference calls, VFD control |
| Motor | Havells 0.5HP, 3-phase, 4-pole, 1380 RPM | Physical test subject |
| VFD | Delta VFD-007EL21W-1 (220V single-phase in) | Speed and direction control |
| Vibration sensor | MPU-6050 GY-521 (I2C, ±8g) | Bearing vibration at 1 kHz |
| Temperature sensor | DS18B20 waterproof (1-Wire) | Motor casing temperature |
| Load rig | Custom rope brake dynamometer + dual SAMSO scales | Controlled mechanical loading + torque measurement |
| RS-485 adapter | USB to RS-485 converter | Modbus RTU communication with VFD |
| Thermal camera | FLIR TG165-X | Thermal validation of DS18B20 readings |

### Load Rig

A custom rope brake dynamometer was fabricated for this project — welded steel frame, belt around the motor shaft pulley, and two SAMSO electronic hanging scales measuring tight-side (T1) and slack-side (T2) tension.

```
Torque (N·m) = (T1 − T2) × r
```

This gives actual measured shaft torque rather than an electrical estimate, and produces realistic vibration signatures under load.

---

## Fault Detection Model

### Dataset
CWRU (Case Western Reserve University) Bearing Dataset — drive-end, 12 kHz, fault sizes 0.007 / 0.014 / 0.021 inches, load conditions 0–3 HP.

**Anti-leakage measures:**
- `MAX_SEGS_PER_FILE = 200` — prevents segments from the same recording appearing in both train and test
- `GroupKFold` cross-validation — all segments from the same file stay within the same fold

### Feature Extraction Pipeline

```
2048-sample window
    → Resample 1 kHz → 12 kHz
    → High-pass filter at 100 Hz
    → STFT (NPERSEG=512, NOVERLAP=384)
    → Hilbert envelope + envelope spectrum
    → (17, 769) feature matrix
```

### Models and Results

| Model | OOF Accuracy | F1 Score |
|---|---|---|
| CNN | 66.85% | 0.609 |
| LSTM | 69.60% | 0.658 |
| Transformer | 69.65% | 0.660 |
| Hybrid CNN-LSTM | 82.20% | 0.785 |
| **Stacked Ensemble** | **97.10%** | **0.971** |

The stacked ensemble uses all four models' 16 probability outputs as features for a `LogisticRegression` meta-learner trained on out-of-fold predictions. All models are exported as ONNX and served via FastAPI.

> Note: Fold 3 models are deployed as they produced the best validation metrics. The OOF accuracy of 97.1% is the more conservative estimate computed across all five folds.

---

## Software

### Raspberry Pi — `control_panel.py`

Three parallel daemon threads:

| Thread | Function |
|---|---|
| MPU-6050 sampler | 1 kHz sampling, 2048-sample sliding buffer, auto-calibration at startup, RMS + peak calculation |
| Telemetry publisher | Fire-and-forget HTTP POST to Vercel `/api/telemetry` every second, 3s timeout |
| Command poller | GET `/api/command` every second, execute on VFD, POST acknowledgment back |

**Terminal commands:** `run`, `rev`, `stop`, `set <hz>`, `monitor`, `thermlog <label> <hz>`, `exit`

**Monitor mode** — streams live telemetry every second, accepts inline commands, logs to `motor_delta_log.csv`.

### Telemetry Payload

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

> `power_w` is three-phase apparent power (V × I × 1.732) — an approximation of true active power. True power = apparent power × power factor (typically 0.70–0.85 for an induction motor under load).

### VFD Register Map (Modbus RS-485, 9600 baud, Slave ID 1)

| Register | Value | Scaling |
|---|---|---|
| 0x2103 | Output frequency | ÷ 100 = Hz |
| 0x2104 | Output current | ÷ 10 = A |
| 0x2108 | DC bus voltage | ÷ 10 = V |
| 0x2109 | Output voltage | ÷ 10 = V |
| 0x210B | VFD internal temp | raw °C |

### Bidirectional Control — Command Reference

| Command | Value | Effect |
|---|---|---|
| `start` | null | Motor runs forward |
| `stop` | null | Motor stops |
| `e_stop` | null | Emergency stop — sets frequency to 0 before stopping |
| `set_speed` | `{ "rpm": 1200 }` | Changes motor speed |
| `set_mode` | `{ "mode": "manual" \| "auto" }` | Sets operation mode flag |

After executing, Pi POSTs `{ "ack": true, "command": "...", "result": "ok" }` back to `/api/command`, clearing the pending queue.

### Inference Server — `inference_server.py`

FastAPI + Uvicorn on port 8000. Receives 2048-sample vibration windows from the Pi over LAN.

**Endpoints:**
- `GET /health` — status check
- `POST /predict` — returns fault class, confidence, and class probabilities
- `POST /predict/debug` — verbose output including per-model predictions

**Artifacts** (in `./dt_model_artifacts/`):
```
cnn_model.onnx          5.4 MB
lstm_model.onnx         10.1 MB
transformer_model.onnx  4.4 MB
hybrid_model.onnx       19.9 MB
meta_learner.pkl        LogisticRegression stacking meta-learner
feature_config.json     Preprocessing parameters
```

### Dashboard

React app deployed at `https://digital-twin-dashboard-psi.vercel.app`

**Panels:**
- **Fault Status** — colour-coded: green (Normal), amber (Ball), orange (Outer Race), red (Inner Race)
- **Confidence Gauge** — arc gauge 0–100%, red → amber → green
- **Sensor Grid** — voltage, current, RPM, temperature, vibration (g), power (VA)
- **Connection Status** — goes offline if no data for 5+ seconds
- **Motor Control** — Start, Stop, E-Stop, speed input (RPM)

---

## Live Readings (Normal Operation, 50 Hz, 5 kg Load)

| Parameter | Typical | Range |
|---|---|---|
| Output Voltage | 230 V | 225–232 V |
| Output Current | 1.3 A | 1.1–1.6 A |
| Motor Speed | 1380 RPM | 1350–1400 RPM |
| Vibration RMS | 0.029 g | 0.020–0.045 g |
| Vibration Peak | 0.11 g | 0.08–0.18 g |
| Motor Temperature | 25–28 °C | Rises after 15+ min |
| Power (apparent) | 520 VA | 438–630 VA |
| VFD Internal Temp | 70 °C | 55–92 °C |
| Fault Class | Normal | 91–98% confidence |

---

## Setup

### Raspberry Pi

```bash
# Install dependencies
pip install pymodbus smbus2 paho-mqtt --break-system-packages

# Enable 1-Wire (DS18B20)
# Add to /boot/config.txt: dtoverlay=w1-gpio

# Run
python3 control_panel.py
```

### Inference Server (Lab PC)

```bash
cd "Inference Server"
pip install fastapi uvicorn onnxruntime scipy numpy

# Start server
uvicorn inference_server:app --host 0.0.0.0 --port 8000
```

### Dashboard

```bash
cd web-dashboard
npm install
npm run dev        # local dev
# or deploy to Vercel
```

---

## File Reference

| File | Location | Purpose |
|---|---|---|
| `control_panel.py` | Pi `~/` | Main motor control + sensors + inference + telemetry |
| `vfd_diagnostic.py` | Pi `~/` | VFD register diagnostic tool |
| `inference_server.py` | PC `Downloads/Inference Server/` | FastAPI fault classification server |
| `dt_model_artifacts/` | PC `Downloads/Inference Server/` | ONNX models + meta-learner + config |
| `motor_delta_log.csv` | Pi `~/` | Running sensor + fault log |

---

## Future Work

- **Domain adaptation** — fine-tune classifier on real 1 kHz motor data, remove resampling dependency
- **Thermal ODE model** — predict time-to-overheat using DS18B20 + current
- **Meta health score** — single 0–100 index combining all sensor modalities
- **Autonomous threshold control** — auto-reduce speed or e-stop based on fault confidence and vibration thresholds
- **PZEM-004T integration** — true power quality measurements (power factor, harmonics)
- **Edge inference** — move ONNX models onto Raspberry Pi directly

---

## References

Key references for the fault detection methodology:

- CWRU Bearing Dataset: https://engineering.case.edu/bearingdatacenter
- Hendriks et al. (2022) — data leakage in CWRU benchmarks: https://doi.org/10.1016/j.ymssp.2021.108732
- Grieves (2014) — Digital Twin concept whitepaper
- Fuller et al. (2020) — Digital Twin enabling technologies, IEEE Access

---

## Author

**Sarthak Vijay Sukhral**
B.Tech ECE, Punjab Engineering College, Chandigarh
Internship at National Physical Laboratory (CSIR), New Delhi
Under guidance of Dr. Paramita Guha, Senior Scientist
January – May 2026
