import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, ZoomControl, GeoJSON, useMap, Tooltip } from "react-leaflet";
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useEffect, useState, useCallback, useRef, useMemo, createContext, useContext } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import "./MapaExplorar.css";

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

const CATEGORIES_NEGOCI = [
  "Restaurant", "Botiga", "Bar", "Hotel", "Cafeteria", "Supermercat", "Farmàcia", "Gimnàs"
];

// ICONOS
const iconRuta = new L.Icon({ iconUrl: "/iconorojo.png", iconSize: [32, 32], iconAnchor: [16, 32] });
const iconRutaPropia = new L.Icon({ iconUrl: "/iconoazul.png", iconSize: [32, 32], iconAnchor: [16, 32] });
const iconParada = new L.Icon({ iconUrl: "/pinrojo.png", iconSize: [28, 28], iconAnchor: [14, 28] });
const iconParadaPropia = new L.Icon({ iconUrl: "/pinazul.png", iconSize: [28, 28], iconAnchor: [14, 28] });
const iconParadaNegoci = new L.Icon({ iconUrl: "/pinverde.png", iconSize: [28, 28], iconAnchor: [14, 28] });
const iconParadaNegociOtro = new L.Icon({ iconUrl: "/pinamarillo.png", iconSize: [28, 28], iconAnchor: [14, 28] });
const iconUser = new L.Icon({ iconUrl: "/puntblau.png", iconSize: [20, 20], iconAnchor: [10, 10] });
const iconNegoci = new L.Icon({ iconUrl: "/iconoverde.png", iconSize: [30, 30], iconAnchor: [15, 30] });
const iconNegociOtro = new L.Icon({ iconUrl: "/iconoamarillo.png", iconSize: [30, 30], iconAnchor: [15, 30] });
const iconNegociSelected = new L.Icon({ iconUrl: "/iconoverde.png", iconSize: [42, 42], iconAnchor: [21, 42], className: 'mapa-explorar-marker-selected' });

function MapResizer({ isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 400);
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

function ClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => {
      if (e.originalEvent.target.classList.contains('leaflet-container')) {
        onClick();
      }
    },
  });
  return null;
}

function MapRefSetter({ setMap }) {
  const map = useMap();
  useEffect(() => {
    if (map) setMap(map);
  }, [map, setMap]);
  return null;
}

function FlyToNegoci({ seleccio, isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    if (seleccio?.type === 'negoci' && seleccio.data.latitud && seleccio.data.longitud) {
      const lat = Number(seleccio.data.latitud);
      const lng = Number(seleccio.data.longitud);
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        const bounds = L.latLng(lat, lng).toBounds(10);
        map.fitBounds(bounds, { 
          paddingTopLeft: [20, 70], 
          paddingBottomRight: [20, window.innerHeight * 0.45], 
          maxZoom: 16 
        });
      } else {
        const leftPad = isSidebarVisible ? 440 : 400;
        const bounds = L.latLng(lat, lng).toBounds(10); 
        map.fitBounds(bounds, { paddingTopLeft: [leftPad, 80], paddingBottomRight: [80, 80], maxZoom: 16 });
      }
    }
  }, [seleccio, map, isSidebarVisible]);
  return null;
}

function FitToGeometry({ geojson, isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    if (geojson) {
      const layer = L.geoJSON(geojson);
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        map.fitBounds(layer.getBounds(), { 
          paddingTopLeft: [20, 80], 
          paddingBottomRight: [20, window.innerHeight * 0.45], 
          maxZoom: 14
        });
      } else {
        const leftPad = isSidebarVisible ? 440 : 400;
        map.fitBounds(layer.getBounds(), { paddingTopLeft: [leftPad, 80], paddingBottomRight: [80, 80], maxZoom: 16 });
      }
    }
  }, [geojson, map, isSidebarVisible]);
  return null;
}

function FlyToParadaExplorar({ parades, selectedParadaId, isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    if (selectedParadaId === null) return;
    const p = parades.find((pt, i) => i === selectedParadaId);
    if (p) {
      const isMobile = window.innerWidth <= 768;
      const bounds = L.latLng(Number(p.latitud), Number(p.longitud)).toBounds(10);
      
      if (isMobile) {
        map.fitBounds(bounds, { 
          paddingTopLeft: [10, 70],
          paddingBottomRight: [20, window.innerHeight * 0.45],
          maxZoom: 17 
        });
      } else {
        const leftPad = isSidebarVisible ? 440 : 400;
        map.fitBounds(bounds, { paddingTopLeft: [leftPad, 80], paddingBottomRight: [80, 80], maxZoom: 17 });
      }
    }
  }, [selectedParadaId, parades, map, isSidebarVisible]);
  return null;
}

