import React from 'react';
import { Wifi, WifiOff, Play, Pause } from 'lucide-react';
import './ConnectionStatus.css';

function ConnectionStatus({ connected, status }) {
  return (
    <div className="connection-status">
      <div className="status-item">
        <div className="status-icon-wrapper">
          {connected ? (
            <Wifi className="status-icon connected pulse" size={20} />
          ) : (
            <WifiOff className="status-icon disconnected" size={20} />
          )}
        </div>
        <div className="status-info">
          <span className="status-label">MQTT Connection</span>
          <span className={`status-value ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {status && (
        <>
          <div className="status-divider"></div>
          
          <div className="status-item">
            <div className="status-icon-wrapper">
              {status.running ? (
                <Play className="status-icon running" size={20} />
              ) : (
                <Pause className="status-icon" size={20} />
              )}
            </div>
            <div className="status-info">
              <span className="status-label">Motor Status</span>
              <span className={`status-value ${status.running ? 'running' : ''}`}>
                {status.running ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          <div className="status-divider"></div>

          <div className="status-item">
            <div className="status-info">
              <span className="status-label">Speed</span>
              <span className="status-value">{status.rpm} RPM</span>
            </div>
          </div>

          <div className="status-divider"></div>

          <div className="status-item">
            <div className="status-info">
              <span className="status-label">Current Condition</span>
              <span className={`status-value fault-${status.current_fault?.toLowerCase() || 'normal'}`}>
                {status.current_fault || 'Unknown'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ConnectionStatus;
