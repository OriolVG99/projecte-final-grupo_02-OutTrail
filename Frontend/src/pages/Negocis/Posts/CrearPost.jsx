import { useState, useEffect } from "react";
import axios from "axios";
import Spinner from "../../../components/Spinner.jsx";
import Message from "../../../components/Message.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useNavigate, useParams } from "react-router-dom";
import "./CrearPost.css";

//Pantalla per crear una nova publicacio (post) d'un negoci
export default function CrearPost() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [titol, setTitol] = useState("");
  const [contingut, setContingut] = useState("");
  const [fotos, setFotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const onFotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const validImages = files.filter(file => file.type.startsWith("image/"));
    if (validImages.length !== files.length) {
      setMsg({ title: "Atenció", text: "Només es permeten fitxers d'imatge (jpg, png, etc.)", color: "yellow" });
    }
    if (validImages.length === 0) return;
    setFotos(prev => [...prev, ...validImages]);
    setPreviewUrls(prev => [...prev, ...validImages.map(f => URL.createObjectURL(f))]);
  };

  const removeFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [previewUrls]);

  const crear = async (e) => {
    e.preventDefault();
    if (!titol.trim() || !contingut.trim()) {
      setMsg({ title: "Atenció", text: "Títol i contingut són obligatoris", color: "yellow" });
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("titol", titol);
      form.append("contingut", contingut);
      fotos.forEach(f => form.append("fotos", f));
      await axios.post(
        `/api/negocis/${id}/posts`,
        form,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      navigate(`/negocis/${id}`, { replace: true });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="crear-post-page">
      {msg && <Message title={msg.title} text={msg.text} color={msg.color} buttonText="D'acord" onButtonClick={() => setMsg(null)} />}
      {loading && <div className="crear-post-overlay"><Spinner /></div>}
      <h1 className="crear-post-title">Crear post</h1>
      <form className="crear-post-form" onSubmit={crear}>
        <input className="crear-post-input" placeholder="Títol" value={titol} onChange={(e) => setTitol(e.target.value)} />
        <textarea className="crear-post-textarea" placeholder="Contingut" value={contingut} onChange={(e) => setContingut(e.target.value)} />
        <label className="crear-post-file-input-label">+ Afegir fotos
          <input type="file" multiple accept="image/*" onChange={onFotosChange} className="crear-post-file-input" />
        </label>
        {previewUrls.length > 0 && (
          <div className="crear-post-preview-grid">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="crear-post-preview-item">
                <img src={url} className="crear-post-preview-img" />
                <button type="button" className="crear-post-remove-foto-btn" onClick={() => removeFoto(idx)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <button className="crear-post-submit-btn" type="submit">Crear post</button>
      </form>
    </div>
  );
}