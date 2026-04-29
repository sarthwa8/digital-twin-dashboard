import "./Header.css"

export default function Header({ online, vfdTemp }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-title">DIGITAL TWIN — NPL LAB</span>
        {vfdTemp != null && vfdTemp !== 0 && (
          <span className="header-vfd">VFD: {vfdTemp}°C</span>
        )}
      </div>
      <div className={`connection-pill ${online ? "pill-live" : "pill-offline"}`}>
        <span className="pill-dot" />
        {online ? "LIVE" : "OFFLINE"}
      </div>
    </header>
  )
}