const MapContext = createContext();

function PreviewPopupRuta({ r }) {
  const { user, favRutes, favLoading, toggleFavoritRuta, saveMapState, navigate } = useContext(MapContext);
  const isFav = favRutes.has(Number(r.id_ruta));
  const isLoading = favLoading.has(`r-${r.id_ruta}`);

  return (
    <div className="map-preview-tooltip">
      <img 
        src={r.fotos ? `http://localhost:4000/uploads/${r.fotos.split(',')[0]}` : "/OutTrail-sinfondo.png"} 
        className="map-preview-img" 
        style={{ objectFit: r.fotos ? "cover" : "contain", background: r.fotos ? "none" : "#f0f0f0" }}
      />
      <div className="map-preview-content">
        <div className="map-preview-title">{r.nom}</div>
        <div className="map-preview-info-line">
          <span>⭐ {Number(r.valoracio_mitjana || 0).toFixed(1)}</span>
          <span className="dot">·</span>
          <span>{r.dificultat}</span>
          <span className="dot">·</span>
          <span>{r.distancia_km} km</span>
        </div>
        <div className="map-preview-actions">
          <button className="map-preview-btn-main" onClick={(e) => {
            e.stopPropagation();
            saveMapState({ type: 'ruta', id: r.id_ruta });
            navigate(`/rutes/${r.id_ruta}`);
          }}>Veure detall</button>
          {user && (user.role === 3 || user.id != r.id_usuari) && (
            <button 
              className={`map-preview-btn-fav ${isFav ? 'active' : ''}`} 
              onClick={(e) => toggleFavoritRuta(e, r.id_ruta)}
              disabled={isLoading}
            >
              {isFav ? "❤️" : "🤍"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewPopupNegoci({ n }) {
  const { user, favNegocis, favLoading, toggleFavoritNegoci, saveMapState, navigate } = useContext(MapContext);
  const isFav = favNegocis.has(Number(n.id_negoci));
  const isLoading = favLoading.has(`n-${n.id_negoci}`);

  return (
    <div className="map-preview-tooltip">
      <img 
        src={n.fotos ? `http://localhost:4000/uploads/${n.fotos.split(',')[0]}` : "/OutTrail-sinfondo.png"} 
        className="map-preview-img" 
        style={{ objectFit: n.fotos ? "cover" : "contain", background: n.fotos ? "none" : "#f0f0f0" }}
      />
      <div className="map-preview-content">
        <div className="map-preview-title">{n.nom}</div>
        <div className="map-preview-info-line">
          <span>⭐ {Number(n.valoracio_mitjana || 0).toFixed(1)}</span>
          <span className="dot">·</span>
          <span>{n.tipus}</span>
          <span className="dot">·</span>
          <span>{n.zona}</span>
        </div>
        <div className="map-preview-actions">
          <button className="map-preview-btn-main" onClick={(e) => {
            e.stopPropagation();
            saveMapState({ type: 'negoci', id: n.id_negoci });
            navigate(`/negocis/${n.id_negoci}`);
          }}>Veure detall</button>
          {user && (user.role === 3 || user.id != n.id_usuari) && (
            <button 
              className={`map-preview-btn-fav ${isFav ? 'active' : ''}`} 
              onClick={(e) => toggleFavoritNegoci(e, n.id_negoci)}
              disabled={isLoading}
            >
              {isFav ? "❤️" : "🤍"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MapaExplorar() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [rutes, setRutes] = useState([]);
  const [negocis, setNegocis] = useState([]);
  const [paradesRuta, setParadesRuta] = useState([]);
  const [seleccio, setSeleccio] = useState(null);
  const [geometryRuta, setGeometryRuta] = useState(null);
  const [mapType, setMapType] = useState("satellite");
  const [userLocation, setUserLocation] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetall, setLoadingDetall] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [selectedParadaId, setSelectedParadaId] = useState(null);

  const [msg, setMsg] = useState(null);

  const [tab, setTab] = useState("rutes");
  const [dificultat, setDificultat] = useState("");
  const [maxDistanciaDB, setMaxDistanciaDB] = useState(null);
  const [maxKm, setMaxKm] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [minRatingNegoci, setMinRatingNegoci] = useState(0);
  const [nomésFavoritsRutes, setNomésFavoritsRutes] = useState(false);
  const [nomésMevesRutes, setNomésMevesRutes] = useState(false);

  const [tipusNegoci, setTipusNegoci] = useState("");
  const [nomésFavoritsNegocis, setNomésFavoritsNegocis] = useState(false);
  const [nomésMeusNegocis, setNomésMeusNegocis] = useState(false);

  const [favRutes, setFavRutes] = useState(new Set());
  const [favNegocis, setFavNegocis] = useState(new Set());
  const [favLoading, setFavLoading] = useState(new Set());
  const markerRefs = useRef({});
  const closeTimeoutRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);

//Persistencia de l'estat del mapa per recuperarlo en tornar de la vista de detall
  const saveMapState = (openedPopup = null) => {
    const state = {
      tab, dificultat, maxKm, minRating, minRatingNegoci, isSidebarVisible, seleccio, openedPopup,
      center: mapInstance?.getCenter(),
      zoom: mapInstance?.getZoom()
    };
    sessionStorage.setItem('outtrail_map_state', JSON.stringify(state));
  };

  const handleMarkerMouseOver = (e) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    e.target.openPopup();
  };

  const handleMarkerMouseOut = (e) => {
    closeTimeoutRef.current = setTimeout(() => {
      e.target.closePopup();
    }, 300);
  };

  const handlePopupMouseOver = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  const handlePopupMouseOut = (e) => {
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
    closeTimeoutRef.current = setTimeout(() => {
      mapInstance?.closePopup();
    }, 300);
  };

  const loadFavorits = useCallback(async () => {
    if (!token) return;
    try {
      const [r, n] = await Promise.all([
        axios.get("http://localhost:4000/api/favorits/me?type=rutes&limit=999", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("http://localhost:4000/api/favorits/me?type=negocis&limit=999", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setFavRutes(new Set(r.data.favorits.map(f => Number(f.id_ruta))));
      setFavNegocis(new Set(n.data.favorits.map(f => Number(f.id_negoci))));
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSeleccio(null);
    setGeometryRuta(null);
    setParadesRuta([]);

    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const [resRutes, resNegocis] = await Promise.all([
        axios.get("http://localhost:4000/api/rutes-map", {
          ...config,
          params: { dificultat, maxKm: maxKm || 9999, minRating }
        }),
        axios.get("http://localhost:4000/api/negocis-explora", {
          params: { tipus: tipusNegoci, minRating: minRatingNegoci }
        })
      ]);

      setRutes(resRutes.data);
      setNegocis(resNegocis.data);

    } catch (err) {
      console.error(err);
      setMsg({ title: "Error", text: "Error en carregar les dades", color: "red" });
    } finally {
      setLoading(false);
    }
  }, [token, user, dificultat, maxKm, minRating, minRatingNegoci, tipusNegoci]);

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      pos => { setHasLocationPermission(true); setUserLocation([pos.coords.latitude, pos.coords.longitude]); },
      () => { setHasLocationPermission(false); setUserLocation([40.4168, -3.7038]); },
      { enableHighAccuracy: true }
    );
    axios.get("http://localhost:4000/api/rutes-max-km").then(res => {
      const mk = res.data.maxKm || 100;
      setMaxDistanciaDB(mk);
      if (!sessionStorage.getItem('outtrail_map_state')) setMaxKm(mk);
    }).catch(() => {});

    const savedState = sessionStorage.getItem('outtrail_map_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setTab(state.tab || "rutes");
        setDificultat(state.dificultat || "");
        setMaxKm(state.maxKm);
        setMinRating(state.minRating || 0);
        setMinRatingNegoci(state.minRatingNegoci || 0);
        setIsSidebarVisible(state.isSidebarVisible ?? true);
        if (state.seleccio) setSeleccio(state.seleccio);
        
        if (state.center && state.zoom && mapInstance) {
          mapInstance.setView(state.center, state.zoom);
        }

        if (state.openedPopup) {
          setTimeout(() => {
            const { type, id } = state.openedPopup;
            const refKey = `${type}-${id}`;
            if (markerRefs.current[refKey]) {
              markerRefs.current[refKey].openPopup();
            }
          }, 1000);
        }
        sessionStorage.removeItem('outtrail_map_state');
      } catch (e) { console.error("Error restoring map state", e); }
    }

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(status => {
        status.onchange = () => { window.location.reload(); };
      });
    }

    return () => navigator.geolocation.clearWatch(watch);
  }, [mapInstance]);

  useEffect(() => {
    const init = async () => {
      await loadFavorits();
      await fetchData();
    };
    init();
  }, [token, loadFavorits, fetchData]);

  //Funcio per seleccionar una ruta i descarregar la geometria i parades
  const seleccionarRuta = async (r) => {
    if (seleccio?.type === 'ruta' && seleccio.data.id_ruta === r.id_ruta) return;

    setLoadingDetall(true);
    setGeometryRuta(null);
    setParadesRuta([]);
    setSelectedParadaId(null);
    setIsSidebarVisible(false);

    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    try {
      const res = await axios.get(`http://localhost:4000/api/rutes/${r.id_ruta}`, config);
      setSeleccio({ type: 'ruta', data: res.data.ruta });
      setParadesRuta(res.data.parades || []);
      setGeometryRuta(res.data.ruta.geometria?.geojson || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetall(false);
    }
  };

  //Funcio per visualitzar un negoci en el mapa
  const seleccionarNegoci = (n) => {
    setSeleccio({ type: 'negoci', data: n });
    setParadesRuta([]);
    setGeometryRuta(null);
    setSelectedParadaId(null);
    setIsSidebarVisible(false);
  };

  //Neteja la seleccio actual per tornar a la vista general
  const tancarSeleccio = () => {
    setSeleccio(null);
    setParadesRuta([]);
    setGeometryRuta(null);
    setSelectedParadaId(null);
  };

  const toggleFavoritRuta = async (e, id_ruta) => {
    e.stopPropagation();
    e.preventDefault();
    if (!token) return navigate("/auth");
    if (favLoading.has(`r-${id_ruta}`)) return;

    setFavLoading(prev => new Set(prev).add(`r-${id_ruta}`));
    try {
      const res = await axios.post("http://localhost:4000/api/favorits/toggle", { id_ruta }, { headers: { Authorization: `Bearer ${token}` } });
      setFavRutes(prev => {
        const next = new Set(prev);
        const id = Number(id_ruta);
        res.data.isFavorit ? next.add(id) : next.delete(id);
        return next;
      });
    } catch (err) { console.error(err); }
    finally {
      setFavLoading(prev => {
        const next = new Set(prev);
        next.delete(`r-${id_ruta}`);
        return next;
      });
    }
  };

  const toggleFavoritNegoci = async (e, id_negoci) => {
    e.stopPropagation();
    e.preventDefault();
    if (!token) return navigate("/auth");
    if (favLoading.has(`n-${id_negoci}`)) return;

    setFavLoading(prev => new Set(prev).add(`n-${id_negoci}`));
    try {
      const res = await axios.post("http://localhost:4000/api/favorits/toggle", { id_negoci }, { headers: { Authorization: `Bearer ${token}` } });
      setFavNegocis(prev => {
        const next = new Set(prev);
        const id = Number(id_negoci);
        res.data.isFavorit ? next.add(id) : next.delete(id);
        return next;
      });
    } catch (err) { console.error(err); }
    finally {
      setFavLoading(prev => {
        const next = new Set(prev);
        next.delete(`n-${id_negoci}`);
        return next;
      });
    }
  };

  const rutesMarkers = useMemo(() => {
    let filtered = rutes;
    if (nomésFavoritsRutes) filtered = filtered.filter(r => favRutes.has(Number(r.id_ruta)));
    if (nomésMevesRutes && user) filtered = filtered.filter(r => r.id_usuari == user.id);
    
    return filtered
      .filter(r => !(seleccio?.type === 'ruta' && r.id_ruta === seleccio.data.id_ruta))
      .map(r => {
        const esMeva = user && (r.id_usuari == user.id);
        const icono = esMeva ? iconRutaPropia : iconRuta;
        if (!r.latitud || !r.longitud) return null;
        return (
          <Marker
            key={`r-${r.id_ruta}`}
            ref={el => { if (el) markerRefs.current[`ruta-${r.id_ruta}`] = el; }}
            position={[Number(r.latitud), Number(r.longitud)]}
            icon={icono}
            eventHandlers={{ 
              click: (e) => { e.originalEvent.stopPropagation(); seleccionarRuta(r); },
              mouseover: handleMarkerMouseOver,
              mouseout: handleMarkerMouseOut,
            }}
          >
            <Popup closeButton={false} offset={[0, -20]} className="map-preview-popup-container">
              <div onMouseOver={handlePopupMouseOver} onMouseOut={handlePopupMouseOut}>
                <PreviewPopupRuta r={r} />
              </div>
            </Popup>
          </Marker>
        );
      });
  }, [rutes, seleccio, user, nomésFavoritsRutes, nomésMevesRutes, nomésFavoritsRutes ? favRutes : null]);

  const negocisMarkers = useMemo(() => {
    let filtered = negocis;
    if (nomésFavoritsNegocis) filtered = filtered.filter(n => favNegocis.has(Number(n.id_negoci)));
    if (nomésMeusNegocis && user) filtered = filtered.filter(n => n.id_usuari == user.id);

    return filtered
      .filter(n => !(seleccio?.type === 'ruta' && paradesRuta.some(p => p.tipus === 'negoci' && p.nom === n.nom)))
      .map(n => {
        const esMeu = user && (n.id_usuari == user.id);
        const icono = esMeu ? iconNegoci : iconNegociOtro;
        return (
          <Marker
            key={`n-${n.id_negoci}`}
            ref={el => { if (el) markerRefs.current[`negoci-${n.id_negoci}`] = el; }}
            position={[Number(n.latitud), Number(n.longitud)]}
            icon={icono}
            eventHandlers={{ 
              click: (e) => { e.originalEvent.stopPropagation(); seleccionarNegoci(n); },
              mouseover: handleMarkerMouseOver,
              mouseout: handleMarkerMouseOut,
            }}
          >
            <Popup closeButton={false} offset={[0, -20]} className="map-preview-popup-container">
              <div onMouseOver={handlePopupMouseOver} onMouseOut={handlePopupMouseOut}>
                <PreviewPopupNegoci n={n} />
              </div>
            </Popup>
          </Marker>
        );
      });
  }, [negocis, seleccio, paradesRuta, user, nomésFavoritsNegocis, nomésMeusNegocis, nomésFavoritsNegocis ? favNegocis : null]);

  if (!userLocation) return <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><Spinner /></div>;

  return (
    <MapContext.Provider value={{ user, favRutes, favNegocis, favLoading, toggleFavoritRuta, toggleFavoritNegoci, saveMapState, navigate }}>
      <div className="mapa-explorar-page">
        {msg && <Message title={msg.title} text={msg.text} color={msg.color} buttonText="D'acord" onButtonClick={() => setMsg(null)} />}

        <div className="mapa-explorar-content-wrapper" style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          <div
            className="mapa-explorar-sidebar"
            style={{ width: isSidebarVisible ? "320px" : "0px", opacity: isSidebarVisible ? 1 : 0, transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="mapa-explorar-sidebar-inner" style={{ minWidth: "320px" }}>
              <div className="mapa-explorar-tab-container">
                <button onClick={() => setTab("rutes")} className={tab === "rutes" ? "mapa-explorar-tab-active" : "mapa-explorar-tab"}>Rutes</button>
                <button onClick={() => setTab("negocis")} className={tab === "negocis" ? "mapa-explorar-tab-active" : "mapa-explorar-tab"}>Negocis</button>
              </div>

              <div className="mapa-explorar-filters-container">
                {tab === "rutes" ? (
                  <div className="mapa-explorar-filter-group">
                    <div className="mapa-explorar-label">Llegenda</div>
                    <div className="mapa-explorar-legend">
                      <div className="mapa-explorar-legend-grid">
                        <div className="legend-item"><img src="/iconoazul.png" alt="" /> <span>La teva ruta</span></div>
                        <div className="legend-item"><img src="/pinazul.png" alt="" /> <span>Parada teva</span></div>
                        <div className="legend-item"><img src="/iconorojo.png" alt="" /> <span>Ruta d'altre</span></div>
                        <div className="legend-item"><img src="/pinrojo.png" alt="" /> <span>Parada altre</span></div>
                        <div className="legend-item"><img src="/iconoverde.png" alt="" /> <span>El teu negoci</span></div>
                        <div className="legend-item"><img src="/pinverde.png" alt="" /> <span>Parada al teu negoci</span></div>
                        <div className="legend-item"><img src="/iconoamarillo.png" alt="" /> <span>Negoci d'altre</span></div>
                        <div className="legend-item"><img src="/pinamarillo.png" alt="" /> <span>Parada en un negoci</span></div>
                        <div className="legend-item"><img src="/puntblau.png" alt="" /> <span>La teva posició</span></div>
                      </div>
                    </div>
                    <div className="mapa-explorar-label">Dificultat</div>
                    <select value={dificultat} onChange={(e) => setDificultat(e.target.value)} className="mapa-explorar-input">
                      <option value="">Totes les dificultats</option>
                      <option value="Molt fàcil">Molt fàcil</option>
                      <option value="Fàcil">Fàcil</option>
                      <option value="Mitjana">Mitjana</option>
                      <option value="Difícil">Difícil</option>
                      <option value="Expert">Expert</option>
                    </select>

                    {maxDistanciaDB !== null && (
                      <div className="mapa-explorar-range-box">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div className="mapa-explorar-label">Distància màx</div>
                          <strong style={{ color: "#004c06" }}>{maxKm} km</strong>
                        </div>
                        <input type="range" min="1" max={maxDistanciaDB} value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))} className="mapa-explorar-range" />
                      </div>
                    )}

                    <div className="mapa-explorar-label">Valoració mínima</div>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <span
                          key={s}
                          onClick={() => setMinRating(minRating === s ? 0 : s)}
                          style={{ cursor: "pointer", fontSize: "22px", color: s <= minRating ? "#ffc107" : "#ddd", transition: "color 0.2s" }}
                        >★</span>
                      ))}
                      {minRating > 0 && <span style={{ fontSize: "12px", color: "#888", marginLeft: "6px" }}>{minRating}+ estrelles</span>}
                    </div>

                    {user && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                        <label className="mapa-explorar-checkbox-label" style={{ marginBottom: 0 }}>
                          <input type="checkbox" checked={nomésFavoritsRutes} onChange={(e) => setNomésFavoritsRutes(e.target.checked)} />
                          Només rutes favorites
                        </label>
                        <label className="mapa-explorar-checkbox-label" style={{ marginBottom: 0 }}>
                          <input type="checkbox" checked={nomésMevesRutes} onChange={(e) => setNomésMevesRutes(e.target.checked)} />
                          Només rutes meves
                        </label>
                      </div>
                    )}

                    <button onClick={fetchData} className="mapa-explorar-search-btn">Aplicar filtres</button>
                    <button className="mapa-explorar-reset-btn" onClick={() => { 
                      setDificultat(""); 
                      setMaxKm(maxDistanciaDB); 
                      setMinRating(0); 
                      setNomésFavoritsRutes(false); 
                      setNomésMevesRutes(false);
                      setLoading(true);
                      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                      axios.get("http://localhost:4000/api/rutes-map", {
                        ...config,
                        params: { dificultat: "", maxKm: maxDistanciaDB, minRating: 0 }
                      }).then(res => {
                        setRutes(res.data);
                        setLoading(false);
                      });
                    }}>Reiniciar els filtres</button>
                  </div>
                ) : (
                  <div className="mapa-explorar-filter-group">
                    <div className="mapa-explorar-label">Llegenda</div>
                    <div className="mapa-explorar-legend">
                      <div className="mapa-explorar-legend-grid">
                        <div className="legend-item"><img src="/iconoazul.png" alt="" /> <span>La teva ruta</span></div>
                        <div className="legend-item"><img src="/pinazul.png" alt="" /> <span>Parada teva</span></div>
                        <div className="legend-item"><img src="/iconorojo.png" alt="" /> <span>Ruta d'altre</span></div>
                        <div className="legend-item"><img src="/pinrojo.png" alt="" /> <span>Parada altre</span></div>
                        <div className="legend-item"><img src="/iconoverde.png" alt="" /> <span>El teu negoci</span></div>
                        <div className="legend-item"><img src="/pinverde.png" alt="" /> <span>Parada al teu negoci</span></div>
                        <div className="legend-item"><img src="/iconoamarillo.png" alt="" /> <span>Negoci d'altre</span></div>
                        <div className="legend-item"><img src="/pinamarillo.png" alt="" /> <span>Parada en un negoci</span></div>
                        <div className="legend-item"><img src="/puntblau.png" alt="" /> <span>La teva posició</span></div>
                      </div>
                    </div>
                    <div className="mapa-explorar-label">Categoria</div>
                    <select value={tipusNegoci} onChange={(e) => setTipusNegoci(e.target.value)} className="mapa-explorar-input">
                      <option value="">Totes les categories</option>
                      {CATEGORIES_NEGOCI.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <div className="mapa-explorar-label">Valoració mínima</div>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <span
                          key={s}
                          onClick={() => setMinRatingNegoci(minRatingNegoci === s ? 0 : s)}
                          style={{ cursor: "pointer", fontSize: "22px", color: s <= minRatingNegoci ? "#ffc107" : "#ddd", transition: "color 0.2s" }}
                        >★</span>
                      ))}
                      {minRatingNegoci > 0 && <span style={{ fontSize: "12px", color: "#888", marginLeft: "6px" }}>{minRatingNegoci}+ estrelles</span>}
                    </div>

                    {user && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                        <label className="mapa-explorar-checkbox-label" style={{ marginBottom: 0 }}>
                          <input type="checkbox" checked={nomésFavoritsNegocis} onChange={(e) => setNomésFavoritsNegocis(e.target.checked)} />
                          Només negocis favorits
                        </label>
                        <label className="mapa-explorar-checkbox-label" style={{ marginBottom: 0 }}>
                          <input type="checkbox" checked={nomésMeusNegocis} onChange={(e) => setNomésMeusNegocis(e.target.checked)} />
                          Només negocis meus
                        </label>
                      </div>
                    )}

                    <button onClick={fetchData} className="mapa-explorar-search-btn">Aplicar filtres</button>
                    <button className="mapa-explorar-reset-btn" onClick={() => { 
                      setTipusNegoci(""); 
                      setNomésFavoritsNegocis(false); 
                      setNomésMeusNegocis(false);
                      setMinRatingNegoci(0);
                      setLoading(true);
                      axios.get("http://localhost:4000/api/negocis-explora", {
                        params: { tipus: "", minRating: 0 }
                      }).then(res => {
                        setNegocis(res.data);
                        setLoading(false);
                      });
                    }}>Reiniciar els filtres</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {seleccio && (
            <div
              className="mapa-explorar-detail-panel"
              style={{ left: isSidebarVisible ? "320px" : "20px", transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={tancarSeleccio} className="mapa-explorar-close-btn">✕</button>
              {seleccio.type === 'ruta' ? (
                <div>
                  {seleccio.data.fotos ? (
                    <img src={`http://localhost:4000/uploads/${seleccio.data.fotos.split(',')[0]}`} className="mapa-explorar-detail-img" />
                  ) : (
                    <img src="/OutTrail-sinfondo.png" className="mapa-explorar-detail-img" style={{ objectFit: "contain", background: "#f0f0f0" }} />
                  )}
                  <h3 className="mapa-explorar-detail-title">{seleccio.data.nom}</h3>
                  <div className="mapa-explorar-detail-meta">
                    ⭐ {Number(seleccio.data.valoracio_mitjana || 0).toFixed(1)} | {seleccio.data.dificultat} | {seleccio.data.distancia_km} km
                  </div>
                  <p className="mapa-explorar-detail-desc">{seleccio.data.descripcio?.substring(0, 120)}...</p>
                  <button onClick={() => navigate(`/rutes/${seleccio.data.id_ruta}`)} className="mapa-explorar-view-detail-btn">Veure en detall</button>
                </div>
              ) : (
                <div>
                  {seleccio.data.fotos ? (
                    <img src={`http://localhost:4000/uploads/${seleccio.data.fotos.split(',')[0]}`} className="mapa-explorar-detail-img" />
                  ) : (
                    <img src="/OutTrail-sinfondo.png" className="mapa-explorar-detail-img" style={{ objectFit: "contain", background: "#f0f0f0" }} />
                  )}
                  <h3 className="mapa-explorar-detail-title">{seleccio.data.nom}</h3>
                  <div className="mapa-explorar-detail-meta">
                    ⭐ {Number(seleccio.data.valoracio_mitjana || 0).toFixed(1)} | 📍 {seleccio.data.zona} | 🏷️ {seleccio.data.tipus}
                  </div>
                  <button onClick={() => navigate(`/negocis/${seleccio.data.id_negoci}`, { state: { fromMap: true } })} className="mapa-explorar-view-detail-btn">Veure en detall</button>
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1, position: "relative" }}>
            <button className="mapa-explorar-collapse-btn" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
              {isSidebarVisible ? "◀" : "▶"}
            </button>

            {!seleccio && (
              <div className="mapa-explorar-floating-controls">
                {user && (
                  <button onClick={() => navigate("/crear-ruta")} className="mapa-explorar-create-btn">+ Crear ruta</button>
                )}
                <div className="mapa-explorar-map-layers-btn" onClick={() => setMapType(mapType === "satellite" ? "osm" : mapType === "osm" ? "topo" : "satellite")}>
                  <img src={thumbnails[mapType]} style={{ width: "125px", height: "60px", borderRadius: "10px", objectFit: "cover" }} />
                </div>
              </div>
            )}

            {(loading || loadingDetall) && (
              <div className="mapa-explorar-loading-overlay"><Spinner /></div>
            )}

            <MapContainer 
              center={userLocation} 
              zoom={hasLocationPermission ? 14 : 6} 
              style={{ height: "100%", width: "100%" }} 
              zoomControl={false}
              minZoom={3}
              maxBounds={[[-90, -180], [90, 180]]}
            >
              <ChangeView center={userLocation} zoom={hasLocationPermission ? 14 : 6} />
              <MapResizer isSidebarVisible={isSidebarVisible} />
              <MapRefSetter setMap={setMapInstance} />
              <ClickHandler onClick={() => setSelectedParadaId(null)} />
              <ZoomControl position="topright" />
              <TileLayer 
                url={mapLayers[mapType].url} 
                attribution={mapLayers[mapType].attribution} 
                noWrap={true}
              />

              {hasLocationPermission && <Marker position={userLocation} icon={iconUser}><Tooltip direction="top">La teva ubicació</Tooltip></Marker>}

              <FlyToNegoci seleccio={seleccio} isSidebarVisible={isSidebarVisible} />
              <FitToGeometry geojson={geometryRuta} isSidebarVisible={isSidebarVisible} />
              <FlyToParadaExplorar parades={paradesRuta} selectedParadaId={selectedParadaId} isSidebarVisible={isSidebarVisible} />

              <MarkerClusterGroup 
                chunkedLoading 
                maxClusterRadius={30}
                showCoverageOnHover={false}
                spiderfyOnMaxZoom={true}
                iconCreateFunction={(cluster) => {
                  const count = cluster.getChildCount();
                  return L.divIcon({
                    html: `<div class="mapa-explorar-cluster-bubble">${count}</div>`,
                    className: "mapa-explorar-custom-cluster-icon",
                    iconSize: L.point(40, 40, true),
                  });
                }}
              >
                {rutesMarkers}
                {negocisMarkers}
              </MarkerClusterGroup>

              {seleccio?.type === 'ruta' && paradesRuta.map((p, i) => {
                const esMeva = user && (seleccio.data.id_usuari == user.id);
                let icono = esMeva ? iconParadaPropia : iconParada;
                
                if (p.tipus === 'negoci') {
                  //Comprovacio de propietat del negoci creuant dades de parades amb la llista de negocis
                  const esMeuNegoci = user && negocis.some(n => 
                    n.nom === p.nom && 
                    Number(n.latitud) === Number(p.latitud) && 
                    Number(n.longitud) === Number(p.longitud) && 
                    n.id_usuari == user.id
                  );
                  icono = esMeuNegoci ? iconParadaNegoci : iconParadaNegociOtro;
                }

                return (
                  <Marker key={`p-${seleccio.data.id_ruta}-${i}`} position={[Number(p.latitud), Number(p.longitud)]} icon={icono}
                    eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelectedParadaId(i); } }}
                  >
                    <Popup offset={[0, -20]}><strong>{p.nom}</strong></Popup>
                  </Marker>
                );
              })}

              {geometryRuta && (
                <GeoJSON
                  key={`geo-${seleccio?.data?.id_ruta}`}
                  data={geometryRuta}
                  style={{ color: "#007bff", weight: 5 }}
                />
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </MapContext.Provider>
  );
}