import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import ImagenProducto from '../ImagenProducto';
import './AccesorioCard.css';

export default function AccesorioCard({ accesorio }) {
  const { agregarItem } = useCart();
  const precio = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(accesorio.acc_precio);
  const disponible = accesorio.acc_estado === 'disponible';

  return (
    <article className="product-card">
      <Link to={`/visualizador/${accesorio.id_accesorio}`} className="product-link" aria-label={`Ver ${accesorio.acc_nombre}`}>
        {/* Área de imagen - usa ImagenProducto con fallback automático */}
        <ImagenProducto
          src={accesorio.imagen}
          alt={accesorio.acc_nombre}
          className="product-image"
        />
        <div className="product-shine" />
      </Link>

      <div className="product-content">
        {/* Badge "Disponible" - posición absoluta dentro del contenido */}
        {disponible && (
          <span className="product-badge badge--mint">✦ Disponible</span>
        )}

        <span className="product-code">{accesorio.codigo_sku || 'Sin SKU'}</span>

        <span className="product-view">Vista 3D →</span>

        <div className="product-meta">
          <span>{accesorio.categoria_accesorio?.cat_nombre || 'Accesorios'}</span>
          <span>● Compatible</span>
        </div>

        <h3 className="product-title">{accesorio.acc_nombre}</h3>

        <p className="product-description">{accesorio.acc_descripcion || 'Pieza verificada para personalizar tu motocicleta.'}</p>

        <div className="product-footer">
          <div className="product-price">
            <small>Desde</small>
            <strong>{precio}</strong>
          </div>
          <button
            className="btn btn--primary btn--sm add-product"
            disabled={!disponible}
            onClick={() => agregarItem(accesorio)}
            aria-label={`Agregar ${accesorio.acc_nombre} al carrito`}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}