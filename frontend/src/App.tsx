import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Login from './pages/auth/Login';
import Catalogo from './pages/public/Catalogo';
import Carrito from './pages/public/Carrito';
import AdminLayout from './layouts/AdminLayout';
import RutaProtegida from './components/private/RutaProtegida';
import { ROL_ADMIN, ROL_VENDEDOR } from './utils/constants/roles';
import Visualizador from './pages/public/Visualizador';
import Configurador from './pages/public/Configurador';
import MisCotizaciones from './pages/public/MisCotizaciones';
import NoEncontrado from './pages/public/NoEncontrado';
import VerificarCorreo from './pages/auth/VerificarCorreo';
import BannerConexion from './components/menus/BannerConexion';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import RestablecerPassword from './pages/auth/RestablecerPassword';
import Registro from './pages/auth/Registro';

// Code-splitting: cargar páginas admin bajo demanda
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Cotizaciones = lazy(() => import('./pages/Cotizaciones'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Tienda = lazy(() => import('./pages/Tienda'));
const PermisosRBAC = lazy(() => import('./pages/PermisosRBAC'));
const Roles = lazy(() => import('./pages/Roles'));
const RecursoAdmin = lazy(() => import('./components/tables/RecursoAdmin'));

function LoadingFallback() {
  return <div className="admin-loading">Cargando módulo...</div>;
}

// Wrapper para rutas lazy con Suspense
function LazyWrapper({ Component }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  );
}

function App() {
  return (
    <>
      <BannerConexion />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/verificar/:token" element={<VerificarCorreo />} />
        <Route path="/recuperar" element={<RecuperarPassword />} />
        <Route path="/restablecer/:token" element={<RestablecerPassword />} />
        <Route path="/visualizador/:id" element={<Visualizador />} />
        <Route path="/configurador" element={<Configurador />} />
        <Route
          path="/mis-cotizaciones"
          element={
            <RutaProtegida>
              <MisCotizaciones />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin"
          element={
            <RutaProtegida rolesPermitidos={[ROL_ADMIN, ROL_VENDEDOR]}>
              <AdminLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inventario" element={<LazyWrapper Component={Inventario} />} />
          <Route path="cotizaciones" element={<LazyWrapper Component={Cotizaciones} />} />
          <Route path="reportes" element={<LazyWrapper Component={Reportes} />} />
          <Route
            path="productos"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]}>
                <RecursoAdmin />
              </RutaProtegida>
            }
          />
          <Route path="usuarios" element={<LazyWrapper Component={Usuarios} />} />
          <Route path="tienda" element={<LazyWrapper Component={Tienda} />} />
          <Route path="permisos" element={<LazyWrapper Component={PermisosRBAC} />} />
          <Route path="roles" element={<LazyWrapper Component={Roles} />} />
        </Route>
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </>
  );
}

export default App;