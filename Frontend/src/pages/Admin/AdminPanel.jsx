import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import Message from "../../components/Message.jsx";
import "./AdminPanel.css";

export default function AdminPanel() {
  const { token, user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [zona, setZona] = useState("");
  const [roleFilter, setRoleFilter] = useState("tots");
  const [page, setPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [zones, setZones] = useState([]);
  const PAGE_SIZE = 10;

  const loadZones = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/users/zones", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setZones(res.data.zones);
    } catch (err) {}
  };

  const loadUsers = async (customPage = page) => {
    setLoadingUsers(true);
    try {
      const res = await axios.get("http://localhost:4000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, zona, role: roleFilter, page: customPage, limit: PAGE_SIZE }
      });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setLoadingUsers(false);
    } catch (err) {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      const init = async () => {
        await loadZones();
        await loadUsers(1);
        setFullyLoaded(true);
      };
      init();
    }
  }, [authLoading]);

  const buscar = () => {
    setPage(1);
    loadUsers(1);
  };

  const nextPage = () => {
    if (page * PAGE_SIZE < total) {
      const newPage = page + 1;
      setPage(newPage);
      loadUsers(newPage);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      loadUsers(newPage);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await axios.delete(`http://localhost:4000/api/admin/users/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const wasSelf = user && String(user.id) === String(deleteId);
      setDeleteId(null);

      if (wasSelf) {
        logout();
        navigate("/auth");
      } else {
        setMsg({ 
          title: "Èxit", 
          text: "Usuari i totes les seves dades eliminades correctament.", 
          color: "green",
          buttonText: "D'acord"
        });
        loadUsers(page);
      }
    } catch (err) {
      setMsg({ 
        title: "Error", 
        text: "No s'ha pogut eliminar l'usuari. Revisa que no hi hagi problemes de connexió.", 
        color: "red",
        buttonText: "D'acord"
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!fullyLoaded) return <div className="full-spinner"><Spinner /></div>;

  const renderRoleBadge = (id_role) => {
    if (id_role === 1) return <span className="admin-role-badge role-caminant">Caminant</span>;
    if (id_role === 2) return <span className="admin-role-badge role-business">Business</span>;
    if (id_role === 3) return <span className="admin-role-badge role-admin">Admin</span>;
    return null;
  };

  return (
    <div className="admin-panel">
      {msg && (
        <Message 
          title={msg.title} 
          text={msg.text} 
          color={msg.color} 
          buttonText={msg.buttonText || "D'acord"} 
          onButtonClick={() => setMsg(null)} 
        />
      )}
      {deleteId && (
        <ConfirmBox
          title="Eliminar Usuari"
          text="Estàs segur que vols eliminar aquest usuari i totes les seves dades? Aquesta acció és irreversible."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}

      <div className="admin-header">
        <h1 className="admin-title">Panell d'Administració</h1>
        <p className="admin-subtitle">Gestió d'usuaris i permisos</p>
        <button className="admin-requests-btn" onClick={() => navigate("/admin/business-requests")}>
          📋 Sol·licituds Business
        </button>
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <input
            className="admin-input"
            placeholder="Cerca per nom, email o username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <select className="admin-select" value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">Totes les zones</option>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select className="admin-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="tots">Tots els rols</option>
            <option value="caminant">Caminant</option>
            <option value="business">Business</option>
            <option value="admin">Admin</option>
          </select>
          <button className="admin-btn-search" onClick={buscar}>Filtrar</button>
        </div>
      </div>

      {loadingUsers ? (
        <div className="admin-loading"><Spinner /></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuari</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estat</th>
                <th>Accions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id_usuari}>
                  <td>{u.id_usuari}</td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-mini">
                        {u.foto_perfil ? (
                          <img src={`http://localhost:4000/uploads/${u.foto_perfil}`} alt="" />
                        ) : (
                          <span>{u.nom.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="user-name">{u.nom} {u.cognoms}</div>
                        <div className="user-username">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{renderRoleBadge(u.id_role)}</td>
                  <td>
                    {u.validated ? (
                      <span className="status-validated">Validat</span>
                    ) : (
                      <span className="status-pending">Pendent</span>
                    )}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-edit" onClick={() => navigate(`/admin/users/${u.id_usuari}`)}>Editar</button>
                      <button className="btn-delete" onClick={() => setDeleteId(u.id_usuari)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="no-results">No s'han trobat usuaris.</p>}
        </div>
      )}

      <div className="admin-pagination">
        <button disabled={page === 1} onClick={prevPage}>Anterior</button>
        <span>Pàgina {page} de {Math.ceil(total / PAGE_SIZE) || 1}</span>
        <button disabled={page * PAGE_SIZE >= total} onClick={nextPage}>Següent</button>
      </div>
    </div>
  );
}
