import { useState, useEffect } from "react";
import Login from "./Login";
import Register from "./Register";
import { useLocation } from "react-router-dom";
import "./LoginRegister.css";

//Component contenidor que commuta entre les vistes d'inici de sessio i registre
export default function LoginRegister() {
  const [mode, setMode] = useState("login");
  const location = useLocation();

  useEffect(() => {
    if (location.state?.mode) {
      setMode(location.state.mode);
    }
  }, [location.state]);

  return (
    <div className="login-register-wrapper">
      <div className="login-register-card">
        <div className="login-register-logo-container">
          <h1>OutTrail</h1>
          <p>Explora, descobreix i comparteix rutes</p>
        </div>
        <div className="login-register-switch-container">
          <button
            className={`login-register-switch-btn ${mode === "login" ? "active" : "inactive"}`}
            onClick={() => setMode("login")}
          >
            Iniciar sessió
          </button>
          <button
            className={`login-register-switch-btn ${mode === "register" ? "active" : "inactive"}`}
            onClick={() => setMode("register")}
          >
            Registrar-se
          </button>
        </div>
        {mode === "login" ? (<Login setMode={setMode} />) : (<Register setMode={setMode} />)}
      </div>
    </div>
  );
}