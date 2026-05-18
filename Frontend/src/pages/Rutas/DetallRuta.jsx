import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, ZoomControl, useMapEvents, useMap, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../../context/AuthContext.jsx";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import "./DetallRuta.css";

const iconParada = new L.Icon({ iconUrl: "/pinrojo.png", iconSize: [30, 30], iconAnchor: [15, 30] });
const iconParadaSelected = new L.Icon({ iconUrl: "/pinrojo.png", iconSize: [40, 40], iconAnchor: [20, 40], className: 'marker-selected-detall' });
const iconNegoci = new L.Icon({ iconUrl: "/pinverde.png", iconSize: [30, 30], iconAnchor: [15, 30] });
const iconNegociOtro = new L.Icon({ iconUrl: "/pinamarillo.png", iconSize: [30, 30], iconAnchor: [15, 30] });
const iconNegociSelected = new L.Icon({ iconUrl: "/pinverde.png", iconSize: [40, 40], iconAnchor: [20, 40], className: 'marker-selected-detall' });
const iconUser = new L.Icon({ iconUrl: "/puntblau.png", iconSize: [20, 20], iconAnchor: [10, 10] });

const thumbnails = {
  satellite: "https://tiles.stadiamaps.com/tiles/alidade_satellite/12/2048/1365.jpg",
  osm: "https://tile.openstreetmap.org/12/2048/1365.png",
  topo: "https://tile.opentopomap.org/12/2048/1365.png"
};

const mapLayers = {
  satellite: { url: "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}.jpg", attribution: "OutTrail" },
  osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "OutTrail" },
  topo: { url: "https://tile.opentopomap.org/{z}/{x}/{y}.png", attribution: "OutTrail" }
};

function ZoomToGeom({ data, isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    if (data) {
      const layer = L.geoJSON(data);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          map.fitBounds(bounds, { 
            paddingTopLeft: [10, 70], 
            paddingBottomRight: [10, isSidebarVisible ? window.innerHeight * 0.5 : 80]
          });
        } else {
          try {
            map.fitBounds(bounds, { padding: [50, 50] });
          } catch (e) {
            console.warn("Leaflet fitBounds error:", e);
          }
        }
      }
    }
  }, [data, map, isSidebarVisible]);
  return null;
}

function MapResizer({ isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map && map._container) {
        try { map.invalidateSize(); } catch (e) {}
      }
    }, 400); //Esperar a que la animacio del sidebar acabi
    return () => clearTimeout(timer);
  }, [isSidebarVisible, map]);
  return null;
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

//Centra el mapa i obre el popup d'una parada especifica quan se selecciona
function FlyToParada({ parades, selectedParadaId, geojson, isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    if (selectedParadaId) {
      const p = parades.find(pt => pt.id_parada === selectedParadaId);
      if (p) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          const latlng = L.latLng(Number(p.latitud), Number(p.longitud));
          map.flyTo(latlng, 18, { duration: 0.6 });
          setTimeout(() => {
            map.panBy([0, window.innerHeight * 0.2], { animate: true });
          }, 650);
        } else {
          try {
            map.flyTo([Number(p.latitud), Number(p.longitud)], 18, { duration: 0.6 });
          } catch (e) {
            console.warn("Leaflet flyTo error:", e);
          }
        }
      }
    } else if (geojson) {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          map.fitBounds(bounds, { 
            paddingTopLeft: [20, 80], 
            paddingBottomRight: [20, window.innerHeight * 0.45],
            duration: 0.6 
          });
        } else {
          try {
            map.fitBounds(bounds, { padding: [50, 50], duration: 0.6 });
          } catch (e) {
            console.warn("Leaflet fitBounds error:", e);
          }
        }
      }
    }
  }, [selectedParadaId, parades, geojson, map, isSidebarVisible]);
  return null;
}

function PopupController({ selectedId, markersRef }) {
  useEffect(() => {
    if (selectedId && markersRef.current[selectedId]) {
      setTimeout(() => {
        markersRef.current[selectedId]?.openPopup();
      }, 100);
    }
  }, [selectedId, markersRef]);
  return null;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (e.originalEvent.target.classList.contains('leaflet-container')) {
        onMapClick();
      }
    }
  });
  return null;
}

