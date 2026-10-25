import './ModalConfirmacion.css';

export default function ModalConfirmacion({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligroso = false,
  onConfirmar,
  onCancelar,
}) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay" onClick={onCancelar} role="dialog" aria-modal="true" aria-labelledby="modal-confirm-titulo">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2 id="modal-confirm-titulo" className="modal-title">{titulo}</h2>
          <button className="modal-close" onClick={onCancelar} aria-label="Cerrar">✕</button>
        </header>

        <p className="modal-text">{mensaje}</p>

        <footer className="modal-footer">
          <button type="button" className="btn btn--ghost" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button
            type="button"
            className={`btn ${peligroso ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </footer>
      </div>
    </div>
  );
}