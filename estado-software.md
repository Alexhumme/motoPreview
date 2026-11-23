# Estado actual del software - MotoPreview

## Versión actual
v1.1.1

## Funcionalidades principales

### Catálogo y Carrito
- Visualización de accesorios y productos para motocicletas
- Carrito de compras con gestión de cantidades
- Filtros por categoría, tipo y marca

### Configurador 3D
- Visualizador de modelos 3D con lazy-loading
- Configuración de accesorios compatibles por modelo de moto
- Previsualización en tiempo real

### RBAC (Control de Accesos Basado en Roles)
- Matriz de permisos (15 recursos × 6 acciones = 90 combos)
- Roles: Superadmin, Admin de tienda, Vendedor
- Panel de permisos editables solo por Superadmin

### Dashboard y Reportes
- Métricas por tienda para Superadmin
- Resumen de ventas, pedidos pendientes, por cobrar
- Gráficos de estado de inventario

### Autenticación y Seguridad
- Registro de cuenta con validación de email
- Login con captcha matemático
- Recuperación y restablecimiento de contraseña
- Tema oscuro/claro persistente

### API REST
- Catálogo de productos y accesorios
- Gestión de inventario por tienda
- Sistema de cotizaciones y cotizaciones detalladas
- Endpoints RBAC y recursos protegidos

## Principales cambios realizados en esta actividad

1. **Validación de correo (BUG-01)**: Agregada validación regex en formularios de registro e inicio de sesión para evitar correos inválidos. Implementado en `Registro.jsx` y `Login.jsx`.

2. **Lazy-loading 3D (MEJORA-02)**: Implementado React.lazy y Suspense para el componente Visor3D, cargando three.js, gsap y lenis solo cuando se necesita. Reduce ~900KB del bundle inicial. Implementado en `Visualizador.jsx`.

3. **Refactoring de carga de datos (TÉCNICA-03)**: Creado hook personalizado `useCargaInicial` que encapsula el patrón `useEffect` + `useRef` guard + fetch + setState. Refactorizado componentes Accesorios y Dashboard para usar el nuevo hook, eliminando código duplicado.

4. **Arquitectura de ramas**: Establecido flujo de trabajo con ramas `main`, `feature/*`, `fix/*` y `refactor/*`. Todos los cambios realizados mediante ramas independientes y merge a main.

## Errores pendientes

- Pendiente: Configuración insegura potencial (DT-07) - CORS y secrets en .env local
- Pendiente: Dependencias pesadas adicionales no optimizadas
- Pendiente: Cobertura de tests en frontend (aún limitada)

## Mejoras pendientes

- Ampliar cobertura de tests en frontend con Testing Library
- Optimizar imágenes y assets del bundle
- Implementar restricciones CORS por entorno
- Auditar y mover secretos a gestión de variables de entorno segura
- Crear hook useCargaInicial para remaining components (Inventario, Usuarios, Tienda, etc.)

## Deudas técnicas identificadas (del diagnóstico)

| ID | Deuda | Estado |
|----|-------|--------|
| DT-01 | Código duplicado en efectos de carga | Parcial: hook useCargaInicial creado |
| DT-02 | Funciones extensas | En progreso: Dashboard refactorizado |
| DT-03 | Ausencia de pruebas en frontend | Pendiente: 13 tests Vitest existentes |
| DT-04 | Dependencias pesadas en bundle | Parcial: lazy-loading 3D implementado |
| DT-05 | Código obsoleto | Pendiente: modelos managed=False |
| DT-06 | Manejo inadecuado de errores | Parcial: validación de email añadida |
| DT-07 | Configuración insegura potencial | Pendiente: restricciones CORS |

## Deudas técnicas corregidas

- DT-01: Creado hook useCargaInicial reutilizable (Aplicado a Accesorios y Dashboard)
- DT-03: Validación de email implementada en formularios (Registro e Login)
- DT-04: Lazy-loading para Visor3D implementado (React.lazy + Suspense)
