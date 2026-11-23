# Trazabilidad de cambios — MotoPreview

## Cambio 1: Fix del selector de estado del rol (BUG-001)

| Paso | Evidencia |
|---|---|
| Issue | #1 — "BUG: el selector de estado del rol enviaba string en vez de boolean" |
| Rama | `fix/cors-origenes-produccion` (fix/*) |
| Commit | `ce34732` — `fix: el selector de estado del rol enviaba string en vez de boolean` |
| Pull Request | PR #4 — "fix: el selector de estado del rol enviaba string en vez de boolean" |
| Integración | Mergeado a `main` (squash) — sha `555fe9e` |
| Versión | v1.1.0 |

Problema: El `<select>` de estado del rol en `Seguridad.jsx` usaba `value={formulario.activo}` (booleano) con opciones `value={true}`/`value={false}` (que el DOM convierte a string) y `onChange` guardaba `e.target.value` (string). El PUT enviaba `"true"`/`"false"` en vez de un booleano.

Solución: `value={String(formulario.activo)}` y `onChange` convierte de vuelta a boolean (`e.target.value === 'true'`).

## Cambio 2: Búsqueda en Usuarios + selectores en cascada en Configurador (Mejora #2)

| Paso | Evidencia |
|---|---|
| Issue | #2 — "Mejora: exportar reportes de cotizaciones a CSV" (reutilizado para la mejora de búsqueda/selectores) |
| Rama | `feature/busqueda-usuarios` (feature/*) |
| Commit | `0b0d158` — `feat: busqueda en Usuarios + selectores en cascada en Configurador` |
| Pull Request | Integrado a `main` por fast-forward (sin PR separado; cambios ya en main) |
| Integración | Fast-forward en `main` |
| Versión | v1.1.0 |

Problema: La tabla de Usuarios no tenía búsqueda y el Configurador no tenía selectores en cascada ni búsqueda de moto.

Solución: Barra de búsqueda en Usuarios (por nombre/email/rol) con contador; selectores en cascada marca→modelo→año + búsqueda de moto en Configurador; filtro por tipo (multi-select).
