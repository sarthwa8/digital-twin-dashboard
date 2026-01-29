import React from "react";
import { Cpu } from "lucide-react";
import "./UnityViewer.css";

function UnityViewer({ faultData, statusData }) {
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
        {/* ✅ IFRAME IS NOW ACTIVE */}
        <iframe
          src="/unity-build/index.html"
          title="Motor Digital Twin"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            minHeight: "500px",
          }}
          allow="autoplay; fullscreen"
        />

        {/* Overlay Info Box */}
        <div
          className="simulation-info"
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            width: "250px",
            zIndex: 10,
          }}
        >
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value">
              {statusData?.running ? "Running" : "Idle"}
            </span>
          </div>
          {faultData && (
            <div className="info-item">
              <span className="info-label">Fault:</span>
              <span
                className="info-value"
                style={{
                  color:
                    faultData.predicted_class === "Normal"
                      ? "#10b981"
                      : "#ef4444",
                }}
              >
                {faultData.predicted_class}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UnityViewer;
