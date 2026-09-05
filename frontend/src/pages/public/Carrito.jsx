import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { obtenerMotos } from '../../services/motos';
import { crearCotizacion } from '../../services/cotizaciones';
import './Carrito.css';

export default function Carrito() {
  const { items, actualizarCantidad, eliminarItem, vaciarCarrito, totalPrecio } = useCart();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [motos, setMotos] = useState([]);
  const [idMoto, setIdMoto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    obtenerMotos().then(setMotos);
  }, []);

  const precioFormateado = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');

    if (!usuario) {
      navigate('/login');
      return;
    }
    if (!idMoto) {
      setError('Selecciona tu moto');
      return;
    }

    setEnviando(true);
    try {
      await crearCotizacion({
        id_tienda: usuario.id_tienda,
        id_moto: idMoto,
        coti_observaciones: observaciones,
        items: items.map((i) => ({ id_accesorio: i.accesorio.id_accesorio, cantidad: i.cantidad })),
      });
      vaciarCarrito();
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar la cotización');
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className="carrito__vacio">
        <Link to="/" className="carrito__volver">← Volver al catálogo</Link>
        <h1>¡Cotización enviada!</h1>
        <p>La tienda va a revisar tu solicitud pronto.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="carrito__vacio">
        <Link to="/" className="carrito__volver">← Volver al catálogo</Link>
        <h1>Tu carrito está vacío</h1>
        <p>Agrega accesorios desde el catálogo para armar tu cotización.</p>
      </div>
    );
  }

  return (
    <div className="carrito">
      <Link to="/" className="carrito__volver">← Seguir explorando el catálogo</Link>
      <h1 className="carrito__titulo">Tu cotización</h1>

      <div className="carrito__items">
        {items.map((item) => (
          <div key={item.accesorio.id_accesorio} className="carrito__item">
            <div className="carrito__item-info">
              <span className="carrito__item-nombre">{item.accesorio.acc_nombre}</span>
              <span className="carrito__item-precio">{precioFormateado(item.accesorio.acc_precio)} c/u</span>
            </div>
            <div className="carrito__item-controles">
              <button onClick={() => actualizarCantidad(item.accesorio.id_accesorio, item.cantidad - 1)}>−</button>
              <span>{item.cantidad}</span>
              <button onClick={() => actualizarCantidad(item.accesorio.id_accesorio, item.cantidad + 1)}>+</button>
              <button className="carrito__eliminar" onClick={() => eliminarItem(item.accesorio.id_accesorio)}>
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="carrito__total">
        <span>Total</span>
        <span>{precioFormateado(totalPrecio)}</span>
      </div>

      <form onSubmit={manejarEnvio} className="carrito__form">
        <label>¿Para qué moto es esta cotización?</label>
        <select value={idMoto} onChange={(e) => setIdMoto(e.target.value)} required>
          <option value="">Selecciona tu moto...</option>
          {motos.map((moto) => (
            <option key={moto.id_moto} value={moto.id_moto}>
              {moto.modelo_moto?.marca_moto?.marca_nombre} {moto.modelo_moto?.modelo_nombre} {moto.moto_anio}
            </option>
          ))}
        </select>

        <label>Observaciones (opcional)</label>
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />

        {!usuario && <p className="carrito__aviso">Necesitas iniciar sesión para enviar la cotización.</p>}
        {error && <p className="carrito__error">{error}</p>}

        <button type="submit" disabled={enviando} className="carrito__boton-enviar">
          {enviando ? 'Enviando...' : usuario ? 'Enviar cotización' : 'Iniciar sesión para continuar'}
        </button>
      </form>
    </div>
  );
}