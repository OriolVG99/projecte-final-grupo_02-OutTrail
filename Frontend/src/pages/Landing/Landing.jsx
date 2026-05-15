import React from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-title">OutTrail</h1>
          <p className="landing-subtitle">
            Descobreix rutes inèdites, connecta amb la natura i recolza el comerç local.
          </p>
          <div className="landing-cta-group">
            <button className="landing-btn-primary" onClick={() => navigate("/explorar")}>
              Explorar el Mapa
            </button>
            <button className="landing-btn-secondary" onClick={() => navigate("/auth")}>
              Començar ara
            </button>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-header">
          <h2>Per què triar OutTrail?</h2>
          <p>Tot el que necessites per a la teva propera aventura en un sol lloc.</p>
        </div>
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Mapes Interactius</h3>
            <p>Navega per rutes detallades amb informació precisa, i crea les teves pròpies rutes.</p>
          </div>
          <div className="landing-feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Comunitat Activa</h3>
            <p>Segueix altres aventurers, comparteix experiències i descobreix rutes.</p>
          </div>
          <div className="landing-feature-card">
            <div className="feature-icon">🏪</div>
            <h3>Negocis Locals</h3>
            <p>Troba restaurants, allotjaments i botigues de confiança durant les teves rutes.</p>
          </div>
        </div>
      </section>

      <section className="landing-info">
        <div className="landing-info-content">
          <div className="landing-info-text">
            <h2>Dona suport al comerç de proximitat</h2>
            <p>
              A OutTrail creiem en la simbiosi entre l'esport a l'aire lliure i l'economia local. 
              Per això, integrem negocis de proximitat directament al mapa perquè mai et falti res.
            </p>
            <button className="landing-btn-outline" onClick={() => navigate("/register-business")}>
              Soc un negoci
            </button>
          </div>
          <div className="landing-info-image">
            <img 
              src="/landing_nature_business.png" 
              alt="Nature and business" 
            />
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <h2>Llest per a la teva propera ruta?</h2>
        <p>Uneix-te a milers d'aventurers que ja estan explorant amb OutTrail.</p>
        <button className="landing-btn-primary" onClick={() => navigate("/auth")}>
          Crear un compte gratuït
        </button>
      </section>

      <footer className="landing-footer">
        <div className="footer-logo">
          <img src="/OutTrail-sinfondo.png" alt="OutTrail Logo" />
          <span>OutTrail © 2026</span>
        </div>
        <div className="footer-links">
          <span onClick={() => navigate("/legal/privacitat")}>Privacitat</span>
          <span onClick={() => navigate("/legal/termes")}>Termes d'ús</span>
          <span onClick={() => navigate("/legal/contacte")}>Contacte</span>
        </div>
      </footer>
    </div>
  );
}
