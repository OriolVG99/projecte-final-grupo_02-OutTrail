import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import "./Login.css";

// omponent per a l'inici de sessio amb gestio d'estat de recordatori i visibilitat de contrasenya
export default function Login({ setMode }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [modalError, setModalError] = useState(null);

  const EyeOpen = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="#444" strokeWidth="2"/>
    </svg>
  );

  const EyeClosed = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 3L21 21" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10.58 10.58C10.21 11 10 11.48 10 12C10 13.1 10.9 14 12 14C12.52 14 13 13.79 13.42 13.42" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6.53 6.53C4.5 8 3 10 1 12C3.5 17 7.5 20 12 20C13.7 20 15.3 19.6 16.76 18.9" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17.47 17.47C19.5 16 21 14 23 12C20.5 7 16.5 4 12 4C10.3 4 8.7 4.4 7.24 5.1" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    const savedPassword = localStorage.getItem("savedPassword");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    try {
      const res = await axios.post("/api/login", {
        email: email.toLowerCase(),
        password
      });

      if (remember) {
        localStorage.setItem("savedEmail", email);
        localStorage.setItem("savedPassword", password);
      } else {
        localStorage.removeItem("savedEmail");
        localStorage.removeItem("savedPassword");
      }

      login(res.data.user, res.data.token);
      const from = location.state?.from || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setModalError(err.response?.data?.error || "Error iniciant sessió");
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <>
      {loadingLogin && <div className="login-overlay"><Spinner /></div>}
      {modalError && (
        <Message
          title="Error"
          text={modalError}
          color="red"
          buttonText="Tancar"
          onButtonClick={() => setModalError(null)}
        />
      )}

      <form onSubmit={submit} autoComplete="on">
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="login-password-container">
          <input
            className="login-input login-input-password"
            type={showPassword ? "text" : "password"}
            placeholder="Contrasenya"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="login-password-toggle"
          >
            {showPassword ? EyeClosed : EyeOpen}
          </span>
        </div>
        <label className="login-remember-label">
          <input
            type="checkbox"
            className="login-remember-checkbox"
            checked={remember}
            onChange={() => setRemember(!remember)}
          />
          Recordar-me
        </label>
        <button className="login-btn" type="submit" disabled={loadingLogin}>
          {loadingLogin ? "Entrant..." : "Entrar"}
        </button>
        <div className="login-footer">
          No tens compte?{" "}
          <span onClick={() => setMode("register")} className="login-footer-link">Registra’t</span>
        </div>
      </form>
    </>
  );
}