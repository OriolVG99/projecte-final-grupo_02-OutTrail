import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, ZoomControl, useMap, Tooltip } from "react-leaflet";
import { useState, memo, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import L from "leaflet";
import Spinner from "../../components/Spinner.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import "./EditarRuta.css";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  rectSortingStrategy
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import Message from "../../components/Message.jsx";
import Error403 from "../errors/Error403.jsx";

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;

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

function MapResizer({ isSidebarVisible }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (map) map.invalidateSize();
      } catch (e) {
        console.warn("map.invalidateSize error", e);
      }
    }, 400);
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

function FlyToSelected({ punts, selectedPointId }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedPointId) return;
    const p = punts.find(pt => pt.id === selectedPointId);
    if (p) {
      map.flyTo([p.lat, p.lng], 18, { duration: 0.6 });
    }
  }, [selectedPointId, punts, map]);
  return null;
}

//Genera una icona combinada que indica si el punt esta seleccionat i si es un negoci propi
const createCombinedIcon = (selected, tipus, esMeu) => {
  let iconUrl = "/pinrojo.png";
  if (tipus === 'negoci') {
    iconUrl = esMeu ? "/pinverde.png" : "/pinamarillo.png";
  }
  return L.divIcon({
    html: `
      <div style="position: relative; width: 32px; height: 32px;">
        <img src="${iconUrl}" style="width:28px;height:28px;" />
        ${selected ? `<div style="position:absolute; top:0px; right:10.5px; background:#FFFFFF; color:red; width:15px; height:15px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.3); border:1px solid #ccc;">×</div>` : ""}
      </div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
};

const selectedHaloIcon = L.divIcon({
  html: `<div style="width:40px; height:40px; margin-top:2px; margin-left:2.5px; border-radius:50%; background:rgba(0,150,0,0.25); border:2px solid #008000; transform:translate(-4px,-8px);"></div>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 32]
});

const iconNegociMeu = L.icon({
  iconUrl: "/iconoverde.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const iconNegociAltre = L.icon({
  iconUrl: "/iconoamarillo.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

//Item de la llista lateral que permet reordenar i editar el nom de les parades
const SortablePunt = memo(function SortablePunt({ punt, setPunts, puntRefs, selectedPointId, setSelectedPointId }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: punt.id,
    activationConstraint: { distance: 8 }
  });

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={(el) => { setNodeRef(el); puntRefs.current[punt.id] = el; }}
      className="sortable-item-inner"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: selectedPointId === punt.id ? "#e8f5e9" : "white",
        border: selectedPointId === punt.id ? "1px solid #004c06" : "1px solid #ddd"
      }}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); setSelectedPointId(punt.id); }}
    >
      <div {...listeners} className="sortable-item-handle" onClick={(e) => e.stopPropagation()}>
        ☰ Arrossega per moure
      </div>
      <input
        className="sortable-item-input"
        value={punt.nom}
        onChange={(e) => {
          const nouNom = e.target.value;
          setPunts(prev => prev.map(p => (p.id === punt.id ? { ...p, nom: nouNom } : p)));
        }}
        onClick={(e) => { e.stopPropagation(); setSelectedPointId(punt.id); }}
      />
      <div className="sortable-item-footer">
        <small className="sortable-item-coords">{Number(punt.lat).toFixed(5)}, {Number(punt.lng).toFixed(5)}</small>
        <button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => { e.stopPropagation(); setPunts(prev => prev.filter(p => p.id !== punt.id)); }}
          className="sortable-item-delete-btn"
          style={{ background: isHovered ? "#8a1400" : "#b01a00" }}
        >Eliminar</button>
      </div>
    </div>
  );
});

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
      className="editar-ruta-preview-item"
    >
      <img src={photo.preview || photo.url} className="editar-ruta-preview-img" {...attributes} {...listeners} alt="" />
      <button 
        onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
        className="editar-ruta-remove-preview"
      >×</button>
    </div>
  );
});

