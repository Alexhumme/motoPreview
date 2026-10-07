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
        setModelo3d(null); // este accesorio no tiene modelo 3D todavía, está bien
      }
      setCargando(false);
    }
    cargar();
  }, [id]);

  if (cargando) return <p className="visualizador__estado">Cargando...</p>;
  if (!accesorio) return <p className="visualizador__estado">Accesorio no encontrado</p>;

  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(accesorio.acc_precio);

  return (
    <div className="visualizador">
      <Link to="/" className="visualizador__volver">← Volver al catálogo</Link>

      <div className="visualizador__layout">
        <Visor3D url={modelo3d?.url_modelo3d} nombreAccesorio={accesorio.acc_nombre} />

        <div className="visualizador__info">
          <span className="visualizador__categoria">{accesorio.categoria_accesorio?.cat_nombre}</span>
          <h1 className="visualizador__nombre">{accesorio.acc_nombre}</h1>
          <p className="visualizador__descripcion">{accesorio.acc_descripcion}</p>
          <div className="visualizador__ficha">
            <span>SKU: {accesorio.codigo_sku}</span>
            <span>Peso: {accesorio.peso} kg</span>
          </div>
          <span className="visualizador__precio">{precioFormateado}</span>
        </div>
      </div>
    </div>
  );
}