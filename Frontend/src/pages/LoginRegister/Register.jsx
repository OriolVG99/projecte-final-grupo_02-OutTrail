import { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import "./Register.css";

//Component per al registre d'usuaris amb validacio basica de format d'email
export default function Register({ setMode }) {
  const [form, setForm] = useState({
    nom: "",
    cognoms: "",
    username: "",
    email: "",
    password: ""
  });

  const { login } = useAuth();
  const navigate = useNavigate();
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [modalError, setModalError] = useState(null);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setModalError("Si us plau, introdueix un correu electrònic vàlid (exemple@gmail.com)");
      return;
    }
    setLoadingRegister(true);
    try {
      const normalizedForm = { ...form, email: form.email.toLowerCase() };
      await axios.post("/api/register", normalizedForm);
      const resLogin = await axios.post("/api/login", {
        email: form.email.toLowerCase(),
        password: form.password
      });
      login(resLogin.data.user, resLogin.data.token);
      navigate("/");
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      setModalError(typeof errorMsg === 'string' ? errorMsg : "Error creant el compte");
    } finally {

      setLoadingRegister(false);
    }
  };

  return (
    <>
      {loadingRegister && <div className="register-overlay"><Spinner /></div>}
      {modalError && (
        <Message
          title="Error"
          text={modalError}
          color="red"
          buttonText="Tancar"
          onButtonClick={() => setModalError(null)}
        />
      )}
      <form onSubmit={submit}>
        <input className="register-input" name="nom" placeholder="Nom" onChange={handle} />
        <input className="register-input" name="cognoms" placeholder="Cognoms" onChange={handle} />
        <input className="register-input" name="username" placeholder="Nom d'usuari" onChange={handle} />
        <input className="register-input" name="email" type="email" placeholder="Email" onChange={handle} required/>
        <input className="register-input" name="password" type="password" placeholder="Contrasenya" onChange={handle} />
        <button className="register-btn" type="submit" disabled={loadingRegister}>
          {loadingRegister ? "Creant compte..." : "Crear compte"}
        </button>
        <div className="register-footer">
          Ja tens compte? <span onClick={() => setMode("login")} className="register-footer-link">Logueja’t</span>
        </div>
        <div className="register-business-footer">
          Tens un negoci? <span onClick={() => navigate("/register-business")} className="register-footer-link">Sol·licita el rol business</span>
        </div>
      </form>
    </>
  );
}
