import { useEffect, useRef, useState } from 'react';
import DataTable from './DataTable';
import ModalConfirmacion from '../ModalConfirmacion';
import { mensajeError } from '../../services/crud';
import './RecursoAdmin.css';

function valoresIniciales(campos, fila, aFormulario) {
  const base = {};
  campos.forEach((c) => { base[c.nombre] = c.defecto ?? ''; });
  if (!fila) return base;
  const origen = aFormulario ? aFormulario(fila) : fila;
  campos.forEach((c) => {
    const valor = origen[c.nombre];
    base[c.nombre] = valor === null || valor === undefined ? '' : String(valor);
  });
  return base;
}

function construirPayload(campos, valores) {
  const payload = {};
  campos.forEach((c) => {
    const bruto = (valores[c.nombre] ?? '').toString().trim();
    if (bruto === '') {
      payload[c.nombre] = null;
    } else {
      payload[c.nombre] = c.tipo === 'number' ? Number(bruto) : bruto;
    }
  });
  return payload;
}

/**
 * Pantalla CRUD administrativa reutilizable: tabla + formulario + confirmación.
 *
 * api: { listar, crear, actualizar, eliminar }  (ver services/crud.js)
 * columnas / campos: arreglo, o función (extra) => arreglo cuando dependen de datos auxiliares.
 */
export default function RecursoAdmin({
  titulo,
  singular,
  claveId,
  api,
  columnas,
  campos,
  cargarExtra,
  aFormulario,
  textoEliminar,
  accionesExtra,
  solo = false,
  vacio,
}) {
  const [filas, setFilas] = useState([]);
  const [extra, setExtra] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);
  const [editando, setEditando] = useState(undefined); // undefined = cerrado, null = nuevo, objeto = edición
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const primerCampo = useRef(null);

  const cols = typeof columnas === 'function' ? columnas(extra) : columnas;
  const camposForm = typeof campos === 'function' ? campos(extra) : campos;

  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [datos, adicional] = await Promise.all([api.listar(), cargarExtra ? cargarExtra() : {}]);
        if (!activo) return;
        setFilas(datos);
        setExtra(adicional);
        setError('');
      } catch (err) {
        if (activo) setError(mensajeError(err, 'No se pudo cargar la información.'));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [api, cargarExtra, recarga]);

  // Recarga silenciosa tras guardar o eliminar.
  const cargar = () => setRecarga((n) => n + 1);
  // Reintento tras un error: vuelve a mostrar el indicador de carga.
  const reintentar = () => { setCargando(true); setRecarga((n) => n + 1); };

  useEffect(() => {
    if (editando === undefined) return undefined;
    primerCampo.current?.focus();
    const alPresionar = (e) => { if (e.key === 'Escape') setEditando(undefined); };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [editando]);

  function abrir(fila) {
    setEditando(fila);
    setValores(valoresIniciales(camposForm, fila, aFormulario));
    setErrores({});
    setErrorForm('');
    setAviso(null);
  }

  async function guardar(e) {
    e.preventDefault();
    const faltantes = {};
    camposForm.forEach((c) => {
      if (c.requerido && !(valores[c.nombre] ?? '').toString().trim()) faltantes[c.nombre] = 'Este campo es obligatorio.';
    });
    setErrores(faltantes);
    if (Object.keys(faltantes).length) return;

    setGuardando(true);
    setErrorForm('');
    try {
      const payload = construirPayload(camposForm, valores);
      if (editando) await api.actualizar(editando[claveId], payload);
      else await api.crear(payload);
      setEditando(undefined);
      setAviso({ tipo: 'ok', texto: `${singular} guardado correctamente.` });
      cargar();
    } catch (err) {
      setErrorForm(mensajeError(err, `No se pudo guardar. Verifica los campos e inténtalo nuevamente.`));
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    const fila = aEliminar;
    setAEliminar(null);
    try {
      await api.eliminar(fila[claveId]);
      setAviso({ tipo: 'ok', texto: `${singular} eliminado.` });
      cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, `No se pudo eliminar el ${singular.toLowerCase()}.`) });
    }
  }

  return (
    <section className="ra">
      <header className="ra-cabecera">
        <h1 className="ra-titulo">{titulo}</h1>
        {!solo && <button type="button" className="dt-boton" onClick={() => abrir(null)}>+ Nuevo {singular.toLowerCase()}</button>}
      </header>

      {aviso && <p role={aviso.tipo === 'error' ? 'alert' : 'status'} className={`ra-aviso ra-aviso--${aviso.tipo}`}>{aviso.texto}</p>}

      <DataTable
        columnas={cols}
        filas={filas}
        claveFila={claveId}
        cargando={cargando}
        error={error}
        onReintentar={reintentar}
        vacio={vacio || `No hay registros de ${titulo.toLowerCase()}.`}
        acciones={(fila) => (
          <>
            {accionesExtra?.(fila)}
            <button type="button" className="dt-boton dt-boton--suave" onClick={() => abrir(fila)}>Editar</button>
            <button type="button" className="dt-boton dt-boton--peligro" onClick={() => setAEliminar(fila)}>Eliminar</button>
          </>
        )}
      />

      {editando !== undefined && (
        <div className="ra-overlay" onClick={() => setEditando(undefined)}>
          <form
            className="ra-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ra-modal-titulo"
            onClick={(e) => e.stopPropagation()}
            onSubmit={guardar}
            noValidate
          >
            <h2 id="ra-modal-titulo">{editando ? `Editar ${singular.toLowerCase()}` : `Nuevo ${singular.toLowerCase()}`}</h2>
            {camposForm.map((c, i) => {
              const id = `ra-campo-${c.nombre}`;
              const mensaje = errores[c.nombre];
              const propiedades = {
                id,
                name: c.nombre,
                value: valores[c.nombre] ?? '',
                required: !!c.requerido,
                'aria-invalid': mensaje ? 'true' : undefined,
                'aria-describedby': mensaje ? `${id}-error` : undefined,
                onChange: (e) => setValores({ ...valores, [c.nombre]: e.target.value }),
                ref: i === 0 ? primerCampo : undefined,
              };
              return (
                <div className="ra-campo" key={c.nombre}>
                  <label htmlFor={id}>{c.etiqueta}{c.requerido && ' *'}</label>
                  {c.tipo === 'select' ? (
                    <select {...propiedades}>
                      <option value="">Seleccionar...</option>
                      {c.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                    </select>
                  ) : c.tipo === 'textarea' ? (
                    <textarea rows={3} {...propiedades} />
                  ) : (
                    <input type={c.tipo || 'text'} min={c.min} max={c.max} placeholder={c.ayuda} {...propiedades} />
                  )}
                  {mensaje && <small id={`${id}-error`} className="ra-error-campo">{mensaje}</small>}
                </div>
              );
            })}
            {errorForm && <p role="alert" className="ra-aviso ra-aviso--error">{errorForm}</p>}
            <div className="ra-botones">
              <button type="button" className="dt-boton dt-boton--suave" onClick={() => setEditando(undefined)}>Cancelar</button>
              <button type="submit" className="dt-boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      <ModalConfirmacion
        abierto={!!aEliminar}
        titulo={`¿Eliminar este ${singular.toLowerCase()}?`}
        mensaje={`${aEliminar && textoEliminar ? textoEliminar(aEliminar) + ' ' : ''}Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </section>
  );
}
