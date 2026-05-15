import { useNavigate } from "react-router-dom";

//Pantalla d'error 404 per a rutes no existents a l'aplicacio
export default function Error404() {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Outfit', 'Lato', sans-serif", textAlign: "center", padding: "20px" }}>
      <h1 style={{ fontSize: "120px", margin: 0, color: "#004c06", opacity: 0.2 }}>404</h1>
      <h2 style={{ fontSize: "32px", fontWeight: "900", color: "#333", marginBottom: "10px" }}>Ups! Pàgina no trobada</h2>
      <p style={{ fontSize: "18px", color: "#666", marginBottom: "30px", maxWidth: "400px" }}>Sembla que t'has perdut pel camí. Aquesta ruta no existeix al nostre mapa.</p>
      <button style={{ background: "#004c06", color: "white", padding: "14px 28px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0, 76, 6, 0.3)" }} onClick={() => navigate("/")}>
        Tornar a l'inici
      </button>
    </div>
  );
}