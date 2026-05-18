import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../components/Spinner.jsx";
import Message from "../../components/Message.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import Error403 from "../errors/Error403.jsx";
import "./AdminBusinessRequests.css";

//Panell d'administracio per gestionar les peticions d'alta de comptes Business
export default function AdminBusinessRequests() {
  const { token, user, loading } = useAuth();
  const [loadingPage, setLoadingPage] = useState(true);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState(null);
  const [rejectBox, setRejectBox] = useState(null);
  const [motiu, setMotiu] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionText, setActionText] = useState("");

  const loadRequests = () => {
    axios
      .get("/api/admin/business-requests", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        setRequests(res.data.requests);
        setLoadingPage(false);
      })
      .catch(() => setLoadingPage(false));
  };

  useEffect(() => {
    if (!user || user.role !== 3) return;
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, [user, token]);

  if (loading) return <div className="admin-business-requests-spinner-wrapper"><Spinner /></div>;
  if (!user || user.role !== 3) return <Error403 />;
  if (loadingPage) return <div className="admin-business-requests-spinner-wrapper"><Spinner /></div>;

  const accept = async (id) => {
    setActionLoading(true);
    setActionText("Acceptant...");
    try {
      await axios.put(
        `/api/admin/business-requests/${id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadRequests();
      setMsg({ title: "Acceptada", text: "Sol·licitud acceptada correctament.", color: "green" });
    } catch (err) {
      setMsg({ title: "Error", text: "No s'ha pogut acceptar la sol·licitud.", color: "red" });
    }
    setActionLoading(false);
  };

  const reject = async (id) => {
    setActionLoading(true);
    setActionText("Denegant...");
    try {
      await axios.put(
        `/api/admin/business-requests/${id}/reject`,
        { motiu },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadRequests();
      setRejectBox(null);
      setMotiu("");
      setMsg({ title: "Rebutjada", text: "Sol·licitud rebutjada i usuari eliminat.", color: "red" });
    } catch (err) {
      setMsg({ title: "Error", text: "No s'ha pogut rebutjar la sol·licitud.", color: "red" });
    }
    setActionLoading(false);
  };

  return (
    <div className="admin-business-requests-page">
      {actionLoading && <div className="admin-business-requests-overlay"><Spinner /></div>}
      {msg && (
        <Message
          title={msg.title}
          text={msg.text}
          color={msg.color}
          buttonText="Tancar"
          onButtonClick={() => setMsg(null)}
        />
      )}
      <h1 className="app-title">Peticions Business</h1>
      {requests.length === 0 && (
        <p className="admin-business-requests-no-requests">No hi ha sol·licituds pendents.</p>
      )}
      {requests.map((req) => (
        <div key={req.id_usuari} className="admin-business-requests-card">
          <div className="admin-business-requests-row-main">
            <div className="admin-business-requests-info">
              <div className="admin-business-requests-text-row">
                <strong>👤 Nom:</strong> <span>{req.nom} {req.cognoms}</span>
              </div>
              <div className="admin-business-requests-text-row">
                <strong>@ Username:</strong> <span>{req.username}</span>
              </div>
              <div className="admin-business-requests-text-row">
                <strong>✉️ Email:</strong> <span>{req.email}</span>
              </div>
            </div>
            <div className="admin-business-requests-buttons">
              <button
                onClick={() => accept(req.id_usuari)}
                className="admin-business-requests-accept-btn"
                disabled={actionLoading}
              >
                {actionLoading && actionText === "Acceptant..." ? "Acceptant..." : "Acceptar"}
              </button>
              <button
                onClick={() => setRejectBox(rejectBox === req.id_usuari ? null : req.id_usuari)}
                className="admin-business-requests-reject-btn"
                disabled={actionLoading}
              >
                {rejectBox === req.id_usuari ? "Tancar" : "Denegar"}
              </button>
            </div>
          </div>
          {rejectBox === req.id_usuari && (
            <div className="admin-business-requests-reject-box">
              <textarea
                placeholder="Motiu de la denegació"
                value={motiu}
                onChange={(e) => setMotiu(e.target.value)}
                className="admin-business-requests-textarea"
              />
              <button
                onClick={() => reject(req.id_usuari)}
                className="admin-business-requests-reject-confirm-btn"
                disabled={actionLoading}
              >
                {actionLoading && actionText === "Denegant..." ? "Denegant..." : "Enviar i eliminar usuari"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}