export default function EditarRuta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, loading } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [punts, setPunts] = useState([]);
  const [nomRuta, setNomRuta] = useState("");
  const [descripcio, setDescripcio] = useState("");
  const [zona, setZona] = useState("");
  const [dificultat, setDificultat] = useState("");
  const [distancia, setDistancia] = useState("");
  const [esPublica, setEsPublica] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [negocis, setNegocis] = useState([]);

  const [fotosGrid, setFotosGrid] = useState([]);

  const [geometry, setGeometry] = useState(null);
  const [mapType, setMapType] = useState("satellite");
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]);
  const [userLocation, setUserLocation] = useState([40.4168, -3.7038]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const [show403, setShow403] = useState(false);
  const [modal, setModal] = useState(null); 
  const [confirmSave, setConfirmSave] = useState(false);
  const puntRefs = useRef({});
  const fileInputRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setUserLocation(prev => {
          if (prev && prev[0] === latitude && prev[1] === longitude) return prev;
          return [latitude, longitude];
        });
        setHasLocationPermission(true);
      },
      () => {
        setHasLocationPermission(false);
        setUserLocation([40.4168, -3.7038]);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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

  useEffect(() => {
    const fetchNegocis = async () => {
      try {
        const res = await axios.get("/api/negocis?limit=1000");
        setNegocis(res.data.negocis || []);
      } catch (err) {
        console.error("Error carregant negocis", err);
      }
    };
    fetchNegocis();
  }, []);

  const iconUser = new L.Icon({ iconUrl: "/puntblau.png", iconSize: [20, 20], iconAnchor: [10, 10] });

  useEffect(() => {
    if (!token || loading) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    axios.get(`/api/rutes/${id}`, config)
      .then(res => {
        const { ruta, parades: paradesDB, geometry: geomDB } = res.data;

        if (String(ruta.id_usuari) !== String(user?.id) && user?.role !== 3) {
          setLoadingData(false);
          setShow403(true);
          return;
        }

        setNomRuta(ruta.nom);
        setDescripcio(ruta.descripcio || "");
        setZona(ruta.zona || "");
        setDificultat(ruta.dificultat || "");
        setEsPublica(ruta.es_publica);
        setDistancia(ruta.distancia_km || "");

        if (ruta.fotos) {
          const files = ruta.fotos.split(",").map(f => f.trim()).filter(Boolean);
          const mapped = files.map(f => ({
             id: f,
             type: 'existing',
             url: f.startsWith('http') ? f : `/uploads/${f}`,
             filename: f
          }));
          setFotosGrid(mapped);
        }

        const puntsCarregats = paradesDB.map(p => ({
          id: `p-${Math.random()}`,
          nom: p.nom,
          lat: Number(p.latitud),
          lng: Number(p.longitud),
          tipus: p.tipus || null
        }));

        setPunts(puntsCarregats);

        if (puntsCarregats.length > 0) {
          setMapCenter([puntsCarregats[0].lat, puntsCarregats[0].lng]);
        }

        if (geomDB) setGeometry(geomDB);

        setLoadingData(false);
      })
      .catch(err => {
        console.error(err);
        setModal({
          title: "Error",
          text: "No s'ha pogut carregar la ruta. Torna-ho a intentar.",
          color: "red",
          buttonText: "Tornar",
          onButtonClick: () => navigate("/explorar")
        });
      });
  }, [id, token, user, loading, navigate]);

  useEffect(() => {
    if (punts.length < 2) { setGeometry(null); setDistancia(""); return; }
    const timeout = setTimeout(async () => {
      try {
        const coords = punts.map(p => [p.lng, p.lat]);
        const res = await fetch("/api/ors-directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: coords })
        });
        const data = await res.json();
        if (data.features) {
          const ruta = data.features[0];
          setGeometry(ruta.geometry);
          setDistancia((ruta.properties.summary.distance / 1000).toFixed(2));
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [punts]);

  useEffect(() => {
    if (punts.length === 0) return;

    function samplePoints(points, minDistanceMeters = 1000) {
      const result = [];
      let last = null;
      for (const p of points) {
        if (!last) { result.push(p); last = p; continue; }
        const dist = Math.sqrt(Math.pow((p.lng - last.lng) * 111320, 2) + Math.pow((p.lat - last.lat) * 110540, 2));
        if (dist >= minDistanceMeters) { result.push(p); last = p; }
      }
      if (result.length > 0 && result[result.length - 1] !== points[points.length - 1]) {
        result.push(points[points.length - 1]);
      }
      return result;
    }

    const timeout = setTimeout(async () => {
      const sampled = samplePoints(punts);
      const names = [];
      for (const p of sampled) {
        try {
          const r = await fetch("/api/reverse-geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: p.lat, lon: p.lng })
          });
          const j = await r.json();
          const n = j.address?.city || j.address?.town || j.address?.village;
          if (n && !names.includes(n)) names.push(n);
        } catch {}
      }
      if (names.length > 0) setZona(names.join(" - "));
    }, 1200);

    return () => clearTimeout(timeout);
  }, [punts]);

  function AfegirPunt() {
    useMapEvents({
      click(e) {
        setSelectedPointId(null);
        const { lat, lng } = e.latlng;
        setPunts(prev => [...prev, { id: Date.now().toString(), nom: `Punt ${prev.length + 1}`, lat, lng }]);
      }
    });
    return null;
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
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
      setModal({ 
        title: "Atenció", 
        text: "Algunes imatges són massa grans i s'han descartat. El límit per imatge és 4MB.", 
        color: "yellow",
        buttonText: "D'acord",
        onButtonClick: () => setModal(null)
      });
    }

    if (validFiles.length > 0) {
      const newItems = validFiles.map(file => ({
        id: `new-${Date.now()}-${Math.random()}`,
        type: 'new',
        file,
        preview: URL.createObjectURL(file)
      }));
      setFotosGrid(prev => [...prev, ...newItems]);
    }
  };

  const removePhoto = (id) => {
    setFotosGrid(prev => prev.filter(f => f.id !== id));
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPunts(prev => {
      const oldIndex = prev.findIndex(p => p.id === active.id);
      const newIndex = prev.findIndex(p => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
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

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    const missingFields = [];
    if (!nomRuta.trim()) missingFields.push("Nom");
    if (!descripcio.trim()) missingFields.push("Descripció");
    if (!zona.trim()) missingFields.push("Zona");
    if (!dificultat.trim()) missingFields.push("Dificultat");
    if (punts.length < 2) missingFields.push("almenys 2 punts al mapa");

    if (missingFields.length > 0) {
      setModal({
        title: "Falten dades",
        text: `Falten els següents camps: ${missingFields.join(", ")}.`,
        color: "yellow",
        buttonText: "D'acord",
        onButtonClick: () => setModal(null)
      });
      return;
    }
    setConfirmSave(true);
  };

  //Logica per actualitzar la ruta existent, gestionant noves imatges i eliminacio de les antigues
  const guardarCanvis = async () => {
    if (saving) return;
    setConfirmSave(false);
    setSaving(true);

    const formData = new FormData();
    formData.append("nom", nomRuta);
    formData.append("descripcio", descripcio);
    formData.append("zona", zona);
    formData.append("dificultat", dificultat);
    formData.append("es_publica", esPublica);
    formData.append("distancia_km", distancia);
    const existingToKeep = fotosGrid.filter(f => f.type === 'existing').map(f => f.filename);
    const ordenFotos = fotosGrid.map(f => f.type);
    
    formData.append("existingFotos", JSON.stringify(existingToKeep));
    formData.append("ordenFotos", JSON.stringify(ordenFotos));
    
    if (geometry) formData.append("geojson", JSON.stringify(geometry));
    
    const newFiles = fotosGrid.filter(f => f.type === 'new');
    const totalSize = newFiles.reduce((acc, f) => acc + f.file.size, 0);
    if (totalSize > 4.5 * 1024 * 1024) {
      setModal({ 
        title: "Atenció", 
        text: "El conjunt de noves imatges és massa gran per al servidor (més de 4.5MB total). Si us plau, redueix el nombre o qualitat de les fotos.", 
        color: "yellow",
        buttonText: "D'acord",
        onButtonClick: () => setModal(null)
      });
      setSaving(false);
      return;
    }

    newFiles.forEach(f => formData.append("fotos", f.file));

    try {
      await axios.put(
        `/api/rutes/${id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      setSaving(false);
      setModal({
        title: "Ruta actualitzada",
        text: "Els canvis s'han guardat correctament.",
        color: "green",
        buttonText: "Veure ruta",
        onButtonClick: () => navigate(`/rutes/${id}`, { 
          state: { fromMe: location.state?.fromMe },
          replace: true
        })
      });
    } catch (err) {
      console.error(err);
      setSaving(false);
      setModal({
        title: "Error en guardar",
        text: "No s'han pogut guardar els canvis. Torna-ho a intentar.",
        color: "red",
        buttonText: "Tancar",
        onButtonClick: () => setModal(null)
      });
    }
  };

  if (loading || loadingData) return <Spinner />;
  if (show403) return <Error403 />;
  if (!user) return <p style={{ padding: "2rem" }}>Inicia sessió per editar rutes.</p>;

  return (
    <div 
      className="editar-ruta-page"
      onClick={(e) => {
        if (!e.target.closest('.sortable-item-inner') && !e.target.closest('.leaflet-marker-icon') && !e.target.closest('.editar-ruta-sidebar')) {
          setSelectedPointId(null);
        }
      }}
    >
      {modal && <Message title={modal.title} text={modal.text} color={modal.color} buttonText={modal.buttonText} onButtonClick={modal.onButtonClick} />}
      {confirmSave && <ConfirmBox text="Segur que vols guardar els canvis de la ruta?" onConfirm={guardarCanvis} onCancel={() => setConfirmSave(false)} />}

      <div className="editar-ruta-container">

        <div
          className="editar-ruta-sidebar"
          style={{ width: isSidebarVisible ? "350px" : "0px", opacity: isSidebarVisible ? 1 : 0, transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="editar-ruta-sidebar-inner">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
               <button onClick={() => navigate(-1)} className="editar-ruta-back-btn">← Tornar</button>
            </div>
            
            <h2 className="editar-ruta-title">EDITAR RUTA</h2>

            <div className="editar-ruta-form-group">
              <label><strong>Nom</strong></label>
              <input className="editar-ruta-input" placeholder="Ex: Camí de Ronda" value={nomRuta} onChange={(e) => setNomRuta(e.target.value)} />

              <label><strong>Descripció</strong></label>
              <textarea className="editar-ruta-textarea" placeholder="Explica com és la ruta..." value={descripcio} onChange={(e) => setDescripcio(e.target.value)} />

              <label><strong>Zona</strong></label>
              <input className="editar-ruta-input" placeholder="S'omple automàticament" value={zona} onChange={(e) => setZona(e.target.value)} />

              <label><strong>Dificultat</strong></label>
              <select className="editar-ruta-input" value={dificultat} onChange={(e) => setDificultat(e.target.value)}>
                <option value="">Selecciona dificultat</option>
                <option value="Molt fàcil">Molt fàcil</option>
                <option value="Fàcil">Fàcil</option>
                <option value="Mitjana">Mitjana</option>
                <option value="Difícil">Difícil</option>
                <option value="Expert">Expert</option>
              </select>

              <label><strong>Visibilitat</strong></label>
              <select className="editar-ruta-input" value={esPublica} onChange={(e) => setEsPublica(e.target.value === "true")}>
                <option value="true">Pública (tothom la pot veure)</option>
                <option value="false">Privada (només jo)</option>
              </select>

              <label><strong>Fotos de la ruta</strong></label>

              <div
                className="editar-ruta-dropzone"
                onClick={() => fileInputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileChange({ target: { files: e.dataTransfer.files } });
                  }
                }}
              >
                <p className="editar-ruta-dropzone-text">Prem per afegir més imatges</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>

              {fotosGrid.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndPhotos}>
                  <SortableContext items={fotosGrid.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="editar-ruta-fotos-grid">
                      {fotosGrid.map((p) => (
                        <SortablePhoto key={p.id} photo={p} removePhoto={removePhoto} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <div className="editar-ruta-distance-box">
                <strong>Distància total:</strong> {distancia || "0.00"} km
              </div>
            </div>

            <h3 className="editar-ruta-section-header">Punts de pas ({punts.length})</h3>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '-5px', marginBottom: '10px', fontStyle: 'italic' }}>Clica sobre el mapa per crear una parada</p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={punts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="editar-ruta-punts-container">
                  {punts.map((p) => (
                    <SortablePunt key={p.id} punt={p} setPunts={setPunts} puntRefs={puntRefs} selectedPointId={selectedPointId} setSelectedPointId={setSelectedPointId} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button className="editar-ruta-save-btn" onClick={handleSubmit} disabled={saving}>
              {saving ? "Guardant..." : "Guardar Canvis"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, position: "relative" }} onClick={() => setSelectedPointId(null)}>
          <button className="collapse-btn" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
            {isSidebarVisible ? "◀" : "▶"}
          </button>

          <MapContainer
            center={mapCenter}
            zoom={hasLocationPermission ? 13 : 6}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            minZoom={3}
            maxZoom={19}
            maxBounds={[[-90, -180], [90, 180]]}
          >
            <ChangeView center={mapCenter} zoom={hasLocationPermission ? 13 : 6} />
            <MapResizer isSidebarVisible={isSidebarVisible} />
            <ZoomControl position="topright" />
            <TileLayer 
              url={mapLayers[mapType].url} 
              attribution={mapLayers[mapType].attribution} 
              maxNativeZoom={mapType === "topo" ? 17 : 17}
              maxZoom={19}
              noWrap={true}
            />
            <AfegirPunt />

            {negocis.filter(n => !punts.some(p => p.tipus === 'negoci' && p.nom === n.nom)).map(negoci => {
              const esMeu = user && negoci.id_usuari === user.id;
              return (
                <Marker
                  key={`negoci-${negoci.id_negoci}`}
                  position={[negoci.latitud, negoci.longitud]}
                  icon={esMeu ? iconNegociMeu : iconNegociAltre}
                  eventHandlers={{
                    click: () => {
                      setPunts(prev => [...prev, {
                        id: Date.now().toString() + "-" + negoci.id_negoci,
                        nom: negoci.nom,
                        lat: negoci.latitud,
                        lng: negoci.longitud,
                        tipus: "negoci",
                        id_usuari_negoci: negoci.id_usuari
                      }]);
                      setModal({ title: "Negoci afegit", text: `S'ha afegit ${negoci.nom} com a parada a la teva ruta!`, color: "green", buttonText: "D'acord", onButtonClick: () => setModal(null) });
                    }
                  }}
                >
                  <Tooltip direction="top" offset={[0, -30]}>Negoci {negoci.nom} (Clic per afegir com a parada)</Tooltip>
                </Marker>
              );
            })}

            {punts.map((p) => selectedPointId === p.id && (
              <Marker key={p.id + "-halo"} position={[p.lat, p.lng]} icon={selectedHaloIcon} interactive={false} />
            ))}

            {userLocation && (
              <Marker position={userLocation} icon={iconUser}>
                <Tooltip direction="top" offset={[0, -10]}>La teva ubicació</Tooltip>
              </Marker>
            )}

            <FlyToSelected punts={punts} selectedPointId={selectedPointId} />

            {punts.map((p) => {
              //Comprovacio robusta de propietat per determinar el color del pin (verd = propi, groc = altre)
              const esMeu = p.tipus === 'negoci' && (
                p.id_usuari_negoci ? Number(p.id_usuari_negoci) === Number(user?.id) : 
                negocis.find(n => 
                  n.nom === p.nom && 
                  Number(n.latitud) === Number(p.lat) && 
                  Number(n.longitud) === Number(p.lng)
                )?.id_usuari === user?.id
              );
              return (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={createCombinedIcon(selectedPointId === p.id, p.tipus, esMeu)}
                  eventHandlers={{
                    click: (e) => {
                      const target = e.originalEvent.target;
                      if (target.innerText === "×") {
                        setPunts(prev => prev.filter(x => x.id !== p.id));
                        setSelectedPointId(null);
                        return;
                      }
                      setSelectedPointId(p.id);
                      puntRefs.current[p.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                />
              );
            })}

            {geometry && (
              <Polyline
                positions={geometry.coordinates.map(c => [c[1], c[0]])}
                color="#0936cc"
                weight={4}
                opacity={0.7}
              />
            )}
          </MapContainer>

          <div className="editar-ruta-map-controls">
            <div className="editar-ruta-layer-btn" onClick={() => setMapType(prev => prev === "satellite" ? "osm" : prev === "osm" ? "topo" : "satellite")}>
              <img src={thumbnails[mapType]} alt="map" className="editar-ruta-layer-img" />
            </div>
          </div>
        </div>
      </div>

      {saving && (
        <div className="editar-ruta-overlay"><Spinner /></div>
      )}
    </div>
  );
}