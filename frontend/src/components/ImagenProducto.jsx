import { useTema } from '../context/temaContexto';

const PLACEHOLDER_CLARO = '/placeholder_pendiente.png';
const PLACEHOLDER_OSCURO = '/placeholder_pendiente_oscuro.png';

/**
 * Imagen de producto con respaldo automático a "FOTO PENDIENTE":
 * se usa el placeholder cuando el producto no tiene foto o cuando la
 * URL configurada no carga. Cada tema tiene su propio placeholder:
 * fondo claro en el modo claro y fondo oscuro en el modo oscuro.
 */
export default function ImagenProducto({ src, alt = '', className = '' }) {
  const { tema } = useTema();
  const placeholder = tema === 'claro' ? PLACEHOLDER_CLARO : PLACEHOLDER_OSCURO;

  return (
    <img
      src={src || placeholder}
      alt={alt || 'Foto pendiente'}
      className={className}
      loading="lazy"
      onError={(e) => {
        if (e.currentTarget.src.endsWith(placeholder)) return;
        e.currentTarget.src = placeholder;
      }}
    />
  );
}
