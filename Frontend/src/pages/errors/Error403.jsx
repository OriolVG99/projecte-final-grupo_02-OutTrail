import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

//Pantalla d'error 403 per a accessos denegats o falta d'autenticacio
export default function Error403() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isLogged = !!user;

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Outfit', 'Lato', sans-serif", textAlign: "center", padding: "20px" }}>
      <h1 style={{ fontSize: "120px", margin: 0, color: "#f39c12", opacity: 0.4, fontWeight: "900" }}>403</h1>
      <h2 style={{ fontSize: "32px", fontWeight: "900", color: "#333", marginBottom: "10px" }}>Accés restringit</h2>
      {!isLogged ? (
        <>
          <p style={{ fontSize: "18px", color: "#666", marginBottom: "30px", maxWidth: "400px" }}>Has d'iniciar sessió per poder explorar aquesta part d'OutTrail.</p>
          <button className="btn-green" style={{ background: "#004c06", color: "white", padding: "14px 28px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0, 76, 6, 0.3)" }} onClick={() => navigate("/auth", { replace: true, state: { from: location.pathname } })}>
            Anar a Iniciar sessió
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: "18px", color: "#666", marginBottom: "30px", maxWidth: "400px" }}>No tens els permisos necessaris per entrar aquí. Sembla una zona privada!</p>
          <button className="btn-green" style={{ background: "#004c06", color: "white", padding: "14px 28px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0, 76, 6, 0.3)" }} onClick={() => navigate("/")}>
            Tornar a l'inici
          </button>
        </>
      )}
    </div>
  );
}