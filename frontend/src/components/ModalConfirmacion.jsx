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
    <div className="modal-confirmacion__overlay" onClick={onCancelar}>
      <div className="modal-confirmacion__caja" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-confirmacion__titulo">{titulo}</h2>
        <p className="modal-confirmacion__mensaje">{mensaje}</p>
        <div className="modal-confirmacion__botones">
          <button className="modal-confirmacion__boton-cancelar" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button
            className={`modal-confirmacion__boton-confirmar ${peligroso ? 'modal-confirmacion__boton-confirmar--peligroso' : ''}`}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}