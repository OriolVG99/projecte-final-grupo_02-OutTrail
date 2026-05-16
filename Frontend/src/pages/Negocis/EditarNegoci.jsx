import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "./EditarNegoci.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
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

const TIPUS_NEGOCI = ["Restaurant", "Botiga", "Bar", "Hotel", "Cafeteria", "Supermercat", "Farmàcia", "Gimnàs"];

//Gestiona el clic al mapa per actualitzar coordenades i zona en el formulari d'edicio
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

//Formulari d'edicio de dades de negoci, incloent gestio de fotos i ubicacio
export default function EditarNegoci() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [nom, setNom] = useState("");
  const [zona, setZona] = useState("");
  const [tipus, setTipus] = useState("");
  const [descripcio, setDescripcio] = useState("");
  const [latLng, setLatLng] = useState({ lat: "", lng: "" });
  const [existingFotos, setExistingFotos] = useState([]);
  const [newFotos, setNewFotos] = useState([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [mapType, setMapType] = useState("satellite");
  const [mapInstance, setMapInstance] = useState(null);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageColor, setMessageColor] = useState("red");
  const [confirmSave, setConfirmSave] = useState(false);

  const showMessage = (text, color = "red") => {
    setMessageText(text);
    setMessageColor(color);
    setMessageOpen(true);
  };

  useEffect(() => {
    const loadNegoci = async () => {
      try {
        const res = await axios.get(`/api/negocis/${id}`);
        const n = res.data.negoci;
        setNom(n.nom || "");
        setZona(n.zona || "");
        setTipus(n.tipus || "");
        setDescripcio(n.descripcio || "");
        if (n.latitud && n.longitud) setLatLng({ lat: n.latitud, lng: n.longitud });
        setExistingFotos(n.fotos ? n.fotos.split(",").map(f => f.trim()).filter(Boolean) : []);
      } catch (err) {
        console.error(err);
        showMessage("Error carregant negoci");
      } finally {
        setLoading(false);
      }
    };
    loadNegoci();
  }, [id]);

  const onNewFotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewFotos(prev => [...prev, ...files]);
    setNewPreviewUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeExistingFoto = (index) => setExistingFotos(prev => prev.filter((_, i) => i !== index));

  const removeNewFoto = (index) => {
    setNewFotos(prev => prev.filter((_, i) => i !== index));
    setNewPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => newPreviewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [newPreviewUrls]);

  const allowOnlyNumbers = (e) => {
    const allowed = ["0","1","2","3","4","5","6","7","8","9",".",",","-","Backspace","Delete","ArrowLeft","ArrowRight","Tab"];
    if (!allowed.includes(e.key)) e.preventDefault();
  };

  const onLatChange = (e) => {
    const raw = e.target.value.replace(",", ".");
    setLatLng(prev => ({ ...prev, lat: raw }));
    if (raw.trim() !== "" && !isNaN(Number(raw)) && !isNaN(Number(latLng.lng))) {
      mapInstance?.setView([Number(raw), Number(latLng.lng)], mapInstance.getZoom());
    }
  };

  const onLngChange = (e) => {
    const raw = e.target.value.replace(",", ".");
    setLatLng(prev => ({ ...prev, lng: raw }));
    if (raw.trim() !== "" && !isNaN(Number(raw)) && !isNaN(Number(latLng.lat))) {
      mapInstance?.setView([Number(latLng.lat), Number(raw)], mapInstance.getZoom());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nom.trim()) return showMessage("El nom és obligatori");
    setConfirmSave(true);
  };

  const editar = async () => {
    setConfirmSave(false);
    setGlobalLoading(true);
    try {
      const form = new FormData();
      form.append("nom", nom);
      form.append("zona", zona);
      form.append("tipus", tipus);
      form.append("descripcio", descripcio);
      form.append("existingFotos", JSON.stringify(existingFotos));
      if (latLng.lat && latLng.lng) {
        form.append("latitud", Number(latLng.lat));
        form.append("longitud", Number(latLng.lng));
      }
      newFotos.forEach(f => form.append("fotos", f));
      await axios.put(`/api/negocis/${id}`, form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      showMessage("Negoci actualitzat correctament!", "green");
    } catch (err) {
      console.error(err);
      showMessage("Error actualitzant el negoci");
    } finally {
      setGlobalLoading(false);
    }
  };

  if (loading) return <div className="editar-negoci-full-spinner"><Spinner /></div>;

  return (
    <div className="editar-negoci-page">
      {globalLoading && <div className="editar-negoci-overlay"><Spinner /></div>}
      {confirmSave && (
        <ConfirmBox
          text="Segur que vols guardar els canvis del negoci?"
          onConfirm={editar}
          onCancel={() => setConfirmSave(false)}
        />
      )}
      {messageOpen && (
        <Message
          title={messageColor === "green" ? "Tot correcte" : "Atenció"}
          text={messageText}
          color={messageColor}
          buttonText="Tancar"
          onButtonClick={() => {
            setMessageOpen(false);
            if (messageColor === "green") {
              const fromMe = location.state?.fromMe === true;
              navigate(`/negocis/${id}`, { state: { fromMe }, replace: true });
            }
          }}
        />
      )}
      <h1 className="editar-negoci-title">Editar negoci</h1>
      <div className="editar-negoci-card">
        <form className="editar-negoci-form" onSubmit={handleSubmit}>
          <div className="editar-negoci-section">
            <h2 className="editar-negoci-section-title">Informació bàsica</h2>
            <input className="editar-negoci-input" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            <select className="editar-negoci-input" value={tipus} onChange={(e) => setTipus(e.target.value)}>
              <option value="">Tipus de negoci</option>
              {TIPUS_NEGOCI.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="editar-negoci-input" placeholder="Zona" value={zona} onChange={(e) => setZona(e.target.value)} />
            <textarea className="editar-negoci-textarea" placeholder="Descripció" value={descripcio} onChange={(e) => setDescripcio(e.target.value)} />
          </div>
          <div className="editar-negoci-section">
            <h2 className="editar-negoci-section-title">Coordenades</h2>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "10px", marginTop: "-4px" }}>Clica al mapa per canviar les coordenades automàticament.</p>
            <div className="editar-negoci-coords-row">
              <input className="editar-negoci-input" placeholder="Latitud" value={latLng.lat} onKeyDown={allowOnlyNumbers} onChange={onLatChange} />
              <input className="editar-negoci-input" placeholder="Longitud" value={latLng.lng} onKeyDown={allowOnlyNumbers} onChange={onLngChange} />
            </div>
          </div>
          <div className="editar-negoci-section">
            <h2 className="editar-negoci-section-title">Ubicació al mapa</h2>
            <div className="editar-negoci-map-box">
              <div style={{ position: "relative", width: "100%", height: "450px" }}>
                <MapContainer whenCreated={setMapInstance} center={[latLng.lat || 41.226, latLng.lng || 1.725]} zoom={15} maxZoom={mapType === "topo" ? 12 : 17} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url={mapLayers[mapType]} noWrap={true} />
                  <ClickHandler setLatLng={setLatLng} onZonaAuto={setZona} />
                  {latLng.lat && latLng.lng && <Marker position={[Number(latLng.lat), Number(latLng.lng)]} icon={defaultIcon} />}
                </MapContainer>
                <div className="editar-negoci-map-thumb-container">
                  <div className="editar-negoci-map-thumb-box" onClick={() => setMapType(mapType === "satellite" ? "osm" : mapType === "osm" ? "topo" : "satellite")}>
                    <img src={thumbnails[mapType]} alt="map" className="editar-negoci-map-thumb-img" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="editar-negoci-section">
            <h2 className="editar-negoci-section-title">Fotos</h2>
            {existingFotos.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "14px", marginBottom: "8px", fontWeight: "bold" }}>Fotos actuals:</p>
                <div className="editar-negoci-preview-grid">
                  {existingFotos.map((f, idx) => (
                    <div key={idx} className="editar-negoci-preview-item">
                      <img src={f?.startsWith('http') ? f : `/uploads/${f}`} alt="" className="editar-negoci-preview-img" />
                      <button type="button" className="editar-negoci-remove-foto-btn" onClick={() => removeExistingFoto(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <label className="editar-negoci-file-input-label">+ Afegir fotos noves
              <input type="file" multiple onChange={onNewFotosChange} className="editar-negoci-file-input" />
            </label>
            {newPreviewUrls.length > 0 && (
              <div className="editar-negoci-preview-grid">
                {newPreviewUrls.map((url, idx) => (
                  <div key={idx} className="editar-negoci-preview-item">
                    <img src={url} alt="" className="editar-negoci-preview-img" />
                    <button type="button" className="editar-negoci-remove-foto-btn" onClick={() => removeNewFoto(idx)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="editar-negoci-actions-row">
            <button type="button" className="editar-negoci-cancel-btn" onClick={() => navigate(-1)}>Cancel·lar</button>
            <button className="editar-negoci-submit-btn" type="submit">Guardar canvis</button>
          </div>
        </form>
      </div>
    </div>
  );
}