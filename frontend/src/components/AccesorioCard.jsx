import './AccesorioCard.css';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function AccesorioCard({ accesorio }) {
  const { agregarItem } = useCart();

  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(accesorio.acc_precio);

  return (
    <article className="accesorio-card">
      <Link to={`/visualizador/${accesorio.id_accesorio}`} className="accesorio-card__imagen">
        <span className="accesorio-card__sku">{accesorio.codigo_sku}</span>
      </Link>
      <div className="accesorio-card__cuerpo">
        <span className="accesorio-card__categoria">
          {accesorio.categoria_accesorio?.cat_nombre}
        </span>
        <h3 className="accesorio-card__nombre">{accesorio.acc_nombre}</h3>
        <p className="accesorio-card__descripcion">{accesorio.acc_descripcion}</p>
        <div className="accesorio-card__detalle">
          <span>{accesorio.peso} kg</span>
          <span className={`accesorio-card__estado accesorio-card__estado--${accesorio.acc_estado}`}>
            {accesorio.acc_estado}
          </span>
        </div>
        <div className="accesorio-card__pie">
          <span className="accesorio-card__precio">{precioFormateado}</span>
          <button
            className="accesorio-card__boton"
            onClick={() => agregarItem(accesorio)}
            disabled={accesorio.acc_estado !== 'disponible'}
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}