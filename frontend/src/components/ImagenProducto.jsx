import { useTema } from '../context/TemaContext';

const PLACEHOLDER = '/placeholder_pendiente.png';

/**
 * Imagen de producto con respaldo automático:
 * - Tema oscuro: placeholder "FOTO PENDIENTE" (las fotos nuevas).
 * - Tema claro: respaldo antiguo con el texto "MP".
 * En ambos casos se usa el placeholder cuando el producto no tiene foto
 * o cuando la URL configurada no carga.
 */
export default function ImagenProducto({ src, alt = '', className = '' }) {
  const { tema } = useTema();

  if (tema === 'claro') {
    return (
      <div className={`mp-fallback ${className}`.trim()} role="img" aria-label={alt || 'Foto pendiente'}>
        MP
      </div>
    );
  }

  return (
    <img
      src={src || PLACEHOLDER}
      alt={alt || 'Foto pendiente'}
      className={className}
      loading="lazy"
      onError={(e) => {
        if (e.currentTarget.src.endsWith(PLACEHOLDER)) return;
        e.currentTarget.src = PLACEHOLDER;
      }}
    />
  );
}
