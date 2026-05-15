//Component modal generic per demanar confirmació abans d'accions destructives
export default function ConfirmBox({ title, text, onConfirm, onCancel, loading = false }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
      <div style={{ background: "#ffffff", padding: "40px 30px", borderRadius: "20px", width: "90%", maxWidth: "400px", textAlign: "center", fontFamily: "'Outfit', 'Lato', sans-serif", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", border: "1px solid #eee" }}>
        <div style={{ fontSize: "50px", marginBottom: "20px", color: "#ffc107" }}>⚠️</div>
        <h2 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "24px", fontWeight: "900" }}>{title || "Estàs segur?"}</h2>
        <p style={{ color: "#666", lineHeight: "1.5", fontSize: "16px", marginBottom: "30px" }}>{text}</p>
        <div style={{ display: "flex", gap: "15px" }}>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: "14px", background: "#f5f5f5", color: "#666", border: "none", borderRadius: "12px", cursor: loading ? "default" : "pointer", fontWeight: "bold", fontSize: "15px", transition: "all 0.2s", opacity: loading ? 0.6 : 1 }}>Cancel·lar</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: "14px", background: "#b01a00", color: "white", border: "none", borderRadius: "12px", cursor: loading ? "default" : "pointer", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 12px rgba(176, 26, 0, 0.3)", transition: "all 0.2s", opacity: loading ? 0.8 : 1 }}>
            {loading ? "Processant..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}