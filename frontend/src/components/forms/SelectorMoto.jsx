import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CornerDownLeft, Search, X } from 'lucide-react';
import { filtrarMotos, sinAcentos } from '../../utils/motos';
import './SelectorMoto.css';

const ALTO_MAX = 292;
const MAX_OPCIONES = 60;

/* Resalta cada palabra de la consulta dentro del texto. Se compara carácter a
   carácter sin acentos para que los índices del resalte coincidan con el texto
   original (normalizar la cadena entera cambiaría su longitud). */
function Resaltado({ texto, consulta }) {
  const partes = useMemo(() => {
    const letras = [...String(texto ?? '')];
    const tokens = sinAcentos(consulta).split(/\s+/).filter(Boolean);
    if (!tokens.length || !letras.length) return [{ texto: letras.join(''), marcado: false }];

    const plano = letras.map((letra) => {
      const suelto = sinAcentos(letra);
      return suelto.length === 1 ? suelto : letra.toLowerCase();
    }).join('');

    const marcas = new Array(letras.length).fill(false);
    tokens.forEach((token) => {
      let desde = 0;
      for (;;) {
        const inicio = plano.indexOf(token, desde);
        if (inicio < 0) break;
        for (let i = inicio; i < inicio + token.length; i += 1) marcas[i] = true;
        desde = inicio + token.length;
      }
    });

    const salida = [];
    let actual = { texto: '', marcado: marcas[0] };
    letras.forEach((letra, i) => {
      if (marcas[i] === actual.marcado) actual.texto += letra;
      else { salida.push(actual); actual = { texto: letra, marcado: marcas[i] }; }
    });
    salida.push(actual);
    return salida;
  }, [texto, consulta]);

  return partes.map((parte, i) => (
    parte.marcado
      ? <mark key={i} className="selector-moto__resalte">{parte.texto}</mark>
      : <span key={i}>{parte.texto}</span>
  ));
}

/**
 * Input textual con sugerencias en vivo (combobox ARIA). La lista va en un
 * portal porque los paneles que lo contienen llevan clip-path y la recortarían.
 * `onElegir` recibe la moto completa, o null para la opción «ninguna» y el borrado.
 */
