# Estado actual del software — MotoPreview

## Versión actual

**v1.1.0** (tag `v1.1.0`)

## Funcionalidades principales

- Catálogo y carrito de accesorios con placeholder "FOTO PENDIENTE" (variantes dark/light).
- Configurador 3D (lazy-loaded) de accesorios compatibles por modelo de moto.
- RBAC: matriz de permisos (15 recursos × 6 acciones = 90 combos) editable solo por Superadmin; roles CRUD por Admin de tienda.
- Dashboard con métricas por tienda y consolidado para Superadmin.
- Tema oscuro/claro con conmutador persistente (localStorage + `data-tema`).
- Marca con logo del casco (modo oscuro: logo v2; modo claro: casco sobre chip blanco).
- Login con captcha (operación matemática).
- Sidebar categorizado en el panel de administración con iconos lucide y menú hamburguesa responsive.
- Búsqueda en Usuarios y selectores en cascada en el Configurador (v1.1.0).

## Principales cambios realizados (v1.1.0)

- Fix del selector de estado del rol (envío de booleano en vez de string).
- Búsqueda en tiempo real en Usuarios.
- Selectores en cascada marca→modelo→año + búsqueda de moto en Configurador.
- Filtro por tipo (multi-select) en Configurador y Catálogo.

## Errores pendientes

- Algunos `catch` silenciosos en frontend sin feedback al usuario (DT-06).
- Funciones extensas en backend (`views.py`) y frontend (`Seguridad.jsx`) sin refactorizar (DT-02).

## Mejoras pendientes

- Exportación de reportes a CSV.
- Ampliación de pruebas frontend (cobertura actual: 13 tests).
- Lazy-load del motor de motion (GSAP + Lenis).

## Deudas técnicas identificadas

Ver `documentacion/deuda-tecnica.md`: DT-01 a DT-07.

## Deudas técnicas corregidas

- DT-01 parcial (patrón `useRef`-guard en 10 componentes).
- Fix del selector de estado del rol (booleano).
