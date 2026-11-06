import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, CalendarDays, CircleUser, LogOut, Mail, Moon, ShieldCheck,
  Store, Sun,
} from 'lucide-react';
import { useAuth } from '../context/authContexto';
import { usePermiso } from '../context/usePermiso';
import { useTema } from '../context/temaContexto';
import { obtenerTienda } from '../services/tiendas';
import { NOMBRE_ROL } from '../utils/constants/roles';
import './Perfil.css';

const BadgeEstado = ({ estado }) => {
  const variante = estado === 'activo' ? 'badge--mint' : estado === 'bloqueado' ? 'badge--pink' : 'badge--gray';
  return <span className={`badge ${variante}`}>{estado}</span>;
};

const fechaLarga = (fecha) => {
  if (!fecha) return '—';
  const fechaHora = new Date(fecha);
  return Number.isNaN(fechaHora.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(fechaHora);
};

export default function Perfil() {
  const { usuario, logout } = useAuth();
  const { tema, alternarTema } = useTema();
  const { esSuperAdmin } = usePermiso();
  const navigate = useNavigate();
  const [nombreTienda, setNombreTienda] = useState(null);

  const idTienda = usuario?.id_tienda;

  useEffect(() => {
    if (!idTienda) {
      setNombreTienda(null);
      return;
    }
    let activo = true;
    obtenerTienda(idTienda)
      .then((tienda) => { if (activo) setNombreTienda(tienda?.nombre_tienda ?? null); })
      .catch(() => { if (activo) setNombreTienda(null); });
    return () => { activo = false; };
  }, [idTienda]);

  if (!usuario) {
    return (
      <div className="perfil">
        <p className="perfil-vacio">La sesión caducó. <Link to="/login">Volver a entrar</Link>.</p>
      </div>
    );
  }

  const nombreRol = usuario.rol?.nombre_rol || NOMBRE_ROL[usuario.id_rol] || 'Personal de tienda';

  function manejarLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="perfil">
      <header className="perfil-header">
        <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Panel / Perfil</div>
        <h1 className="perfil-title">Mi perfil</h1>
      </header>

      <section className="card perfil-identidad" aria-labelledby="identidad-title">
        <h2 id="identidad-title" className="perfil-seccion-title">Identidad</h2>
        <div className="perfil-identidad-fila">
          <span className="perfil-avatar" aria-hidden="true"><CircleUser size={34} /></span>
          <div className="perfil-identidad-texto">
            <strong className="perfil-nombre">{usuario.usu_nombre || 'Sin nombre'}</strong>
            <span className="perfil-rol">{nombreRol}</span>
            {usuario.email_verificado && (
              <span className="perfil-verificado" title="Correo verificado">
                <BadgeCheck size={14} aria-hidden="true" /> Correo verificado
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="card perfil-datos" aria-labelledby="datos-title">
        <h2 id="datos-title" className="perfil-seccion-title">Datos de la cuenta</h2>
        <dl className="perfil-data-list">
          <div>
            <dt><Mail size={14} aria-hidden="true" /> Correo</dt>
            <dd>{usuario.usu_email}</dd>
          </div>
          <div>
            <dt><ShieldCheck size={14} aria-hidden="true" /> Rol</dt>
            <dd>{nombreRol}{esSuperAdmin() ? ' · acceso global' : ''}</dd>
          </div>
          <div>
            <dt><Store size={14} aria-hidden="true" /> Tienda</dt>
            <dd>{nombreTienda || (idTienda ? 'No se pudo cargar' : 'Cuenta global, sin tienda')}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd><BadgeEstado estado={usuario.estado_usuario} /></dd>
          </div>
          <div>
            <dt><CalendarDays size={14} aria-hidden="true" /> Registro</dt>
            <dd>{fechaLarga(usuario.fecha_registro)}</dd>
          </div>
        </dl>
      </section>

      <section className="card perfil-preferencias" aria-labelledby="preferencias-title">
        <h2 id="preferencias-title" className="perfil-seccion-title">Sesión y apariencia</h2>
        <div className="perfil-preferencias-acciones">
          <button className="btn btn--outline btn--sm" onClick={alternarTema}>
            {tema === 'oscuro' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            {tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}
          </button>
          <button className="btn btn--danger btn--sm" onClick={manejarLogout}>
            <LogOut size={14} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}