export default function SelectorMoto({
  id,
  motos = [],
  texto = '',
  onTexto,
  onElegir,
  placeholder = 'Marca, modelo o año...',
  opcionNinguna = '',
  cargando = false,
  className = '',
}) {
  const idInterno = useId();
  const idLista = `${id || idInterno}-lista`;

  const campoRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const listaRef = useRef(null);

  const [abierta, setAbierta] = useState(false);
  const [activo, setActivo] = useState(0);
  const [confirmado, setConfirmado] = useState('');
  const [pos, setPos] = useState(null);

  // Al enfocar una moto ya elegida la lista muestra todo el catálogo: si no,
  // el texto comprometido filtraría la lista a un único resultado.
  const consulta = texto === confirmado ? '' : texto;

  const { opciones, total } = useMemo(() => {
    const encontradas = filtrarMotos(motos, consulta);
    const lista = encontradas.slice(0, MAX_OPCIONES);
    if (opcionNinguna && sinAcentos(opcionNinguna).includes(sinAcentos(consulta).trim())) {
      lista.unshift({ id: '', etiqueta: opcionNinguna, modelo: opcionNinguna, marca: '', anio: '', detalle: '', moto: null });
    }
    return { opciones: lista, total: encontradas.length };
  }, [motos, consulta, opcionNinguna]);

  const indice = opciones.length === 0 ? -1 : Math.max(0, Math.min(activo, opciones.length - 1));

  useEffect(() => { setActivo(0); }, [consulta]);

  const medir = useCallback(() => {
    const caja = inputRef.current?.getBoundingClientRect();
    if (!caja) return;
    const margen = 10;
    const huecoAbajo = window.innerHeight - caja.bottom - margen;
    const huecoArriba = caja.top - margen;
    const haciaArriba = huecoAbajo < 190 && huecoArriba > huecoAbajo;
    setPos({
      izquierda: caja.left,
      ancho: caja.width,
      arriba: haciaArriba ? null : caja.bottom + 6,
      abajo: haciaArriba ? window.innerHeight - caja.top + 6 : null,
      altoMax: Math.max(132, Math.min(ALTO_MAX, (haciaArriba ? huecoArriba : huecoAbajo) - 6)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!abierta) return undefined;
    medir();
    let cuadro = 0;
    const programar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(medir);
    };
    window.addEventListener('scroll', programar, true);
    window.addEventListener('resize', programar);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('scroll', programar, true);
      window.removeEventListener('resize', programar);
    };
  }, [abierta, medir]);

  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (evento) => {
      if (campoRef.current?.contains(evento.target) || panelRef.current?.contains(evento.target)) return;
      setAbierta(false);
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierta]);

  // Desplaza solo el contenedor de la lista: scrollIntoView movería también la página.
  useEffect(() => {
    const contenedor = listaRef.current;
    if (!abierta || indice < 0 || !contenedor) return;
    const nodo = contenedor.querySelector(`[data-indice="${indice}"]`);
    if (!nodo) return;
    const arriba = nodo.offsetTop;
    const abajo = arriba + nodo.offsetHeight;
    if (arriba < contenedor.scrollTop) contenedor.scrollTop = arriba;
    else if (abajo > contenedor.scrollTop + contenedor.clientHeight) contenedor.scrollTop = abajo - contenedor.clientHeight;
  }, [abierta, indice, opciones.length]);

  function elegir(opcion) {
    setConfirmado(opcion.etiqueta);
    onTexto?.(opcion.etiqueta);
    onElegir?.(opcion.moto);
    setAbierta(false);
    inputRef.current?.focus();
  }

  function limpiar() {
    setConfirmado('');
    onTexto?.('');
    onElegir?.(null);
    setAbierta(false);
    inputRef.current?.focus();
  }

  function escribir(evento) {
    setConfirmado('');
    onTexto?.(evento.target.value);
    setAbierta(true);
  }

  function teclas(evento) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!abierta) { setAbierta(true); setActivo(0); return; }
      if (!opciones.length) return;
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      setActivo((prev) => (Math.max(0, prev) + paso + opciones.length) % opciones.length);
      return;
    }
    if (evento.key === 'Enter') {
      // Evita que Enter envíe el formulario del carrito con la lista abierta.
      evento.preventDefault();
      if (!abierta) { setAbierta(true); setActivo(0); return; }
      if (indice >= 0) elegir(opciones[indice]);
      return;
    }
    if (evento.key === 'Escape' && abierta) {
      evento.preventDefault();
      evento.stopPropagation();
      setAbierta(false);
      return;
    }
    if (evento.key === 'Tab') setAbierta(false);
  }

  const vacio = cargando
    ? 'Cargando motos...'
    : motos.length === 0
      ? 'No hay motos registradas todavía.'
      : `Sin coincidencias para «${texto.trim()}». Revisa la marca, el modelo o el año.`;

  return (
    <div
      className={`selector-moto${className ? ` ${className}` : ''}`}
      ref={campoRef}
      onBlur={(evento) => {
        if (campoRef.current?.contains(evento.relatedTarget)) return;
        setAbierta(false);
      }}
    >
      <Search size={14} className="selector-moto__icono" aria-hidden="true" />
      <input
        id={id}
        ref={inputRef}
        type="text"
        className="selector-moto__input"
        value={texto}
        onChange={escribir}
        onFocus={() => setAbierta(true)}
        onClick={() => setAbierta(true)}
        onKeyDown={teclas}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={abierta}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={abierta && indice >= 0 ? `${idLista}-${indice}` : undefined}
      />
      {texto ? (
        <button
          type="button"
          className="selector-moto__control"
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={limpiar}
          aria-label="Borrar moto"
          title="Borrar moto"
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          className={`selector-moto__control${abierta ? ' selector-moto__control--girada' : ''}`}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => { setAbierta((prev) => !prev); inputRef.current?.focus(); }}
          aria-label="Ver todas las motos"
          title="Ver todas las motos"
          tabIndex={-1}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      )}

      <span className="selector-moto__live" role="status" aria-live="polite">
        {abierta ? `${total} ${total === 1 ? 'moto disponible' : 'motos disponibles'}` : ''}
      </span>

      {abierta && pos && createPortal(
        <div
          className="selector-moto__panel"
          ref={panelRef}
          style={{
            left: `${pos.izquierda}px`,
            width: `${pos.ancho}px`,
            top: pos.arriba === null ? 'auto' : `${pos.arriba}px`,
            bottom: pos.abajo === null ? 'auto' : `${pos.abajo}px`,
            '--alto-max': `${pos.altoMax}px`,
          }}
          onMouseDown={(evento) => evento.preventDefault()}
        >
          <ul className="selector-moto__lista" role="listbox" id={idLista} aria-label="Motos sugeridas" ref={listaRef}>
            {opciones.map((opcion, i) => (
              <li
                key={opcion.id || 'ninguna'}
                id={`${idLista}-${i}`}
                data-indice={i}
                role="option"
                aria-selected={i === indice}
                className={`selector-moto__opcion${i === indice ? ' selector-moto__opcion--activa' : ''}${opcion.moto ? '' : ' selector-moto__opcion--ninguna'}`}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(opcion)}
              >
                <span className="selector-moto__romo" aria-hidden="true" />
                <span className="selector-moto__texto">
                  <span className="selector-moto__nombre">
                    <Resaltado texto={opcion.modelo || opcion.etiqueta} consulta={consulta} />
                    {opcion.anio !== '' && <em className="selector-moto__anio">{opcion.anio}</em>}
                  </span>
                  {(opcion.marca || opcion.detalle) && (
                    <span className="selector-moto__detalle">
                      <Resaltado texto={[opcion.marca, opcion.detalle].filter(Boolean).join(' · ')} consulta={consulta} />
                    </span>
                  )}
                </span>
                {i === indice && <CornerDownLeft size={13} className="selector-moto__intro" aria-hidden="true" />}
              </li>
            ))}
          </ul>

          {opciones.length === 0 && <p className="selector-moto__vacio">{vacio}</p>}

          <div className="selector-moto__pie">
            <span className="selector-moto__conteo">
              {total > opciones.length ? `${opciones.length} de ${total}` : total} {total === 1 ? 'moto' : 'motos'}
            </span>
            <span className="selector-moto__teclas" aria-hidden="true">
              <kbd>↑</kbd><kbd>↓</kbd> navegar <kbd>Enter</kbd> elegir <kbd>Esc</kbd> cerrar
            </span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}