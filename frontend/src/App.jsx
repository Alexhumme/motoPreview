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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Catalogo />} />
      <Route path="/carrito" element={<Carrito />} />
      <Route path="/visualizador/:id" element={<Visualizador />} />
      <Route path="/configurador" element={<Configurador />} />
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
        <Route path="accesorios" element={<Accesorios />} />
      </Route>
    </Routes>
  );
}

export default App;