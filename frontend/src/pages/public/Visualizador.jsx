import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { obtenerModelo3dPorAccesorio } from '../../services/modelos3d';
import Visor3D from '../../components/Visor3D';
import './Visualizador.css';

export default function Visualizador() {
  const { id } = useParams();
  const [accesorio, setAccesorio] = useState(null);
  const [modelo3d, setModelo3d] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const respAccesorio = await api.get(`/accesorios/${id}`);
        setAccesorio(respAccesorio.data);
      } catch {
        setAccesorio(null);
      }
      try {
        const modelo = await obtenerModelo3dPorAccesorio(id);
        setModelo3d(modelo);
      } catch {
        setModelo3d(null);
      }
      setCargando(false);
    }
    cargar();
  }, [id]);

  if (cargando) {
    return (
      <div className="visualizador-page" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: '56px', width: '200px', marginBottom: 'var(--space-32)' }} />
        <div className="skeleton" style={{ height: '500px' }} />
      </div>
    );
  }
  if (!accesorio) {
    return (
      <div className="visualizador-page">
        <Link to="/" className="btn btn--ghost btn--sm">← Volver al catálogo</Link>
        <div className="visualizador-empty">
          <span className="empty-icon" aria-hidden="true">⌕</span>
          <h1 className="empty-title">Accesorio no encontrado</h1>
          <p className="empty-subtitle">La pieza que buscas no existe o ha sido eliminada.</p>
          <Link to="/" className="btn btn--primary">Volver al catálogo →</Link>
        </div>
      </div>
    );
  }

  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(accesorio.acc_precio);

  return (
    <div className="visualizador-page">
      <Link to="/" className="btn btn--ghost btn--sm visualizador-back">← Volver al catálogo</Link>

      <div className="visualizador-layout">
        <Visor3D url={modelo3d?.url_modelo3d} nombreAccesorio={accesorio.acc_nombre} />

        <div className="visualizador-info">
          <span className="visualizador-categoria">{accesorio.categoria_accesorio?.cat_nombre}</span>
          <h1 className="visualizador-title">{accesorio.acc_nombre}</h1>
          <p className="visualizador-description">{accesorio.acc_descripcion || ''}</p>
          <div className="visualizador-ficha">
            <span>SKU: {accesorio.codigo_sku}</span>
            <span>Peso: {accesorio.peso} kg</span>
          </div>
          <span className="visualizador-price">{precioFormateado}</span>

          <button className="btn btn--primary btn--full">Agregar al carrito</button>
        </div>
      </div>
    </div>
  );
}