export default function DetallRuta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.state?.fromMe) {
      navigate("/me/rutes");
    } else {
      navigate(-1);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ca-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };
  const { user, token } = useAuth();

  const [ruta, setRuta] = useState(null);
  const [parades, setParades] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState("satellite");
  const [selectedParadaId, setSelectedParadaId] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isFavorit, setIsFavorit] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [fotoIndex, setFotoIndex] = useState(0);
  const [reviewsSortBy, setReviewsSortBy] = useState("newest");
  const [reviewsPage, setReviewsPage] = useState(1);
  const reviewsPerPage = 5;
  const [selectedImg, setSelectedImg] = useState(null);
  const [userLocation, setUserLocation] = useState([40.4168, -3.7038]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [userNegocis, setUserNegocis] = useState(new Set());

  const markersRef = useRef({});
  const sidebarItemsRef = useRef({});

  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      pos => { setHasLocationPermission(true); setUserLocation([pos.coords.latitude, pos.coords.longitude]); },
      () => { setHasLocationPermission(false); setUserLocation([40.4168, -3.7038]); },
      { enableHighAccuracy: true }
    );
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(status => {
        status.onchange = () => {
          window.location.reload();
        };
      });
    }
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  const [puntuacio, setPuntuacio] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comentari, setComentari] = useState("");
  const [enviantReview, setEnviantReview] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`/api/rutes/${id}/reviews`);
      setReviews(res.data || []);
    } catch (err) {}
  };

  const fetchData = async () => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const [resRuta, resReviews] = await Promise.all([
        axios.get(`/api/rutes/${id}`, config),
        axios.get(`/api/rutes/${id}/reviews`)
      ]);
      setRuta(resRuta.data.ruta);
      setParades(resRuta.data.parades || []);
      setReviews(resReviews.data || []);

      if (token) {
        const favRes = await axios.get("/api/favorits/me?type=rutes", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const isFav = favRes.data.favorits.some(f => f.id_ruta === Number(id));
        setIsFavorit(isFav);

        const myNegRes = await axios.get("/api/negocis?limit=1000", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const myIds = new Set(myNegRes.data.negocis.filter(n => n.id_usuari === user.id).map(n => n.nom + n.latitud + n.longitud));
        setUserNegocis(myIds);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

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

  useEffect(() => {
    if (selectedParadaId && sidebarItemsRef.current[selectedParadaId]) {
      sidebarItemsRef.current[selectedParadaId].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedParadaId]);

  const toggleFavorit = async (e) => {
    if (e) e.stopPropagation();
    if (!token) return navigate("/auth");
    if (favLoading) return;

    setFavLoading(true);
    try {
      const res = await axios.post("/api/favorits/toggle",
        { id_ruta: id, type: 'ruta' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsFavorit(res.data.isFavorit);
    } catch (err) {
      console.error(err);
    } finally {
      setFavLoading(false);
    }
  };

  const eliminarRuta = () => {
    setConfirm({
      text: "Estàs segur que vols eliminar aquesta ruta per sempre?",
      onConfirm: async () => {
        try {
          await axios.delete(`/api/rutes/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (location.state?.fromMe) {
            navigate("/me/rutes");
          } else {
            navigate("/explorar");
          }
        } catch (err) {
          setMsg({ title: "Error", text: "No s'ha pogut eliminar la ruta", color: "red" });
        }
      }
    });
  };

  const enviarReview = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (String(ruta.id_usuari) === String(user.id) && user.role !== 3) {
      setMsg({ title: "Error", text: "No pots valorar la teva pròpia ruta.", color: "red" });
      return;
    }

    setEnviantReview(true);
    try {
      await axios.post("/api/reviews",
        { id_ruta: id, puntuacio, comentari },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComentari("");
      setPuntuacio(5);
      setMsg({ title: "Èxit", text: "Valoració publicada correctament!", color: "green" });
      fetchData();
    } catch (err) {
      setMsg({ title: "Error", text: err.response?.data?.error || "Error enviant valoració", color: "red" });
    } finally {
      setEnviantReview(false);
    }
  };

  const exportToGPX = () => {
    if (!ruta || !ruta.geometria?.geojson) return;
    
    const geojson = ruta.geometria.geojson;
    let coords = [];
    
    if (geojson.type === "LineString") {
      coords = geojson.coordinates;
    } else if (geojson.type === "MultiLineString") {
      coords = geojson.coordinates.flat();
    } else if (geojson.type === "Feature" && geojson.geometry.type === "LineString") {
      coords = geojson.geometry.coordinates;
    }
    
    if (coords.length === 0) {
      setMsg({ title: "Avís", text: "Aquesta ruta no té coordenades per exportar.", color: "orange" });
      return;
    }

    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OutTrail" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${ruta.nom}</name>
    <desc>${ruta.descripcio || ""}</desc>
    <author>
      <name>OutTrail User</name>
    </author>
  </metadata>
${parades.map(p => `  <wpt lat="${p.latitud}" lon="${p.longitud}">
    <name>${p.nom}</name>
    <type>${p.tipus || "waypoint"}</type>
  </wpt>`).join("\n")}
  <trk>
    <name>${ruta.nom}</name>
    <trkseg>
${coords.map(c => `      <trkpt lat="${c[1]}" lon="${c[0]}"></trkpt>`).join("\n")}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ruta.nom.replace(/\s+/g, "_")}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const eliminarReview = async (reviewId) => {
    setConfirm({
      text: "Segur que vols eliminar aquesta valoració?",
      onConfirm: async () => {
        try {
          await axios.delete(`/api/reviews/${reviewId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setConfirm(null);
          fetchData();
        } catch (err) {
          setMsg({ title: "Error", text: "Error eliminant valoració", color: "red" });
        }
      }
    });
  };

  if (loading) return <div className="mapa-detall-ruta-full-spinner"><Spinner /></div>;
  if (!ruta) return <div className="mapa-detall-ruta-full-spinner">Ruta no trobada</div>;

  const jaHaFetReview = user && reviews.some(r => r.id_usuari === user.id);
  const esAdmin = user?.role === 3;
  const esPropietari = user && String(ruta.id_usuari) === String(user.id);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewsSortBy === "newest") return new Date(b.data) - new Date(a.data);
    if (reviewsSortBy === "oldest") return new Date(a.data) - new Date(b.data);
    if (reviewsSortBy === "best") return b.puntuacio - a.puntuacio;
    if (reviewsSortBy === "worst") return a.puntuacio - b.puntuacio;
    return 0;
  });

  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);
  const correctedReviewsPage = reviewsPage > totalPages ? Math.max(1, totalPages) : reviewsPage;
  const paginatedReviews = sortedReviews.slice((correctedReviewsPage - 1) * reviewsPerPage, correctedReviewsPage * reviewsPerPage);

  const toggleMapType = () => {
    if (mapType === "satellite") setMapType("osm");
    else if (mapType === "osm") setMapType("topo");
    else setMapType("satellite");
  };

  return (
    <div className="mapa-detall-ruta-page" onClick={(e) => {
      if (!e.target.closest('.parada-item-clickable') && !e.target.closest('.leaflet-marker-icon')) {
        setSelectedParadaId(null);
      }
    }}>
      {msg && <Message title={msg.title} text={msg.text} color={msg.color} buttonText="D'acord" onButtonClick={() => setMsg(null)} />}
      {confirm && <ConfirmBox text={confirm.text} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <div className="mapa-detall-ruta-container">
        <div className="mapa-detall-ruta-sidebar" style={{ width: isSidebarVisible ? "400px" : "0px", opacity: isSidebarVisible ? 1 : 0, transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>

          <div className="mapa-detall-ruta-sidebar-content" style={{ minWidth: "400px", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
              <button onClick={handleBack} className="mapa-detall-ruta-back-btn">← Tornar</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "5px" }}>
              <div className="fav-container" style={{ position: "relative", marginBottom: "20px" }}>
                {ruta.fotos ? (
                  (() => {
                    const fotos = ruta.fotos.split(',').filter(f => f.trim() !== "");
                    return (
                      <div className="mapa-detall-ruta-slider">
                        <img
                          src={fotos[fotoIndex]?.startsWith('http') ? fotos[fotoIndex] : `/uploads/${fotos[fotoIndex]}`}
                          className="mapa-detall-ruta-main-img"
                          onClick={() => setSelectedImg(fotos[fotoIndex]?.startsWith('http') ? fotos[fotoIndex] : `/uploads/${fotos[fotoIndex]}`)}
                        />
                        {fotos.length > 1 && (
                          <>
                            <button className="mapa-detall-ruta-slider-btn-left" onClick={() => setFotoIndex((fotoIndex - 1 + fotos.length) % fotos.length)}>‹</button>
                            <button className="mapa-detall-ruta-slider-btn-right" onClick={() => setFotoIndex((fotoIndex + 1) % fotos.length)}>›</button>
                          </>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <img src="/OutTrail-sinfondo.png" className="mapa-detall-ruta-main-img" style={{ objectFit: "contain", background: "#f9f9f9" }} />
                )}
                {(!esPropietari || esAdmin) && (
                  <button
                    className="fav-btn-overlay"
                    onClick={toggleFavorit}
                    disabled={favLoading}
                    title={isFavorit ? "Treure de favorits" : "Afegir a favorits"}
                  >
                    {isFavorit ? "❤️" : "🤍"}
                  </button>
                )}
              </div>

              <h1 className="mapa-detall-ruta-title">{ruta.nom}</h1>
              <div className="mapa-detall-ruta-meta">
                <span>⛰️ {ruta.dificultat}</span>
                <span>📏 {ruta.distancia_km} km</span>
                <span style={{ color: "#666" }}>⭐ {Number(ruta.valoracio_mitjana || 0).toFixed(1)}/5</span>
                <button 
                  onClick={exportToGPX} 
                  className="mapa-detall-ruta-download-btn"
                  title="Descarregar fitxer GPX per a GPS"
                >
                  🗃️ GPX
                </button>
              </div>

              <p className="mapa-detall-ruta-desc">{ruta.descripcio}</p>

              <div className="mapa-detall-ruta-section">
                <h3 className="mapa-detall-ruta-section-title">Parades</h3>
                <div className="mapa-detall-ruta-parades-list">
                  {parades.map((p, i) => (
                    <div
                      key={p.id_parada}
                      ref={el => sidebarItemsRef.current[p.id_parada] = el}
                      className={`parada-item-clickable ${selectedParadaId === p.id_parada ? 'selected' : ''}`}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedParadaId(p.id_parada);
                      }}
                    >
                      <div className="mapa-detall-ruta-parada-num">{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="mapa-detall-ruta-parada-name">{p.nom}</div>
                        <div className="mapa-detall-ruta-coords">{Number(p.latitud).toFixed(5)}, {Number(p.longitud).toFixed(5)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mapa-detall-ruta-section">
                <h3 className="mapa-detall-ruta-section-title">Valoracions ({reviews.length})</h3>

                {!jaHaFetReview && user && (!esPropietari || esAdmin) && (
                  <form onSubmit={enviarReview} className="mapa-detall-ruta-review-form">
                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "5px" }}>Puntuació:</label>
                      <div style={{ display: "flex", gap: "5px" }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <span
                            key={s}
                            className={`star ${(hoverRating || puntuacio) >= s ? "filled" : ""}`}
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
                      placeholder="Escriu la teva opinió..."
                      value={comentari}
                      onChange={e => setComentari(e.target.value)}
                      className="mapa-detall-ruta-textarea"
                      required
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="submit" disabled={enviantReview} className="mapa-detall-ruta-submit-btn">
                        {enviantReview ? "Enviant..." : "Publicar valoració"}
                      </button>
                    </div>
                  </form>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
                  <select
                    className="mapa-detall-ruta-sort-select"
                    value={reviewsSortBy}
                    onChange={(e) => { setReviewsSortBy(e.target.value); setReviewsPage(1); }}
                  >
                    <option value="newest">Més noves</option>
                    <option value="oldest">Més velles</option>
                    <option value="best">Millor puntuació</option>
                    <option value="worst">Pitjor puntuació</option>
                  </select>
                </div>

                <div className="mapa-detall-ruta-reviews-list">
                  {paginatedReviews.map(r => (
                    <div key={r.id_review} className="mapa-detall-ruta-review-card">
                      <div className="mapa-detall-ruta-review-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => navigate(`/perfils/${r.id_usuari}`)}>
                          {r.autor?.foto_perfil ? (
                            <img src={r.autor.foto_perfil?.startsWith('http') ? r.autor.foto_perfil : `/uploads/${r.autor.foto_perfil}`} className="mapa-detall-ruta-avatar" />
                          ) : (
                            <div className="mapa-detall-ruta-avatar-placeholder">{r.autor?.username?.[0]}</div>
                          )}
                          <span className="mapa-detall-ruta-author-name">@{r.autor?.username}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="mapa-detall-ruta-stars">{"⭐".repeat(r.puntuacio)}</span>
                          {(esAdmin || (user && user.id === r.id_usuari)) && (
                            <button onClick={() => eliminarReview(r.id_review)} className="mapa-detall-ruta-delete-review-btn-text">eliminar</button>
                          )}
                        </div>
                      </div>
                      <p className="mapa-detall-ruta-review-text">{r.comentari}</p>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "11px", color: "#999" }}>{formatDate(r.data)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mapa-detall-ruta-pagination">
                    <button
                      disabled={correctedReviewsPage === 1}
                      onClick={() => setReviewsPage(correctedReviewsPage - 1)}
                      className="mapa-detall-ruta-page-btn"
                    >
                      ‹
                    </button>
                    <span className="mapa-detall-ruta-page-info">Pàgina {correctedReviewsPage} de {totalPages}</span>
                    <button
                      disabled={correctedReviewsPage === totalPages}
                      onClick={() => setReviewsPage(correctedReviewsPage + 1)}
                      className="mapa-detall-ruta-page-btn"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(esPropietari || esAdmin) && (
              <div className="mapa-detall-ruta-bottom-actions">
                <button onClick={() => navigate(`/editar-ruta/${id}`)} className="mapa-detall-ruta-edit-btn">Editar</button>
                <button onClick={eliminarRuta} className="mapa-detall-ruta-delete-btn">Eliminar</button>
              </div>
            )}
          </div>
        </div>

        <div className="mapa-detall-ruta-map-container">
          <button className="collapse-btn no-mobile-collapse" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
            {isSidebarVisible ? "◀" : "▶"}
          </button>

          <div className="mapa-detall-ruta-map-controls">
            <div className="mapa-detall-ruta-layer-btn" onClick={toggleMapType}>
              <img src={thumbnails[mapType]} className="mapa-detall-ruta-layer-img" />
            </div>
          </div>

          <MapContainer
            center={[40.4168, -3.7038]}
            zoom={hasLocationPermission ? 13 : 6}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            minZoom={3}
            maxBounds={[[-90, -180], [90, 180]]}
          >
            <MapResizer isSidebarVisible={isSidebarVisible} />
            <ClickHandler onMapClick={() => setSelectedParadaId(null)} />
            <ZoomControl position="topright" />
            <FlyToParada parades={parades} selectedParadaId={selectedParadaId} geojson={ruta.geometria?.geojson} isSidebarVisible={isSidebarVisible} />
            <PopupController selectedId={selectedParadaId} markersRef={markersRef} />
            <TileLayer
              url={mapLayers[mapType].url}
              attribution={mapLayers[mapType].attribution}
              noWrap={true}
            />

            {ruta.geometria?.geojson && (
              <>
                <GeoJSON data={ruta.geometria.geojson} style={{ color: "#007bff", weight: 5 }} />
                <ZoomToGeom data={ruta.geometria.geojson} isSidebarVisible={isSidebarVisible} />
              </>
            )}

            {hasLocationPermission && <Marker position={userLocation} icon={iconUser}><Tooltip direction="top">La teva ubicació</Tooltip></Marker>}


            {parades.map((p, i) => (
              <Marker
                key={p.id_parada}
                ref={el => markersRef.current[p.id_parada] = el}
                position={[Number(p.latitud), Number(p.longitud)]}
                //Deteccio de propietat del negoci per mostrar el pin verd o groc
                icon={p.tipus === "negoci" ? (userNegocis.has(p.nom + p.latitud + p.longitud) ? iconNegoci : iconNegociOtro) : iconParada}
                eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelectedParadaId(p.id_parada); } }}
              >
                <Popup offset={[0, -20]}>
                  <div style={{ textAlign: "center", fontWeight: "bold" }}>
                    {p.nom}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
      {selectedImg && (
        <div className="mapa-detall-ruta-lightbox-overlay" onClick={() => setSelectedImg(null)}>
          <span className="mapa-detall-ruta-close-lightbox" onClick={() => setSelectedImg(null)}>×</span>
          <div className="mapa-detall-ruta-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImg} alt="Fullscreen" className="mapa-detall-ruta-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}