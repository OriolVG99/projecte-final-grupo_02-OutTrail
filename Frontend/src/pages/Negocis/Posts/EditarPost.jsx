import { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "../../../components/Spinner.jsx";
import Message from "../../../components/Message.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useNavigate, useParams } from "react-router-dom";
import "./EditarPost.css";

//Pantalla per editar un post existent d'un negoci, permetent modificar text i fotos
export default function EditarPost() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [titol, setTitol] = useState("");
  const [contingut, setContingut] = useState("");
  const [idNegoci, setIdNegoci] = useState(null);
  const [existingFotos, setExistingFotos] = useState([]);
  const [newFotos, setNewFotos] = useState([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadPost();
  }, []);

  const loadPost = async () => {
    try {
      const res = await axios.get(`/api/posts_negoci/${id}`);
      const post = res.data.post;
      setTitol(post.titol);
      setContingut(post.contingut);
      setIdNegoci(post.id_negoci);
      setExistingFotos(post.fotos ? post.fotos.split(",").map(f => f.trim()).filter(Boolean) : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const onNewFotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const validImages = files.filter(file => file.type.startsWith("image/"));
    if (validImages.length !== files.length) {
      setMsg({ title: "Atenció", text: "Només es permeten fitxers d'imatge (jpg, png, etc.)", color: "yellow" });
    }
    if (validImages.length === 0) return;
    setNewFotos(prev => [...prev, ...validImages]);
    setNewPreviewUrls(prev => [...prev, ...validImages.map(f => URL.createObjectURL(f))]);
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

  const editar = async (e) => {
    e.preventDefault();
    if (!titol.trim() || !contingut.trim()) {
      setMsg({ title: "Atenció", text: "Títol i contingut són obligatoris", color: "yellow" });
      return;
    }
    setGlobalLoading(true);
    try {
      const form = new FormData();
      form.append("titol", titol);
      form.append("contingut", contingut);
      form.append("existingFotos", JSON.stringify(existingFotos));
      newFotos.forEach(f => form.append("fotos", f));
      await axios.put(`/api/posts_negoci/${id}`, form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      navigate(`/negocis/${idNegoci}`, { replace: true });
    } catch (err) {
      console.error(err);
    }
    setGlobalLoading(false);
  };

  if (loading) return <div className="editar-post-full-spinner"><Spinner /></div>;

  return (
    <div className="editar-post-page">
      {msg && <Message title={msg.title} text={msg.text} color={msg.color} buttonText="D'acord" onButtonClick={() => setMsg(null)} />}
      {globalLoading && <div className="editar-post-overlay"><Spinner /></div>}
      <h1 className="editar-post-title">Editar post</h1>
      <form className="editar-post-form" onSubmit={editar}>
        <input className="editar-post-input" placeholder="Títol" value={titol} onChange={(e) => setTitol(e.target.value)} />
        <textarea className="editar-post-textarea" placeholder="Contingut" value={contingut} onChange={(e) => setContingut(e.target.value)} />
        {existingFotos.length > 0 && (
          <div>
            <p style={{ fontWeight: "bold", marginBottom: "10px" }}>Fotos actuals:</p>
            <div className="editar-post-preview-grid">
              {existingFotos.map((f, idx) => (
                <div key={idx} className="editar-post-preview-item">
                  <img src={f?.startsWith('http') ? f : `/uploads/${f}`} className="editar-post-preview-img" />
                  <button type="button" className="editar-post-remove-foto-btn" onClick={() => removeExistingFoto(idx)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <label className="editar-post-file-input-label">+ Afegir fotos noves
          <input type="file" multiple accept="image/*" onChange={onNewFotosChange} className="editar-post-file-input" />
        </label>
        {newPreviewUrls.length > 0 && (
          <div className="editar-post-preview-grid">
            {newPreviewUrls.map((url, idx) => (
              <div key={idx} className="editar-post-preview-item">
                <img src={url} className="editar-post-preview-img" />
                <button type="button" className="editar-post-remove-foto-btn" onClick={() => removeNewFoto(idx)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <button className="editar-post-submit-btn" type="submit">Guardar canvis</button>
      </form>
    </div>
  );
}