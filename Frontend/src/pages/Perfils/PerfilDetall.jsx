import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import "./PerfilDetall.css";

//Pantalla de detall d'un perfil d'usuari extern, mostrant les seves rutes o negocis
export default function PerfilDetall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [items, setItems] = useState([]);
  const [favorits, setFavorits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [favoritLoading, setFavoritLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const favoritsRef = useRef([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const PAGE_SIZE = 6;

  useEffect(() => {
    const loadInitial = async () => {
      if (!token) return;
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [resUser, resFavorits] = await Promise.all([
          axios.get(`/api/users/${id}`, config),
          axios.get("/api/favorits/me?limit=999", config),
        ]);
        const favData = resFavorits.data.favorits || [];
        favoritsRef.current = favData;
        setFavorits(favData);
        setPerfil(resUser.data.user);
      } catch (err) {
        console.error(err);
        if (err.response?.data?.error) {
          setErrorMsg(err.response.data.error);
        } else {
          setErrorMsg("Error carregant el perfil.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [id, token]);

  useEffect(() => {
    if (!perfil) return;
    loadItems(page);

    const interval = setInterval(() => {
      loadItems(page, true);
    }, 5000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadItems(page, true);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [perfil, page]);

  const loadItems = async (customPage, silent = false) => {
    if (!silent) setItemsLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: PAGE_SIZE + 1, offset: (customPage - 1) * PAGE_SIZE }
      };
      const url = perfil.id_role === 1 ? `/api/rutes/user/${id}` : `/api/negocis/user/${id}`;
      const res = await axios.get(url, config);
      const rawItems = perfil.id_role === 1 ? res.data.rutes || [] : res.data.negocis || [];
      const normalizedItems = rawItems.map((item) => {
        const isFavorit = favoritsRef.current.some((fav) =>
          Number(perfil.id_role) === 1 ? Number(fav.id_ruta) === Number(item.id_ruta) : Number(fav.id_negoci) === Number(item.id_negoci)
        );
        return { ...item, isFavorit };
      });
      const hasMore = normalizedItems.length > PAGE_SIZE;
      setItems(normalizedItems.slice(0, PAGE_SIZE));
      setHasNextPage(hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setItemsLoading(false);
    }
  };

  const toggleFavorit = async (e, id_ruta, id_negoci) => {
    e.stopPropagation();
    if (favoritLoading) return;
    setFavoritLoading(true);
    try {
      const res = await axios.post("/api/favorits/toggle", { id_ruta, id_negoci }, { headers: { Authorization: `Bearer ${token}` } });
      const newState = res.data.isFavorit;
      setItems((prev) => prev.map((item) => {
        const isTarget = id_ruta ? item.id_ruta === id_ruta : item.id_negoci === id_negoci;
        return isTarget ? { ...item, isFavorit: newState } : item;
      }));
      setFavorits((prev) => {
        const updated = newState ? [...prev, { id_ruta, id_negoci }] : prev.filter((fav) => id_ruta ? fav.id_ruta !== id_ruta : fav.id_negoci !== id_negoci);
        favoritsRef.current = updated;
        return updated;
      });
    } catch (err) {
      console.error("Error toggle favorit", err);
    } finally {
      setFavoritLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  if (loading) return <div className="perfil-detall-full-screen-spinner"><Spinner /></div>;
  if (errorMsg) return <div style={{textAlign: "center", marginTop: "100px", fontSize: "1.2rem", fontWeight: "bold", color: "#666", padding: "20px"}}>{errorMsg}</div>;
  if (!perfil) return <p className="perfil-detall-no-user">Usuari no trobat.</p>;

  return (
    <div className="perfil-detall-container">
      <div className="perfil-detall-back-wrapper">
        <button className="perfil-detall-back-btn" onClick={() => navigate(-1)}>← Tornar</button>
      </div>
      <div className="perfil-detall-header-card">
        <div className="perfil-detall-avatar-container">
          {perfil.foto_perfil ? (
            <img src={perfil.foto_perfil?.startsWith('http') ? perfil.foto_perfil : `/uploads/${perfil.foto_perfil}`} alt="Perfil" className="perfil-detall-avatar" />
          ) : (
            <div className="perfil-detall-no-avatar">{perfil.nom?.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="perfil-detall-header-info">
          <h1 className="perfil-detall-nom">{perfil.nom} {perfil.cognoms}</h1>
          <div className="perfil-detall-user-row">
            <p className="perfil-detall-username">@{perfil.username}</p>
            {perfil.experiencia && <span className="perfil-detall-exp-text">• {perfil.experiencia} anys d'experiència</span>}
          </div>
          <div className="perfil-detall-badges">
            <span className={perfil.id_role === 1 ? "perfil-detall-role-tag-ruta" : perfil.id_role === 2 ? "perfil-detall-role-tag-business" : "perfil-detall-role-tag-admin"}>{perfil.id_role === 1 ? "Caminant" : perfil.id_role === 2 ? "Business" : "Admin"}</span>
            {perfil.zona && <span className="perfil-detall-zona-tag">📍 {perfil.zona}</span>}
          </div>
        </div>
      </div>
      <h2 className="perfil-detall-section-title">{perfil.id_role === 1 ? "Rutes publicades" : "Negocis gestionats"}</h2>
      {itemsLoading ? (
        <div className="perfil-detall-loading-box"><Spinner /></div>
      ) : (
        <>
          <div className="perfil-detall-grid">
            {items.length === 0 ? (
              <p className="perfil-detall-no-results">No hi ha elements per mostrar encara.</p>
            ) : (
              items.map((item) => {
                const fotos = item.fotos ? item.fotos.split(",") : [];
                const isRuta = perfil.id_role === 1;
                const esMeuPerfil = user && String(user.id) === String(id);
                return (
                  <div key={isRuta ? item.id_ruta : item.id_negoci} className="perfil-detall-card" onClick={() => navigate(isRuta ? `/rutes/${item.id_ruta}` : `/negocis/${item.id_negoci}`)}>
                    <div className="perfil-detall-card-image-container">
                      {isRuta && item.es_publica === false && <div className="perfil-detall-private-badge">Privada</div>}
                      {fotos.length > 0 ? (
                        <img src={fotos[0]?.startsWith('http') ? fotos[0] : `/uploads/${fotos[0]}`} alt={item.nom} className="perfil-detall-card-image" />
                      ) : (
                        <img src="/OutTrail-sinfondo.png" alt="Default" className="perfil-detall-card-image" />
                      )}
                      {!esMeuPerfil && (
                        <div className="perfil-detall-heart-btn" style={{ opacity: favoritLoading ? 0.6 : 1, pointerEvents: favoritLoading ? "none" : "auto" }} onClick={(e) => toggleFavorit(e, isRuta ? item.id_ruta : null, !isRuta ? item.id_negoci : null)}>
                          {item.isFavorit ? "❤️" : "🤍"}
                        </div>
                      )}
                    </div>
                    <div className="perfil-detall-card-content">
                      <div className="perfil-detall-card-info">
                        <h3 className="perfil-detall-item-name">{item.nom}</h3>
                        <p className="perfil-detall-info">📍 {item.zona || "—"}</p>
                        <p className="perfil-detall-info">{isRuta ? `⛰️ ${item.dificultat}` : `🏷️ ${item.tipus || "Negoci"}`}</p>
                        {isRuta && item.distancia_km && <p className="perfil-detall-info">📏 {item.distancia_km} km</p>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {items.length > 0 && (
            <div className="perfil-detall-pagination">
              <button className={page > 1 ? "perfil-detall-page-btn" : "perfil-detall-page-btn-disabled"} onClick={() => page > 1 && handlePageChange(page - 1)} disabled={page === 1}> Anterior </button>
              <span className="perfil-detall-page-text">Pàgina {page}</span>
              <button className={hasNextPage ? "perfil-detall-page-btn" : "perfil-detall-page-btn-disabled"} onClick={() => hasNextPage && handlePageChange(page + 1)} disabled={!hasNextPage}> Següent </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}