import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import LoginRegister from "./pages/LoginRegister/LoginRegister.jsx";
import Perfil from "./pages/Perfils/Perfil.jsx";
import Header from "./components/Header.jsx";
import "leaflet/dist/leaflet.css";
import MapaExplorar from "./pages/Mapas/MapaExplorar.jsx";
import CrearRuta from "./pages/Rutas/CrearRuta.jsx";
import DetallRuta from "./pages/Rutas/DetallRuta.jsx";
import EditarRuta from "./pages/Rutas/EditarRuta.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Error404 from "./pages/errors/Error404.jsx";
import ExploraRutes from "./pages/Rutas/ExploraRutes.jsx";
import MisRutes from "./pages/Rutas/MisRutes.jsx";
import Perfils from "./pages/Perfils/Perfils.jsx";
import PerfilDetall from "./pages/Perfils/PerfilDetall.jsx";
import Seguits from "./pages/Perfils/Seguits.jsx";
import AdminBusinessRequests from "./pages/BusinessRol/AdminBusinessRequests.jsx";
import AdminPanel from "./pages/Admin/AdminPanel.jsx";
import AdminUserEdit from "./pages/Admin/AdminUserEdit.jsx";
import BusinessRegister from "./pages/BusinessRol/BusinessRegister.jsx";
import ExploraNegocis from "./pages/Negocis/ExploraNegocis.jsx";
import DetallNegoci from "./pages/Negocis/DetallNegoci.jsx";
import MisNegocis from "./pages/Negocis/MisNegocis.jsx";
import CrearNegoci from "./pages/Negocis/CrearNegoci.jsx";
import EditarNegoci from "./pages/Negocis/EditarNegoci.jsx";
import CrearPost from "./pages/Negocis/Posts/CrearPost.jsx";
import EditarPost from "./pages/Negocis/Posts/EditarPost.jsx";
import Favorits from "./pages/Perfils/Favorits.jsx";
import Landing from "./pages/Landing/Landing.jsx";
import LegalPage from "./pages/Landing/LegalPage.jsx";
import axios from "axios";
import "./index.css";

//Configurar interceptor global per detectar quan l'usuari ha estat eliminat o el token es invalid
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      //Si el servidor ens diu que no estem autoritzats (per exemple, usuari borrat)
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  }
);

//Punt d'entrada de l'aplicacio on es defineix el sistema de rutes i el context d'autenticacio
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/auth" element={<LoginRegister />} />
          <Route path="/" element={<Landing />} />
          <Route path="/explorar" element={<MapaExplorar />} />
          <Route path="/register-business" element={<BusinessRegister />} />

          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/crear-ruta" element={<ProtectedRoute><CrearRuta /></ProtectedRoute>} />
          <Route path="/rutes/:id" element={<ProtectedRoute><DetallRuta /></ProtectedRoute>} />
          <Route path="/editar-ruta/:id" element={<ProtectedRoute><EditarRuta /></ProtectedRoute>} />
          <Route path="/rutes" element={<ProtectedRoute><ExploraRutes /></ProtectedRoute>} />
          <Route path="/me/rutes" element={<ProtectedRoute><MisRutes /></ProtectedRoute>} />
          <Route path="/perfils" element={<ProtectedRoute><Perfils /></ProtectedRoute>} />
          <Route path="/perfils/:id" element={<ProtectedRoute><PerfilDetall /></ProtectedRoute>} />
          <Route path="/perfils/seguits" element={<ProtectedRoute><Seguits /></ProtectedRoute>} />
          
          <Route path="/admin" element={<ProtectedRoute roles={[3]}><AdminPanel /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute roles={[3]}><AdminUserEdit /></ProtectedRoute>} />
          <Route path="/admin/business-requests" element={<ProtectedRoute roles={[3]}><AdminBusinessRequests /></ProtectedRoute>} />
          
          <Route path="/negocis" element={<ProtectedRoute><ExploraNegocis /></ProtectedRoute>} />
          <Route path="/negocis/:id" element={<ProtectedRoute><DetallNegoci /></ProtectedRoute>} />
          <Route path="/me/negocis" element={<ProtectedRoute roles={[2, 3]}><MisNegocis /></ProtectedRoute>} />
          <Route path="/negocis/crear" element={<ProtectedRoute roles={[2, 3]}><CrearNegoci /></ProtectedRoute>} />
          <Route path="/negocis/:id/editar" element={<ProtectedRoute roles={[2, 3]}><EditarNegoci /></ProtectedRoute>} />
          <Route path="/negocis/:id/posts/crear" element={<ProtectedRoute roles={[2, 3]}><CrearPost /></ProtectedRoute>} />
          <Route path="/posts_negoci/:id/editar" element={<ProtectedRoute roles={[2, 3]}><EditarPost /></ProtectedRoute>} />
          
          <Route path="/favorits" element={<ProtectedRoute><Favorits /></ProtectedRoute>} />
          <Route path="/legal/:type" element={<LegalPage />} />
          <Route path="*" element={<Error404 />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);