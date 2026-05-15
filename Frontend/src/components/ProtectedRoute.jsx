import { useAuth } from "../context/AuthContext.jsx";
import Error403 from "../pages/errors/Error403.jsx";

//Component per restringir l'acces a rutes segons l'autenticacio i el rol de l'usuari
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Error403 />;
  if (roles && !roles.includes(user.role)) return <Error403 />;
  return children;
}