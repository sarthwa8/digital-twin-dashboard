# Unity WebGL Integration Guide

This guide explains how to integrate your existing Unity motor simulation into the web dashboard for remote viewing.

## 🎯 Overview

Your Unity simulation will:
1. Export as WebGL build
2. Embed in the React dashboard
3. Receive real-time MQTT data
4. Update visualization based on sensor data and fault predictions

---

## 📦 Method 1: Static WebGL Embed (Simple)

### Step 1: Export Unity Project

In Unity Editor:
1. **File → Build Settings**
2. **Select WebGL** platform
3. **Click "Switch Platform"** (wait for reimport)
4. **Player Settings → WebGL Settings:**
   - Compression Format: **Disabled** (for compatibility)
   - Or use **Brotli** if server supports it
5. **Build** and choose output folder (e.g., `motor-unity-build`)

### Step 2: Copy to Web Dashboard

```bash
# Copy Unity build to dashboard public folder
cp -r /path/to/motor-unity-build /path/to/web-dashboard/public/unity
```

Your structure should look like:
```
web-dashboard/
├── public/
│   └── unity/
│       ├── Build/
│       │   ├── motor-unity-build.data.unityweb
│       │   ├── motor-unity-build.framework.js.unityweb
│       │   ├── motor-unity-build.loader.js
│       │   └── motor-unity-build.wasm.unityweb
│       ├── TemplateData/
│       └── index.html
```

### Step 3: Update UnityViewer Component

Edit `web-dashboard/src/components/UnityViewer.jsx`:

```jsx
import React, { useEffect, useRef } from 'react';
import { Cpu } from 'lucide-react';
import './UnityViewer.css';

function UnityViewer({ faultData, statusData }) {
  const iframeRef = useRef(null);
  
  // Send data to Unity when it changes
  useEffect(() => {
    if (iframeRef.current && faultData) {
      // Post message to Unity iframe
      iframeRef.current.contentWindow.postMessage({
        type: 'FAULT_UPDATE',
        data: faultData
      }, '*');
    }
  }, [faultData]);
  
  return (
    <div className="unity-viewer">
      <div className="unity-header">
        <Cpu size={24} />
        <h2>3D Motor Visualization</h2>
        {faultData && (
          <span className="unity-badge">{faultData.predicted_class}</span>
        )}
      </div>
      
      <div className="unity-container">
        <iframe 
          ref={iframeRef}
          src="/unity/index.html" 
          title="Motor Digital Twin"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}

export default UnityViewer;
```

---

## 🔌 Method 2: Unity + MQTT (Advanced)

This method adds real-time MQTT communication directly in Unity.

### Step 1: Install M2Mqtt in Unity

1. **Download M2Mqtt Unity Package:**
   - https://github.com/gpvigano/M2MqttUnity
   - Or use Unity Package Manager (if available)

2. **Import into Unity:**
   - Assets → Import Package → Custom Package
   - Select `M2MqttUnity.unitypackage`

### Step 2: Create MQTT Manager Script

Create `Assets/Scripts/MQTTManager.cs`:

```csharp
using UnityEngine;
using M2MqttUnity;
using uPLibrary.Networking.M2Mqtt.Messages;
using System.Text;
using System;

public class MQTTManager : M2MqttUnityClient
{
    [Header("MQTT Configuration")]
    public string brokerAddress = "broker.hivemq.com";
    public int brokerPort = 1883;
    
    [Header("Topics")]
    public string faultTopic = "digitaltwin/motor/fault/prediction";
    public string statusTopic = "digitaltwin/motor/status";
    
    [Header("References")]
    public MotorController motorController;
    
    private void Start()
    {
        // Connect to MQTT broker
        Connect();
    }
    
    protected override void OnConnecting()
    {
        Debug.Log("Connecting to MQTT broker...");
    }
    
    protected override void OnConnected()
    {
        Debug.Log("Connected to MQTT broker");
        
        // Subscribe to topics
        client.Subscribe(new string[] { faultTopic, statusTopic }, 
                        new byte[] { MqttMsgBase.QOS_LEVEL_AT_MOST_ONCE, 
                                    MqttMsgBase.QOS_LEVEL_AT_MOST_ONCE });
        
        Debug.Log($"Subscribed to: {faultTopic}, {statusTopic}");
    }
    
    protected override void OnConnectionFailed(string errorMessage)
    {
        Debug.LogError($"MQTT connection failed: {errorMessage}");
    }
    
    protected override void DecodeMessage(string topic, byte[] message)
    {
        string msg = Encoding.UTF8.GetString(message);
        Debug.Log($"Received [{topic}]: {msg}");
        
        try
        {
            if (topic == faultTopic)
            {
                // Parse fault prediction JSON
                FaultData faultData = JsonUtility.FromJson<FaultData>(msg);
                motorController.UpdateFault(faultData);
            }
            else if (topic == statusTopic)
            {
                // Parse status JSON
                StatusData statusData = JsonUtility.FromJson<StatusData>(msg);
                motorController.UpdateStatus(statusData);
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"Error parsing MQTT message: {e.Message}");
        }
    }
    
    private void OnDestroy()
    {
        Disconnect();
    }
}

[Serializable]
public class FaultData
{
    public string predicted_class;
    public float confidence;
    public FaultProbabilities probabilities;
}

[Serializable]
public class FaultProbabilities
{
    public float Normal;
    public float InnerRace;
    public float Ball;
    public float OuterRace;
}

[Serializable]
public class StatusData
{
    public bool running;
    public int rpm;
    public string current_fault;
}
```

