import { useState, useEffect, useRef, memo } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "./CrearNegoci.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortablePhoto = memo(function SortablePhoto({ photo, removePhoto }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: photo.id
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none'
      }}
      className="crear-negoci-preview-item"
    >
      <img src={photo.preview} className="crear-negoci-preview-img" {...attributes} {...listeners} alt="" />
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
        className="crear-negoci-remove-foto-btn"
      >✕</button>
    </div>
  );
});

const markerIcon = L.icon({
  iconUrl: "/iconoverde.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const iconUser = new L.Icon({
  iconUrl: "/puntblau.png",
  iconSize: [20, 20],
  iconAnchor: [10, 10]
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

const TIPUS_NEGOCI = ["Restaurant", "Botiga", "Bar", "Hotel", "Cafeteria", "Supermercat", "Farmàcia"];
const fallbackVilanova = [41.226, 1.725];

//Gestiona el clic al mapa per obtenir coordenades i fer reverse geocoding de la zona
function ClickHandler({ setLatLng, onZonaAuto }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setLatLng({ lat, lng });
      try {
        const res = await axios.post("/api/reverse-geocode", { lat, lon: lng });
        const zona = res.data.address?.city || res.data.address?.town || res.data.address?.village || "";
        if (zona) onZonaAuto(zona);
      } catch (err) {
        console.error("ERROR REVERSE GEOCODE:", err);
      }
    }
  });
  return null;
}

