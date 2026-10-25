import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Catalogo from './pages/public/Catalogo';
import Carrito from './pages/public/Carrito';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Cotizaciones from './pages/Cotizaciones';
import RutaProtegida from './components/private/RutaProtegida';
import { ROL_ADMIN, ROL_VENDEDOR } from './utils/constants/roles';
import Visualizador from './pages/public/Visualizador';
import Accesorios from './components/tables/Accesorios';
import Configurador from './pages/public/Configurador';
import MisCotizaciones from './pages/public/MisCotizaciones';
import NoEncontrado from './pages/public/NoEncontrado';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';
import VerificarCorreo from './pages/auth/VerificarCorreo';
import BannerConexion from './components/menus/BannerConexion';
import Tienda from './pages/Tienda';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import RestablecerPassword from './pages/auth/RestablecerPassword';
import Registro from './pages/auth/Registro';
import PermisosRBAC from './pages/PermisosRBAC';
import Roles from './pages/Roles';

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
          <Route path="inventario" element={<Inventario />} />
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="reportes" element={<Reportes />} />
          <Route
            path="accesorios"
            element={
              <RutaProtegida rolesPermitidos={[ROL_ADMIN]}>
                <Accesorios />
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