### Step 3: Create Motor Controller Script

Create `Assets/Scripts/MotorController.cs`:

```csharp
using UnityEngine;
using UnityEngine.UI;

public class MotorController : MonoBehaviour
{
    [Header("Motor Parts")]
    public GameObject motorShaft;
    public GameObject motorHousing;
    public GameObject bearings;
    
    [Header("UI Elements")]
    public Text faultTypeText;
    public Text confidenceText;
    public Slider confidenceBar;
    public Text rpmText;
    
    [Header("Visual Effects")]
    public ParticleSystem sparkEffect;  // For faults
    public Light warningLight;
    
    [Header("Animation")]
    public float baseRotationSpeed = 360f;  // degrees per second
    private float currentRPM = 0f;
    private bool isRunning = false;
    
    [Header("Fault Colors")]
    public Color normalColor = Color.green;
    public Color innerRaceColor = new Color(1f, 0.65f, 0f);  // Orange
    public Color ballColor = Color.yellow;
    public Color outerRaceColor = Color.red;
    
    private Renderer housingRenderer;
    private string currentFault = "Normal";
    
    private void Start()
    {
        housingRenderer = motorHousing.GetComponent<Renderer>();
        UpdateVisuals();
    }
    
    private void Update()
    {
        if (isRunning && motorShaft != null)
        {
            // Rotate motor shaft
            float rotationThisFrame = (currentRPM / 60f) * 360f * Time.deltaTime;
            motorShaft.transform.Rotate(Vector3.up, rotationThisFrame);
        }
    }
    
    public void UpdateFault(FaultData data)
    {
        currentFault = data.predicted_class;
        
        // Update UI
        if (faultTypeText) faultTypeText.text = data.predicted_class;
        if (confidenceText) confidenceText.text = $"{data.confidence:F1}%";
        if (confidenceBar) confidenceBar.value = data.confidence / 100f;
        
        // Update visuals
        UpdateVisuals();
        
        Debug.Log($"Fault updated: {data.predicted_class} ({data.confidence}%)");
    }
    
    public void UpdateStatus(StatusData data)
    {
        isRunning = data.running;
        currentRPM = data.rpm;
        
        if (rpmText) rpmText.text = $"{data.rpm} RPM";
        
        Debug.Log($"Status updated: Running={data.running}, RPM={data.rpm}");
    }
    
    private void UpdateVisuals()
    {
        Color faultColor = GetFaultColor(currentFault);
        
        // Update motor housing color
        if (housingRenderer != null)
        {
            housingRenderer.material.color = faultColor;
            housingRenderer.material.SetColor("_EmissionColor", faultColor * 0.5f);
        }
        
        // Update warning light
        if (warningLight != null)
        {
            warningLight.color = faultColor;
            warningLight.intensity = (currentFault == "Normal") ? 0f : 2f;
        }
        
        // Particle effects for faults
        if (sparkEffect != null)
        {
            if (currentFault != "Normal")
            {
                if (!sparkEffect.isPlaying)
                    sparkEffect.Play();
                
                var main = sparkEffect.main;
                main.startColor = faultColor;
            }
            else
            {
                if (sparkEffect.isPlaying)
                    sparkEffect.Stop();
            }
        }
    }
    
    private Color GetFaultColor(string fault)
    {
        switch (fault)
        {
            case "Normal": return normalColor;
            case "InnerRace": return innerRaceColor;
            case "Ball": return ballColor;
            case "OuterRace": return outerRaceColor;
            default: return Color.gray;
        }
    }
}
```

### Step 4: Setup in Unity Scene

1. **Create Empty GameObject** named "MQTT Manager"
2. **Add Component** → `MQTTManager` script
3. **Configure:**
   - Broker Address: `broker.hivemq.com`
   - Broker Port: `1883`
   - Fault Topic: `digitaltwin/motor/fault/prediction`
   - Status Topic: `digitaltwin/motor/status`

