# Changelog

Todos los cambios importantes del proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).                                    
 
HEAD
## [v1.1.1] - 2026-11-23

### Fixed

- Validación de correo en formularios de registro e inicio de sesión
- Refactorización del hook useCargaInicial en componentes Dashboard y Accesorios

### Changed

- Lazy-loading implementado para Visor3D con React.lazy y Suspense
- Migración de patrones useEffect + useRef a hook reutilizable useCargaInicial

MINOR porque se agregan funcionalidades sin romper compatibilidad

## [v1.1.0] - 2026-11-23

## [v1.1.0] - 2026-11-24

6f0376cee2150cc8ab624ed584f082350381d38a

### Added

- Búsqueda en tiempo real en la tabla de Usuarios (por nombre, email o rol) con contador de resultados.
- Selectores en cascada marca → modelo → año en el Configurador.
- Barra de búsqueda de moto en el Configurador.
HEAD
- Filtro por tipo (multi-select) en el Catálogo y en el Configurador.

- Filtro por tipo (multi-select) en el Configurador y en el Catálogo.
6f0376cee2150cc8ab624ed584f082350381d38a
- Documentación de deuda técnica (`documentacion/deuda-tecnica.md`).
- Documentación de trazabilidad (`documentacion/trazabilidad.md`).
- `CONTRIBUTING.md` y `CHANGELOG.md`.

### Fixed

- Selector de estado del rol en Seguridad.jsx enviaba string (`"true"`/`"false"`) en vez de booleano; ahora envía un booleano real.
- Limpieza de imports no usados (`Layers`, `etiquetaMoto`, `FiltroCapa`, `TODAS`) en Configurador.jsx.

### Changed

- Catálogo: filtros unificados con clase `filtro-chip` del sistema; eliminado `catalog-hero` del catálogo dedicado.
- Configurador: filtro por tipo en lugar de categoría + tipo.

## [v1.0.0] - 2026-11-22

### Added

- RBAC completo: matriz de permisos (15 recursos × 6 acciones = 90 combos) editable solo por Superadmin; roles CRUD por Admin de tienda.
- Catálogo y configurador de accesorios para motocicletas con placeholder "FOTO PENDIENTE".
- Configurador 3D (lazy-loaded) de accesorios compatibles por modelo de moto.
- Dashboard con métricas por tienda y consolidado para Superadmin.
- Tema oscuro/claro con conmutador persistente.
 HEAD
- Marca con el logo del casco (modo oscuro: logo v2; modo claro: casco sobre chip blanco).

- Marca con logo del casco (modo oscuro: logo v2; modo claro: casco sobre chip blanco).
 6f0376cee2150cc8ab624ed584f082350381d38a
- Login con captcha (operación matemática).
- Sidebar categorizado en el panel de administración con iconos lucide.
- Pruebas: 235 backend (51 skipped), 13 frontend (Vitest), lint 0 errores, build OK.
