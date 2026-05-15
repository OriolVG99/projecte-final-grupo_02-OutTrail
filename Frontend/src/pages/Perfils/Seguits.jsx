import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import "./Seguits.css";

//Pantalla que llista els usuaris que l'usuari actual segueix, amb opcio de deixar de seguir
export default function Seguits() {
  const { token, loading: authLoading } = useAuth();
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
  const [confirm, setConfirm] = useState(null);
  const PAGE_SIZE = 5;

  const loadZones = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/users/zones", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setZones(res.data.zones);
    } catch (err) {}
  };

  const loadFollowing = async (customPage = page, allowEmpty = true) => {
    setLoadingUsers(true);
    try {
      const res = await axios.get("http://localhost:4000/api/users/following", {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, zona, experiencia, role: roleFilter, page: customPage, limit: PAGE_SIZE }
      });
      const rows = res.data.users || [];
      if (!allowEmpty && rows.length === 0) {
        setLoadingUsers(false);
        return null;
      }
      setUsers(rows);
      setLoadingUsers(false);
      return rows;
    } catch (err) {
      setLoadingUsers(false);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!authLoading) {
        await loadZones();
        await loadFollowing(1);
        setFullyLoaded(true);
      }
    };
    init();
  }, [authLoading]);

  const buscar = async () => {
    setPage(1);
    await loadFollowing(1);
  };

  const nextPage = async () => {
    const newPage = page + 1;
    const rows = await loadFollowing(newPage, false);
    if (!rows) return;
    setPage(newPage);
  };

  const prevPage = async () => {
    if (page === 1) return;
    const newPage = page - 1;
    const rows = await loadFollowing(newPage, false);
    if (!rows) return;
    setPage(newPage);
  };

  const canGoPrev = page > 1;
  const canGoNext = users.length === PAGE_SIZE;

  const handleUnfollowClick = (e, u) => {
    e.stopPropagation();
    setConfirm({
      text: `Estàs segur que vols deixar de seguir a ${u.nom} (@${u.username})?`,
      onConfirm: () => unfollow(u.id_usuari)
    });
  };

  const unfollow = async (id) => {
    setActionLoading(id);
    setGlobalLoading(true);
    try {
      await axios.delete(`http://localhost:4000/api/follow/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadFollowing(page);
    } catch (err) {}
    setActionLoading(null);
    setGlobalLoading(false);
    setConfirm(null);
  };

  if (!fullyLoaded) return <div className="seguits-full-spinner"><Spinner /></div>;

  const renderRoleBadge = (id_role) => {
    if (id_role === 1) return <span className="seguits-role-caminant">Caminant</span>;
    if (id_role === 2) return <span className="seguits-role-business">Business</span>;
    return null;
  };

  return (
    <div className="seguits-page">
      {confirm && <ConfirmBox text={confirm.text} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {globalLoading && <div className="seguits-overlay"><Spinner /></div>}
      <div className="seguits-header-row">
        <h1 className="app-title">Gent que segueixes</h1>
        <button className="seguits-back-btn" onClick={() => navigate(-1)}>← Tornar</button>
      </div>
      <h2 className="seguits-subtitle">Filtrar seguits</h2>
      <div className="seguits-filter-card">
        <div className="seguits-filter-row-one-line">
          <div className="seguits-search-wrapper">
            <input className="seguits-input" placeholder="Nom o username" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
            {search.length > 0 && <span className="seguits-clear-x" onClick={() => setSearch("")}>✕</span>}
          </div>
          <select className="seguits-select" value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">Zona</option>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <div className="seguits-search-wrapper">
            <input className="seguits-input" placeholder="Experiència (anys)" value={experiencia} onChange={(e) => { const val = e.target.value; if (/^\d*$/.test(val)) setExperiencia(val); }} onKeyDown={(e) => e.key === "Enter" && buscar()} />
            {experiencia.length > 0 && <span className="seguits-clear-x" onClick={() => setExperiencia("")}>✕</span>}
          </div>
          <select className="seguits-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="tots">Rol</option>
            <option value="caminant">Caminant</option>
            <option value="business">Business</option>
          </select>
          <button className="seguits-search-btn" onClick={buscar}>Buscar</button>
        </div>
      </div>
      {loadingUsers && <div style={{ marginTop: "40px", display: "flex", justifyContent: "center" }}><Spinner /></div>}
      {!loadingUsers && users.length === 0 && <p className="seguits-no-results">No segueixes ningú amb aquests filtres.</p>}
      <div className="seguits-list">
        {users.map((u) => (
          <div key={u.id_usuari} className="seguits-card" onClick={() => navigate(`/perfils/${u.id_usuari}`)}>
            <div className="seguits-card-left">
              <div className="seguits-avatar">
                {u.foto_perfil ? (
                  <img src={`http://localhost:4000/uploads/${u.foto_perfil}`} className="seguits-avatar-img" />
                ) : (
                  <span className="seguits-avatar-letter">{u.nom.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="seguits-name">{u.nom} {u.cognoms}</div>
                <div className="seguits-username">@{u.username}</div>
                <div className="seguits-info">
                  {renderRoleBadge(u.id_role)}
                  {u.zona && <span>📍 {u.zona}</span>}
                  {u.experiencia && <span>🏃 {u.experiencia} anys</span>}
                </div>
              </div>
            </div>
            <button className="seguits-unfollow-btn" onClick={(e) => handleUnfollowClick(e, u)} disabled={actionLoading === u.id_usuari}>
              {actionLoading === u.id_usuari ? "Deixant..." : "Deixar de seguir"}
            </button>
          </div>
        ))}
      </div>
      <div className="seguits-pagination">
        <button className={canGoPrev ? "seguits-page-btn" : "seguits-page-btn-disabled"} onClick={canGoPrev ? prevPage : undefined} disabled={!canGoPrev}>Anterior</button>
        <span className="seguits-page-number">Pàgina {page}</span>
        <button className={canGoNext ? "seguits-page-btn" : "seguits-page-btn-disabled"} onClick={canGoNext ? nextPage : undefined} disabled={!canGoNext}>Següent</button>
      </div>
    </div>
  );
}