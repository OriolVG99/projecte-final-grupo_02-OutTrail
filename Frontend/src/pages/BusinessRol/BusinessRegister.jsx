import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import "./BusinessRegister.css";

//Formulari de registre per a comptes d'empresa (Business) que requereixen validacio manual
export default function BusinessRegister() {
  const [form, setForm] = useState({
    nom: "",
    cognoms: "",
    username: "",
    email: "",
    password: ""
  });

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedForm = { ...form, email: form.email.toLowerCase() };
      await axios.post("/api/register-business", normalizedForm);
      setModal({
        title: "Sol·licitud enviada",
        text: "El teu compte serà revisat per l'administrador.",
        color: "green"
      });
    } catch (err) {
      setModal({
        title: "Error",
        text: err.response?.data?.error || "No s'ha pogut crear el compte",
        color: "red"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="business-register-wrapper">
      {loading && <div className="business-register-overlay"><Spinner /></div>}
      {modal && (
        <Message
          title={modal.title}
          text={modal.text}
          color={modal.color}
          buttonText="Tancar"
          onButtonClick={() => {
            setModal(null);
            if (modal.color === "green") navigate("/auth");
          }}
        />
      )}
      <div className="business-register-card">
        <h1 className="business-register-title">Registre Business</h1>
        <p className="business-register-subtitle">Fes créixer el teu negoci amb OutTrail</p>
        <form onSubmit={submit}>
          <input className="business-register-input" name="nom" placeholder="Nom" onChange={handle} />
          <input className="business-register-input" name="cognoms" placeholder="Cognoms (opcional)" onChange={handle} />
          <input className="business-register-input" name="username" placeholder="Username" onChange={handle} />
          <input className="business-register-input" name="email" placeholder="Email" onChange={handle} />
          <input className="business-register-input" name="password" type="password" placeholder="Contrasenya" onChange={handle} />
          <button className="business-register-btn" type="submit" disabled={loading}>
            {loading ? "Enviant..." : "Registrar negoci"}
          </button>
          <div className="business-register-bottom-text">
            Ja tens compte?{" "}
            <span onClick={() => navigate("/auth")} className="business-register-link">Logueja’t</span>
          </div>
          <div className="business-register-bottom-text-2">
            Vols registrar-te com caminant?{" "}
            <span onClick={() => navigate("/auth", { state: { mode: "register" } })} className="business-register-link">Registra’t aquí</span>
          </div>
        </form>
      </div>
    </div>
  );
}