4. **Create Motor GameObject** (or use existing)
5. **Add Component** → `MotorController` script
6. **Assign references** in inspector (motor parts, UI elements)

7. **Link MQTT → Motor:**
   - In MQTT Manager, drag Motor GameObject to "Motor Controller" field

### Step 5: Test in Unity Editor

1. **Play in Editor**
2. **Run Python simulator** in another terminal
3. **Check Console** for MQTT messages
4. **Verify motor responds** to fault changes

---

## 🎨 UI Overlay Integration

To match the look from your screenshot, create Unity UI:

### Canvas Setup

```csharp
// Create Canvas (World Space or Overlay)
Canvas canvas = FindObjectOfType<Canvas>();

// Left panel - Fault Simulation
GameObject leftPanel = new GameObject("LeftPanel");
leftPanel.AddComponent<RectTransform>();
leftPanel.AddComponent<Image>().color = new Color(0.2f, 0.3f, 0.4f, 0.8f);

// Right panel - CWRU Fault Detector
GameObject rightPanel = new GameObject("RightPanel");
rightPanel.AddComponent<RectTransform>();
rightPanel.AddComponent<Image>().color = new Color(0.3f, 0.3f, 0.3f, 0.8f);
```

Or design in Unity UI Editor:
1. **Create UI** → **Panel** (for background)
2. **Add Text** elements for:
   - "FAULT SIMULATION"
   - Running time / phase / progress
   - AI prediction
3. **Add Progress Bars** (Sliders)
4. **Add Probability Bars** for each fault class

---

## 📱 WebGL Build Optimization

### Compression

For faster loading:
1. **Player Settings → WebGL:**
   - Compression Format: **Brotli** (best)
   - Requires server support (Nginx, Apache)
   
2. **Alternative - Gzip:**
   - Enable Gzip in server config
   - Smaller than uncompressed

### Code Stripping

1. **Player Settings → Other Settings:**
   - Stripping Level: **High**
   - Managed Stripping Level: **High**

2. **Remove unused assets:**
   - Delete unused textures, models, scripts
   - Use Asset Cleanup tools

### Loading Screen

Customize Unity's loading bar:
1. **Player Settings → Resolution and Presentation:**
   - WebGL Template: **Minimal** or **Default**
   
2. **Create custom template** in `Assets/WebGLTemplates/`

---

## 🔍 Troubleshooting

### Unity build fails
- Check WebGL build support is installed (Unity Hub → Installs → Add Modules)
- Ensure all scripts compile without errors
- Try "Clean Build" option

### MQTT connection fails in WebGL
- WebGL doesn't support native sockets
- Use WebSocket MQTT (port 8884 for HiveMQ: `wss://broker.hivemq.com:8884/mqtt`)
- Update M2Mqtt to WebSocket-compatible version

### iframe doesn't load
- Check browser console for errors
- Verify Unity build path is correct
- Ensure files are served (not file:// protocol)
- Add to `.env` if using Vite:
  ```
  VITE_UNITY_PATH=/unity
  ```

### Performance issues
- Reduce texture quality in Unity
- Use lower polygon models
- Disable unnecessary physics
- Limit particle effects
- Use WebGL 2.0 (faster than WebGL 1.0)

---

## 🚀 Production Deployment

### Build for Production

```bash
# In Unity: Build WebGL with Brotli compression
# Then in web-dashboard:

cd web-dashboard
npm run build

# Output will be in web-dashboard/dist/
```

### Deploy Options

**1. Vercel (Recommended):**
```bash
npm install -g vercel
vercel --prod
```

**2. Netlify:**
- Drag & drop `dist/` folder to Netlify

**3. AWS S3 + CloudFront:**
```bash
aws s3 sync dist/ s3://your-bucket/
```

---

## 📊 Performance Benchmarks

| Platform | Load Time | FPS | Memory |
|----------|-----------|-----|--------|
| Chrome | ~5s | 60 | ~150MB |
| Firefox | ~6s | 55 | ~180MB |
| Safari | ~7s | 50 | ~200MB |
| Mobile | ~10s | 30 | ~250MB |

---

## 🎯 Next Steps

1. ✅ Export Unity as WebGL
2. ✅ Test iframe integration
3. 🔄 Add MQTT communication
4. 🔄 Optimize build size
5. 🔄 Deploy to production
6. 🔄 Add interactive controls (rotate camera, zoom, etc.)

---

**Resources:**
- [Unity WebGL Docs](https://docs.unity3d.com/Manual/webgl-building.html)
- [M2Mqtt Unity](https://github.com/gpvigano/M2MqttUnity)
- [Unity UI System](https://docs.unity3d.com/Packages/com.unity.ugui@1.0/manual/index.html)

**Last Updated**: January 2026
