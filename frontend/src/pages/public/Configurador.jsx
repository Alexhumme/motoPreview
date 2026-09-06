import { useEffect, useState } from 'react';
import { obtenerMotos } from '../../services/motos';
import { obtenerAccesoriosCompatibles } from '../../services/compatibilidad';
import { obtenerCategorias } from '../../services/accesorios';
import { useCart } from '../../context/CartContext';
import './Configurador.css';
import { Link, useNavigate } from 'react-router-dom';

export default function Configurador() {
  const navigate = useNavigate();
  const { items, agregarItem, actualizarCantidad, eliminarItem, totalPrecio } = useCart();

  const [motos, setMotos] = useState([]);
  const [idMotoSeleccionada, setIdMotoSeleccionada] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [accesoriosCompatibles, setAccesoriosCompatibles] = useState([]);
  const [cargandoAccesorios, setCargandoAccesorios] = useState(false);

  useEffect(() => {
    async function cargarInicial() {
      const [datosMotos, datosCategorias] = await Promise.all([obtenerMotos(), obtenerCategorias()]);
      setMotos(datosMotos);
      setCategorias(datosCategorias);
      if (datosMotos.length > 0) setIdMotoSeleccionada(datosMotos[0].id_moto);
    }
    cargarInicial();
  }, []);

  useEffect(() => {
    if (!idMotoSeleccionada) return;
    async function cargarCompatibles() {
      setCargandoAccesorios(true);
      const moto = motos.find((m) => m.id_moto === idMotoSeleccionada);
      const datos = await obtenerAccesoriosCompatibles(moto.id_modelo_moto);
      setAccesoriosCompatibles(datos);
      setCargandoAccesorios(false);
    }
    cargarCompatibles();
  }, [idMotoSeleccionada, motos]);

  const motoActual = motos.find((m) => m.id_moto === idMotoSeleccionada);

  const accesoriosFiltrados = categoriaActiva === 'todas'
    ? accesoriosCompatibles
    : accesoriosCompatibles.filter((a) => a.id_categoria === categoriaActiva);

  const precioFormateado = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

  function estaEnCarrito(id_accesorio) {
    return items.some((i) => i.accesorio.id_accesorio === id_accesorio);
  }

return (
  <>
    <header className="configurador__header">
      <Link to="/" className="configurador__volver">← Catálogo</Link>
      <span className="configurador__marca">MotoPreview</span>
    </header>
    <div className="configurador">
      <div className="configurador__izquierda">
        <h1 className="configurador__titulo">Personaliza tu moto</h1>

        <label className="configurador__etiqueta-selector">Modelo</label>
        <select
          className="configurador__selector-moto"
          value={idMotoSeleccionada}
          onChange={(e) => setIdMotoSeleccionada(e.target.value)}
        >
          {motos.map((moto) => (
            <option key={moto.id_moto} value={moto.id_moto}>
              {moto.modelo_moto?.marca_moto?.marca_nombre} {moto.modelo_moto?.modelo_nombre} {moto.moto_anio}
            </option>
          ))}
        </select>

        <div className="configurador__vistas">
  <div className="configurador__vista-chica">
    <span className="configurador__vista-etiqueta">Vista frontal</span>
    <div className="configurador__vista-placeholder">Foto pendiente</div>
  </div>
  <div className="configurador__vista-chica">
    <span className="configurador__vista-etiqueta">Vista trasera</span>
    <div className="configurador__vista-placeholder">Foto pendiente</div>
  </div>
</div>
<div className="configurador__vista-moto">
  {motoActual ? (
    motoActual.moto_imagen ? (
      <img src={motoActual.moto_imagen} alt={motoActual.modelo_moto?.modelo_nombre} className="configurador__moto-foto" />
    ) : (
      <>
        <span className="configurador__moto-nombre">
          {motoActual.modelo_moto?.marca_moto?.marca_nombre} {motoActual.modelo_moto?.modelo_nombre}
        </span>
        <span className="configurador__moto-detalle">
          {motoActual.modelo_moto?.cilindraje} · {motoActual.moto_anio} · {motoActual.moto_version}
        </span>
        <span className="configurador__moto-aviso">Foto pendiente de cargar</span>
      </>
    )
  ) : (
    <span className="configurador__moto-aviso">Cargando...</span>
  )}
</div>
<div className="configurador__vista-grande">
  <span className="configurador__vista-etiqueta">Vista previa</span>
  {motoActual ? (
    <div className="configurador__vista-placeholder configurador__vista-placeholder--grande">
      <span className="configurador__moto-nombre">
        {motoActual.modelo_moto?.marca_moto?.marca_nombre} {motoActual.modelo_moto?.modelo_nombre}
      </span>
      <span className="configurador__moto-detalle">
        {motoActual.modelo_moto?.cilindraje} · {motoActual.moto_anio}
      </span>
    </div>
  ) : (
    <div className="configurador__vista-placeholder configurador__vista-placeholder--grande">Cargando...</div>
  )}
</div>
      </div>

      <div className="configurador__derecha">
        <h2 className="configurador__titulo-accesorios">Accesorios</h2>

        <div className="configurador__categorias">
          <button
            className={`configurador__categoria ${categoriaActiva === 'todas' ? 'configurador__categoria--activa' : ''}`}
            onClick={() => setCategoriaActiva('todas')}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id_categoria}
              className={`configurador__categoria ${categoriaActiva === cat.id_categoria ? 'configurador__categoria--activa' : ''}`}
              onClick={() => setCategoriaActiva(cat.id_categoria)}
            >
              {cat.cat_nombre}
            </button>
          ))}
        </div>

        <div className="configurador__lista-accesorios">
          {cargandoAccesorios && <p>Cargando accesorios compatibles...</p>}
          {!cargandoAccesorios && accesoriosFiltrados.length === 0 && (
            <p className="configurador__vacio">No hay accesorios compatibles en esta categoría.</p>
          )}
          {accesoriosFiltrados.map((acc) => (
            <div key={acc.id_accesorio} className="configurador__item">
              <div className="configurador__item-imagen">{acc.codigo_sku}</div>
              <div className="configurador__item-info">
                <span className="configurador__item-nombre">{acc.acc_nombre}</span>
                <span className="configurador__item-marca">{acc.categoria_accesorio?.cat_nombre}</span>
                <span className="configurador__item-precio">{precioFormateado(acc.acc_precio)}</span>
                <span className="configurador__item-compatible">● Compatible</span>
              </div>
              <button
                className={`configurador__item-boton ${estaEnCarrito(acc.id_accesorio) ? 'configurador__item-boton--agregado' : ''}`}
                onClick={() => agregarItem(acc)}
              >
                {estaEnCarrito(acc.id_accesorio) ? '✓' : 'Agregar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="configurador__panel-inferior">
          <div className="configurador__panel-lista">
            <span className="configurador__panel-titulo">Tu configuración ({items.length})</span>
            {items.map((item) => (
              <div key={item.accesorio.id_accesorio} className="configurador__panel-item">
                <span>{item.accesorio.acc_nombre}</span>
                <span>{item.cantidad} × {precioFormateado(item.accesorio.acc_precio)}</span>
                <button onClick={() => eliminarItem(item.accesorio.id_accesorio)}>✕</button>
              </div>
            ))}
          </div>
          <div className="configurador__panel-acciones">
            <span className="configurador__panel-subtotal">Subtotal: {precioFormateado(totalPrecio)}</span>
            <button className="configurador__panel-boton" onClick={() => navigate('/carrito')}>
              Ir al carrito
            </button>
          </div>
        </div>
      )}
    </div>
   </>
  );
}