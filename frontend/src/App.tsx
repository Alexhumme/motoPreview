import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Login from './pages/auth/Login';
import Catalogo from './pages/public/Catalogo';
import Carrito from './pages/public/Carrito';
import AdminLayout from './layouts/AdminLayout';
import RutaProtegida from './components/private/RutaProtegida';
import { ROL_ADMIN, ROL_SUPERADMIN, ROL_VENDEDOR } from './utils/constants/roles';
import MisCotizaciones from './pages/public/MisCotizaciones';
import NoEncontrado from './pages/public/NoEncontrado';
import VerificarCorreo from './pages/auth/VerificarCorreo';
import BannerConexion from './components/menus/BannerConexion';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import RestablecerPassword from './pages/auth/RestablecerPassword';
import Registro from './pages/auth/Registro';

// Code-splitting: páginas con three.js bajo demanda (pesan ~1MB);
// si fueran estáticas ensuciarían el bundle inicial de toda la app.
const Visualizador = lazy(() => import('./pages/public/Visualizador'));
const Configurador = lazy(() => import('./pages/public/Configurador'));

// Code-splitting: cargar páginas admin bajo demanda
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Cotizaciones = lazy(() => import('./pages/Cotizaciones'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Tienda = lazy(() => import('./pages/Tienda'));
const Seguridad = lazy(() => import('./pages/Seguridad'));
const Accesorios = lazy(() => import('./pages/Accesorios'));

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
        <Route path="/" element={<Catalogo />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/verificar/:token" element={<VerificarCorreo />} />
        <Route path="/recuperar" element={<RecuperarPassword />} />
        <Route path="/restablecer/:token" element={<RestablecerPassword />} />
        <Route
          path="/visualizador/:id"
          element={<LazyWrapper Component={Visualizador} />}
        />
        <Route
          path="/configurador"
          element={<LazyWrapper Component={Configurador} />}
        />
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
            path="accesorios"
            element={
              <RutaProtegida
                rolesPermitidos={[ROL_ADMIN]}
                permisos={[
                  { recurso: 'productos', accion: 'crear' },
                  { recurso: 'productos', accion: 'actualizar' },
                ]}
              >
                <LazyWrapper Component={Accesorios} />
              </RutaProtegida>
            }
          />
          <Route
            path="usuarios"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]} recurso="usuarios" accion="listar">
                <LazyWrapper Component={Usuarios} />
              </RutaProtegida>
            }
          />
          <Route path="tienda" element={<LazyWrapper Component={Tienda} />} />
          <Route
            path="permisos"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN, ROL_SUPERADMIN]}>
                <LazyWrapper Component={Seguridad} />
              </RutaProtegida>
            }
          />
          <Route path="roles" element={<Navigate to="/admin/permisos" replace />} />
        </Route>
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </>
  );
}

export default App;