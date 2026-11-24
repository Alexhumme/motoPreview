import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pencil, Plus, Trash2, X } from 'lucide-react';
import DataTable from '../components/tables/DataTable';
import { useAuth } from '../context/authContexto';
import { usePermiso } from '../context/usePermiso';
import {
  actualizarTienda,
  crearTienda,
  eliminarTienda,
  obtenerPlanesSuscripcion,
  obtenerTiendas,
} from '../services/tiendas';
import { mensajeError } from '../services/crud';
import './Tiendas.css';

const FORMULARIO_VACIO = {
  nombre_tienda: '',
  nit: '',
  direccion_tienda: '',
  telefono_tienda: '',
  email_tienda: '',
  id_plan: '',
  estado_tienda: 'activa',
};

const COLUMNAS = [
  { clave: 'nombre_tienda', etiqueta: 'Tienda' },
  { clave: 'nit', etiqueta: 'NIT' },
  {
    clave: 'estado_tienda',
    etiqueta: 'Estado',
    filtrable: true,
    render: (tienda) => (
      <span className={`badge badge--${tienda.estado_tienda === 'activa' ? 'mint' : tienda.estado_tienda === 'suspendida' ? 'pink' : 'gray'}`}>
        {tienda.estado_tienda}
      </span>
    ),
    valor: (tienda) => tienda.estado_tienda,
  },
  {
    clave: 'plan',
    etiqueta: 'Plan',
    valor: (tienda) => tienda.plan_subscripcion?.plan_nombre,
    render: (tienda) => tienda.plan_subscripcion?.plan_nombre || '—',
  },
  {
    clave: 'contacto',
    etiqueta: 'Contacto',
    valor: (tienda) => tienda.email_tienda || tienda.telefono_tienda,
    render: (tienda) => tienda.email_tienda || tienda.telefono_tienda || '—',
  },
];

function formularioDeTienda(tienda) {
  if (!tienda) return FORMULARIO_VACIO;
  return {
    nombre_tienda: tienda.nombre_tienda || '',
    nit: tienda.nit || '',
    direccion_tienda: tienda.direccion_tienda || '',
    telefono_tienda: tienda.telefono_tienda || '',
    email_tienda: tienda.email_tienda || '',
    id_plan: tienda.id_plan || tienda.plan_subscripcion?.id_plan || '',
    estado_tienda: tienda.estado_tienda || 'activa',
  };
}

