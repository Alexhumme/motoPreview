import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { obtenerMotos } from '../../services/motos';
import { crearCotizacion } from '../../services/cotizaciones';
import SiteHeader from '../../components/SiteHeader';
import './Carrito.css';

const money = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(value);

export default function Carrito() {
  const { items, actualizarCantidad, eliminarItem, vaciarCarrito, totalItems, totalPrecio } = useCart();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [motos, setMotos] = useState([]);
  const [idMoto, setIdMoto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => { obtenerMotos().then(setMotos).catch(() => setMotos([])); }, []);

  async function manejarEnvio(event) {
    event.preventDefault();
    setError('');
    if (!usuario) { navigate('/login'); return; }
    if (!idMoto) { setError('Selecciona tu moto para continuar.'); return; }
    setEnviando(true);
    try {
      await crearCotizacion({
        id_tienda: usuario.id_tienda,
        id_moto: idMoto,
        coti_observaciones: observaciones,
        items: items.map((item) => ({ id_accesorio: item.accesorio.id_accesorio, cantidad: item.cantidad })),
      });
      vaciarCarrito();
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar la cotización.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="cart-page">
        <Link to="/" className="back-link">← Volver al catálogo</Link>
        {exito ? (
          <div className="empty-cart"><div className="empty-cart__icon">✓</div><h1>¡Cotización enviada!</h1><p>La tienda va a revisar tu solicitud pronto.</p><Link to="/" className="button button--accent">Volver al catálogo →</Link></div>
        ) : (
          <>
            <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> Tu selección</div><h1>Carrito de accesorios.</h1></div><span className="cart-large-count">{totalItems} {totalItems === 1 ? 'pieza' : 'piezas'}</span></div>
            {items.length === 0 ? (
              <div className="empty-cart"><div className="empty-cart__icon">▣</div><h2>Tu carrito está esperando una buena idea.</h2><p>Explora las piezas disponibles y empieza a construir una configuración a tu medida.</p><Link to="/configurador" className="button button--accent">Abrir configurador →</Link></div>
            ) : (
              <div className="cart-layout">
                <section className="cart-lines">
                  {items.map((item) => (
                    <article className="cart-line" key={item.accesorio.id_accesorio}>
                      <div className="mini-art">{item.accesorio.imagen ? <img src={item.accesorio.imagen} alt="" /> : <span>MP</span>}</div>
                      <div className="cart-line__info"><span>{item.accesorio.categoria_accesorio?.cat_nombre || 'Accesorio'}</span><h3>{item.accesorio.acc_nombre}</h3><small>{item.accesorio.codigo_sku}</small></div>
                      <div className="quantity-control"><button onClick={() => actualizarCantidad(item.accesorio.id_accesorio, item.cantidad - 1)}>−</button><b>{item.cantidad}</b><button onClick={() => actualizarCantidad(item.accesorio.id_accesorio, item.cantidad + 1)}>+</button></div>
                      <strong className="cart-line__price">{money(item.accesorio.acc_precio * item.cantidad)}</strong>
                      <button className="remove-button" onClick={() => eliminarItem(item.accesorio.id_accesorio)}>×</button>
                    </article>
                  ))}
                </section>
                <aside className="summary-card">
                  <span className="summary-kicker">Resumen de cotización</span><h2>Lista para rodar.</h2>
                  <div className="summary-row"><span>Subtotal</span><strong>{money(totalPrecio)}</strong></div><div className="summary-row"><span>Envío</span><strong>Por confirmar</strong></div><div className="summary-total"><span>Total estimado</span><strong>{money(totalPrecio)}</strong></div>
                  <form onSubmit={manejarEnvio} className="quote-form">
                    <label>¿Para qué moto es esta cotización?<select value={idMoto} onChange={(e) => setIdMoto(e.target.value)} required><option value="">Selecciona tu moto...</option>{motos.map((moto) => <option key={moto.id_moto} value={moto.id_moto}>{moto.modelo_moto?.marca_moto?.marca_nombre} {moto.modelo_moto?.modelo_nombre} {moto.moto_anio}</option>)}</select></label>
                    <label>Observaciones (opcional)<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} /></label>
                    {!usuario && <p className="summary-note">Necesitas iniciar sesión para enviar la cotización.</p>}
                    {error && <p className="cart-error">{error}</p>}
                    <button className="button button--accent button--full" disabled={enviando} type="submit">{enviando ? 'Enviando...' : usuario ? 'Solicitar cotización →' : 'Iniciar sesión para continuar'}</button>
                  </form>
                  <p className="summary-note">✓ Sin pagos en línea. La tienda confirmará disponibilidad.</p>
                </aside>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}