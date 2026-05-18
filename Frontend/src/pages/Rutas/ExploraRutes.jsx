import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./ExploraRutes.css";

const DIFICULTATS = ["Molt fàcil", "Fàcil", "Mitjana", "Difícil", "Expert"];

//Vista de llistat de rutes amb filtratge per zona, dificultat i distancia
export default function ExploraRutes() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [rutes, setRutes] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [favorits, setFavorits] = useState(new Set());
  const [favLoading, setFavLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [zona, setZona] = useState("");
  const [dificultat, setDificultat] = useState("");
  const [distanciaMax, setDistanciaMax] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const loadRutes = async (customPage = page, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const offset = (customPage - 1) * PAGE_SIZE;
      const res = await axios.get("/api/rutes-explora", {
        params: {
          search,
          zona,
          dificultat,
          distanciaMax,
          limit: PAGE_SIZE + 1,
          offset
        }
      });
      const rows = res.data.rutes || [];
      const hasMore = rows.length > PAGE_SIZE;
      setRutes(rows.slice(0, PAGE_SIZE));
      setHasNextPage(hasMore);
      if (!silent) setLoading(false);
      return rows;
    } catch (err) {
      console.error(err);
      if (!silent) setLoading(false);
      return null;
    }
  };

  const loadZones = async () => {
    try {
      const res = await axios.get("/api/rutes/zones");
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
        params: { type: "rutes", limit: 999, offset: 0 }
      });
      const ids = new Set(
        (res.data.favorits || []).map(f => f.id_ruta).filter(Boolean)
      );
      setFavorits(ids);
    } catch (err) {
      console.error("Error carregant favorits", err);
    }
  };

  const toggleFavorit = async (e, id_ruta) => {
    e.stopPropagation();
    if (!token || favLoading) return;
    setFavLoading(true);
    try {
      const res = await axios.post(
        "/api/favorits/toggle",
        { id_ruta },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFavorits(prev => {
        const next = new Set(prev);
        res.data.isFavorit ? next.add(id_ruta) : next.delete(id_ruta);
        return next;
      });
    } catch (err) {
      console.error("Error toggle favorit", err);
    } finally {
      setFavLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
    loadFavorits();
    setFullyLoaded(true);
  }, []);

  useEffect(() => {
    if (fullyLoaded) {
      loadRutes(page);
    }
  }, [page, zona, dificultat, search]); // Don't include distanciaMax unless we want it to search as we type

  useEffect(() => {
    if (!fullyLoaded) return;
    const interval = setInterval(() => {
      loadRutes(page, true);
      loadFavorits();
    }, 5000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadRutes(page, true);
        loadFavorits();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [page, search, zona, dificultat, distanciaMax, token, fullyLoaded]);

  const buscar = useCallback(async () => {
    setPage(1);
    await loadRutes(1);
  }, [search, zona, dificultat, distanciaMax]);

  const nextPage = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    if (page > 1) setPage(p => p - 1);
  }, [page]);

  const canGoPrev = page > 1;
  const canGoNext = hasNextPage;

  if (!fullyLoaded) return <div className="explora-rutes-full-spinner"><Spinner /></div>;

  return (
    <div className="explora-rutes-page">
      <div className="explora-rutes-header-row">
        <h1 className="app-title">Explora Rutes</h1>
        {user && (
          <button className="explora-rutes-my-btn" onClick={() => navigate("/me/rutes")}>
            Les meves rutes
          </button>
        )}
      </div>

      <div className="explora-rutes-filter-card">
        <div className="explora-rutes-filter-row">
          <div className="explora-rutes-search-wrapper">
            <input
              className="explora-rutes-input"
              placeholder="Cercar ruta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
            {search.length > 0 && (
              <span className="explora-rutes-clear-x" onClick={() => { setSearch(""); setPage(1); }}>✕</span>
            )}
          </div>

          <select
            className="explora-rutes-select"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
          >
            <option value="">Totes les zones</option>
            {zones.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          <select
            className="explora-rutes-select"
            value={dificultat}
            onChange={(e) => setDificultat(e.target.value)}
          >
            <option value="">Totes les dificultats</option>
            {DIFICULTATS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <div className="explora-rutes-small-input-wrapper">
            <input
              className="explora-rutes-input"
              placeholder="Distància màx (km)"
              value={distanciaMax}
              onChange={(e) => setDistanciaMax(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
          </div>

          <button className="explora-rutes-search-btn" onClick={buscar}>
            Buscar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: "40px", display: "flex", justifyContent: "center" }}>
          <Spinner />
        </div>
      ) : (
        <>
          {rutes.length === 0 && (
            <p className="explora-rutes-no-results">No s'han trobat rutes amb aquests criteris.</p>
          )}

          <div className="explora-rutes-grid">
            {rutes.map(r => {
              const fotos = r.fotos ? r.fotos.split(",") : [];
              const esAutor = user && user.id === r.id_usuari;
              const esFavorit = favorits.has(r.id_ruta);
              return (
                <div
                  key={r.id_ruta}
                  className="explora-rutes-card"
                  onClick={() => navigate(`/rutes/${r.id_ruta}`)}
                >
                  <div className="explora-rutes-photo-box">
                    {fotos.length > 0 ? (
                      <img
                        src={fotos[0]?.startsWith('http') ? fotos[0] : `/uploads/${fotos[0]}`}
                        className="explora-rutes-photo"
                        alt={r.nom}
                      />
                    ) : (
                      <img
                        src="/OutTrail-sinfondo.png"
                        className="explora-rutes-photo"
                        alt="Sense foto"
                      />
                    )}
                    {user && (!esAutor || user.role === 3) && (
                      <div
                        className="explora-rutes-heart"
                        style={{ opacity: favLoading ? 0.6 : 1, pointerEvents: favLoading ? "none" : "auto" }}
                        onClick={(e) => toggleFavorit(e, r.id_ruta)}
                      >
                        {esFavorit ? "❤️" : "🤍"}
                      </div>
                    )}
                  </div>
                  <div className="explora-rutes-card-info">
                    <div className="explora-rutes-name">{r.nom}</div>
                    <div className="explora-rutes-info">📍 {r.zona || "—"}</div>
                    <div className="explora-rutes-info">⛰️ {r.dificultat || "—"}</div>
                    <div className="explora-rutes-info">📏 {r.distancia_km || "0"} km</div>
                    <div className="explora-rutes-info">⭐ {Number(r.valoracio_mitjana || 0).toFixed(1)} / 5</div>
                    <div className="explora-rutes-owner">Autor: @{r.autor_username}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="explora-rutes-pagination">
            <button
              className="explora-rutes-page-btn"
              onClick={canGoPrev ? prevPage : undefined}
              disabled={!canGoPrev}
            >
              Anterior
            </button>
            <span className="explora-rutes-page-number">Pàgina {page}</span>
            <button
              className="explora-rutes-page-btn"
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
