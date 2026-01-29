import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import './FaultDetector.css';

function FaultDetector({ faultData }) {
  if (!faultData) {
    return (
      <div className="fault-detector">
        <div className="fault-header">
          <AlertCircle size={24} />
          <h2>CWRU Fault Detector</h2>
        </div>
        <div className="fault-body no-data">
          <p>Waiting for fault detection data...</p>
        </div>
      </div>
    );
  }

  const { predicted_class, confidence, probabilities, model, classes } = faultData;
  
  const getFaultIcon = () => {
    if (predicted_class === 'Normal') {
      return <CheckCircle size={32} className="fault-icon normal" />;
    }
    return <AlertTriangle size={32} className="fault-icon fault" />;
  };

  const getFaultColor = (fault) => {
    const colors = {
      'Normal': '#10b981',
      'InnerRace': '#f59e0b',
      'Ball': '#ef4444',
      'OuterRace': '#dc2626',
    };
    return colors[fault] || '#94a3b8';
  };

  return (
    <div className="fault-detector">
      <div className="fault-header">
        <AlertCircle size={24} />
        <h2>CWRU Fault Detector</h2>
        <span className="model-badge">Model: {model} | {classes} Classes</span>
      </div>

      <div className="fault-body">
        <div className="fault-prediction">
          {getFaultIcon()}
          <div className="fault-info">
            <h3 className="fault-class" style={{ color: getFaultColor(predicted_class) }}>
              {predicted_class}
            </h3>
            <div className="confidence-bar-container">
              <div className="confidence-label">
                <span>Confidence</span>
                <span className="confidence-value">{confidence}%</span>
              </div>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill"
                  style={{ 
                    width: `${confidence}%`,
                    background: getFaultColor(predicted_class)
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="probabilities-section">
          <h4>Class Probabilities:</h4>
          <div className="probabilities-grid">
            {Object.entries(probabilities).map(([fault, prob]) => (
              <div key={fault} className="probability-item">
                <div className="probability-header">
                  <span className="probability-label">{fault}</span>
                  <span className="probability-value">{prob}%</span>
                </div>
                <div className="probability-bar">
                  <div 
                    className="probability-fill"
                    style={{ 
                      width: `${prob}%`,
                      background: getFaultColor(fault)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FaultDetector;
