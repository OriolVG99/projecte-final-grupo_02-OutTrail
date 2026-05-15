import React from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function LegalPage() {
  const { type } = useParams();
  const navigate = useNavigate();

  const content = {
    privacitat: {
      title: "Política de Privacitat",
      text: `A OutTrail, la teva privacitat és la nostra màxima prioritat. Aquesta política detalla com recollim, utilitzem i protegim la teva informació:
      
      1. Recollida de dades: Recollim informació bàsica com el teu nom d'usuari i correu electrònic per gestionar el teu compte.
      2. Geolocalització: Utilitzem les coordenades de les rutes que crees per mostrar-les al mapa, però mai rastregem la teva ubicació en temps real sense permís.
      3. Protecció: Totes les teves dades s'emmagatzemen de forma segura i encriptada. Seguint la normativa RGPD, tens dret a sol·licitar l'eliminació permanent del teu compte i dades associades en qualsevol moment des del teu perfil.`
    },
    termes: {
      title: "Termes d'ús",
      text: `En registrar-te i utilitzar OutTrail, acceptes les següents condicions de servei:
      
      1. Ús Responsable: Els usuaris es comprometen a no publicar rutes que transcorrin per propietats privades sense permís o zones perilloses no senyalitzades.
      2. Contingut: OutTrail no es fa responsable de la veracitat de la informació publicada pels usuaris. L'autor de la ruta és l'únic responsable del contingut.
      3. Respecte: Qualsevol comentari o valoració ofensiva cap a rutes o negocis serà motiu de revisió i possible suspensió del compte.`
    },
    contacte: {
      title: "Contacte i Suport",
      text: `Volem escoltar la teva opinió! Si tens algun dubte tècnic, suggeriment de millora o vols reportar un incident, estem a la teva disposició:
      
      - Correu Electrònic: suport@outtrail.cat (Resposta en menys de 24h laborables)
      - Suport Tècnic: +34 930 000 000
      - Xarxes Socials: Segueix-nos a @OutTrail per estar al dia de les noves funcionalitats.
      
      Si ets un negoci i vols aparèixer a la nostra plataforma de forma destacada, contacta amb el departament comercial a: business@outtrail.cat.`
    }
  };

  const item = content[type] || content.privacitat;

  return (
    <div style={{ 
      padding: "120px 25px 80px", 
      maxWidth: "900px", 
      margin: "0 auto", 
      fontFamily: "Outfit, sans-serif",
      minHeight: "80vh" 
    }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
        <button 
          onClick={() => navigate("/")}
          style={{ 
            marginBottom: "30px", 
            background: "#f0f4f0", 
            border: "none", 
            color: "#004c06", 
            fontWeight: "bold", 
            cursor: "pointer",
            padding: "10px 20px",
            borderRadius: "50px",
            transition: "0.3s"
          }}
          className="btn-hover-effect"
        >
          ← Tornar a l'Inici
        </button>
        <h1 style={{ color: "#004c06", fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "30px", fontWeight: "800" }}>{item.title}</h1>
        <div style={{ height: "4px", width: "60px", background: "#f4b400", marginBottom: "30px", borderRadius: "2px" }}></div>
        <p style={{ 
          fontSize: "1.15rem", 
          lineHeight: "1.8", 
          color: "#444", 
          whiteSpace: "pre-line",
          textAlign: "justify" 
        }}>
          {item.text}
        </p>
      </div>
    </div>
  );
}
