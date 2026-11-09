import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Pencil, Plus, Search, Shapes, Settings2, ShoppingCart, Trash2, Undo2, X } from 'lucide-react';
import { obtenerMotos } from '../../services/motos';
import { obtenerAccesorios, obtenerTiposProducto } from '../../services/accesorios';
import { useCart } from '../../context/CartContext';
import SiteHeader from '../../components/buttons/SiteHeader';
import ImagenProducto from '../../components/ImagenProducto';
import { refrescarMovimiento } from '../../utils/motion';
import {
  LIMITE_NOMBRE,
  crearConfiguracion,
  guardarConfiguraciones,
  leerConfiguraciones,
  limpiarNombre,
  siguienteNumero,
} from '../../utils/configuraciones';
import '../../components/filters/FiltroCapa.css';
import './Configurador.css';

const money = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(value);

const dosDigitos = (numero) => String(numero).padStart(2, '0');

export default function Configurador() {
  const { items, agregarItem, eliminarItem, actualizarCantidad, totalItems } = useCart();
  const [motos, setMotos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [accesorios, setAccesorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Taller: varias configuraciones conviven en la sesión; una está activa.
  const [taller, setTaller] = useState(leerConfiguraciones);
  const [aviso, setAviso] = useState(null);
  const [renombrando, setRenombrando] = useState(null);
  const renombreCancelado = useRef(false);
  const listaTabs = useRef(null);

  const configuraciones = taller.lista;
  const configuracion = configuraciones.find((c) => c.id === taller.activaId) || configuraciones[0];
  const indiceActivo = configuraciones.findIndex((c) => c.id === configuracion.id);
  const { marca: marcaMoto, modelo: modeloMoto, anio: anioMoto, busqueda: busquedaMoto } = configuracion.moto;
  const piezas = configuracion.piezas;

  useEffect(() => {
    async function cargarInicial() {
      try {
        const [datosMotos, datosTipos, datosAccesorios] = await Promise.all([
          obtenerMotos(),
          obtenerTiposProducto(),
          obtenerAccesorios(),
        ]);
        setMotos(datosMotos);
        setTipos(datosTipos.filter((t) => t.accesorio));
        setAccesorios(datosAccesorios);
      } catch {
        setError('No se pudieron cargar las opciones del configurador.');
      } finally {
        setCargando(false);
      }
    }
    cargarInicial();
  }, []);

  useEffect(() => { guardarConfiguraciones(taller); }, [taller]);

  useEffect(() => {
    if (!aviso) return undefined;
    const tiempo = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(tiempo);
  }, [aviso]);

  // Marcas disponibles (a partir de las motos)
  const marcasMoto = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const m of motos) {
      const id = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      const nombre = m.modelo_moto?.marca_moto?.marca_nombre || '';
      if (id && !seen.has(id)) { seen.add(id); out.push({ id, nombre }); }
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [motos]);

  // Modelos filtrados por marca
  const modelosMoto = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const m of motos) {
      const idMarca = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      if (marcaMoto && idMarca !== marcaMoto) continue;
      const id = m.modelo_moto?.id_modelo_moto;
      const nombre = m.modelo_moto?.modelo_nombre;
      if (id && !seen.has(id)) { seen.add(id); out.push({ id, nombre, cilindraje: m.modelo_moto?.cilindraje }); }
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [motos, marcaMoto]);

  // Años filtrados por modelo
  const aniosMoto = useMemo(() => {
    const out = [];
    for (const m of motos) {
      const idModelo = m.modelo_moto?.id_modelo_moto;
      if (modeloMoto && idModelo !== modeloMoto) continue;
      const idMarca = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      if (marcaMoto && idMarca !== marcaMoto) continue;
      if (!out.includes(m.moto_anio)) out.push(m.moto_anio);
    }
    return out.sort((a, b) => b - a);
  }, [motos, marcaMoto, modeloMoto]);

  // Moto seleccionada (por marca+modelo+año, o la primera que coincida)
  const motoActual = useMemo(() => {
    return motos.find((m) => {
      const idMarca = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      const idModelo = m.modelo_moto?.id_modelo_moto;
      if (marcaMoto && idMarca !== marcaMoto) return false;
      if (modeloMoto && idModelo !== modeloMoto) return false;
      if (anioMoto && String(m.moto_anio) !== String(anioMoto)) return false;
      return true;
    }) || motos.find((m) => {
      if (!busquedaMoto.trim()) return false;
      const texto = busquedaMoto.toLowerCase();
      const nombre = `${m.modelo_moto?.marca_moto?.marca_nombre || ''} ${m.modelo_moto?.modelo_nombre || ''} ${m.moto_anio}`.toLowerCase();
      return nombre.includes(texto);
    }) || (motos.length ? motos[0] : null);
  }, [motos, marcaMoto, modeloMoto, anioMoto, busquedaMoto]);

  // Nombres para la línea secundaria de cada tab, sin volver a consultar la moto.
  const nombresMoto = useMemo(() => {
    const marcas = new Map();
    const modelos = new Map();
    for (const m of motos) {
      const idMarca = m.modelo_moto?.marca_moto?.id_marca || m.modelo_moto?.id_marca;
      const idModelo = m.modelo_moto?.id_modelo_moto;
      if (idMarca) marcas.set(String(idMarca), m.modelo_moto?.marca_moto?.marca_nombre || '');
      if (idModelo) modelos.set(String(idModelo), m.modelo_moto?.modelo_nombre || '');
    }
    return { marcas, modelos };
  }, [motos]);

  const motoNombre = motoActual
    ? `${motoActual.modelo_moto?.marca_moto?.marca_nombre || ''} ${motoActual.modelo_moto?.modelo_nombre || ''}`.trim()
    : 'Selecciona una motocicleta';

  const tiposSeleccionados = useMemo(() => new Set(configuracion.tipos), [configuracion.tipos]);
  const idsPiezas = useMemo(() => new Set(piezas.map((p) => p.id_accesorio)), [piezas]);
  const totalConfiguracion = piezas.reduce((suma, p) => suma + Number(p.acc_precio), 0);

  const accesoriosFiltrados = useMemo(() => {
    if (tiposSeleccionados.size === 0) return accesorios;
    return accesorios.filter((a) => (a.tipos || []).some((t) => tiposSeleccionados.has(t.id_tipo_producto)));
  }, [accesorios, tiposSeleccionados]);

  // La lista y los tabs cambian de altura al cargar, filtrar y cambiar de configuración.
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => refrescarMovimiento());
    return () => cancelAnimationFrame(cuadro);
  }, [cargando, accesoriosFiltrados, taller.activaId, configuraciones.length]);

  useEffect(() => {
    const activa = listaTabs.current?.querySelector('[role="tab"][aria-selected="true"]');
    activa?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [taller.activaId, configuraciones.length]);

  function cambiarConfiguracion(id, cambios) {
    setTaller((prev) => ({
      ...prev,
      lista: prev.lista.map((c) => (c.id === id ? { ...c, ...(typeof cambios === 'function' ? cambios(c) : cambios) } : c)),
    }));
  }

  function elegirMarca(valor) {
    cambiarConfiguracion(configuracion.id, (c) => ({ moto: { ...c.moto, marca: valor, modelo: '', anio: '' } }));
  }

  function elegirModelo(valor) {
    cambiarConfiguracion(configuracion.id, (c) => ({ moto: { ...c.moto, modelo: valor, anio: '' } }));
  }

  function elegirAnio(valor) {
    cambiarConfiguracion(configuracion.id, (c) => ({ moto: { ...c.moto, anio: valor } }));
  }

  function buscarMoto(valor) {
    cambiarConfiguracion(configuracion.id, (c) => ({ moto: { ...c.moto, busqueda: valor } }));
  }

  function toggleTipo(id) {
    cambiarConfiguracion(configuracion.id, (c) => ({
      tipos: c.tipos.includes(id) ? c.tipos.filter((t) => t !== id) : [...c.tipos, id],
    }));
  }

  function togglePieza(accesorio) {
    setAviso(null);
    cambiarConfiguracion(configuracion.id, (c) => ({
      piezas: c.piezas.some((p) => p.id_accesorio === accesorio.id_accesorio)
        ? c.piezas.filter((p) => p.id_accesorio !== accesorio.id_accesorio)
        : [...c.piezas, accesorio],
    }));
  }

  function nuevaConfiguracion() {
    const nueva = crearConfiguracion(siguienteNumero(configuraciones));
    setTaller((prev) => ({ lista: [...prev.lista, nueva], activaId: nueva.id }));
    setRenombrando(null);
    setAviso(null);
  }

  function seleccionarConfiguracion(id) {
    setTaller((prev) => (prev.activaId === id ? prev : { ...prev, activaId: id }));
    setRenombrando(null);
  }

  // Nunca se borra la última: el taller siempre tiene al menos una configuración.
  function eliminarConfiguracion(id) {
    if (configuraciones.length < 2) return;
    const indice = configuraciones.findIndex((c) => c.id === id);
    const borrada = configuraciones[indice];
    const lista = configuraciones.filter((c) => c.id !== id);
    const activaId = taller.activaId === id ? lista[Math.min(indice, lista.length - 1)].id : taller.activaId;
    setTaller({ lista, activaId });
    setRenombrando(null);
    const piezasBorradas = borrada.piezas.length;
    setAviso({
      tono: 'aviso',
      texto: `«${borrada.nombre}» eliminada${piezasBorradas ? ` con ${piezasBorradas} ${piezasBorradas === 1 ? 'pieza' : 'piezas'}` : ''}.`,
      accion: {
        etiqueta: 'Deshacer',
        onClick: () => {
          setTaller((prev) => ({
            lista: [...prev.lista.slice(0, indice), borrada, ...prev.lista.slice(indice)],
            activaId: borrada.id,
          }));
          setAviso(null);
        },
      },
    });
  }

  function empezarRenombrado(id) {
    const actual = configuraciones.find((c) => c.id === id);
    if (!actual) return;
    renombreCancelado.current = false;
    setRenombrando({ id, valor: actual.nombre });
  }

  function confirmarRenombrado() {
    if (renombreCancelado.current) { renombreCancelado.current = false; return; }
    if (!renombrando) return;
    const nombre = limpiarNombre(renombrando.valor);
    if (nombre) cambiarConfiguracion(renombrando.id, { nombre });
    setRenombrando(null);
  }

  function cancelarRenombrado() {
    renombreCancelado.current = true;
    setRenombrando(null);
  }

  function teclasTabs(evento) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const ultimo = configuraciones.length - 1;
    let siguiente = indiceActivo;
    if (evento.key === 'ArrowLeft') siguiente = indiceActivo <= 0 ? ultimo : indiceActivo - 1;
    if (evento.key === 'ArrowRight') siguiente = indiceActivo >= ultimo ? 0 : indiceActivo + 1;
    if (evento.key === 'Home') siguiente = 0;
    if (evento.key === 'End') siguiente = ultimo;
    seleccionarConfiguracion(configuraciones[siguiente].id);
    requestAnimationFrame(() => {
      listaTabs.current?.querySelectorAll('[role="tab"]')[siguiente]?.focus();
    });
  }

  // Las piezas viajan al carrito solo cuando el usuario lo confirma: la
  // configuración queda vacía y el aviso ofrece revertir el traslado completo.
  function agregarAlCarrito() {
    if (piezas.length === 0) return;
    const transferidas = piezas;
    const idConfiguracion = configuracion.id;
    const cantidadesPrevias = new Map(items.map((linea) => [linea.accesorio.id_accesorio, linea.cantidad]));
    transferidas.forEach((pieza) => agregarItem(pieza));
    cambiarConfiguracion(idConfiguracion, { piezas: [] });
    setAviso({
      tono: 'exito',
      texto: `${transferidas.length} ${transferidas.length === 1 ? 'pieza agregada' : 'piezas agregadas'} al carrito.`,
      enlace: { etiqueta: 'Ver carrito', to: '/carrito' },
      accion: {
        etiqueta: 'Deshacer',
        onClick: () => {
          transferidas.forEach((pieza) => {
            const previa = cantidadesPrevias.get(pieza.id_accesorio);
            if (previa === undefined) eliminarItem(pieza.id_accesorio);
            else actualizarCantidad(pieza.id_accesorio, previa);
          });
          cambiarConfiguracion(idConfiguracion, (c) => ({
            piezas: [...c.piezas, ...transferidas.filter((t) => !c.piezas.some((p) => p.id_accesorio === t.id_accesorio))],
          }));
          setAviso(null);
        },
      },
    });
  }

  function etiquetaMoto(cfg) {
    const partes = [
      nombresMoto.marcas.get(String(cfg.moto.marca)),
      nombresMoto.modelos.get(String(cfg.moto.modelo)),
      cfg.moto.anio,
    ].filter(Boolean);
    return partes.length ? partes.join(' · ') : 'Sin moto definida';
  }

  if (cargando) {
    return (
      <div className="configurador-page">
        <SiteHeader />
        <main className="configurator-main">
          <div className="cargando-estado">
            <div className="skeleton" style={{ height: '56px', width: '280px', marginBottom: 'var(--space-32)' }} />
            <div className="skeleton" style={{ height: '600px' }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="configurador-page">
      <SiteHeader />
      <main className="configurator-main">
        <header className="configurator-header">
          <div className="configurator-copy">
            <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span>Estudio de compatibilidad</div>
            <h1 className="configurator-title">Diseña tu configuración.</h1>
            <p className="configurator-subtitle">Selecciona tu moto y encuentra accesorios que encajan sin complicaciones.</p>
          </div>
          <Link to="/carrito" className="btn btn--outline">
            <ShoppingCart size={16} aria-hidden="true" />
            Ver carrito <span className="btn-count">{totalItems}</span>
          </Link>
        </header>

        {error && <p className="configurator-error" role="alert">{error}</p>}

        <div className="config-tabs">
          <ul
            className="config-tabs__lista"
            role="tablist"
            aria-label="Configuraciones de la sesión"
            ref={listaTabs}
            onKeyDown={teclasTabs}
          >
            {configuraciones.map((cfg, indice) => {
              const activa = cfg.id === configuracion.id;
              const editando = renombrando?.id === cfg.id;
              return (
                <li
                  key={cfg.id}
                  role="presentation"
                  className={`config-tab${activa ? ' config-tab--activa' : ''}${cfg.piezas.length ? ' config-tab--conpiezas' : ''}`}
                >
                  {editando ? (
                    <div className="config-tab__editor">
                      <span className="config-tab__num">{dosDigitos(indice + 1)}</span>
                      <input
                        className="config-tab__input"
                        value={renombrando.valor}
                        maxLength={LIMITE_NOMBRE}
                        autoFocus
                        aria-label={`Nombre de la configuración ${indice + 1}`}
                        onChange={(e) => setRenombrando({ id: cfg.id, valor: e.target.value })}
                        onBlur={confirmarRenombrado}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmarRenombrado();
                          if (e.key === 'Escape') cancelarRenombrado();
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activa}
                      aria-controls="panel-configuracion"
                      tabIndex={activa ? 0 : -1}
                      className="config-tab__sel"
                      onClick={() => seleccionarConfiguracion(cfg.id)}
                      onDoubleClick={() => empezarRenombrado(cfg.id)}
                      title="Doble clic para renombrar"
                    >
                      <span className="config-tab__num">{dosDigitos(indice + 1)}</span>
                      <span className="config-tab__cuerpo">
                        <span className="config-tab__nombre">{cfg.nombre}</span>
                        <span className="config-tab__meta">
                          <span className="config-tab__moto">{etiquetaMoto(cfg)}</span>
                          <em className="config-tab__piezas">
                            {cfg.piezas.length} {cfg.piezas.length === 1 ? 'pza' : 'pzs'}
                          </em>
                        </span>
                      </span>
                    </button>
                  )}
                  {!editando && (
                    <span className="config-tab__acciones">
                      <button
                        type="button"
                        className="config-tab__icono"
                        onClick={() => empezarRenombrado(cfg.id)}
                        aria-label={`Renombrar ${cfg.nombre}`}
                        title="Renombrar"
                      >
                        <Pencil size={12} aria-hidden="true" />
                      </button>
                      {configuraciones.length > 1 && (
                        <button
                          type="button"
                          className="config-tab__icono config-tab__icono--cerrar"
                          onClick={() => eliminarConfiguracion(cfg.id)}
                          aria-label={`Eliminar ${cfg.nombre}`}
                          title="Eliminar configuración"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="config-tabs__nueva"
            onClick={nuevaConfiguracion}
            aria-label="Nueva configuración"
            title="Nueva configuración"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        <div
          className="configurator-layout"
          id="panel-configuracion"
          role="tabpanel"
          aria-label={`Configuración activa: ${configuracion.nombre}`}
        >
          {/* Bike preview panel */}
          <section className="bike-preview-panel card" data-reveal="up">
            <div className="panel-topline">
              <span>Tu motocicleta</span>
              <span className="live-status"><span className="live-dot" aria-hidden="true"></span> Live preview</span>
            </div>

            {/* Selectores en cascada + búsqueda */}
            <div className="moto-selectors">
              <label className="select-label" htmlFor="config-buscar-moto">Buscar moto</label>
              <div className="select-wrap">
                <Search size={14} className="select-search-icon" aria-hidden="true" />
                <input
                  id="config-buscar-moto"
                  type="text"
                  className="select-wrap__input"
                  value={busquedaMoto}
                  onChange={(e) => buscarMoto(e.target.value)}
                  placeholder="Marca, modelo o año..."
                />
              </div>

              <label className="select-label" htmlFor="config-marca">Marca</label>
              <div className="select-wrap">
                <select id="config-marca" value={marcaMoto} onChange={(e) => elegirMarca(e.target.value)}>
                  <option value="">Todas las marcas</option>
                  {marcasMoto.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} aria-hidden="true" />
              </div>

              <label className="select-label" htmlFor="config-modelo">Modelo</label>
              <div className="select-wrap">
                <select id="config-modelo" value={modeloMoto} onChange={(e) => elegirModelo(e.target.value)} disabled={!marcaMoto && marcasMoto.length > 0}>
                  <option value="">Todos los modelos</option>
                  {modelosMoto.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} · {m.cilindraje}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} aria-hidden="true" />
              </div>

              <label className="select-label" htmlFor="config-anio">Año</label>
              <div className="select-wrap">
                <select id="config-anio" value={anioMoto} onChange={(e) => elegirAnio(e.target.value)} disabled={!modeloMoto && modelosMoto.length > 0}>
                  <option value="">Todos los años</option>
                  {aniosMoto.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} aria-hidden="true" />
              </div>
            </div>

            <div className="bike-stage">
              <div className="stage-grid" />
              <span className="stage-tag">{motoActual?.moto_version || 'Compatible'}</span>
              <ImagenProducto src={motoActual?.moto_imagen} alt={motoNombre} className="bike-stage-img" />
              <div className="bike-stage-name">
                <strong>{motoNombre}</strong>
                <span>{motoActual?.modelo_moto?.cilindraje || '—'} · {motoActual?.moto_anio || '—'}</span>
              </div>
            </div>
            <div className="preview-details">
              <div>
                <small>Modelo</small>
                <strong>{motoActual?.modelo_moto?.modelo_nombre || '—'}</strong>
              </div>
              <div>
                <small>Cilindraje</small>
                <strong>{motoActual?.modelo_moto?.cilindraje || '—'}</strong>
              </div>
              <div>
                <small>Estado</small>
                <strong className="status-good"><Check size={14} aria-hidden="true" /> Compatible</strong>
              </div>
            </div>
          </section>

          {/* Compatible accessories panel */}
          <section className="compatible-panel card" data-reveal="up" data-reveal-delay="0.08">
            <div className="panel-topline">
              <span data-scramble-hover>Accesorios disponibles</span>
              <span className="result-count">{accesoriosFiltrados.length} resultados</span>
            </div>

            {/*<p className="compatible-destino">
              <Plus size={12} aria-hidden="true" />
              <span>Las piezas entran en <strong>{configuracion.nombre}</strong>; al carrito solo pasan cuando lo confirmas.</span>
            </p>*/}

            {/* Filtro por tipo (multi-select) */}
            {tipos.length > 0 && (
              <div className="compatible-filters">
                <div className="filtro-capa">
                  <span className="filtro-capa__label"><Shapes size={12} aria-hidden="true" /> Tipo</span>
                  <div className="filtro-capa__chips" role="group" aria-label="Filtrar accesorios por tipo">
                    {tipos.map((t) => (
                      <button
                        key={t.id_tipo_producto}
                        type="button"
                        className={`filtro-chip${tiposSeleccionados.has(t.id_tipo_producto) ? ' filtro-chip--activa' : ''}`}
                        onClick={() => toggleTipo(t.id_tipo_producto)}
                        aria-pressed={tiposSeleccionados.has(t.id_tipo_producto)}
                      >
                        {t.nombre}
                      </button>
                    ))}
                    {tiposSeleccionados.size > 0 && (
                      <button type="button" className="compatible-filters-clear" onClick={() => cambiarConfiguracion(configuracion.id, { tipos: [] })}>
                        <X size={12} aria-hidden="true" /> Quitar filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="compatible-list">
              {accesoriosFiltrados.length === 0 && (
                <p className="list-state list-empty">No hay accesorios con los tipos seleccionados.</p>
              )}
              {accesoriosFiltrados.map((item) => {
                const enConfiguracion = idsPiezas.has(item.id_accesorio);
                return (
                  <div
                    className={`compatible-item${enConfiguracion ? ' compatible-item--elegida' : ''}`}
                    key={item.id_accesorio}
                  >
                    <div className="mini-art">
                      <ImagenProducto src={item.imagen} />
                    </div>
                    <div className="compatible-info">
                      <strong>{item.acc_nombre}</strong>
                      <span>
                        {[item.marca?.nombre, ...(item.tipos || []).map((t) => t.nombre)]
                          .filter(Boolean)
                          .join(' · ')}
                        {' · '}
                        {money(item.acc_precio)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`btn btn--sm ${enConfiguracion ? 'btn--primary' : 'btn--outline'}`}
                      onClick={() => togglePieza(item)}
                      aria-pressed={enConfiguracion}
                      title={enConfiguracion ? 'Quitar de esta configuración' : 'Agregar a esta configuración'}
                      aria-label={`${enConfiguracion ? 'Quitar' : 'Agregar'} ${item.acc_nombre} ${enConfiguracion ? 'de' : 'a'} ${configuracion.nombre}`}
                    >
                      {enConfiguracion ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Configuration bar */}
        <section className="configuration-bar card" aria-label={`Resumen de ${configuracion.nombre}`}>
          <div className="configuration-items">
            <div className="configuration-title">
              <span className="configuration-title__icono"><Settings2 size={18} aria-hidden="true" /></span>
              <span className="configuration-title__texto">
                <strong data-scramble-hover>{configuracion.nombre}</strong>
                <small>
                  {piezas.length
                    ? `${piezas.length} ${piezas.length === 1 ? 'pieza seleccionada' : 'piezas seleccionadas'} · ${etiquetaMoto(configuracion)}`
                    : 'Aún no has agregado piezas'}
                </small>
              </span>
              <span className="configuration-title__indice">{dosDigitos(indiceActivo + 1)} / {dosDigitos(configuraciones.length)}</span>
            </div>

            {piezas.length === 0 ? (
              <p className="configuration-vacia">
                Marca piezas con <Plus size={12} aria-hidden="true" /> en la lista y se guardan en esta configuración.
              </p>
            ) : (
              <div className="configuration-piezas">
                {piezas.map((pieza) => (
                  <div className="configuration-pill" key={pieza.id_accesorio}>
                    <span>{pieza.acc_nombre}</span>
                    <button
                      type="button"
                      onClick={() => togglePieza(pieza)}
                      className="btn btn--danger btn--sm"
                      aria-label={`Quitar ${pieza.acc_nombre} de ${configuracion.nombre}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="configuration-total">
            <span>
              <small>Total estimado</small>
              <strong>{money(totalConfiguracion)}</strong>
            </span>
            <button
              type="button"
              className="btn btn--primary"
              onClick={agregarAlCarrito}
              disabled={piezas.length === 0}
            >
              <ShoppingCart size={16} aria-hidden="true" />
              Agregar al carrito
              {piezas.length > 0 && <span className="btn-count">{piezas.length}</span>}
            </button>
          </div>

          {aviso && (
            <div className={`configuration-aviso configuration-aviso--${aviso.tono}`} role="status">
              {aviso.tono === 'exito'
                ? <Check size={14} aria-hidden="true" />
                : <Trash2 size={14} aria-hidden="true" />}
              <span className="configuration-aviso__texto">{aviso.texto}</span>
              {aviso.enlace && (
                <Link to={aviso.enlace.to} className="configuration-aviso__enlace">
                  {aviso.enlace.etiqueta} <ArrowRight size={12} aria-hidden="true" />
                </Link>
              )}
              {aviso.accion && (
                <button type="button" className="configuration-aviso__accion" onClick={aviso.accion.onClick}>
                  <Undo2 size={12} aria-hidden="true" /> {aviso.accion.etiqueta}
                </button>
              )}
              <button
                type="button"
                className="configuration-aviso__cerrar"
                onClick={() => setAviso(null)}
                aria-label="Cerrar aviso"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}