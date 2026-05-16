import { useAuth } from "../../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";

//Gestio de les dades del perfil d'usuari, canvi de contrasenya i eliminacio de compte
export default function Perfil() {
  const { user, token, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmPasswordModal, setConfirmPasswordModal] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [confirmLogoutModal, setConfirmLogoutModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    cognoms: "",
    zona: "",
    experiencia: "",
    sexe: "",
    data_naixement: "",
    foto_perfil: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString || dateString === "0000-00-00") return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      axios.get("/api/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const u = res.data.user;
        setForm({
          ...u,
          data_naixement: formatDate(u.data_naixement),
          foto_perfil: u.foto_perfil || ""
        });
        setLoadingPerfil(false);
      })
      .catch(() => setLoadingPerfil(false));
    }
  }, [user, token]);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await axios.put("/api/me", form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const u = res.data.user;
      setForm({
        ...u,
        data_naixement: formatDate(u.data_naixement),
        foto_perfil: u.foto_perfil || ""
      });
      setMsg({ title: "Perfil actualitzat", text: "Els canvis s'han guardat correctament", color: "green" });
    } catch (err) {
      setMsg({ title: "Error", text: err.response?.data?.error || "Error actualitzant perfil", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const uploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("foto", file);
    const res = await axios.post("/api/me/foto", fd, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setForm({ ...form, foto_perfil: res.data.foto_perfil });
  };

  const eliminarFoto = async () => {
    await axios.put("/api/me", { ...form, foto_perfil: "" }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setForm({ ...form, foto_perfil: "" });
  };

  if (loading || loadingPerfil) return <Spinner />;

  const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    marginBottom: "12px",
    fontSize: "15px",
    fontFamily: "Lato, sans-serif",
    backgroundColor: "#fff",
    boxSizing: "border-box"
  };

  const labelStyle = {
    display: "block",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#666",
    marginBottom: "5px",
    textTransform: "uppercase",
    paddingLeft: "2px"
  };

  const btnSave = {
    padding: "14px",
    background: "#004c06",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    width: "100%",
    marginTop: "10px",
    fontFamily: "Lato, sans-serif",
    letterSpacing: "1px"
  };

  const getRoleBadge = () => {
    const roleStyles = {
      1: { text: "Caminant", bg: "#e8f5e9", color: "#2e7d32", border: "#c8e6c9" },
      2: { text: "Business", bg: "#e3f2fd", color: "#1565c0", border: "#bbdefb" },
      3: { text: "Admin", bg: "#fff3e0", color: "#e65100", border: "#ffe0b2" }
    };
    const r = roleStyles[user.role] || roleStyles[1];
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 15px",
        borderRadius: "20px",
        backgroundColor: r.bg,
        color: r.color,
        border: `1px solid ${r.border}`,
        fontSize: "12px",
        fontWeight: "bold",
        textTransform: "uppercase",
        marginBottom: "25px"
      }}>
        <span style={{ marginRight: "8px", fontSize: "10px" }}>●</span> {r.text}
      </div>
    );
  };

  const avatar = form.foto_perfil
    ? (
        <img
          src={form.foto_perfil?.startsWith('http') ? form.foto_perfil : `/uploads/${form.foto_perfil}`}
          alt="Foto perfil"
          style={{ width: "140px", height: "140px", borderRadius: "50%", objectFit: "cover", marginBottom: "15px", border: "3px solid #004c06", display: "block", marginLeft: "auto", marginRight: "auto" }}
        />
      )
    : (
        <div style={{ width: "140px", height: "140px", borderRadius: "50%", background: "#004c06", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "48px", fontWeight: "bold", marginBottom: "15px", marginLeft: "auto", marginRight: "auto" }}>
          {form.nom?.charAt(0)?.toUpperCase() || "?"}
        </div>
      );

  const EyeOpen = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="2"/>
    </svg>
  );

  const EyeClosed = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 3L21 21" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10.58 10.58C10.21 11 10 11.48 10 12C10 13.1 10.9 14 12 14C12.52 14 13 13.79 13.42 13.42" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6.53 6.53C4.5 8 3 10 1 12C3.5 17 7.5 20 12 20C13.7 20 15.3 19.6 16.76 18.9" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17.47 17.47C19.5 16 21 14 23 12C20.5 7 16.5 4 12 4C10.3 4 8.7 4.4 7.24 5.1" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const changePassword = async () => {
    try {
      setSaving(true);
      setConfirmPasswordModal(false);
      await axios.put("/api/me/password", passwordForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setMsg({ title: "Contrasenya actualitzada", text: "S'ha canviat amb èxit. Inicia sessió de nou.", color: "green", action: "logout" });
      setPasswordForm({ oldPassword: "", newPassword: "" });
    } catch (err) {
      setMsg({ title: "Error", text: err.response?.data?.error || "Error canviant la contrasenya", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      setConfirmDeleteModal(false);
      await axios.delete("/api/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setMsg({ title: "Compte eliminat", text: "El teu compte i totes les teves dades han estat eliminades.", color: "green", action: "logout" });
    } catch (err) {
      setMsg({ title: "Error", text: err.response?.data?.error || "Error eliminant el compte", color: "red" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ paddingTop: "90px", paddingBottom: "60px", maxWidth: "500px", margin: "0 auto", textAlign: "center", fontFamily: "Lato, sans-serif" }}>
      {saving && <Spinner />}
      {msg && (
        <Message 
          title={msg.title} 
          text={msg.text} 
          color={msg.color} 
          buttonText="Tancar" 
          onButtonClick={() => {
            if (msg.action === "logout") {
              setMsg(null);
              logout();
              navigate("/auth");
            } else {
              setMsg(null);
            }
          }} 
        />
      )}
      {confirmPasswordModal && (
        <ConfirmBox title="Canviar contrasenya" text="Estàs segur que vols canviar la contrasenya? Hauràs de tornar a iniciar sessió." onConfirm={changePassword} onCancel={() => setConfirmPasswordModal(false)} />
      )}
      {confirmDeleteModal && (
        <ConfirmBox title="Eliminar compte" text="Estàs segur que vols eliminar el teu compte? Aquesta acció no té marxa enrere." onConfirm={deleteAccount} onCancel={() => setConfirmDeleteModal(false)} />
      )}
      {confirmLogoutModal && (
        <ConfirmBox title="Tancar sessió" text="Estàs segur que vols tancar la sessió?" onConfirm={logout} onCancel={() => setConfirmLogoutModal(false)} />
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button onClick={() => navigate(-1)} style={{ background: "#5f6360", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "5px" }}>
          ← Tornar
        </button>
      </div>
      <h1 className="app-title">El meu perfil</h1>
      {getRoleBadge()}
      <div style={{ marginBottom: "30px" }}>
        {avatar}
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <label style={{ background: "#004c06", color: "white", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
            Canviar foto
            <input type="file" accept="image/*" onChange={uploadFoto} style={{ display: "none" }} />
          </label>
          {form.foto_perfil && (
            <button onClick={eliminarFoto} style={{ background: "none", color: "#b01a00", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "bold", textDecoration: "underline" }}>
              Eliminar
            </button>
          )}
        </div>
      </div>
      <div style={{ textAlign: "left", background: "#fdfdfd", padding: "25px", borderRadius: "16px", border: "1px solid #eee", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <label style={labelStyle}>Nom</label>
        <input style={inputStyle} name="nom" value={form.nom || ""} onChange={handle} />
        <label style={labelStyle}>Cognoms</label>
        <input style={inputStyle} name="cognoms" value={form.cognoms || ""} onChange={handle} />
        <label style={labelStyle}>Zona</label>
        <input style={inputStyle} name="zona" value={form.zona || ""} onChange={handle} />
        <div style={{ display: "flex", gap: "15px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Experiència</label>
            <input style={inputStyle} name="experiencia" type="number" placeholder="Anys" value={form.experiencia || ""} onChange={handle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Sexe</label>
            <select name="sexe" value={form.sexe || ""} onChange={handle} style={inputStyle}>
              <option value="">Selecciona</option>
              <option value="Home">Home</option>
              <option value="Dona">Dona</option>
              <option value="Sense gènere">Sense gènere</option>
            </select>
          </div>
        </div>
        <label style={labelStyle}>Data de naixement</label>
        <input style={inputStyle} type="date" name="data_naixement" value={form.data_naixement || ""} onChange={handle} />
        <button style={btnSave} onClick={save} disabled={saving}>{saving ? "GUARDANT CANVIS..." : "GUARDAR CANVIS"}</button>
      </div>
      <div style={{ textAlign: "left", background: "#fdfdfd", padding: "20px", borderRadius: "16px", border: "1px solid #eee", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#333", margin: "0" }}>Canviar contrasenya</h3>
          <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>{showPassword ? EyeOpen : EyeClosed}</div>
        </div>
        <div style={{ marginBottom: "12px" }}>
          <input style={{ ...inputStyle, marginBottom: 0 }} name="oldPassword" type={showPassword ? "text" : "password"} placeholder="Contrasenya actual" value={passwordForm.oldPassword} onChange={handlePasswordChange} />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <input style={{ ...inputStyle, marginBottom: 0 }} name="newPassword" type={showPassword ? "text" : "password"} placeholder="Nova contrasenya" value={passwordForm.newPassword} onChange={handlePasswordChange} />
        </div>
        <button onClick={() => setConfirmPasswordModal(true)} style={{ width: "100%", padding: "12px", background: "#fff", color: "#004c06", border: "2px solid #004c06", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }} disabled={saving || !passwordForm.oldPassword || !passwordForm.newPassword}>
          {saving ? "ACTUALITZANT CONTRASENYA..." : "ACTUALITZAR CONTRASENYA"}
        </button>
      </div>
      <div style={{ marginTop: "40px", textAlign: "center", display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" }}>
        <button onClick={() => setConfirmLogoutModal(true)} style={{ background: "none", color: "#888", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "13px", textDecoration: "underline" }}>Tancar sessió</button>
        <button onClick={() => setConfirmDeleteModal(true)} disabled={deleting} style={{ background: "none", color: "#b01a00", border: "none", cursor: deleting ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "13px", textDecoration: "underline", opacity: deleting ? 0.6 : 1 }}>
          {deleting ? "Eliminant compte..." : "Eliminar compte"}
        </button>
      </div>
    </div>
  );
}