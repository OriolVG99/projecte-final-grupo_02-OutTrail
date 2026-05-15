//Component modal per mostrar missatges de feedback (exit, alerta o error)
export default function Message({ title, text, color = "green", buttonText, onButtonClick }) {
  const configs = {
    green: { icon: "✅", accent: "#004c06", shadow: "rgba(0, 76, 6, 0.2)" },
    yellow: { icon: "⚠️", accent: "#ffc107", shadow: "rgba(255, 193, 7, 0.2)" },
    red: { icon: "❌", accent: "#b01a00", shadow: "rgba(176, 26, 0, 0.2)" }
  };
  const config = configs[color] || configs.green;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
      <div style={{ background: "#ffffff", padding: "40px 30px", borderRadius: "20px", width: "90%", maxWidth: "400px", textAlign: "center", fontFamily: "'Outfit', 'Lato', sans-serif", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", border: "1px solid #eee" }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>{config.icon}</div>
        <h2 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "24px", fontWeight: "900" }}>{title}</h2>
        <p style={{ color: "#666", lineHeight: "1.5", fontSize: "16px", marginBottom: "30px" }}>{text}</p>
        {buttonText && (
          <button onClick={onButtonClick} style={{ width: "100%", padding: "14px", background: config.accent, color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px", boxShadow: `0 4px 12px ${config.shadow}`, transition: "all 0.2s" }}>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}