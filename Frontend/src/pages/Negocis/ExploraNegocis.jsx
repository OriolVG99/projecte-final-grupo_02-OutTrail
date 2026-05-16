import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./ExploraNegocis.css";

const TIPUS_NEGOCI = [
  "Restaurant", "Botiga", "Bar", "Hotel", "Cafeteria", "Supermercat", "Farmàcia", "Gimnàs"
];

//Vista de llistat de negocis amb filtres de cerca, zona i categoria
export default function ExploraNegocis() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [negocis, setNegocis] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [favorits, setFavorits] = useState(new Set());
  const [favLoading, setFavLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [zona, setZona] = useState("");
  const [tipus, setTipus] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const loadNegocis = async (customPage = page) => {
    setLoading(true);
    try {
      const offset = (customPage - 1) * PAGE_SIZE;
      const res = await axios.get("/api/negocis", {
        params: { search, zona, tipus, limit: PAGE_SIZE + 1, offset }
      });
      const rows = res.data.negocis || [];
      const hasMore = rows.length > PAGE_SIZE;
      setNegocis(rows.slice(0, PAGE_SIZE));
      setHasNextPage(hasMore);
      setLoading(false);
      return rows;
    } catch (err) {
      console.error(err);
      setLoading(false);
      return null;
    }
  };

  const loadZones = async () => {
    try {
      const res = await axios.get("/api/negocis/zones");
      setZones(res.data.zones || []);
    } catch (err) {
      console.error("Error carregant zones", err);
    }
  };

  const loadFavorits = async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/favorits/me", {
        headers: { Authorization: `Bearer ${token}` },
        params: { type: "negocis", limit: 999, offset: 0 }
      });
      const ids = new Set(
        (res.data.favorits || []).map(f => f.id_negoci).filter(Boolean)
      );
      setFavorits(ids);
    } catch (err) {
      console.error("Error carregant favorits", err);
    }
  };

  const toggleFavorit = async (e, id_negoci) => {
    e.stopPropagation();
    if (!token || favLoading) return;
    setFavLoading(true);
    try {
      const res = await axios.post(
        "/api/favorits/toggle",
        { id_negoci },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFavorits(prev => {
        const next = new Set(prev);
        res.data.isFavorit ? next.add(id_negoci) : next.delete(id_negoci);
        return next;
      });
    } catch (err) {
      console.error("Error toggle favorit", err);
    } finally {
      setFavLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadNegocis(1);
      await loadZones();
      await loadFavorits();
      setFullyLoaded(true);
    };
    init();
  }, []);

  const buscar = useCallback(async () => {
    setPage(1);
    await loadNegocis(1);
  }, [search, zona, tipus]);

  const nextPage = useCallback(async () => {
    const newPage = page + 1;
    await loadNegocis(newPage);
    setPage(newPage);
  }, [page, search, zona, tipus]);

  const prevPage = useCallback(async () => {
    if (page === 1) return;
    const newPage = page - 1;
    await loadNegocis(newPage);
    setPage(newPage);
  }, [page, search, zona, tipus]);

  const canGoPrev = page > 1;
  const canGoNext = hasNextPage;

  if (!fullyLoaded) return <div className="negocis-full-spinner"><Spinner /></div>;

  return (
    <div className="negocis-page">
      <div className="negocis-header-row">
        <h1 className="app-title">Explora Negocis</h1>
        {(user?.role === 2 || user?.role === 3) && (
          <button className="negocis-my-btn" onClick={() => navigate("/me/negocis")}>
            Els meus negocis
          </button>
        )}
      </div>

      <div className="negocis-filter-card">
        <div className="negocis-filter-row-one-line">
          <div className="negocis-search-wrapper">
            <input
              className="negocis-input"
              placeholder="Cercar negoci..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
            {search.length > 0 && (
              <span className="negocis-clear-x" onClick={() => { setSearch(""); setPage(1); }}>✕</span>
            )}
          </div>
          <select className="negocis-select" value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">Totes les zones</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select className="negocis-select" value={tipus} onChange={(e) => setTipus(e.target.value)}>
            <option value="">Totes les categories</option>
            {TIPUS_NEGOCI.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="negocis-search-btn" onClick={buscar}>Buscar</button>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: "40px", display: "flex", justifyContent: "center" }}>
          <Spinner />
        </div>
      ) : (
        <>
          {negocis.length === 0 && (
            <p className="negocis-no-results">No s'han trobat negocis amb aquests criteris.</p>
          )}
          <div className="negocis-grid">
            {negocis.map(n => {
              const fotos = n.fotos ? n.fotos.split(",") : [];
              const esPropietari = user && user.id === n.id_usuari;
              const esFavorit = favorits.has(n.id_negoci);
              return (
                <div key={n.id_negoci} className="negocis-card" onClick={() => navigate(`/negocis/${n.id_negoci}`)}>
                  <div className="negocis-photo-box">
                    {fotos.length > 0 ? (
                      <img src={fotos[0]?.startsWith('http') ? fotos[0] : `/uploads/${fotos[0]}`} className="negocis-photo" alt={n.nom} />
                    ) : (
                      <img src="/OutTrail-sinfondo.png" className="negocis-photo" alt="Sense foto" />
                    )}
                    {user && (!esPropietari || user.role === 3) && (
                      <div
                        className="negocis-heart"
                        style={{ opacity: favLoading ? 0.6 : 1, pointerEvents: favLoading ? "none" : "auto" }}
                        onClick={(e) => toggleFavorit(e, n.id_negoci)}
                      >
                        {esFavorit ? "❤️" : "🤍"}
                      </div>
                    )}
                  </div>
                  <div className="negocis-card-info">
                    <div className="negocis-name">{n.nom}</div>
                    <div className="negocis-info">📍 {n.zona || "—"}</div>
                    <div className="negocis-info">🏷️ {n.tipus || "—"}</div>
                    <div className="negocis-info">⭐ {Number(n.valoracio_mitjana || 0).toFixed(1)} / 5</div>
                    <div className="negocis-owner">Propietari: @{n.propietari_username}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="negocis-pagination">
            <button
              className={canGoPrev ? "negocis-page-btn" : "negocis-page-btn-disabled"}
              onClick={canGoPrev ? prevPage : undefined}
              disabled={!canGoPrev}
            >
              Anterior
            </button>
            <span className="negocis-page-number">Pàgina {page}</span>
            <button
              className={canGoNext ? "negocis-page-btn" : "negocis-page-btn-disabled"}
              onClick={canGoNext ? nextPage : undefined}
              disabled={!canGoNext}
            >
              Següent
            </button>
          </div>
        </>
      )}
    </div>
  );
}