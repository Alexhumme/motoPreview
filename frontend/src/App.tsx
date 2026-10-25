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

function LazyRoute({ component: Component, ...props }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Route {...props} element={<Component />} />
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
          <LazyRoute path="inventario" component={Inventario} />
          <LazyRoute path="cotizaciones" component={Cotizaciones} />
          <LazyRoute path="reportes" component={Reportes} />
          <Route
            path="productos"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]}>
                <RecursoAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path="usuarios"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]}>
                <Usuarios />
              </RutaProtegida>
            }
          />
          <Route
            path="tienda"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]}>
                <Tienda />
              </RutaProtegida>
            }
          />
          <Route
            path="permisos"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]}>
                <PermisosRBAC />
              </RutaProtegida>
            }
          />
          <Route
            path="roles"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]}>
                <Roles />
              </RutaProtegida>
            }
          />
        </Route>
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </>
  );
}

export default App;