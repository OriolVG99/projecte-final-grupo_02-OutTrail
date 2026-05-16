import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import Message from "../../components/Message.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "./MisRutes.css";

//Gestio de les rutes creades per l'usuari amb paginacio i eliminacio
export default function MisRutes() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [rutes, setRutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [rutaToDelete, setRutaToDelete] = useState(null);

  const loadRutes = async (customPage = page) => {
    try {
      const offset = (customPage - 1) * PAGE_SIZE;
      const res = await axios.get(`/api/rutes/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: PAGE_SIZE + 1, offset }
      });
      const rows = res.data.rutes || [];
      const hasMore = rows.length > PAGE_SIZE;
      setRutes(rows.slice(0, PAGE_SIZE));
      setHasNextPage(hasMore);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadRutes(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (user?.id) loadRutes();
  }, [user]);

  const eliminarRuta = async () => {
    if (!rutaToDelete) return;
    setConfirmOpen(false);
    setGlobalLoading(true);
    try {
      await axios.delete(`/api/rutes/${rutaToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const isLastOnPage = rutes.length === 1 && page > 1;
      const newPage = isLastOnPage ? page - 1 : page;
      setPage(newPage);
      await loadRutes(newPage);
      setMessageText("Ruta eliminada correctament.");
      setMessageOpen(true);
    } catch (err) {
      console.error(err);
      setMessageText("Error eliminant la ruta.");
      setMessageOpen(true);
    }
    setGlobalLoading(false);
  };

  if (loading) return <div className="mis-rutes-full-spinner"><Spinner /></div>;

  return (
    <div className="mis-rutes-page">
      {globalLoading && <div className="mis-rutes-overlay"><Spinner /></div>}
      {confirmOpen && (
        <ConfirmBox
          text="Segur que vols eliminar aquesta ruta?"
          onConfirm={eliminarRuta}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      {messageOpen && (
        <Message
          title="Operació completada"
          text={messageText}
          color="green"
          buttonText="Tancar"
          onButtonClick={() => setMessageOpen(false)}
        />
      )}
      <div className="mis-rutes-header-row">
        <h1 className="app-title">Les meves rutes</h1>
        <button
          className="mis-rutes-create-btn"
          onClick={() => navigate("/crear-ruta", { state: { fromMe: true } })}
        >
          + Crear ruta
        </button>
      </div>
      {rutes.length === 0 && (
        <p className="mis-rutes-no-results">Encara no tens cap ruta creada.</p>
      )}
      <div className="mis-rutes-list">
        {rutes.map(r => {
          const fotos = r.fotos ? r.fotos.split(",") : [];
          return (
            <div key={r.id_ruta} className="mis-rutes-card">
              <div className="mis-rutes-photo-box">
                {fotos.length > 0 ? (
                  <img src={fotos[0]?.startsWith('http') ? fotos[0] : `/uploads/${fotos[0]}`} className="mis-rutes-photo" />
                ) : (
                  <img src="/OutTrail-sinfondo.png" alt="Sense foto" className="mis-rutes-photo" />
                )}
              </div>
              <div className="mis-rutes-card-info">
                <div className="mis-rutes-name">{r.nom}</div>
                <div className="mis-rutes-info">Zona: {r.zona || "—"}</div>
                <div className="mis-rutes-info">Dificultat: {r.dificultat || "—"}</div>
                <div className="mis-rutes-info">Distància: {r.distancia_km || "0"} km</div>
                <div className="mis-rutes-visibility-badge" style={{ 
                  background: r.es_publica ? "#e6f4ea" : "#e8f0fe",
                  color: r.es_publica ? "#1e7e34" : "#1967d2"
                }}>
                  {r.es_publica ? "🔓 Pública" : "🔒 Privada"}
                </div>
              </div>
              <div className="mis-rutes-actions">
                <button className="mis-rutes-view-btn" onClick={() => navigate(`/rutes/${r.id_ruta}`)}>Veure</button>
                <button className="mis-rutes-edit-btn" onClick={() => navigate(`/editar-ruta/${r.id_ruta}`, { state: { fromMe: true } })}>Editar</button>
                <button className="mis-rutes-delete-btn" onClick={() => { setRutaToDelete(r.id_ruta); setConfirmOpen(true); }}>Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>
      {(page > 1 || hasNextPage) && (
        <div className="mis-rutes-pagination">
          <button
            className="mis-rutes-page-btn"
            onClick={() => page > 1 && handlePageChange(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </button>
          <span className="mis-rutes-page-text">Pàgina {page}</span>
          <button
            className="mis-rutes-page-btn"
            onClick={() => hasNextPage && handlePageChange(page + 1)}
            disabled={!hasNextPage}
          >
            Següent
          </button>
        </div>
      )}
    </div>
  );
}