//Formulari de creacio de negoci amb seleccio d'ubicacio interactiva al mapa
export default function CrearNegoci() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [nom, setNom] = useState("");
  const [zona, setZona] = useState("");
  const [tipus, setTipus] = useState("");
  const [descripcio, setDescripcio] = useState("");
  const [latLng, setLatLng] = useState({ lat: "", lng: "" });
  const [fotosGrid, setFotosGrid] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState("satellite");
  const [userLocation, setUserLocation] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  
  const fileInputRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageColor, setMessageColor] = useState("red");
  const [redirectId, setRedirectId] = useState(null);

  const showMessage = (text, color = "red") => {
    setMessageText(text);
    setMessageColor(color);
    setMessageOpen(true);
  };

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      pos => {
        setHasLocationPermission(true);
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setHasLocationPermission(false);
        setUserLocation(fallbackVilanova);
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  const onFotosChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const validFiles = [];
    let hasTooLarge = false;

    for (const file of files) {
      if (file.size > 4 * 1024 * 1024) {
        hasTooLarge = true;
      } else {
        validFiles.push(file);
      }
    }

    if (hasTooLarge) {
      showMessage("Algunes imatges són massa grans i s'han descartat. El límit per imatge és 4MB.", "yellow");
    }

    if (validFiles.length > 0) {
      const newItems = validFiles.map(file => ({
        id: `new-${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file)
      }));
      setFotosGrid(prev => [...prev, ...newItems]);
    }
  };

  const removeFoto = (id) => {
    setFotosGrid(prev => prev.filter(f => f.id !== id));
  };

  const onDragEndPhotos = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFotosGrid(prev => {
      const oldIndex = prev.findIndex(p => p.id === active.id);
      const newIndex = prev.findIndex(p => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const allowOnlyNumbers = (e) => {
    const allowed = ["0","1","2","3","4","5","6","7","8","9",".",",","-","Backspace","Delete","ArrowLeft","ArrowRight","Tab"];
    if (!allowed.includes(e.key)) e.preventDefault();
  };

  const onLatChange = (e) => {
    let raw = e.target.value.replace(",", ".");
    setLatLng(prev => ({ ...prev, lat: raw }));
    if (!isNaN(Number(raw)) && raw.trim() !== "" && !isNaN(Number(latLng.lng))) {
      mapInstance?.setView([Number(raw), Number(latLng.lng)], mapInstance.getZoom());
    }
  };

  const onLngChange = (e) => {
    let raw = e.target.value.replace(",", ".");
    setLatLng(prev => ({ ...prev, lng: raw }));
    if (!isNaN(Number(raw)) && raw.trim() !== "" && !isNaN(Number(latLng.lat))) {
      mapInstance?.setView([Number(latLng.lat), Number(raw)], mapInstance.getZoom());
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!nom.trim()) return showMessage("El nom és obligatori");
    if (!tipus) return showMessage("El tipus de negoci és obligatori");
    if (!zona.trim()) return showMessage("La zona és obligatòria");
    if (!descripcio.trim()) return showMessage("La descripció és obligatòria");
    if (latLng.lat === "" || latLng.lng === "") return showMessage("Les coordenades són obligatòries");
    if (isNaN(Number(latLng.lat)) || isNaN(Number(latLng.lng))) return showMessage("Coordenades no vàlides");

    setLoading(true);
    try {
      const form = new FormData();
      form.append("nom", nom);
      form.append("zona", zona);
      form.append("tipus", tipus);
      form.append("descripcio", descripcio);
      form.append("latitud", Number(latLng.lat));
      form.append("longitud", Number(latLng.lng));
      const totalSize = fotosGrid.reduce((acc, f) => acc + f.file.size, 0);
      if (totalSize > 4.5 * 1024 * 1024) {
        showMessage("El conjunt d'imatges és massa gran per al servidor (més de 4.5MB total). Si us plau, redueix el nombre o qualitat de les fotos.", "yellow");
        setLoading(false);
        return;
      }

      for (let f of fotosGrid) form.append("fotos", f.file);
      const res = await axios.post("/api/negocis", form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      setRedirectId(res.data.id_negoci);
      showMessage("Negoci creat correctament!", "green");
    } catch (err) {
      console.error(err);
      showMessage("Error creant el negoci");
    }
    setLoading(false);
  };

  return (
    <div className="crear-negoci-page">
      {loading && <div className="crear-negoci-overlay"><Spinner /></div>}
      {messageOpen && (
        <Message
          title={messageColor === "green" ? "Tot correcte" : "Atenció"}
          text={messageText}
          color={messageColor}
          buttonText="Tancar"
          onButtonClick={() => {
            setMessageOpen(false);
            if (redirectId && messageColor === "green") navigate(`/negocis/${redirectId}`, { state: { fromMe: true }, replace: true });
          }}
        />
      )}
      <h1 className="crear-negoci-title">Crear negoci</h1>
      <div className="crear-negoci-card">
        <form className="crear-negoci-form" onSubmit={crear}>
          <div className="crear-negoci-section">
            <h2 className="crear-negoci-section-title">Informació bàsica</h2>
            <input className="crear-negoci-input" placeholder="Nom del negoci" value={nom} onChange={(e) => setNom(e.target.value)} />
            <select className="crear-negoci-input" value={tipus} onChange={(e) => setTipus(e.target.value)}>
              <option value="">Tipus de negoci</option>
              {TIPUS_NEGOCI.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="crear-negoci-input" placeholder="Zona (automàtica si cliques al mapa)" value={zona} onChange={(e) => setZona(e.target.value)} />
            <textarea className="crear-negoci-textarea" placeholder="Descripció" value={descripcio} onChange={(e) => setDescripcio(e.target.value)} />
          </div>
          <div className="crear-negoci-section">
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "10px" }}>
              <h2 className="crear-negoci-section-title" style={{ marginBottom: 0 }}>Coordenades</h2>
              <span style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>(Clica al mapa per emplenar les coordenades)</span>
            </div>
            <div className="crear-negoci-coords-row">
              <input className="crear-negoci-input" placeholder="Latitud" value={latLng.lat} onKeyDown={allowOnlyNumbers} onChange={onLatChange} />
              <input className="crear-negoci-input" placeholder="Longitud" value={latLng.lng} onKeyDown={allowOnlyNumbers} onChange={onLngChange} />
            </div>
          </div>
          <div className="crear-negoci-section">
            <h2 className="crear-negoci-section-title">Ubicació al mapa</h2>
            <div className="crear-negoci-map-box">
              <div style={{ position: "relative", width: "100%", height: "450px" }}>
                <MapContainer
                  whenCreated={setMapInstance}
                  center={userLocation || fallbackVilanova}
                  zoom={hasLocationPermission ? 14 : 6}
                  minZoom={2.5}
                  maxZoom={mapType === "topo" ? 12 : 17}
                  worldCopyJump={false}
                  noWrap={true}
                  zoomControl={false}
                  maxBounds={[[85, -180], [-85, 180]]}
                  maxBoundsViscosity={1.0}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url={mapLayers[mapType]} maxNativeZoom={mapType === "topo" ? 12 : 17} maxZoom={mapType === "topo" ? 12 : 17} noWrap={true} />
                  <ClickHandler setLatLng={setLatLng} onZonaAuto={setZona} />
                  {latLng.lat !== "" && latLng.lng !== "" && !isNaN(Number(latLng.lat)) && !isNaN(Number(latLng.lng)) && (
                    <Marker position={[Number(latLng.lat), Number(latLng.lng)]} icon={markerIcon} />
                  )}
                  {hasLocationPermission && userLocation && <Marker position={userLocation} icon={iconUser} />}
                </MapContainer>
                <div style={{ position: "absolute", bottom: "20px", right: "20px", zIndex: 1100, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                  <div style={{ background: "white", borderRadius: "12px", padding: "2px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", cursor: "pointer", display: "flex" }} onClick={() => setMapType(mapType === "satellite" ? "osm" : mapType === "osm" ? "topo" : "satellite")}>
                    <img src={thumbnails[mapType]} alt="map" style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="crear-negoci-section">
            <h2 className="crear-negoci-section-title">Fotos</h2>
            <div 
              className="crear-negoci-dropzone"
              onClick={() => fileInputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  onFotosChange({ target: { files: e.dataTransfer.files } });
                }
              }}
            >
              <p className="crear-negoci-dropzone-text">Prem per afegir fotos del negoci</p>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                onChange={onFotosChange} 
              />
            </div>
            {fotosGrid.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndPhotos}>
                <SortableContext items={fotosGrid.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="crear-negoci-preview-grid">
                    {fotosGrid.map((p) => (
                      <SortablePhoto key={p.id} photo={p} removePhoto={removeFoto} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          <div className="crear-negoci-actions-row">
            <button type="button" className="crear-negoci-cancel-btn" onClick={() => navigate("/me/negocis")}>Cancel·lar</button>
            <button className="crear-negoci-submit-btn" type="submit">+ Crear negoci</button>
          </div>
        </form>
      </div>
    </div>
  );
}