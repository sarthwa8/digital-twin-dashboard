import React from 'react';
import { Activity, Zap } from 'lucide-react';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-bg-effect"></div>
      <div className="header-content">
        <div className="header-left">
          <div className="logo-container">
            <div className="logo-icon">
              <Zap size={40} />
              <div className="logo-pulse"></div>
            </div>
            <div className="logo-text">
              <h1 className="header-title">
                <span className="title-main">DIGITAL TWIN</span>
                <span className="title-sub">MONITORING SYSTEM</span>
              </h1>
              <p className="header-subtitle">
                <span className="subtitle-highlight">MOTOR</span> FAULT DETECTION • REAL-TIME ANALYSIS
              </p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-badge">
            <span className="badge-label">MODEL</span>
            <span className="badge-value">CNN-4</span>
          </div>
          <div className="header-badge">
            <span className="badge-label">DATASET</span>
            <span className="badge-value">CWRU</span>
          </div>
          <div className="status-indicator">
            <div className="status-dot pulse"></div>
            <span>LIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
