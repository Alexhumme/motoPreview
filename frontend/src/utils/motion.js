/**
 * Capa de movimiento del sitio público.
 * Lenis lleva el scroll suave; GSAP + ScrollTrigger disparan las animaciones
 * declaradas en el markup con atributos data-*.
 *
 * Atributos que una vista puede usar:
 *   data-reveal="up | fade | scale | lineas | grupo"   (por defecto "up")
 *   data-reveal-delay="0.1"                            (segundos)
 *   data-scramble="TEXTO" [+ data-scramble-hover]
 *   data-parallax="0.18"                               (factor de desplazamiento)
 *   data-contado="1250"                                (conteo ascendente)
 *   data-glitch="TITULO"                               (split RGB, puro CSS)
 *
 * Con prefers-reduced-motion no se construye nada: no se añade js-motion, así
 * que ningún estado inicial oculto entra en juego y el CSS queda en su forma final.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { RoughEase } from 'gsap/EasePack';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, RoughEase);

const SELECTOR = '[data-reveal],[data-scramble],[data-scramble-hover],[data-parallax],[data-contado]';
const SALIDA = gsap.parseEase('power4.out') || 'power4.out';
const RUDO =
  gsap.parseEase('rough({ strength: 2, points: 18, template: power4.inOut, taper: both, randomize: true, clamp: true })') ||
  SALIDA;
const GLIFOS = '01<>/\\[]{}=+*·';

const menosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const activos = new Set();
let motor = null;

/* ------------------------------------------------------------------
   Comportamientos: cada uno devuelve su propia depuración
   ------------------------------------------------------------------ */

function animarRevelado(el) {
  const modo = el.dataset.reveal || 'up';
  const delay = Number(el.dataset.revealDelay) || 0;
  const activador = { trigger: el, start: 'top 88%', once: true };

  if (modo === 'lineas') {
    const division = new SplitText(el, { type: 'lines', mask: 'lines' });
    const animacion = gsap.fromTo(
      division.lines,
      { yPercent: 115 },
      { yPercent: 0, duration: 0.95, stagger: 0.075, delay, ease: SALIDA, scrollTrigger: activador }
    );
    return () => {
      animacion.kill();
      division.revert();
    };
  }

  if (modo === 'grupo') {
    if (!el.children.length) return null;
    const animacion = gsap.fromTo(
      el.children,
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.055, delay, ease: SALIDA, scrollTrigger: activador }
    );
    return () => animacion.kill();
  }

  const desde =
    { fade: { opacity: 0 }, scale: { opacity: 0, scale: 0.96 } }[modo] || { opacity: 0, y: 30 };
  // fromTo en lugar de from: el valor final se declara, así GSAP no tiene que
  // reconstruir el estado base del transform en cada refresh de ScrollTrigger.
  const hasta = Object.fromEntries(Object.keys(desde).map((prop) => [prop, prop === 'y' ? 0 : 1]));
  const animacion = gsap.fromTo(el, desde, {
    ...hasta,
    duration: 0.9,
    delay,
    ease: SALIDA,
    scrollTrigger: activador,
  });
  return () => animacion.kill();
}

