import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "./Perfils.css";

//Pantalla d'exploracio d'usuaris amb filtres per zona, experiencia i rol
export default function Perfils() {
  const { token, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [search, setSearch] = useState("");
  const [zona, setZona] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [roleFilter, setRoleFilter] = useState("tots");
  const [page, setPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const PAGE_SIZE = 5;

  const loadZones = async () => {
    try {
      const res = await axios.get("/api/users/zones", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setZones(res.data.zones);
    } catch (err) {}
  };

  const loadUsers = async (customPage = page, allowEmpty = true, silent = false) => {
    if (!silent) setLoadingUsers(true);
    try {
      const res = await axios.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, zona, experiencia, role: roleFilter, page: customPage, limit: PAGE_SIZE }
      });
      const rows = res.data.users || [];
      if (!allowEmpty && rows.length === 0) {
        if (!silent) setLoadingUsers(false);
        return null;
      }
      setUsers(rows);
      if (!silent) setLoadingUsers(false);
      return rows;
    } catch (err) {
      if (!silent) setLoadingUsers(false);
      return null;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadZones();
    setFullyLoaded(true);
  }, [authLoading]);

  useEffect(() => {
    if (fullyLoaded) {
      loadUsers(page);
    }
  }, [page, search, zona, experiencia, roleFilter]);

  useEffect(() => {
    if (!fullyLoaded || authLoading) return;
    const interval = setInterval(() => {
      loadUsers(page, true, true);
    }, 5000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadUsers(page, true, true);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [authLoading, page, search, zona, experiencia, roleFilter, token, fullyLoaded]);

  const buscar = () => {
    setPage(1);
  };

  const nextPage = () => {
    setPage(p => p + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const canGoPrev = page > 1;
  const canGoNext = users.length === PAGE_SIZE;

  const follow = async (id) => {
    setActionLoading(id);
    setGlobalLoading(true);
    try {
      await axios.post(`/api/follow/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await new Promise((r) => setTimeout(r, 200));
      await loadUsers(page);
    } catch (err) {}
    setActionLoading(null);
    setGlobalLoading(false);
  };

  const unfollow = async (id) => {
    setActionLoading(id);
    setGlobalLoading(true);
    try {
      await axios.delete(`/api/follow/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await new Promise((r) => setTimeout(r, 200));
      await loadUsers(page);
    } catch (err) {}
    setActionLoading(null);
    setGlobalLoading(false);
  };

  if (!fullyLoaded) return <div className="full-spinner"><Spinner /></div>;

  const renderRoleBadge = (id_role) => {
    if (id_role === 1) return <span className="role-caminant">Caminant</span>;
    if (id_role === 2) return <span className="role-business">Business</span>;
    return null;
  };

  return (
    <div className="perfils-page">
      {globalLoading && <div className="overlay"><Spinner /></div>}
      <div className="header-row">
        <h1 className="app-title">Explora Perfils</h1>
        <button className="following-btn" onClick={() => navigate("/perfils/seguits")}>Gent que segueixes</button>
      </div>
      <h2 className="subtitle">Cercar perfils</h2>
      <div className="filter-card">
        <div className="filter-row-one-line">
          <div className="search-wrapper">
            <input className="input" placeholder="Nom o username" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
            {search.length > 0 && <span className="clear-x" onClick={() => setSearch("")}>✕</span>}
          </div>
          <select className="select" value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">Zona</option>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <div className="search-wrapper">
            <input className="input" placeholder="Experiència (anys)" value={experiencia} onChange={(e) => { const val = e.target.value; if (/^\d*$/.test(val)) setExperiencia(val); }} onKeyDown={(e) => e.key === "Enter" && buscar()} />
            {experiencia.length > 0 && <span className="clear-x" onClick={() => setExperiencia("")}>✕</span>}
          </div>
          <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="tots">Rol</option>
            <option value="caminant">Caminant</option>
            <option value="business">Business</option>
          </select>
          <button className="search-btn" onClick={buscar}>Buscar</button>
        </div>
      </div>
      {loadingUsers && <div style={{ marginTop: "40px", display: "flex", justifyContent: "center" }}><Spinner /></div>}
      {!loadingUsers && users.length === 0 && <p className="no-results">No s’han trobat perfils.</p>}
      <div className="list">
        {users.map((u) => (
          <div key={u.id_usuari} className="card" onClick={() => navigate(`/perfils/${u.id_usuari}`)}>
            <div className="card-left">
              <div className="avatar">
                {u.foto_perfil ? (
                  <img src={u.foto_perfil?.startsWith('http') ? u.foto_perfil : `/uploads/${u.foto_perfil}`} className="avatar-img" />
                ) : (
                  <span className="avatar-letter">{u.nom.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="name">{u.nom} {u.cognoms}</div>
                <div className="username">@{u.username}</div>
                <div className="info">
                  {renderRoleBadge(u.id_role)}
                  {u.zona && <span>📍 {u.zona}</span>}
                  {u.experiencia && <span>🏃 {u.experiencia} anys</span>}
                </div>
              </div>
            </div>
            {u.id_usuari !== user.id_usuari && (
              <button
                className={u.is_following ? "unfollow-btn" : "follow-btn"}
                onClick={(e) => { e.stopPropagation(); u.is_following ? unfollow(u.id_usuari) : follow(u.id_usuari); }}
                disabled={actionLoading === u.id_usuari}
              >
                {actionLoading === u.id_usuari ? (u.is_following ? "Deixant..." : "Seguint...") : (u.is_following ? "Deixar" : "Seguir")}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="pagination">
        <button className={canGoPrev ? "page-btn" : "page-btn-disabled"} onClick={canGoPrev ? prevPage : undefined} disabled={!canGoPrev}> Anterior </button>
        <span className="page-number">Pàgina {page}</span>
        <button className={canGoNext ? "page-btn" : "page-btn-disabled"} onClick={canGoNext ? nextPage : undefined} disabled={!canGoNext}> Següent </button>
      </div>
    </div>
  );
}