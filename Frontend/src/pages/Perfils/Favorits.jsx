import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import "./Favorits.css";

//Pantalla que mostra les rutes i negocis marcats com a favorits per l'usuari
export default function Favorits() {
  const { token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [favorits, setFavorits] = useState([]);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(location.state?.tab || "rutes");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const PAGE_SIZE = 6;

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
  };

  useEffect(() => {
    if (authLoading || !token) return;
    loadFavorits(page, activeTab);
  }, [token, page, activeTab, authLoading]);

  useEffect(() => {
    if (authLoading || !token) return;
    const interval = setInterval(() => {
      loadFavorits(page, activeTab, true);
    }, 5000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadFavorits(page, activeTab, true);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [token, page, activeTab, authLoading]);

  const loadFavorits = async (customPage = 1, tab = activeTab, silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const res = await axios.get("/api/favorits/me", {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: PAGE_SIZE + 1, offset: (customPage - 1) * PAGE_SIZE, type: tab === "rutes" ? "rutes" : "negocis" }
      });
      const data = res.data.favorits || [];
      const hasMore = data.length > PAGE_SIZE;
      setFavorits(data.slice(0, PAGE_SIZE));
      setHasNextPage(hasMore);
    } catch (err) {
      console.error("Error carregant favorits", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const toggleFavorit = async (e, id_ruta, id_negoci) => {
    e.stopPropagation();
    if (toggleLoading) return;
    setToggleLoading(true);
    try {
      await axios.post("/api/favorits/toggle", { id_ruta, id_negoci }, { headers: { Authorization: `Bearer ${token}` } });
      const wouldRemain = favorits.filter(f => id_ruta ? f.id_ruta !== id_ruta : f.id_negoci !== id_negoci).length;
      if (wouldRemain === 0 && page > 1) {
        setPage(p => p - 1);
      } else {
        await loadFavorits(page, activeTab);
      }
    } catch (err) {
      console.error("Error toggle favorit", err);
    } finally {
      setToggleLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading || loading) return <div className="favorits-full-spinner"><Spinner /></div>;

  return (
    <div className="favorits-page">
      <div className="favorits-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <h1 className="app-title" style={{ marginBottom: 0 }}>Els meus favorits</h1>
        <div className="favorits-tabs">
          <button onClick={() => handleTabChange("rutes")} className={`favorits-tab ${activeTab === "rutes" ? "favorits-tab-active" : ""}`}>Rutes</button>
          <button onClick={() => handleTabChange("negocis")} className={`favorits-tab ${activeTab === "negocis" ? "favorits-tab-active" : ""}`}>Negocis</button>
        </div>
      </div>
      {favorits.length === 0 ? (
        <p className="favorits-no-data">No tens cap {activeTab === "rutes" ? "ruta" : "negoci"} preferit.</p>
      ) : (
        <>
          <div className="favorits-grid">
            {favorits.map(fav => {
              const item = fav.tipus === "ruta" ? fav.ruta : fav.negoci;
              if (!item) return null;
              const id = fav.tipus === "ruta" ? item.id_ruta : item.id_negoci;
              const fotos = item.fotos ? item.fotos.split(",") : [];
              const img = fotos.length > 0 ? fotos[0] : null;
              return (
                <div key={`${fav.tipus}-${id}`} className="favorits-card" onClick={() => navigate(fav.tipus === "ruta" ? `/rutes/${id}` : `/negocis/${id}`, fav.tipus === "negoci" ? { state: { fromFavoritsNegocis: true } } : undefined)}>
                  <div className="favorits-photo-box">
                    <div className="favorits-heart" style={{ opacity: toggleLoading ? 0.6 : 1, pointerEvents: toggleLoading ? "none" : "auto" }} onClick={(e) => toggleFavorit(e, fav.tipus === "ruta" ? item.id_ruta : null, fav.tipus === "negoci" ? item.id_negoci : null)}>❤️</div>
                    {img ? (
                      <img src={img?.startsWith('http') ? img : `/uploads/${img}`} alt={item.nom} className="favorits-photo" />
                    ) : (
                      <img src="/OutTrail-sinfondo.png" alt="default" className="favorits-photo" />
                    )}
                  </div>
                  <div className="favorits-info">
                    <div className="favorits-name">{item.nom}</div>
                    <div className="favorits-zona">📍 {item.zona || "—"}</div>
                    {fav.tipus === "ruta" ? (
                      <>
                        <div className="favorits-extra">⛰️ {item.dificultat || "—"}</div>
                        <div className="favorits-extra">📏 {item.distancia_km || "0"} km</div>
                        <div className="favorits-extra">⭐ {Number(item.valoracio_mitjana || 0).toFixed(1)} / 5</div>
                        {item.creador_username && <div className="favorits-creator">👤 @{item.creador_username}</div>}
                      </>
                    ) : (
                      <>
                        <div className="favorits-extra">🏷️ {item.tipus || "—"}</div>
                        <div className="favorits-extra">⭐ {Number(item.valoracio_mitjana || 0).toFixed(1)} / 5</div>
                        {item.propietari_username && <div className="favorits-creator">👤 @{item.propietari_username}</div>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {(page > 1 || hasNextPage) && (
            <div className="favorits-pagination">
              <button className={page > 1 ? "favorits-page-btn" : "favorits-page-btn-disabled"} onClick={() => page > 1 && handlePageChange(page - 1)} disabled={page === 1}>Anterior</button>
              <span className="favorits-page-text">Pàgina {page}</span>
              <button className={hasNextPage ? "favorits-page-btn" : "favorits-page-btn-disabled"} onClick={() => hasNextPage && handlePageChange(page + 1)} disabled={!hasNextPage}>Següent</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}