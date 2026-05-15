import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import ConfirmBox from "./ConfirmBox.jsx";

//Component de capcalera que gestiona la navegacio i l'estat visual de la sessio de l'usuari
export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoverItem, setHoverItem] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const lato = { fontFamily: "Lato, sans-serif" };
  const header = { width: "100%", height: "70px", padding: "0 25px", background: "#004c06", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box", position: "fixed", top: 0, left: 0, zIndex: 9999, ...lato };
  const logoBox = { height: "100px", display: "flex", alignItems: "center", cursor: "pointer", zIndex: 10000 };
  const logoImg = { height: "100%", objectFit: "contain" };
  const nav = { display: "flex", gap: "25px", marginLeft: "40px", ...lato };
  const navItem = { cursor: "pointer", fontWeight: "bold", fontSize: "15px", padding: "6px 10px", borderRadius: "6px", transition: "0.2s", ...lato };

  const navHover = (name, path) => ({
    ...navItem,
    background: location.pathname === path ? "#ffffff55" : hoverItem === name ? "#ffffff33" : "transparent"
  });

  const btn = { padding: "8px 15px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", transition: "0.2s", fontFamily: "'Lato', sans-serif" };
  const btnPerfil = { ...btn, background: "#a6ada8", color: "black" };
  const btnLogout = { ...btn, background: "#b01a00", color: "white" };
  const btnLogin = { ...btn, background: "#ffffff", color: "#004c06" };

  return (
    <header style={header} className="app-header-container">
      <div style={logoBox} onClick={() => navigate("/")}>
        <img src="/OutTrailBlanco-sinfondo.png" alt="OutTrail" style={logoImg} />
      </div>
      
      {user && (
        <button className="mobile-burger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      )}

      <nav style={nav} className={`app-header-nav ${user && isMobileMenuOpen ? 'open' : ''}`}>
        <div style={navHover("mapa", "/explorar")} onMouseEnter={() => setHoverItem("mapa")} onMouseLeave={() => setHoverItem(null)} onClick={() => { navigate("/explorar"); setIsMobileMenuOpen(false); }}>Explorar</div>
        {user && (
          <>
            <div style={navHover("rutes", "/rutes")} onMouseEnter={() => setHoverItem("rutes")} onMouseLeave={() => setHoverItem(null)} onClick={() => { navigate("/rutes"); setIsMobileMenuOpen(false); }}>Rutes</div>
            <div style={navHover("negocis", "/negocis")} onMouseEnter={() => setHoverItem("negocis")} onMouseLeave={() => setHoverItem(null)} onClick={() => { navigate("/negocis"); setIsMobileMenuOpen(false); }}>Negocis</div>
            <div style={navHover("perfils", "/perfils")} onMouseEnter={() => setHoverItem("perfils")} onMouseLeave={() => setHoverItem(null)} onClick={() => { navigate("/perfils"); setIsMobileMenuOpen(false); }}>Perfils</div>
            <div style={navHover("favorits", "/favorits")} onMouseEnter={() => setHoverItem("favorits")} onMouseLeave={() => setHoverItem(null)} onClick={() => { navigate("/favorits"); setIsMobileMenuOpen(false); }}>Favorits</div>
          </>
        )}
      </nav>

      {user ? (
        <div style={{ display: "flex", gap: "15px", alignItems: "center", ...lato }} className={`app-header-user-actions ${isMobileMenuOpen ? 'open' : ''}`}>
          <span style={{ cursor: "pointer", fontWeight: "bold", color: hoverItem === "username" ? "#a6ada8" : "white", transition: "0.2s" }} onMouseEnter={() => setHoverItem("username")} onMouseLeave={() => setHoverItem(null)} onClick={() => { navigate("/perfil"); setIsMobileMenuOpen(false); }}>{user.username}</span>
          <button className="btn-red" style={btnLogout} onClick={() => setShowLogoutConfirm(true)}>Logout</button>
        </div>
      ) : (
        <div className="app-header-login">
          <button style={btnLogin} onClick={() => navigate("/auth")}>Iniciar sessió</button>
        </div>
      )}

      {showLogoutConfirm && (
        <ConfirmBox 
          text="Estàs segur que vols tancar la sessió?"
          onConfirm={() => { logout(); navigate("/"); setShowLogoutConfirm(false); setIsMobileMenuOpen(false); }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </header>
  );
}