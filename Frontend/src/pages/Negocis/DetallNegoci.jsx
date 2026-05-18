import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import Message from "../../components/Message.jsx";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./DetallNegoci.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "/iconoverde.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const thumbnails = {
  satellite: "https://tiles.stadiamaps.com/tiles/alidade_satellite/12/2048/1365.jpg",
  osm: "https://tile.openstreetmap.org/12/2048/1365.png",
  topo: "https://tile.opentopomap.org/12/2048/1365.png"
};

const mapLayers = {
  satellite: "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}.jpg",
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  topo: "https://tile.opentopomap.org/{z}/{x}/{y}.png"
};

//Vista de detall d'un negoci amb gestio de favorits, posts i valoracions d'usuaris
export default function DetallNegoci() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();

  const fromMe = location.state?.fromMe === true;
  const fromMap = location.state?.fromMap === true;
  const fromFavoritsNegocis = location.state?.fromFavoritsNegocis === true;

  const handleBack = () => {
    if (fromMe) return navigate("/me/negocis");
    if (fromMap) return navigate(-1);
    if (fromFavoritsNegocis) return navigate("/favorits", { state: { tab: "negocis" } });
    navigate(-1);
  };

  const [negoci, setNegoci] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [fotoIndex, setFotoIndex] = useState(0);
  const [selectedImg, setSelectedImg] = useState(null); 
  const [isFavorit, setIsFavorit] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [postToDelete, setPostToDelete] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [mapType, setMapType] = useState("satellite");

  const [reviews, setReviews] = useState([]);
  const [puntuacio, setPuntuacio] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comentari, setComentari] = useState("");
  const [enviantReview, setEnviantReview] = useState(false);
  const [reviewsSortBy, setReviewsSortBy] = useState("newest");
  const [reviewsPage, setReviewsPage] = useState(1);
  const reviewsPerPage = 5;

  const [postsPage, setPostsPage] = useState(1);
  const postsPerPage = 3;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ca-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`/api/negocis/${id}/reviews`);
      setReviews(res.data || []);
    } catch (err) {}
  };

  const loadNegoci = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [resNegoci, resReviews] = await Promise.all([
        axios.get(`/api/negocis/${id}`, { headers }),
        axios.get(`/api/negocis/${id}/reviews`)
      ]);
      setNegoci(resNegoci.data.negoci);
      setPosts(resNegoci.data.posts);
      setIsFavorit(resNegoci.data.isFavorit || false);
      setReviews(resReviews.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const enviarReview = async (e) => {
    e.preventDefault();
    if (!token) return navigate("/auth");
    if (String(negoci.id_usuari) === String(user.id) && user.role !== 3) {
      setMessageText("No pots valorar el teu propi negoci.");
      setMessageOpen(true);
      return;
    }
    setEnviantReview(true);
    try {
      await axios.post("/api/negocis-reviews", 
        { id_negoci: id, puntuacio, comentari },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComentari("");
      setPuntuacio(5);
      await loadNegoci();
      setMessageText("Valoració publicada correctament!");
      setMessageOpen(true);
    } catch (err) {
      setMessageText(err.response?.data?.error || "Error enviant valoració");
      setMessageOpen(true);
    } finally {
      setEnviantReview(false);
    }
  };

  const eliminarReview = async () => {
    setConfirmPostOpen(false); 
    setGlobalLoading(true);
    try {
      await axios.delete(`/api/negocis-reviews/${reviewToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadNegoci();
      setMessageText("Valoració eliminada correctament.");
      setMessageOpen(true);
    } catch (err) {
      console.error(err);
      setMessageText("Error eliminant la valoració.");
      setMessageOpen(true);
    }
    setGlobalLoading(false);
    setReviewToDelete(null);
  };

  const toggleFavorit = async (e) => {
    e.stopPropagation();
    if (!token || favLoading) return;
    setFavLoading(true);
    try {
      const res = await axios.post(
        "/api/favorits/toggle",
        { id_negoci: parseInt(id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsFavorit(res.data.isFavorit);
    } catch (err) {
      console.error("Error toggle favorit negoci", err);
    } finally {
      setFavLoading(false);
    }
  };

  useEffect(() => {
    loadNegoci();

    const interval = setInterval(fetchReviews, 5000);
    const handleFocus = () => {
      if (document.visibilityState === "visible") fetchReviews();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [id, token]);

  const eliminarNegoci = async () => {
    setConfirmOpen(false);
    setGlobalLoading(true);
    try {
      await axios.delete(`/api/negocis/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessageText("Negoci eliminat correctament.");
      setShouldRedirect(true); 
      setMessageOpen(true);
    } catch (err) {
      console.error(err);
      setMessageText("Error eliminant el negoci.");
      setMessageOpen(true);
    }
    setGlobalLoading(false);
  };

  const eliminarPost = async () => {
    setConfirmPostOpen(false);
    setGlobalLoading(true);
    try {
      await axios.delete(`/api/posts_negoci/${postToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadNegoci();
      setMessageText("Post eliminat correctament.");
      setMessageOpen(true);
    } catch (err) {
      console.error(err);
      setMessageText("Error eliminant el post.");
      setMessageOpen(true);
    }
    setGlobalLoading(false);
    setPostToDelete(null);
  };

  const handleCloseMessage = () => {
    setMessageOpen(false);
    if (shouldRedirect) navigate(`/me/negocis`); 
  };

  if (loading) return <div className="negoci-detall-full-spinner"><Spinner /></div>;
  if (!negoci) return <p style={{ paddingTop: "100px" }}>Negoci no trobat.</p>;

  const fotos = negoci.fotos ? negoci.fotos.split(",").filter(f => f.trim() !== "") : [];
  const esPropietari = user && (user.id === negoci.id_usuari || user.role === 3);
  const jaHaFetReview = user && reviews.some(r => r.id_usuari === user.id);
  const esAdmin = user?.role === 3;

  const sortedReviews = [...reviews].sort((a, b) => {
    const valA = a.puntuacio || 0;
    const valB = b.puntuacio || 0;
    const dateA = a.data ? new Date(a.data).getTime() : 0;
    const dateB = b.data ? new Date(b.data).getTime() : 0;
    if (reviewsSortBy === "newest") return dateB - dateA;
    if (reviewsSortBy === "oldest") return dateA - dateB;
    if (reviewsSortBy === "best") return valB - valA;
    if (reviewsSortBy === "worst") return valA - valB;
    return 0;
  });

  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);
  const correctedReviewsPage = reviewsPage > totalPages ? Math.max(1, totalPages) : reviewsPage;
  const paginatedReviews = sortedReviews.slice((correctedReviewsPage - 1) * reviewsPerPage, correctedReviewsPage * reviewsPerPage);

  const totalPostsPages = Math.ceil(posts.length / postsPerPage);
  const correctedPostsPage = postsPage > totalPostsPages ? Math.max(1, totalPostsPages) : postsPage;
  const paginatedPosts = posts.slice((correctedPostsPage - 1) * postsPerPage, correctedPostsPage * postsPerPage);

  return (
    <div className="negoci-detall-page">
      {selectedImg && (
        <div className="negoci-detall-lightbox-overlay" onClick={() => setSelectedImg(null)}>
          <span className="negoci-detall-close-lightbox" onClick={() => setSelectedImg(null)}>×</span>
          <div className="negoci-detall-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImg} alt="Fullscreen" className="negoci-detall-lightbox-img" />
          </div>
        </div>
      )}
      {globalLoading && <div className="negoci-detall-overlay"><Spinner /></div>}
      {confirmOpen && (
        <ConfirmBox
          text="Segur que vols eliminar aquest negoci?"
          onConfirm={eliminarNegoci}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      {confirmPostOpen && (
        <ConfirmBox
          text={postToDelete ? "Segur que vols eliminar aquest post?" : "Segur que vols eliminar aquesta valoració?"}
          onConfirm={postToDelete ? eliminarPost : eliminarReview}
          onCancel={() => { setConfirmPostOpen(false); setPostToDelete(null); setReviewToDelete(null); }}
        />
      )}
      {messageOpen && (
        <Message
          title="Operació completada"
          text={messageText}
          color="green"
          buttonText="Tancar"
          onButtonClick={handleCloseMessage}
        />
      )}
      <div className="negoci-detall-header-row">
        <h1 className="negoci-detall-title">{negoci.nom}</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {user && (!esPropietari || esAdmin) && (
            <button className="negoci-detall-fav-btn-only-emoji" onClick={toggleFavorit} disabled={favLoading}>
              {isFavorit ? "❤️" : "🤍"}
            </button>
          )}
          <button className="negoci-detall-back-btn" onClick={handleBack}>← Tornar</button>
        </div>
      </div>

      {fotos.length > 0 && (
        <div className="negoci-detall-slider">
          <img
            src={fotos[fotoIndex]?.includes('cloudinary.com') || fotos[fotoIndex]?.startsWith('http') ? fotos[fotoIndex] : `/uploads/${fotos[fotoIndex]}`}
            className="negoci-detall-slider-img"
            onClick={() => {
              const img = fotos[fotoIndex];
              setSelectedImg(img?.includes('cloudinary.com') || img?.startsWith('http') ? img : `/uploads/${img}`);
            }}
          />
          {fotos.length > 1 && (
            <>
              <button className="negoci-detall-slider-btn-left" onClick={() => setFotoIndex((fotoIndex - 1 + fotos.length) % fotos.length)}>‹</button>
              <button className="negoci-detall-slider-btn-right" onClick={() => setFotoIndex((fotoIndex + 1) % fotos.length)}>›</button>
            </>
          )}
        </div>
      )}

      <div className="negoci-detall-info-card">
        <div className="negoci-detall-info-grid">
          <div className="negoci-detall-info-item">
            <span className="negoci-detall-info-icon">📍</span>
            <div>
              <span className="negoci-detall-info-label">Zona</span>
              <span className="negoci-detall-info-value">{negoci.zona || "No especificada"}</span>
            </div>
          </div>
          <div className="negoci-detall-info-item">
            <span className="negoci-detall-info-icon">🏷️</span>
            <div>
              <span className="negoci-detall-info-label">Categoria</span>
              <span className="negoci-detall-info-value">{negoci.tipus || "No especificada"}</span>
            </div>
          </div>
          <div className="negoci-detall-info-item">
            <span className="negoci-detall-info-icon">⭐</span>
            <div>
              <span className="negoci-detall-info-label">Valoració</span>
              <span className="negoci-detall-info-value">{Number(negoci.valoracio_mitjana || 0).toFixed(1)}/5</span>
            </div>
          </div>
          {negoci.latitud && negoci.longitud && (
            <div className="negoci-detall-info-item">
              <span className="negoci-detall-info-icon">🗺️</span>
              <div>
                <span className="negoci-detall-info-label">Ubicació</span>
                <span className="negoci-detall-info-value">{Number(negoci.latitud).toFixed(4)}, {Number(negoci.longitud).toFixed(4)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="negoci-detall-description-section">
          <h3 className="negoci-detall-description-title">Sobre aquest negoci</h3>
          <p className="negoci-detall-description-text">{negoci.descripcio || "Aquest negoci encara no té una descripció detallada."}</p>
        </div>

        {negoci.latitud && negoci.longitud && (
          <div style={{ position: "relative", marginTop: "20px" }}>
            <div className="negoci-detall-map-box">
              <MapContainer
                center={[negoci.latitud, negoci.longitud]}
                zoom={15}
                maxZoom={19}
                minZoom={3}
                style={{ width: "100%", height: "450px" }}
                maxBounds={[[-90, -180], [90, 180]]}
              >
                <TileLayer url={mapLayers[mapType]} maxNativeZoom={mapType === "topo" ? 17 : 19} maxZoom={17} noWrap={true} />
                <Marker position={[negoci.latitud, negoci.longitud]} icon={markerIcon}>
                  <Popup offset={[0, -20]}>{negoci.nom}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="negoci-detall-layer-selector-container">
              <div
                className="negoci-detall-layer-btn"
                onClick={() =>
                  setMapType(mapType === "satellite" ? "osm" : mapType === "osm" ? "topo" : "satellite")
                }
              >
                <img src={thumbnails[mapType]} alt="capa" className="negoci-detall-layer-img" />
              </div>
            </div>
          </div>
        )}

        {esPropietari && (
          <div className="negoci-detall-owner-actions" style={{ marginTop: "20px", marginBottom: 0, justifyContent: "space-between" }}>
            <button className="negoci-detall-edit-btn" onClick={() => navigate(`/negocis/${id}/editar`, { state: { fromMe } })}>Editar negoci</button>
            <button className="negoci-detall-delete-btn" onClick={() => setConfirmOpen(true)}>Eliminar negoci</button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h2 className="negoci-detall-subtitle" style={{ marginBottom: 0 }}>Posts del negoci</h2>
        {esPropietari && (
          <button className="negoci-detall-create-post-btn" onClick={() => navigate(`/negocis/${id}/posts/crear`, { replace: true })}>+ Crear post</button>
        )}
      </div>

      <div className="negoci-detall-posts-list">
        {posts.length === 0 ? (
          <p style={{ color: "#888", fontStyle: "italic" }}>Aquest negoci encara no ha publicat cap post.</p>
        ) : (
          paginatedPosts.map(post => {
            const fotosPost = post.fotos ? post.fotos.split(",").filter(f => f.trim() !== "") : [];
            return (
              <div key={post.id_post} className="negoci-detall-post-card">
                <div className="negoci-detall-post-header">
                  <h3 className="negoci-detall-post-title">{post.titol}</h3>
                  <div className="negoci-detall-post-date-container">
                    <span className="negoci-detall-post-date">{formatDate(post.data)}</span>
                    {post.data_edicio && <span className="negoci-detall-post-edited">(editat el {formatDate(post.data_edicio)})</span>}
                  </div>
                </div>
                <p className="negoci-detall-post-content">{post.contingut}</p>
                {fotosPost.length > 0 && (
                  <div className="negoci-detall-post-photos-grid">
                    {fotosPost.map((f, idx) => (
                      <div key={idx} className="negoci-detall-post-photo-wrapper">
                        <img
                           src={f.includes('cloudinary.com') || f.startsWith('http') ? f : `/uploads/${f}`}
                           className="negoci-detall-post-photo"
                           alt="Post"
                           onClick={() => setSelectedImg(f.includes('cloudinary.com') || f.startsWith('http') ? f : `/uploads/${f}`)}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {esPropietari && (
                  <div className="negoci-detall-post-actions" style={{ justifyContent: "space-between" }}>
                    <button className="negoci-detall-edit-btn" onClick={() => navigate(`/posts_negoci/${post.id_post}/editar`, { replace: true })}>Editar</button>
                    <button className="negoci-detall-delete-btn" onClick={() => { setPostToDelete(post.id_post); setConfirmPostOpen(true); }}>Eliminar</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPostsPages > 1 && (
        <div className="negoci-detall-pagination" style={{ marginTop: "15px" }}>
          <button 
            disabled={correctedPostsPage === 1} 
            onClick={() => setPostsPage(correctedPostsPage - 1)}
            className="negoci-detall-page-btn"
          >
            Anterior
          </button>
          <span className="negoci-detall-page-info">Pàgina {correctedPostsPage} de {totalPostsPages}</span>
          <button 
            disabled={correctedPostsPage === totalPostsPages} 
            onClick={() => setPostsPage(correctedPostsPage + 1)}
            className="negoci-detall-page-btn"
          >
            Següent
          </button>
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
        <h2 className="negoci-detall-subtitle">Valoracions ({reviews.length})</h2>
        {!jaHaFetReview && user && (user.role === 3 || user.id !== negoci.id_usuari) && (
          <form onSubmit={enviarReview} className="negoci-detall-review-form">
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", display: "block", marginBottom: "8px" }}>Puntuació:</label>
              <div style={{ display: "flex", gap: "5px" }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span 
                    key={s} 
                    className={`negoci-detall-star ${(hoverRating || puntuacio) >= s ? "filled" : ""}`}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setPuntuacio(s)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <textarea 
              placeholder="Escriu la teva opinió sobre aquest negoci..." 
              value={comentari} 
              onChange={e => setComentari(e.target.value)}
              className="negoci-detall-review-textarea"
              required
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={enviantReview} className="negoci-detall-submit-review-btn">
                {enviantReview ? "Enviant..." : "Publicar valoració"}
              </button>
            </div>
          </form>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
          <select 
            className="negoci-detall-sort-select" 
            value={reviewsSortBy} 
            onChange={(e) => { setReviewsSortBy(e.target.value); setReviewsPage(1); }}
          >
            <option value="newest">Més noves</option>
            <option value="oldest">Més velles</option>
            <option value="best">Millor puntuació</option>
            <option value="worst">Pitjor puntuació</option>
          </select>
        </div>

        <div className="negoci-detall-reviews-list">
          {paginatedReviews.length === 0 ? (
            <p style={{ color: "#888", fontStyle: "italic" }}>Encara no hi ha valoracions.</p>
          ) : (
            paginatedReviews.map(r => (
              <div key={r.id_review} className="negoci-detall-review-card">
                <div className="negoci-detall-review-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate(`/perfils/${r.id_usuari}`)}>
                    {r.autor?.foto_perfil ? (
                      <img src={r.autor.foto_perfil?.startsWith('http') ? r.autor.foto_perfil : `/uploads/${r.autor.foto_perfil}`} className="negoci-detall-review-avatar" />
                    ) : (
                      <div className="negoci-detall-review-avatar-placeholder">{r.autor?.username?.[0]}</div>
                    )}
                    <span className="negoci-detall-review-author">@{r.autor?.username}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <span className="negoci-detall-review-stars">{"⭐".repeat(r.puntuacio)}</span>
                    {(esAdmin || (user && user.id === r.id_usuari)) && (
                      <button onClick={() => { setReviewToDelete(r.id_review); setConfirmPostOpen(true); }} className="negoci-detall-delete-review-btn">Eliminar</button>
                    )}
                  </div>
                </div>
                <p className="negoci-detall-review-content">{r.comentari}</p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span className="negoci-detall-review-date">{formatDate(r.data)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="negoci-detall-pagination">
            <button 
              disabled={correctedReviewsPage === 1} 
              onClick={() => setReviewsPage(correctedReviewsPage - 1)}
              className="negoci-detall-page-btn"
            >
              Anterior
            </button>
            <span className="negoci-detall-page-info">Pàgina {correctedReviewsPage} de {totalPages}</span>
            <button 
              disabled={correctedReviewsPage === totalPages} 
              onClick={() => setReviewsPage(correctedReviewsPage + 1)}
              className="negoci-detall-page-btn"
            >
              Següent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}