import { useEffect, useState } from 'react';
import { obtenerAccesorios, obtenerCategorias, crearAccesorio, actualizarAccesorio } from '../services/accesorios';
import { obtenerModelosCompatibles, marcarCompatible, quitarCompatible } from '../services/compatibilidad';
import { obtenerMotos } from '../services/motos';
import './Accesorios.css';

const VACIO = {
  acc_nombre: '', id_categoria: '', acc_descripcion: '',
  acc_precio: '', peso: '', codigo_sku: '', imagen: '', acc_estado: 'disponible',
};

const estadoBadge = {
  disponible: 'mint',
  agotado: 'pink',
  descontinuado: 'gray',
};

export default function Accesorios() {
  const [accesorios, setAccesorios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [compatibilidadesActuales, setCompatibilidadesActuales] = useState([]); // [{id_compatibilidad, modelo_moto}]
  const [modelosSeleccionados, setModelosSeleccionados] = useState(new Set()); // ids de modelo_moto marcados
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function cargarTodo() {
    const [datosAccesorios, datosCategorias, datosMotos] = await Promise.all([
      obtenerAccesorios(), obtenerCategorias(), obtenerMotos(),
    ]);
    setAccesorios(datosAccesorios);
    setCategorias(datosCategorias);
    // modelos únicos, sacados de las motos (varias motos comparten modelo)
    const modelosUnicos = [];
    const vistos = new Set();
    for (const moto of datosMotos) {
      if (!vistos.has(moto.id_modelo_moto)) {
        vistos.add(moto.id_modelo_moto);
        modelosUnicos.push(moto.modelo_moto);
      }
    }
    setModelos(modelosUnicos);
    setCargando(false);
  }

  useEffect(() => {
    async function refrescar() {
      await cargarTodo();
    }
    refrescar();
  }, []);

  async function abrirNuevo() {
    setEditandoId(null);
    setFormulario(VACIO);
    setCompatibilidadesActuales([]);
    setModelosSeleccionados(new Set());
    setError('');
    setModalAbierto(true);
  }

  async function abrirEdicion(accesorio) {
    setEditandoId(accesorio.id_accesorio);
    setFormulario({
      acc_nombre: accesorio.acc_nombre,
      id_categoria: accesorio.id_categoria,
      acc_descripcion: accesorio.acc_descripcion || '',
      acc_precio: accesorio.acc_precio,
      peso: accesorio.peso || '',
      codigo_sku: accesorio.codigo_sku || '',
      imagen: accesorio.imagen || '',
      acc_estado: accesorio.acc_estado,
    });
    setError('');
    setModalAbierto(true);

    const compatibles = await obtenerModelosCompatibles(accesorio.id_accesorio);
    setCompatibilidadesActuales(compatibles);
    setModelosSeleccionados(new Set(compatibles.map((c) => c.id_modelo_moto)));
  }

  function cerrarModal() {
    setModalAbierto(false);
  }

  function alternarModelo(id_modelo_moto) {
    setModelosSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id_modelo_moto)) nuevo.delete(id_modelo_moto);
      else nuevo.add(id_modelo_moto);
      return nuevo;
    });
  }

  async function guardarCompatibilidades(id_accesorio) {
    const idsActuales = new Set(compatibilidadesActuales.map((c) => c.id_modelo_moto));

    // Agregar las nuevas marcadas que no estaban
    for (const id_modelo_moto of modelosSeleccionados) {
      if (!idsActuales.has(id_modelo_moto)) {
        await marcarCompatible(id_accesorio, id_modelo_moto);
      }
    }
    // Quitar las que estaban y ya no están marcadas
    for (const compat of compatibilidadesActuales) {
      if (!modelosSeleccionados.has(compat.id_modelo_moto)) {
        await quitarCompatible(compat.id_compatibilidad);
      }
    }
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const datos = {
        ...formulario,
        acc_precio: Number(formulario.acc_precio),
        peso: formulario.peso ? Number(formulario.peso) : null,
      };

      let idAccesorio = editandoId;
      if (editandoId) {
        await actualizarAccesorio(editandoId, datos);
      } else {
        const creado = await crearAccesorio(datos);
        idAccesorio = creado.id_accesorio;
      }

      await guardarCompatibilidades(idAccesorio);
      await cargarTodo();
      cerrarModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el accesorio');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="accesorios-admin" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '200px', marginBottom: 'var(--space-32)' }} />
        <div className="skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="accesorios-admin">
      <header className="accesorios-admin__header">
        <h1 className="accesorios-admin__titulo">Accesorios</h1>
        <button className="btn btn--primary" onClick={abrirNuevo}>+ Nuevo accesorio</button>
      </header>

      <div className="card accesorios-admin__card">
        <table className="accesorios-admin__tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>SKU</th>
              <th>Precio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accesorios.map((acc) => (
              <tr key={acc.id_accesorio}>
                <td>{acc.acc_nombre}</td>
                <td>{acc.categoria_accesorio?.cat_nombre}</td>
                <td><span className="accesorios-admin__sku">{acc.codigo_sku}</span></td>
                <td>${Number(acc.acc_precio).toLocaleString('es-CO')}</td>
                <td>
                  <span className={`badge badge--${estadoBadge[acc.acc_estado] || 'gray'}`}>{acc.acc_estado}</span>
                </td>
                <td>
                  <button className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(acc)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div
            className="modal accesorios-admin__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accesorio-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="accesorio-modal-titulo" className="modal-title">
                {editandoId ? 'Editar accesorio' : 'Nuevo accesorio'}
              </h2>
              <button className="modal-close" onClick={cerrarModal} aria-label="Cerrar">✕</button>
            </header>

            <form onSubmit={manejarSubmit} noValidate>
              <div className="form-field">
                <label className="form-label" htmlFor="acc-nombre">Nombre</label>
                <input
                  id="acc-nombre"
                  className="form-input"
                  value={formulario.acc_nombre}
                  onChange={(e) => setFormulario({ ...formulario, acc_nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="acc-categoria">Categoría</label>
                <select
                  id="acc-categoria"
                  className="form-input"
                  value={formulario.id_categoria}
                  onChange={(e) => setFormulario({ ...formulario, id_categoria: e.target.value })}
                  required
                >
                  <option value="">Selecciona...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>{cat.cat_nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="acc-descripcion">Descripción</label>
                <textarea
                  id="acc-descripcion"
                  className="form-input"
                  value={formulario.acc_descripcion}
                  onChange={(e) => setFormulario({ ...formulario, acc_descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="accesorios-admin__fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="acc-precio">Precio (COP)</label>
                  <input
                    id="acc-precio"
                    type="number"
                    className="form-input"
                    value={formulario.acc_precio}
                    onChange={(e) => setFormulario({ ...formulario, acc_precio: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="acc-peso">Peso (kg)</label>
                  <input
                    id="acc-peso"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formulario.peso}
                    onChange={(e) => setFormulario({ ...formulario, peso: e.target.value })}
                  />
                </div>
              </div>

              <div className="accesorios-admin__fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="acc-sku">SKU</label>
                  <input
                    id="acc-sku"
                    className="form-input"
                    value={formulario.codigo_sku}
                    onChange={(e) => setFormulario({ ...formulario, codigo_sku: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="acc-estado">Estado</label>
                  <select
                    id="acc-estado"
                    className="form-input"
                    value={formulario.acc_estado}
                    onChange={(e) => setFormulario({ ...formulario, acc_estado: e.target.value })}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="agotado">Agotado</option>
                    <option value="descontinuado">Descontinuado</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="acc-imagen">Imagen (URL, opcional)</label>
                <input
                  id="acc-imagen"
                  className="form-input"
                  value={formulario.imagen}
                  onChange={(e) => setFormulario({ ...formulario, imagen: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Compatible con estos modelos de moto</label>
                <div className="accesorios-admin__checkboxes">
                  {modelos.map((modelo) => (
                    <label key={modelo.id_modelo_moto} className="accesorios-admin__checkbox">
                      <input
                        type="checkbox"
                        checked={modelosSeleccionados.has(modelo.id_modelo_moto)}
                        onChange={() => alternarModelo(modelo.id_modelo_moto)}
                      />
                      {modelo.marca_moto?.marca_nombre} {modelo.modelo_nombre}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <footer className="modal-footer">
                <button type="button" onClick={cerrarModal} className="btn btn--ghost">Cancelar</button>
                <button type="submit" disabled={guardando} className="btn btn--primary">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
