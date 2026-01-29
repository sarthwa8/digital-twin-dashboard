import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Zap, Thermometer } from 'lucide-react';
import './SensorGrid.css';

function SensorGrid({ sensorData, dataHistory }) {
  const { imu, power, thermal } = sensorData;

  // Format data for vibration chart (accelerometer)
  const vibrationData = dataHistory.imu.map((data, index) => ({
    index,
    x: data.accelerometer.x,
    y: data.accelerometer.y,
    z: data.accelerometer.z,
  }));

  // Format data for power chart
  const powerData = dataHistory.power.map((data, index) => ({
    index,
    voltage: data.voltage,
    current: data.current,
    power: data.power / 10, // Scale down for better visualization
  }));

  // Format data for temperature chart
  const thermalData = dataHistory.thermal.map((data, index) => ({
    index,
    temperature: data.temperature,
  }));

  return (
    <div className="sensor-grid">
      {/* IMU Sensor Card */}
      <div className="sensor-card">
        <div className="sensor-card-header">
          <Activity size={24} />
          <h3>IMU Sensor (MPU-6050)</h3>
          <span className="sensor-badge">6-DoF</span>
        </div>
        <div className="sensor-card-body">
          {imu ? (
            <>
              <div className="sensor-values">
                <div className="value-group">
                  <span className="value-label">Accelerometer</span>
                  <div className="value-row">
                    <span className="value-item">X: {imu.accelerometer.x.toFixed(2)} m/s²</span>
                    <span className="value-item">Y: {imu.accelerometer.y.toFixed(2)} m/s²</span>
                    <span className="value-item">Z: {imu.accelerometer.z.toFixed(2)} m/s²</span>
                  </div>
                </div>
                <div className="value-group">
                  <span className="value-label">Gyroscope</span>
                  <div className="value-row">
                    <span className="value-item">X: {imu.gyroscope.x.toFixed(2)} °/s</span>
                    <span className="value-item">Y: {imu.gyroscope.y.toFixed(2)} °/s</span>
                    <span className="value-item">Z: {imu.gyroscope.z.toFixed(2)} °/s</span>
                  </div>
                </div>
              </div>
              {vibrationData.length > 0 && (
                <div className="chart-container">
                  <h4 className="chart-title">Vibration (Accelerometer)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={vibrationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                      <XAxis dataKey="index" stroke="#94a3b8" hide />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(30, 41, 59, 0.95)', 
                          border: '1px solid rgba(71, 85, 105, 0.5)',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="x" stroke="#3b82f6" strokeWidth={2} dot={false} name="X-axis" />
                      <Line type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2} dot={false} name="Y-axis" />
                      <Line type="monotone" dataKey="z" stroke="#f59e0b" strokeWidth={2} dot={false} name="Z-axis" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="no-data">Waiting for IMU data...</div>
          )}
        </div>
      </div>

      {/* Power Analyzer Card */}
      <div className="sensor-card">
        <div className="sensor-card-header">
          <Zap size={24} />
          <h3>Power Analyzer (PZEM-004T)</h3>
          <span className="sensor-badge">AC</span>
        </div>
        <div className="sensor-card-body">
          {power ? (
            <>
              <div className="sensor-values">
                <div className="value-grid">
                  <div className="value-box">
                    <span className="value-label">Voltage</span>
                    <span className="value-main">{power.voltage.toFixed(1)} V</span>
                  </div>
                  <div className="value-box">
                    <span className="value-label">Current</span>
                    <span className="value-main">{power.current.toFixed(2)} A</span>
                  </div>
                  <div className="value-box">
                    <span className="value-label">Power</span>
                    <span className="value-main">{power.power.toFixed(1)} W</span>
                  </div>
                  <div className="value-box">
                    <span className="value-label">Power Factor</span>
                    <span className="value-main">{power.power_factor.toFixed(3)}</span>
                  </div>
                  <div className="value-box">
                    <span className="value-label">Frequency</span>
                    <span className="value-main">{power.frequency.toFixed(1)} Hz</span>
                  </div>
                  <div className="value-box">
                    <span className="value-label">Apparent Power</span>
                    <span className="value-main">{power.apparent_power.toFixed(1)} VA</span>
                  </div>
                </div>
              </div>
              {powerData.length > 0 && (
                <div className="chart-container">
                  <h4 className="chart-title">Power Consumption</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={powerData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                      <XAxis dataKey="index" stroke="#94a3b8" hide />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(30, 41, 59, 0.95)', 
                          border: '1px solid rgba(71, 85, 105, 0.5)',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} dot={false} name="Voltage (V)" />
                      <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={2} dot={false} name="Current (A)" />
                      <Line type="monotone" dataKey="power" stroke="#f59e0b" strokeWidth={2} dot={false} name="Power (W/10)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="no-data">Waiting for power data...</div>
          )}
        </div>
      </div>

      {/* Thermal Sensor Card */}
      <div className="sensor-card">
        <div className="sensor-card-header">
          <Thermometer size={24} />
          <h3>Thermal Probe (DS18B20)</h3>
          <span className="sensor-badge">1-Wire</span>
        </div>
        <div className="sensor-card-body">
          {thermal ? (
            <>
              <div className="sensor-values">
                <div className="value-box-large">
                  <span className="value-label">Stator Housing Temperature</span>
                  <span className="value-main-large">{thermal.temperature.toFixed(1)} °C</span>
                  <div className="temperature-bar">
                    <div 
                      className="temperature-fill"
                      style={{ 
                        width: `${Math.min((thermal.temperature / 100) * 100, 100)}%`,
                        background: thermal.temperature > 60 ? '#ef4444' : thermal.temperature > 50 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </div>
              </div>
              {thermalData.length > 0 && (
                <div className="chart-container">
                  <h4 className="chart-title">Temperature Trend</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={thermalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                      <XAxis dataKey="index" stroke="#94a3b8" hide />
                      <YAxis stroke="#94a3b8" domain={[20, 80]} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(30, 41, 59, 0.95)', 
                          border: '1px solid rgba(71, 85, 105, 0.5)',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#ef4444" 
                        strokeWidth={3} 
                        dot={false} 
                        name="Temperature (°C)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="no-data">Waiting for thermal data...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SensorGrid;