function animarScramble(el) {
  // data-scramble sin valor llega como "true" (React), y en ese caso el texto
  // real es el propio contenido del elemento.
  const fijo = el.dataset.scramble;
  const texto = fijo && fijo !== 'true' ? fijo : el.textContent.trim();
  const configuracion = {
    duration: 0.85,
    ease: 'none',
    scrambleText: { text: texto, chars: GLIFOS, speed: 0.4 },
  };

  if (el.hasAttribute('data-scramble-hover')) {
    const alEntrar = () => gsap.to(el, configuracion);
    el.addEventListener('pointerenter', alEntrar);
    return () => el.removeEventListener('pointerenter', alEntrar);
  }

  const animacion = gsap.to(el, { ...configuracion, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  return () => animacion.kill();
}

function animarParallax(el) {
  const factor = Number(el.dataset.parallax) || 0.15;
  const animacion = gsap.to(el, {
    y: () => el.offsetHeight * factor,
    ease: 'none',
    scrollTrigger: {
      trigger: el.parentElement || el,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
  return () => animacion.kill();
}

function animarContado(el) {
  const destino = Number(el.dataset.contado ?? el.textContent) || 0;
  const contador = { valor: 0 };
  el.textContent = formatoNumero.format(0);
  const animacion = gsap.to(contador, {
    valor: destino,
    duration: 1.6,
    ease: SALIDA,
    onUpdate: () => {
      el.textContent = formatoNumero.format(Math.round(contador.valor));
    },
    scrollTrigger: { trigger: el, start: 'top 92%', once: true },
  });
  return () => {
    animacion.kill();
    el.textContent = formatoNumero.format(destino);
  };
}

/* ------------------------------------------------------------------
   Registro / liberación por elemento
   ------------------------------------------------------------------ */

function aplicar(el) {
  if (el.dataset.movActivo === '1') return;
  el.dataset.movActivo = '1';
  const depuradores = [];
  if (el.hasAttribute('data-reveal')) depuradores.push(animarRevelado(el));
  if (el.hasAttribute('data-scramble') || el.hasAttribute('data-scramble-hover')) {
    depuradores.push(animarScramble(el));
  }
  if (el.hasAttribute('data-parallax')) depuradores.push(animarParallax(el));
  if (el.hasAttribute('data-contado')) depuradores.push(animarContado(el));
  el._depuradores = depuradores;
  activos.add(el);
}

function soltar(el) {
  (el._depuradores || []).forEach((depurar) => depurar && depurar());
  gsap.killTweensOf(el);
  delete el._depuradores;
  delete el.dataset.movActivo;
  activos.delete(el);
}

function registrarEn(nodo) {
  if (!nodo || typeof nodo.querySelectorAll !== 'function') return;
  const candidatos =
    typeof nodo.matches === 'function' && nodo.matches(SELECTOR)
      ? [nodo, ...nodo.querySelectorAll(SELECTOR)]
      : Array.from(nodo.querySelectorAll(SELECTOR));
  candidatos.forEach(aplicar);
}

function purgarDesconectados() {
  activos.forEach((el) => {
    if (!el.isConnected) soltar(el);
  });
}

/* ------------------------------------------------------------------
   Reticula del puntero (solo punteros finos)
   ------------------------------------------------------------------ */

function crearReticula() {
  if (!window.matchMedia('(pointer: fine)').matches) return null;

  const reticula = document.createElement('div');
  reticula.className = 'fx-reticula';
  reticula.setAttribute('aria-hidden', 'true');
  document.body.appendChild(reticula);

  const moverX = gsap.quickTo(reticula, 'x', { duration: 0.35, ease: 'power3.out' });
  const moverY = gsap.quickTo(reticula, 'y', { duration: 0.35, ease: 'power3.out' });
  // El transform lo escribe GSAP, así que el "agrandar" también debe ir por aquí
  const escalar = gsap.quickTo(reticula, 'scale', { duration: 0.25, ease: 'power3.out' });

  const alMover = (evento) => {
    reticula.classList.add('fx-reticula--activo');
    moverX(evento.clientX);
    moverY(evento.clientY);
  };
  const sobreElemento = (evento) => {
    const objetivo = evento.target;
    const interactivo =
      objetivo && objetivo.closest &&
      objetivo.closest('a, button, [role="button"], input, select, .accesorio-card');
    reticula.classList.toggle('fx-reticula--fuerte', Boolean(interactivo));
    escalar(interactivo ? 1.7 : 1);
  };
  const alSalir = () => reticula.classList.remove('fx-reticula--activo');

  window.addEventListener('pointermove', alMover, { passive: true });
  window.addEventListener('pointerover', sobreElemento, { passive: true });
  document.addEventListener('pointerleave', alSalir);

  return () => {
    window.removeEventListener('pointermove', alMover);
    window.removeEventListener('pointerover', sobreElemento);
    document.removeEventListener('pointerleave', alSalir);
    reticula.remove();
  };
}

/* ------------------------------------------------------------------
   Motor
   ------------------------------------------------------------------ */

function crearMotor() {
  document.documentElement.classList.add('js-motion');

  ScrollTrigger.config({ limitCallbacks: true });

  const lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.4,
  });
  lenis.on('scroll', ScrollTrigger.update);

  const enTicker = (tiempo) => lenis.raf(tiempo * 1000);
  gsap.ticker.add(enTicker);
  gsap.ticker.lagSmoothing(0);

  const alClic = (evento) => {
    const enlace = evento.target && evento.target.closest
      ? evento.target.closest('a[href^="#"]')
      : null;
    if (!enlace) return;
    const referencia = enlace.getAttribute('href');
    if (!referencia || referencia === '#') return;
    let destino;
    try {
      destino = document.querySelector(referencia);
    } catch {
      return;
    }
    if (!destino) return;
    evento.preventDefault();
    lenis.scrollTo(destino, { offset: -90, duration: 1.2 });
  };
  document.addEventListener('click', alClic);

  registrarEn(document.documentElement);

  let pendiente = 0;
  const observador = new MutationObserver((mutaciones) => {
    if (pendiente) cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(() => {
      pendiente = 0;
      mutaciones.forEach((mutacion) => mutacion.addedNodes.forEach(registrarEn));
      purgarDesconectados();
    });
  });
  observador.observe(document.body, { childList: true, subtree: true });

  const depurarReticula = crearReticula();

  return {
    usos: 0,
    lenis,
    depurar: () => {
      if (pendiente) cancelAnimationFrame(pendiente);
      observador.disconnect();
      document.removeEventListener('click', alClic);
      if (depurarReticula) depurarReticula();
      Array.from(activos).forEach(soltar);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      gsap.ticker.remove(enTicker);
      lenis.destroy();
      document.documentElement.classList.remove('js-motion');
    },
  };
}

/**
 * Enciende el motor mientras haya al menos un consumidor montado.
 * Devuelve la liberación, para usar tal cual en un useEffect.
 */
export function iniciarMovimiento() {
  if (menosMovimiento()) return () => {};
  if (!motor) {
    motor = crearMotor();
    if (import.meta.env.DEV) window.__motopreviewMotion = motor;
  }
  motor.usos += 1;
  let liberado = false;
  return () => {
    if (liberado || !motor) return;
    liberado = true;
    motor.usos -= 1;
    if (motor.usos <= 0) {
      motor.depurar();
      motor = null;
    }
  };
}

/** Tras cambiar de ruta o de filtros: recalcula alturas y reevalúa lo visible. */
export function refrescarMovimiento() {
  if (!motor) return;
  ScrollTrigger.refresh();
}

/** Scroll de programa que respeta el scroll suave activo. */
export function desplazarse(destino, opciones = {}) {
  if (motor) {
    motor.lenis.scrollTo(destino, { duration: 1.1, ...opciones });
    return;
  }
  const y = typeof destino === 'number' ? destino : null;
  if (y !== null) window.scrollTo(0, y);
  else if (destino && destino.scrollIntoView) destino.scrollIntoView({ block: 'start' });
}

export { RUDO as easeRudo, SALIDA as easeSalida, gsap, ScrollTrigger };
