import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Catalogo from './pages/public/Catalogo';
import Carrito from './pages/public/Carrito';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Inventario from './pages/admin/Inventario';
import Cotizaciones from './pages/admin/Cotizaciones';
import RutaProtegida from './components/RutaProtegida';
import { ROL_ADMIN, ROL_VENDEDOR } from './constants/roles';
import Visualizador from './pages/public/Visualizador';
import Accesorios from './pages/admin/Accesorios';
import Configurador from './pages/public/Configurador';
import MisCotizaciones from './pages/public/MisCotizaciones';
import NoEncontrado from './pages/public/NoEncontrado';
import Usuarios from './pages/admin/Usuarios';
import Reportes from './pages/admin/Reportes';
import VerificarCorreo from './pages/auth/VerificarCorreo';
import BannerConexion from './components/BannerConexion';
import Tienda from './pages/admin/Tienda';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import RestablecerPassword from './pages/auth/RestablecerPassword';
import Registro from './pages/auth/Registro';

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
      </Route>
      <Route path="*" element={<NoEncontrado />} />
     </Routes>
  </>
);
}

export default App;