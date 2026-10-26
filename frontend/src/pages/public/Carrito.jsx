import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { obtenerMotos } from '../../services/motos';
import { crearCotizacion } from '../../services/cotizaciones';
import SiteHeader from '../../components/buttons/SiteHeader';
import ImagenProducto from '../../components/ImagenProducto';
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

  useEffect(() => {
    obtenerMotos().then(setMotos).catch(() => setMotos([]));
  }, []);

  async function manejarEnvio(event) {
    event.preventDefault();
    setError('');
    if (!usuario) {
      navigate('/login');
      return;
    }
    if (!idMoto) {
      setError('Selecciona tu moto para continuar.');
      return;
    }
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
    <div className="cart-page">
      <SiteHeader />
      <main className="cart-main">
        <Link to="/" className="btn btn--ghost btn--sm cart-back">
          ← Volver al catálogo
        </Link>

        {exito ? (
          <div className="cart-empty">
            <div className="empty-icon" aria-hidden="true">✓</div>
            <h1 className="cart-empty-title">¡Cotización enviada!</h1>
            <p className="cart-empty-subtitle">La tienda va a revisar tu solicitud pronto.</p>
            <Link to="/" className="btn btn--primary">Volver al catálogo →</Link>
          </div>
        ) : (
          <>
            <header className="page-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Tu selección</div>
                <h1 className="cart-title">Carrito de accesorios.</h1>
              </div>
              <span className="cart-count-badge">{totalItems} {totalItems === 1 ? 'pieza' : 'piezas'}</span>
            </header>

            {items.length === 0 ? (
              <div className="cart-empty">
                <div className="empty-icon" aria-hidden="true">▣</div>
                <h1 className="cart-empty-title">Tu carrito está esperando una buena idea.</h1>
                <p className="cart-empty-subtitle">Explora las piezas disponibles y empieza a construir una configuración a tu medida.</p>
                <Link to="/configurador" className="btn btn--primary">Abrir configurador →</Link>
              </div>
            ) : (
              <div className="cart-layout">
                <section className="cart-lines">
                  {items.map((item) => (
                    <article key={item.accesorio.id_accesorio} className="cart-line">
                      <div className="mini-art">
                        <ImagenProducto src={item.accesorio.imagen} />
                      </div>
                      <div className="cart-line-info">
                        <span>{item.accesorio.categoria_accesorio?.cat_nombre || 'Accesorio'}</span>
                        <h3 className="cart-line-name">{item.accesorio.acc_nombre}</h3>
                        <small className="cart-line-sku">{item.accesorio.codigo_sku}</small>
                      </div>
                      <div className="quantity-control">
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => actualizarCantidad(item.accesorio.id_accesorio, item.cantidad - 1)}
                          disabled={item.cantidad <= 1}
                          aria-label="Disminuir cantidad"
                        >
                          −
                        </button>
                        <b>{item.cantidad}</b>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => actualizarCantidad(item.accesorio.id_accesorio, item.cantidad + 1)}
                          aria-label="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>
                      <strong className="cart-line-price">{money(item.accesorio.acc_precio * item.cantidad)}</strong>
                      <button
                        className="btn btn--danger btn--sm remove-button"
                        onClick={() => eliminarItem(item.accesorio.id_accesorio)}
                        aria-label={`Eliminar ${item.accesorio.acc_nombre}`}
                      >
                        ×
                      </button>
                    </article>
                  ))}
                </section>

                <aside className="summary-card card">
                  <span className="summary-kicker">Resumen de cotización</span>
                  <h2 className="summary-title">Lista para rodar.</h2>

                  <div className="summary-row">
                    <span>Subtotal</span>
                    <strong>{money(totalPrecio)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Envío</span>
                    <strong>Por confirmar</strong>
                  </div>
                  <div className="summary-total">
                    <span>Total estimado</span>
                    <strong>{money(totalPrecio)}</strong>
                  </div>

                  <form onSubmit={manejarEnvio} className="quote-form">
                    <div className="form-field">
                      <label htmlFor="moto-select" className="form-label">¿Para qué moto es esta cotización?</label>
                      <select
                        id="moto-select"
                        className="form-input form-select"
                        value={idMoto}
                        onChange={(e) => setIdMoto(e.target.value)}
                        required
                      >
                        <option value="">Selecciona tu moto...</option>
                        {motos.map((moto) => (
                          <option key={moto.id_moto} value={moto.id_moto}>
                            {moto.modelo_moto?.marca_moto?.marca_nombre} {moto.modelo_moto?.modelo_nombre} {moto.moto_anio}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="observaciones" className="form-label">Observaciones (opcional)</label>
                      <textarea
                        id="observaciones"
                        className="form-input"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {!usuario && (
                      <p className="summary-note">Necesitas iniciar sesión para enviar la cotización.</p>
                    )}

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button
                      className="btn btn--primary btn--full"
                      disabled={enviando || !usuario || !idMoto}
                      type="submit"
                    >
                      {enviando ? 'Enviando...' : usuario ? 'Solicitar cotización →' : 'Iniciar sesión para continuar'}
                    </button>
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