import { Wifi, WifiOff } from 'lucide-react';
import './ConnectionStatus.css';

function ConnectionStatus({ connected, speed }) {
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
          <span className="status-label">MQTT Broker</span>
          <span className={`status-value ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'broker.emqx.io' : 'Disconnected'}
          </span>
        </div>
      </div>

      {connected && (
        <>
          <div className="status-divider"></div>
          <div className="status-item">
            <div className="status-info">
              <span className="status-label">Motor Speed</span>
              <span className="status-value">{speed} RPM</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ConnectionStatus;
