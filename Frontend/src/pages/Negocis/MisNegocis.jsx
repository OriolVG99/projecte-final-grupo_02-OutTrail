import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import ConfirmBox from "../../components/ConfirmBox.jsx";
import Message from "../../components/Message.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "./MisNegocis.css";

//Llistat de negocis propis de l'usuari amb funcions d'edicio i eliminacio
export default function MisNegocis() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [negocis, setNegocis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [negociToDelete, setNegociToDelete] = useState(null);

  const loadNegocis = async (customPage = page) => {
    try {
      const offset = (customPage - 1) * PAGE_SIZE;
      const res = await axios.get("http://localhost:4000/api/me/negocis", {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: PAGE_SIZE + 1, offset }
      });
      const rows = res.data.negocis || [];
      const hasMore = rows.length > PAGE_SIZE;
      setNegocis(rows.slice(0, PAGE_SIZE));
      setHasNextPage(hasMore);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadNegocis(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    loadNegocis();
  }, []);

  const eliminarNegoci = async () => {
    if (!negociToDelete) return;
    setConfirmOpen(false);
    setGlobalLoading(true);
    try {
      await axios.delete(`http://localhost:4000/api/negocis/${negociToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const isLastOnPage = negocis.length === 1 && page > 1;
      const newPage = isLastOnPage ? page - 1 : page;
      setPage(newPage);
      await loadNegocis(newPage);
      setMessageText("Negoci eliminat correctament.");
      setMessageOpen(true);
    } catch (err) {
      console.error(err);
      setMessageText("Error eliminant el negoci.");
      setMessageOpen(true);
    }
    setGlobalLoading(false);
  };

  if (loading) return <div className="mis-negocis-full-spinner"><Spinner /></div>;

  return (
    <div className="mis-negocis-page">
      {globalLoading && <div className="mis-negocis-overlay"><Spinner /></div>}
      {confirmOpen && (
        <ConfirmBox
          text="Segur que vols eliminar aquest negoci?"
          onConfirm={eliminarNegoci}
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
      <div className="mis-negocis-header-row">
        <h1 className="app-title">Els meus negocis</h1>
        <button className="mis-negocis-create-btn" onClick={() => navigate("/negocis/crear")}>+ Crear negoci</button>
      </div>
      {negocis.length === 0 && (
        <p className="mis-negocis-no-results">Encara no tens cap negoci.</p>
      )}
      <div className="mis-negocis-list">
        {negocis.map(n => {
          const fotos = n.fotos ? n.fotos.split(",") : [];
          return (
            <div key={n.id_negoci} className="mis-negocis-card">
              <div className="mis-negocis-photo-box">
                {fotos.length > 0 ? (
                  <img src={`http://localhost:4000/uploads/${fotos[0]}`} className="mis-negocis-photo" />
                ) : (
                  <img src="/OutTrail-sinfondo.png" alt="Sense foto" className="mis-negocis-photo" />
                )}
              </div>
              <div className="mis-negocis-card-info">
                <div className="mis-negocis-name">{n.nom}</div>
                <div className="mis-negocis-info">Zona: {n.zona || "—"}</div>
                <div className="mis-negocis-info">Tipus: {n.tipus || "—"}</div>
                {n.latitud && n.longitud && (
                  <div className="mis-negocis-coords">📍 {n.latitud}, {n.longitud}</div>
                )}
              </div>
              <div className="mis-negocis-actions">
                <button className="mis-negocis-view-btn" onClick={() => navigate(`/negocis/${n.id_negoci}`, { state: { fromMe: true } })}>Veure</button>
                <button className="mis-negocis-edit-btn" onClick={() => navigate(`/negocis/${n.id_negoci}/editar`, { state: { fromMe: true } })}>Editar</button>
                <button className="mis-negocis-delete-btn" onClick={() => { setNegociToDelete(n.id_negoci); setConfirmOpen(true); }}>Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>
      {(page > 1 || hasNextPage) && (
        <div className="mis-negocis-pagination">
          <button
            className={page > 1 ? "mis-negocis-page-btn" : "mis-negocis-page-btn-disabled"}
            onClick={() => page > 1 && handlePageChange(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </button>
          <span className="mis-negocis-page-text">Pàgina {page}</span>
          <button
            className={hasNextPage ? "mis-negocis-page-btn" : "mis-negocis-page-btn-disabled"}
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