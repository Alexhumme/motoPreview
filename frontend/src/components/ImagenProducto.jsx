const PLACEHOLDER = '/placeholder_pendiente.png';

/**
 * Imagen de producto con respaldo automático a "FOTO PENDIENTE":
 * se usa el placeholder cuando el producto no tiene foto o cuando la
 * URL configurada no carga.
 */
export default function ImagenProducto({ src, alt = '', className = '' }) {
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
