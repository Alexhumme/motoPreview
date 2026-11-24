import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Boxes, Package, Pencil, Plus, X } from 'lucide-react';
import { useAuth } from '../context/authContexto';
import { usePermiso } from '../context/usePermiso';
import {
  actualizarProducto,
  crearProducto,
  obtenerCategorias,
  obtenerMarcasProducto,
  obtenerProductos,
  obtenerTiposProducto,
} from '../services/accesorios';
import { crearInventario, obtenerInventario, registrarMovimiento } from '../services/inventario';
import { TIPOS_MOVIMIENTO } from '../utils/constants/tiposMovimiento';
import DataTable from '../components/tables/DataTable';
import './Inventario.css';

const PRODUCTO_VACIO = {
  nombre: '',
  descripcion: '',
  id_categoria_producto: '',
  id_marca: '',
  precio: '',
  peso: '',
  codigo_sku: '',
  imagen: '',
  estado: 'disponible',
  id_tipos: [],
};

const ESTADOS_PRODUCTO = {
  disponible: 'mint',
  agotado: 'pink',
  descontinuado: 'gray',
};

const ESTADOS_INVENTARIO = {
  normal: 'Normal',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

function nombreProducto(producto) {
  return producto?.nombre || producto?.acc_nombre || 'Sin nombre';
}

function idProducto(producto) {
  return producto?.id_producto || producto?.id_accesorio || '';
}

function formularioProducto(producto) {
  const datos = producto?.producto || producto || {};
  return {
    nombre: datos.nombre || datos.acc_nombre || '',
    descripcion: datos.descripcion || datos.acc_descripcion || '',
    id_categoria_producto: datos.id_categoria_producto || '',
    id_marca: datos.id_marca || '',
    precio: datos.precio ?? datos.acc_precio ?? '',
    peso: datos.peso ?? '',
    codigo_sku: datos.codigo_sku || '',
    imagen: datos.imagen || '',
    estado: datos.estado || datos.acc_estado || 'disponible',
    id_tipos: (datos.tipos || []).map((tipo) => tipo.id_tipo_producto),
  };
}

export default function Inventario() {
  const { usuario } = useAuth();
  const { tienePermiso } = usePermiso();
  const idTienda = usuario?.id_tienda;

  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [vista, setVista] = useState('inventario');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [productoAbierto, setProductoAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(PRODUCTO_VACIO);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [errorProducto, setErrorProducto] = useState('');

  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [productoInventario, setProductoInventario] = useState(null);
  const [formularioInventario, setFormularioInventario] = useState({ stock_actual: 0, stock_minimo: 0 });
  const [guardandoInventario, setGuardandoInventario] = useState(false);
  const [errorInventario, setErrorInventario] = useState('');

  const [movimientoAbierto, setMovimientoAbierto] = useState(false);
  const [itemMovimiento, setItemMovimiento] = useState(null);
  const [formularioMovimiento, setFormularioMovimiento] = useState({ id_tipomov: '', mov_cantidad: '', observaciones: '' });
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);
  const [errorMovimiento, setErrorMovimiento] = useState('');

  const puedeCrearProducto = tienePermiso('productos', 'crear');
  const puedeEditarProducto = tienePermiso('productos', 'actualizar');
  const puedeCrearInventario = tienePermiso('inventario', 'crear');
  const puedeMoverInventario = tienePermiso('inventario', 'crear');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');
    const respuestas = await Promise.allSettled([
      obtenerInventario(idTienda),
      obtenerProductos(),
      obtenerCategorias(),
      obtenerMarcasProducto(),
      obtenerTiposProducto(),
    ]);
    const [datosInventario, datosProductos, datosCategorias, datosMarcas, datosTipos] = respuestas;
    if (datosInventario.status === 'fulfilled') setInventario(datosInventario.value);
    if (datosProductos.status === 'fulfilled') setProductos(datosProductos.value);
    if (datosCategorias.status === 'fulfilled') setCategorias(datosCategorias.value);
    if (datosMarcas.status === 'fulfilled') setMarcas(datosMarcas.value);
    if (datosTipos.status === 'fulfilled') setTipos(datosTipos.value);
    if (respuestas.some((respuesta) => respuesta.status === 'rejected')) {
      setError('No se pudieron cargar todos los datos. Revisa tus permisos e inténtalo de nuevo.');
    }
    setCargando(false);
  }, [idTienda]);

  const cargaRef = useRef(null);
  useEffect(() => {
    if (cargaRef.current === cargarDatos) return;
    cargaRef.current = cargarDatos;
    cargarDatos();
  }, [cargarDatos]);

  function abrirProducto(producto = null) {
    setEditandoId(producto ? idProducto(producto) : null);
    setFormulario(producto ? formularioProducto(producto) : PRODUCTO_VACIO);
    setErrorProducto('');
    setProductoAbierto(true);
  }

  function alternarTipo(id) {
    setFormulario((actual) => ({
      ...actual,
      id_tipos: actual.id_tipos.includes(id)
        ? actual.id_tipos.filter((tipo) => tipo !== id)
        : [...actual.id_tipos, id],
    }));
  }

  async function guardarProducto(evento) {
    evento.preventDefault();
    setGuardandoProducto(true);
    setErrorProducto('');
    const datos = {
      ...formulario,
      id_categoria_producto: formulario.id_categoria_producto || null,
      id_marca: formulario.id_marca || null,
      descripcion: formulario.descripcion || null,
      codigo_sku: formulario.codigo_sku || null,
      imagen: formulario.imagen || null,
      precio: formulario.precio === '' ? null : Number(formulario.precio),
      peso: formulario.peso === '' ? null : Number(formulario.peso),
    };
    try {
      if (editandoId) await actualizarProducto(editandoId, datos);
      else await crearProducto(datos);
      setProductoAbierto(false);
      await cargarDatos();
    } catch (err) {
      setErrorProducto(err.response?.data?.error || 'No se pudo guardar el producto.');
    } finally {
      setGuardandoProducto(false);
    }
  }

  function abrirInventario(producto) {
    setProductoInventario(producto);
    setFormularioInventario({ stock_actual: 0, stock_minimo: 0 });
    setErrorInventario('');
    setInventarioAbierto(true);
  }

  async function guardarInventario(evento) {
    evento.preventDefault();
    setGuardandoInventario(true);
    setErrorInventario('');
    try {
      await crearInventario({
        id_producto: idProducto(productoInventario),
        stock_actual: Number(formularioInventario.stock_actual),
        stock_minimo: Number(formularioInventario.stock_minimo),
        precio: (productoInventario.producto || productoInventario).precio ?? null,
      });
      setInventarioAbierto(false);
      await cargarDatos();
    } catch (err) {
      setErrorInventario(err.response?.data?.error || 'No se pudo agregar el producto al inventario.');
    } finally {
      setGuardandoInventario(false);
    }
  }

  function abrirMovimiento(item) {
    setItemMovimiento(item);
    setFormularioMovimiento({ id_tipomov: '', mov_cantidad: '', observaciones: '' });
    setErrorMovimiento('');
    setMovimientoAbierto(true);
  }

  async function guardarMovimiento(evento) {
    evento.preventDefault();
    setGuardandoMovimiento(true);
    setErrorMovimiento('');
    try {
      await registrarMovimiento({
        id_inventario: itemMovimiento.id_inventario,
        id_tipomov: formularioMovimiento.id_tipomov,
        mov_cantidad: Number(formularioMovimiento.mov_cantidad),
        observaciones: formularioMovimiento.observaciones,
      });
      setMovimientoAbierto(false);
      await cargarDatos();
    } catch (err) {
      setErrorMovimiento(err.response?.data?.error || 'No se pudo registrar el movimiento.');
    } finally {
      setGuardandoMovimiento(false);
    }
  }

  const productoEnInventario = (producto) => {
    const id = idProducto(producto);
    return inventario.some((item) => (item.id_producto || idProducto(item.producto)) === id);
  };

  const columnasProductos = [
    { clave: 'nombre', etiqueta: 'Producto', valor: nombreProducto, render: (producto) => <strong>{nombreProducto(producto)}</strong> },
    {
      clave: 'clasificacion',
      etiqueta: 'Clasificación',
      filtrable: true,
      valor: (producto) => (producto.producto || producto).es_accesorio ? 'Accesorio' : 'Producto general',
      render: (producto) => (
        <span className={`badge badge--${(producto.producto || producto).es_accesorio ? 'violet' : 'gray'}`}>
          {(producto.producto || producto).es_accesorio ? 'Accesorio' : 'Producto general'}
        </span>
      ),
    },
    { clave: 'categoria', etiqueta: 'Categoría', valor: (producto) => producto.categoria_producto?.nombre || '' },
    { clave: 'marca', etiqueta: 'Marca', valor: (producto) => producto.marca?.nombre || '' },
    {
      clave: 'tipos',
      etiqueta: 'Tipos',
      valor: (producto) => (producto.tipos || []).map((tipo) => tipo.nombre).join(', '),
      render: (producto) => (producto.tipos || []).map((tipo) => tipo.nombre).join(', ') || '—',
    },
    { clave: 'precio', etiqueta: 'Precio', valor: (producto) => Number(producto.acc_precio || 0), render: (producto) => `$${Number(producto.acc_precio || 0).toLocaleString('es-CO')}` },
    {
      clave: 'estado',
      etiqueta: 'Estado',
      filtrable: true,
      valor: (producto) => producto.acc_estado,
      render: (producto) => <span className={`badge badge--${ESTADOS_PRODUCTO[producto.acc_estado] || 'gray'}`}>{producto.acc_estado}</span>,
    },
  ];

  const columnasInventario = [
    {
      clave: 'producto',
      etiqueta: 'Producto',
      valor: (item) => nombreProducto(item.accesorio || item.producto),
      render: (item) => <strong>{nombreProducto(item.accesorio || item.producto)}</strong>,
    },
    { clave: 'sku', etiqueta: 'SKU', valor: (item) => (item.accesorio || item.producto)?.codigo_sku || '', render: (item) => <code className="item-sku">{(item.accesorio || item.producto)?.codigo_sku || '—'}</code> },
    ...(!idTienda ? [{ clave: 'tienda', etiqueta: 'Tienda', valor: (item) => item.tienda?.nombre_tienda || '' }] : []),
    { clave: 'stock_actual', etiqueta: 'Stock actual', render: (item) => <span className="stock-value">{item.stock_actual}</span> },
    { clave: 'stock_minimo', etiqueta: 'Stock mínimo', render: (item) => <span className="stock-min">{item.stock_minimo}</span> },
    {
      clave: 'estado_inventario',
      etiqueta: 'Estado',
      filtrable: true,
      valor: (item) => ESTADOS_INVENTARIO[item.estado_inventario] || item.estado_inventario,
      render: (item) => (
        <span className={`badge badge--${item.estado_inventario === 'normal' ? 'mint' : item.estado_inventario === 'bajo' ? 'violet' : 'pink'}`}>
          {ESTADOS_INVENTARIO[item.estado_inventario] || item.estado_inventario}
        </span>
      ),
    },
  ];

  const tiposAccesorio = tipos.filter((tipo) => tipo.accesorio);
  const esAccesorio = formulario.id_tipos.some((id) => tiposAccesorio.some((tipo) => tipo.id_tipo_producto === id));

  return (
    <div className="inventario">
      <header className="inventario-header">
        <div>
          <h1 className="inventario-title">Inventario y accesorios</h1>
          <p className="inventario-descripcion">Gestiona todos los productos y su stock. Los tipos marcados como accesorio aparecen en el configurador.</p>
        </div>
        {puedeCrearProducto && <button className="btn btn--primary" onClick={() => abrirProducto()}><Plus size={16} /> Nuevo producto</button>}
      </header>

      <div className="inventario-tabs" aria-label="Vistas de productos">
        <button className={`btn btn--sm ${vista === 'inventario' ? 'btn--primary' : 'btn--outline'}`} aria-pressed={vista === 'inventario'} onClick={() => setVista('inventario')}>
          <Boxes size={16} /> Inventario
        </button>
        <button className={`btn btn--sm ${vista === 'catalogo' ? 'btn--primary' : 'btn--outline'}`} aria-pressed={vista === 'catalogo'} onClick={() => setVista('catalogo')}>
          <Package size={16} /> Catálogo
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      {vista === 'inventario' ? (
        <DataTable
          columnas={columnasInventario}
          filas={inventario}
          claveFila="id_inventario"
          cargando={cargando}
          vacio="No hay productos en inventario."
          acciones={(item) => puedeMoverInventario ? (
            <button className="btn btn--outline btn--sm" onClick={() => abrirMovimiento(item)}><ArrowRightLeft size={14} /> Movimiento</button>
          ) : null}
        />
      ) : (
        <DataTable
          columnas={columnasProductos}
          filas={productos}
          claveFila="id_accesorio"
          cargando={cargando}
          vacio="No hay productos registrados."
          acciones={(producto) => (
            <div className="inventario-acciones">
              {puedeEditarProducto && <button className="btn btn--ghost btn--sm" onClick={() => abrirProducto(producto)}><Pencil size={14} /> Editar</button>}
              {puedeCrearInventario && idTienda && !productoEnInventario(producto) && (
                <button className="btn btn--outline btn--sm" onClick={() => abrirInventario(producto)}><Plus size={14} /> Inventario</button>
              )}
            </div>
          )}
        />
      )}

      {productoAbierto && (
        <div className="modal-overlay" onClick={() => setProductoAbierto(false)}>
          <div className="modal inventario-modal" role="dialog" aria-modal="true" aria-labelledby="producto-title" onClick={(evento) => evento.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h2 id="producto-title" className="modal-title">{editandoId ? 'Editar producto' : 'Nuevo producto'}</h2>
                <p className="inventario-modal__ayuda">{esAccesorio ? 'Este producto se mostrará en el configurador.' : 'Este producto es general y no aparecerá en el configurador.'}</p>
              </div>
              <button className="modal-close" onClick={() => setProductoAbierto(false)} aria-label="Cerrar"><X size={18} /></button>
            </header>
            <form onSubmit={guardarProducto} className="modal-form" noValidate>
              <div className="form-field">
                <label className="form-label" htmlFor="producto-nombre">Nombre</label>
                <input id="producto-nombre" className="form-input" value={formulario.nombre} onChange={(evento) => setFormulario({ ...formulario, nombre: evento.target.value })} required />
              </div>
              <div className="inventario-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="producto-categoria">Categoría</label>
                  <select id="producto-categoria" className="form-input" value={formulario.id_categoria_producto} onChange={(evento) => setFormulario({ ...formulario, id_categoria_producto: evento.target.value })}>
                    <option value="">Sin categoría</option>
                    {categorias.map((categoria) => <option key={categoria.id_categoria_producto} value={categoria.id_categoria_producto}>{categoria.nombre}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="producto-marca">Marca</label>
                  <select id="producto-marca" className="form-input" value={formulario.id_marca} onChange={(evento) => setFormulario({ ...formulario, id_marca: evento.target.value })}>
                    <option value="">Sin marca</option>
                    {marcas.map((marca) => <option key={marca.id_marca} value={marca.id_marca}>{marca.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Tipos de producto</label>
                <div className="inventario-tipos">
                  {tipos.map((tipo) => (
                    <label key={tipo.id_tipo_producto} className="inventario-tipo">
                      <input type="checkbox" checked={formulario.id_tipos.includes(tipo.id_tipo_producto)} onChange={() => alternarTipo(tipo.id_tipo_producto)} />
                      <span>{tipo.nombre}</span>
                      {tipo.accesorio && <small>Accesorio</small>}
                    </label>
                  ))}
                  {tipos.length === 0 && <span className="inventario-tipos__vacio">No hay tipos registrados.</span>}
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="producto-descripcion">Descripción</label>
                <textarea id="producto-descripcion" className="form-input" rows={2} value={formulario.descripcion} onChange={(evento) => setFormulario({ ...formulario, descripcion: evento.target.value })} />
              </div>
              <div className="inventario-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="producto-precio">Precio (COP)</label>
                  <input id="producto-precio" type="number" min="0" step="0.01" className="form-input" value={formulario.precio} onChange={(evento) => setFormulario({ ...formulario, precio: evento.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="producto-peso">Peso (kg)</label>
                  <input id="producto-peso" type="number" min="0" step="0.01" className="form-input" value={formulario.peso} onChange={(evento) => setFormulario({ ...formulario, peso: evento.target.value })} />
                </div>
              </div>
              <div className="inventario-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="producto-sku">SKU</label>
                  <input id="producto-sku" className="form-input" value={formulario.codigo_sku} onChange={(evento) => setFormulario({ ...formulario, codigo_sku: evento.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="producto-estado">Estado</label>
                  <select id="producto-estado" className="form-input" value={formulario.estado} onChange={(evento) => setFormulario({ ...formulario, estado: evento.target.value })}>
                    <option value="disponible">Disponible</option>
                    <option value="agotado">Agotado</option>
                    <option value="descontinuado">Descontinuado</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="producto-imagen">Imagen (URL)</label>
                <input id="producto-imagen" type="url" className="form-input" value={formulario.imagen} onChange={(evento) => setFormulario({ ...formulario, imagen: evento.target.value })} />
              </div>
              {errorProducto && <p className="form-error" role="alert">{errorProducto}</p>}
              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setProductoAbierto(false)} disabled={guardandoProducto}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={guardandoProducto}>{guardandoProducto ? 'Guardando...' : 'Guardar producto'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {inventarioAbierto && (
        <div className="modal-overlay" onClick={() => setInventarioAbierto(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="inventario-title" onClick={(evento) => evento.stopPropagation()}>
            <header className="modal-header">
              <h2 id="inventario-title" className="modal-title">Agregar a inventario — {nombreProducto(productoInventario)}</h2>
              <button className="modal-close" onClick={() => setInventarioAbierto(false)} aria-label="Cerrar"><X size={18} /></button>
            </header>
            <form onSubmit={guardarInventario} className="modal-form">
              <div className="inventario-fila">
                <div className="form-field">
                  <label className="form-label" htmlFor="stock-inicial">Stock inicial</label>
                  <input id="stock-inicial" type="number" min="0" className="form-input" value={formularioInventario.stock_actual} onChange={(evento) => setFormularioInventario({ ...formularioInventario, stock_actual: evento.target.value })} required />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="stock-minimo">Stock mínimo</label>
                  <input id="stock-minimo" type="number" min="0" className="form-input" value={formularioInventario.stock_minimo} onChange={(evento) => setFormularioInventario({ ...formularioInventario, stock_minimo: evento.target.value })} required />
                </div>
              </div>
              {errorInventario && <p className="form-error" role="alert">{errorInventario}</p>}
              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setInventarioAbierto(false)} disabled={guardandoInventario}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={guardandoInventario}>{guardandoInventario ? 'Guardando...' : 'Agregar'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {movimientoAbierto && (
        <div className="modal-overlay" onClick={() => setMovimientoAbierto(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="movimiento-title" onClick={(evento) => evento.stopPropagation()}>
            <header className="modal-header">
              <h2 id="movimiento-title" className="modal-title">Movimiento — {nombreProducto(itemMovimiento.accesorio || itemMovimiento.producto)}</h2>
              <button className="modal-close" onClick={() => setMovimientoAbierto(false)} aria-label="Cerrar"><X size={18} /></button>
            </header>
            <form onSubmit={guardarMovimiento} className="modal-form">
              <p className="stock-actual">Stock actual: <strong>{itemMovimiento.stock_actual}</strong></p>
              <div className="form-field">
                <label className="form-label" htmlFor="tipo-mov">Tipo de movimiento</label>
                <select id="tipo-mov" className="form-input" value={formularioMovimiento.id_tipomov} onChange={(evento) => setFormularioMovimiento({ ...formularioMovimiento, id_tipomov: evento.target.value })} required disabled={guardandoMovimiento}>
                  <option value="">Selecciona...</option>
                  {TIPOS_MOVIMIENTO.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="cantidad-mov">Cantidad</label>
                <input id="cantidad-mov" type="number" min="1" className="form-input" value={formularioMovimiento.mov_cantidad} onChange={(evento) => setFormularioMovimiento({ ...formularioMovimiento, mov_cantidad: evento.target.value })} required disabled={guardandoMovimiento} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="observaciones-mov">Observaciones</label>
                <textarea id="observaciones-mov" className="form-input" rows={3} value={formularioMovimiento.observaciones} onChange={(evento) => setFormularioMovimiento({ ...formularioMovimiento, observaciones: evento.target.value })} disabled={guardandoMovimiento} />
              </div>
              {errorMovimiento && <p className="form-error" role="alert">{errorMovimiento}</p>}
              <footer className="modal-footer">
                <button type="button" className="btn btn--ghost" onClick={() => setMovimientoAbierto(false)} disabled={guardandoMovimiento}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={guardandoMovimiento}>{guardandoMovimiento ? 'Guardando...' : 'Confirmar'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