export default function Tiendas() {
  const { usuario } = useAuth();
  const { tienePermiso, esSuperAdmin } = usePermiso();
  const [tiendas, setTiendas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPlanes, setCargandoPlanes] = useState(false);
  const [error, setError] = useState('');
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [tiendaEditando, setTiendaEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');
  const [exito, setExito] = useState('');
  const [tiendaAEliminar, setTiendaAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  const puedeCrear = esSuperAdmin() || (!usuario?.id_tienda && tienePermiso('tiendas', 'crear', 'global'));
  const puedeEditar = tienePermiso('tiendas', 'actualizar');
  const puedeEliminar = tienePermiso('tiendas', 'eliminar');

  const cargar = useCallback(async () => {
    try {
      setTiendas(await obtenerTiendas());
      setError('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar la lista de tiendas.'));
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarRef = useRef();
  useEffect(() => {
    if (cargarRef.current === cargar) return;
    cargarRef.current = cargar;
    cargar();
  }, [cargar]);

  async function abrirFormulario(tienda = null) {
    setTiendaEditando(tienda);
    setFormulario(formularioDeTienda(tienda));
    setErrorFormulario('');
    setExito('');
    setFormularioAbierto(true);
    setCargandoPlanes(true);
    try {
      setPlanes(await obtenerPlanesSuscripcion());
    } catch (err) {
      setErrorFormulario(mensajeError(err, 'No se pudieron cargar los planes. Puedes guardar sin plan.'));
    } finally {
      setCargandoPlanes(false);
    }
  }

  function cambiarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function guardarTienda(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorFormulario('');
    setExito('');
    const datos = {
      ...formulario,
      nit: formulario.nit.trim() || null,
      direccion_tienda: formulario.direccion_tienda.trim() || null,
      telefono_tienda: formulario.telefono_tienda.trim() || null,
      email_tienda: formulario.email_tienda.trim() || null,
      id_plan: formulario.id_plan || null,
    };
    try {
      if (tiendaEditando) {
        await actualizarTienda(tiendaEditando.id_tienda, datos);
        setExito('Tienda actualizada correctamente.');
      } else {
        await crearTienda(datos);
        setExito('Tienda creada correctamente.');
      }
      setFormularioAbierto(false);
      await cargar();
    } catch (err) {
      setErrorFormulario(mensajeError(err, 'No se pudo guardar la tienda.'));
    } finally {
      setGuardando(false);
    }
  }

  function abrirEliminacion(tienda) {
    setTiendaAEliminar(tienda);
    setErrorEliminar('');
  }

  async function confirmarEliminacion() {
    setEliminando(true);
    setErrorEliminar('');
    try {
      await eliminarTienda(tiendaAEliminar.id_tienda);
      setTiendaAEliminar(null);
      setExito('Tienda desactivada. Su historial se conserva.');
      await cargar();
    } catch (err) {
      setErrorEliminar(mensajeError(err, 'No se pudo desactivar la tienda.'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <section className="tiendas">
      <header className="tiendas-header">
        <div>
          <h1 className="tiendas-title">Inventario de tiendas</h1>
          <p className="tiendas-help">Administra tiendas, planes y datos de contacto.</p>
        </div>
        {puedeCrear && (
          <button type="button" className="btn btn--primary" onClick={() => abrirFormulario()}>
            <Plus size={16} /> Nueva tienda
          </button>
        )}
      </header>

      {exito && <p className="mensaje mensaje-exito" role="status">{exito}</p>}

      <DataTable
        columnas={COLUMNAS}
        filas={tiendas}
        claveFila="id_tienda"
        cargando={cargando}
        error={error}
        onReintentar={() => { setCargando(true); cargar(); }}
        vacio="No hay tiendas registradas."
        acciones={(tienda) => (
          <div className="tiendas-acciones">
            <Link className="btn btn--outline btn--sm" to={`/admin/tiendas/${tienda.id_tienda}`}>
              Resumen <ArrowUpRight size={14} />
            </Link>
            {puedeEditar && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => abrirFormulario(tienda)}>
                <Pencil size={14} /> Editar
              </button>
            )}
            {puedeEliminar && tienda.estado_tienda !== 'inactiva' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => abrirEliminacion(tienda)}>
                <Trash2 size={14} /> Desactivar
              </button>
            )}
          </div>
        )}
      />

      {formularioAbierto && (
        <div className="modal-overlay" onClick={() => !guardando && setFormularioAbierto(false)}>
          <div className="modal tiendas-modal" role="dialog" aria-modal="true" aria-labelledby="tienda-form-title" onClick={(evento) => evento.stopPropagation()}>
            <header className="modal-header">
              <h2 id="tienda-form-title" className="modal-title">{tiendaEditando ? 'Editar tienda' : 'Nueva tienda'}</h2>
              <button type="button" className="modal-close" onClick={() => setFormularioAbierto(false)} aria-label="Cerrar" disabled={guardando}>
                <X size={18} />
              </button>
            </header>
            <form className="modal-form" onSubmit={guardarTienda}>
              <div className="tiendas-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="tienda-nombre">Nombre</label>
                  <input id="tienda-nombre" className="form-input" value={formulario.nombre_tienda} onChange={(evento) => cambiarCampo('nombre_tienda', evento.target.value)} required disabled={guardando} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="tienda-nit">NIT</label>
                  <input id="tienda-nit" className="form-input" value={formulario.nit} onChange={(evento) => cambiarCampo('nit', evento.target.value)} disabled={guardando} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="tienda-direccion">Dirección</label>
                <input id="tienda-direccion" className="form-input" value={formulario.direccion_tienda} onChange={(evento) => cambiarCampo('direccion_tienda', evento.target.value)} disabled={guardando} />
              </div>
              <div className="tiendas-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="tienda-telefono">Teléfono</label>
                  <input id="tienda-telefono" className="form-input" type="tel" value={formulario.telefono_tienda} onChange={(evento) => cambiarCampo('telefono_tienda', evento.target.value)} disabled={guardando} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="tienda-email">Email</label>
                  <input id="tienda-email" className="form-input" type="email" value={formulario.email_tienda} onChange={(evento) => cambiarCampo('email_tienda', evento.target.value)} disabled={guardando} />
                </div>
              </div>
              <div className="tiendas-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="tienda-plan">Plan</label>
                  <select id="tienda-plan" className="form-input" value={formulario.id_plan} onChange={(evento) => cambiarCampo('id_plan', evento.target.value)} disabled={guardando || cargandoPlanes}>
                    <option value="">{cargandoPlanes ? 'Cargando planes...' : 'Sin plan'}</option>
                    {planes.map((plan) => <option key={plan.id_plan} value={plan.id_plan}>{plan.plan_nombre}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="tienda-estado">Estado</label>
                  <select id="tienda-estado" className="form-input" value={formulario.estado_tienda} onChange={(evento) => cambiarCampo('estado_tienda', evento.target.value)} disabled={guardando}>
                    <option value="activa">Activa</option>
                    <option value="suspendida">Suspendida</option>
                    <option value="inactiva">Inactiva</option>
                  </select>
                </div>
              </div>
              {errorFormulario && <p className="form-error" role="alert">{errorFormulario}</p>}
              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setFormularioAbierto(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={guardando || cargandoPlanes}>
                  {guardando ? 'Guardando...' : 'Guardar tienda'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {tiendaAEliminar && (
        <div className="modal-overlay" onClick={() => !eliminando && setTiendaAEliminar(null)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="tienda-eliminar-title" onClick={(evento) => evento.stopPropagation()}>
            <header className="modal-header">
              <h2 id="tienda-eliminar-title" className="modal-title">Desactivar tienda</h2>
              <button type="button" className="modal-close" onClick={() => setTiendaAEliminar(null)} aria-label="Cerrar" disabled={eliminando}><X size={18} /></button>
            </header>
            <p>¿Desactivar <strong>{tiendaAEliminar.nombre_tienda}</strong>? Sus usuarios, inventario e historial se conservan.</p>
            {errorEliminar && <p className="form-error" role="alert">{errorEliminar}</p>}
            <footer className="modal-footer">
              <button type="button" className="btn btn--ghost" onClick={() => setTiendaAEliminar(null)} disabled={eliminando}>Cancelar</button>
              <button type="button" className="btn btn--primary" onClick={confirmarEliminacion} disabled={eliminando}>
                {eliminando ? 'Desactivando...' : 'Confirmar desactivación'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
