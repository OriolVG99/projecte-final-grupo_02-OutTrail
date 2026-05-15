import { useAuth } from "../../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import "./AdminUserEdit.css";

export default function AdminUserEdit() {
  const { token, user, logout, loading: authLoading } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmPasswordModal, setConfirmPasswordModal] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    cognoms: "",
    username: "",
    email: "",
    zona: "",
    experiencia: "",
    sexe: "",
    data_naixement: "",
    id_role: 1,
    validated: true,
    foto_perfil: ""
  });

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString || dateString === "0000-00-00") return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!authLoading) {
      axios.get(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const u = res.data.user;
        setForm({
          ...u,
          data_naixement: formatDate(u.data_naixement)
        });
        setLoadingUser(false);
      })
      .catch(() => {
        setMsg({ 
          title: "Error", 
          text: "No s'ha pogut carregar l'usuari", 
          color: "red",
          buttonText: "D'acord",
          onButtonClick: () => navigate("/admin")
        });
        setLoadingUser(false);
      });
    }
  }, [id, token, authLoading, navigate]);

  const handle = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const save = async () => {
    try {
      setSaving(true);
      await axios.put(`/api/admin/users/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg({ 
        title: "Usuari actualitzat", 
        text: "Les dades s'han guardat correctament", 
        color: "green",
        buttonText: "D'acord"
      });
    } catch (err) {
      setMsg({ 
        title: "Error", 
        text: err.response?.data?.error || "Error actualitzant usuari", 
        color: "red",
        buttonText: "D'acord"
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      setSaving(true);
      setConfirmPasswordModal(false);
      await axios.put(`/api/admin/users/${id}/password`, { newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg({ 
        title: "Contrasenya actualitzada", 
        text: "La contrasenya s'ha canviat amb èxit", 
        color: "green",
        buttonText: "D'acord"
      });
      setNewPassword("");
    } catch (err) {
      setMsg({ 
        title: "Error", 
        text: err.response?.data?.error || "Error canviant la contrasenya", 
        color: "red",
        buttonText: "D'acord"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setDeleting(true);
      await axios.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfirmDeleteModal(false);

      // Si l'admin s'ha esborrat a si mateix, tancar sessió
      if (user && String(user.id) === String(id)) {
        logout();
        navigate("/auth");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setConfirmDeleteModal(false);
      setMsg({ 
        title: "Error", 
        text: err.response?.data?.error || "Error eliminant l'usuari", 
        color: "red",
        buttonText: "D'acord"
      });
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loadingUser) return <Spinner />;

  return (
    <div className="admin-edit-page">
      {saving && <Spinner />}
      {msg && (
        <Message 
          title={msg.title} 
          text={msg.text} 
          color={msg.color} 
          buttonText={msg.buttonText || "D'acord"} 
          onButtonClick={msg.onButtonClick || (() => setMsg(null))} 
        />
      )}
      {confirmPasswordModal && (
        <ConfirmBox title="Canviar contrasenya" text="Estàs segur que vols canviar la contrasenya d'aquest usuari?" onConfirm={changePassword} onCancel={() => setConfirmPasswordModal(false)} />
      )}
      {confirmDeleteModal && (
        <ConfirmBox 
          title="Eliminar usuari" 
          text="Estàs segur que vols eliminar aquest compte? Aquesta acció no té marxa enrere." 
          onConfirm={deleteAccount} 
          onCancel={() => setConfirmDeleteModal(false)} 
          loading={deleting}
        />
      )}

      <div className="admin-edit-header">
        <button onClick={() => navigate("/admin")} className="btn-back">← Tornar al llistat</button>
        <h1 className="admin-edit-title">Editar Usuari</h1>
        <p className="admin-edit-subtitle">Administració de dades de @{form.username}</p>
      </div>

      <div className="admin-edit-container">
        <div className="admin-edit-card">
          <h2 className="section-title">Informació del Compte</h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Nom</label>
              <input name="nom" value={form.nom || ""} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Cognoms</label>
              <input name="cognoms" value={form.cognoms || ""} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input name="username" value={form.username || ""} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" value={form.email || ""} onChange={handle} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Zona</label>
              <input name="zona" value={form.zona || ""} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Experiència (anys)</label>
              <input name="experiencia" type="number" value={form.experiencia || ""} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Sexe</label>
              <select name="sexe" value={form.sexe || ""} onChange={handle}>
                <option value="">Selecciona</option>
                <option value="Home">Home</option>
                <option value="Dona">Dona</option>
                <option value="Sense gènere">Sense gènere</option>
              </select>
            </div>
            <div className="form-group">
              <label>Data de naixement</label>
              <input type="date" name="data_naixement" value={form.data_naixement || ""} onChange={handle} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Rol</label>
              <select name="id_role" value={form.id_role} onChange={handle}>
                <option value={1}>Caminant</option>
                <option value={2}>Business</option>
                <option value={3}>Administrador</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" name="validated" checked={form.validated} onChange={handle} />
                Usuari Validat
              </label>
            </div>
          </div>

          <button className="btn-save-admin" onClick={save} disabled={saving}>
            {saving ? "Guardant..." : "Guardar Canvis"}
          </button>
        </div>

        <div className="admin-edit-card password-card">
          <h2 className="section-title">Canviar Contrasenya</h2>
          <p className="password-info">Com a administrador, pots canviar la contrasenya de l'usuari sense saber l'actual.</p>
          
          <div className="form-group">
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Nova contrasenya" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
              />
              <button className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <button 
            className="btn-password-admin" 
            onClick={() => setConfirmPasswordModal(true)} 
            disabled={!newPassword || saving}
          >
            Actualitzar Contrasenya
          </button>
        </div>

        <div className="admin-edit-card danger-card">
          <h2 className="section-title">Zona de Perill</h2>
          <p>Eliminar permanentment aquest usuari i totes les seves dades associades.</p>
          <button className="btn-delete-admin" onClick={() => setConfirmDeleteModal(true)} disabled={deleting}>
            {deleting ? "Eliminant..." : "Eliminar Usuari"}
          </button>
        </div>
      </div>
    </div>
  );
}
