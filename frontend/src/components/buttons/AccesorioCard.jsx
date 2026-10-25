import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
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
      <Link to={`/visualizador/${accesorio.id_accesorio}`} className="product-art">
        {accesorio.imagen ? (
          <img src={accesorio.imagen} alt={accesorio.acc_nombre} className="product-art__image" />
        ) : (
          <span className="product-art__fallback">MP</span>
        )}
        <div className="product-art__shine" />
        {accesorio.acc_estado === 'disponible' && <span className="product-badge">✦ Disponible</span>}
        <span className="product-code">{accesorio.codigo_sku}</span>
        <span className="product-view">Vista 3D →</span>
      </Link>
      <div className="product-content">
        <div className="product-meta"><span>{accesorio.categoria_accesorio?.cat_nombre || 'Accesorios'}</span><span>● Compatible</span></div>
        <h3>{accesorio.acc_nombre}</h3>
        <p>{accesorio.acc_descripcion || 'Pieza verificada para personalizar tu motocicleta.'}</p>
        <div className="product-footer">
          <div><small>Desde</small><strong>{precio}</strong></div>
          <button className="add-product" disabled={!disponible} onClick={() => agregarItem(accesorio)} aria-label={`Agregar ${accesorio.acc_nombre}`}>+</button>
        </div>
      </div>
    </article>
  );
}