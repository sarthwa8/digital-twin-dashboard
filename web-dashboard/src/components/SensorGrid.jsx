import { Activity, Zap, Thermometer, Gauge } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './SensorGrid.css';

function SensorGrid({ telemetry, dataHistory }) {
  const { speed, current, temperature, vibration } = telemetry;

  const tempHistory = dataHistory.map((d, i) => ({ index: i, temperature: d.temperature }));
  const currentHistory = dataHistory.map((d, i) => ({ index: i, current: d.current }));

  return (
    <div className="sensor-grid">

      {/* Speed */}
      <div className="sensor-card">
        <div className="sensor-card-header">
          <Gauge size={24} />
          <h3>Motor Speed</h3>
          <span className="sensor-badge">VFD</span>
        </div>
        <div className="sensor-card-body">
          <div className="value-box-large">
            <span className="value-label">Estimated RPM</span>
            <span className="value-main-large">{speed.toFixed(0)} RPM</span>
          </div>
        </div>
      </div>

      {/* Current */}
      <div className="sensor-card">
        <div className="sensor-card-header">
          <Zap size={24} />
          <h3>Motor Current</h3>
          <span className="sensor-badge">VFD</span>
        </div>
        <div className="sensor-card-body">
          <div className="value-box-large">
            <span className="value-label">Phase Current</span>
            <span className="value-main-large">{current.toFixed(2)} A</span>
          </div>
          {currentHistory.length > 1 && (
            <div className="chart-container">
              <h4 className="chart-title">Current Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={currentHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                  <XAxis dataKey="index" stroke="#94a3b8" hide />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(30, 41, 59, 0.95)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={2} dot={false} name="Current (A)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Temperature */}
      <div className="sensor-card">
        <div className="sensor-card-header">
          <Thermometer size={24} />
          <h3>Thermal Probe (DS18B20)</h3>
          <span className="sensor-badge">1-Wire</span>
        </div>
        <div className="sensor-card-body">
          <div className="value-box-large">
            <span className="value-label">Stator Housing Temperature</span>
            <span className="value-main-large">{temperature.toFixed(1)} °C</span>
            <div className="temperature-bar">
              <div
                className="temperature-fill"
                style={{
                  width: `${Math.min((temperature / 100) * 100, 100)}%`,
                  background: temperature > 60 ? '#ef4444' : temperature > 50 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
          </div>
          {tempHistory.length > 1 && (
            <div className="chart-container">
              <h4 className="chart-title">Temperature Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={tempHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                  <XAxis dataKey="index" stroke="#94a3b8" hide />
                  <YAxis stroke="#94a3b8" domain={[20, 80]} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(30, 41, 59, 0.95)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={3} dot={false} name="Temperature (°C)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Vibration */}
      <div className="sensor-card">
        <div className="sensor-card-header">
          <Activity size={24} />
          <h3>Vibration (MPU-6050)</h3>
          <span className="sensor-badge">Pending</span>
        </div>
        <div className="sensor-card-body">
          <div className="value-box-large">
            <span className="value-label">RMS Acceleration</span>
            <span className="value-main-large">{vibration.toFixed(3)} m/s²</span>
          </div>
          <div className="no-data" style={{ marginTop: '0.5rem' }}>MPU-6050 not yet wired</div>
        </div>
      </div>

    </div>
  );
}

export default SensorGrid;
