import React from 'react';
import { Cpu } from 'lucide-react';
import './UnityViewer.css';

function UnityViewer({ faultData, statusData }) {
  // This will embed your Unity WebGL build
  // For now, showing a placeholder with instructions
  
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
        {/* Placeholder - Replace with Unity WebGL iframe or embed */}
        <div className="unity-placeholder">
          <div className="unity-placeholder-content">
            <Cpu size={64} className="unity-placeholder-icon" />
            <h3>Unity WebGL Build</h3>
            <p>To embed your Unity simulation:</p>
            <ol className="unity-instructions">
              <li>Export your Unity project as WebGL build</li>
              <li>Place the build folder in <code>web-dashboard/public/unity/</code></li>
              <li>Uncomment the iframe code below</li>
            </ol>
            
            {/* 
            Example iframe for Unity WebGL:
            <iframe 
              src="/unity/index.html" 
              title="Motor Digital Twin"
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              allow="autoplay; fullscreen"
            />
            */}
            
            <div className="simulation-info">
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">{statusData?.running ? 'Running' : 'Idle'}</span>
              </div>
              {faultData && (
                <>
                  <div className="info-item">
                    <span className="info-label">Detected Fault:</span>
                    <span className="info-value">{faultData.predicted_class}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Confidence:</span>
                    <span className="info-value">{faultData.confidence}%</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnityViewer;
