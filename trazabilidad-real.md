# Trazabilidad de cambios

Este documento documenta el recorrido completo de dos cambios realizados durante el ejercicio.

## Cambio 1: BUG-01 - Validación de correo en formularios

### Issue
- **ID**: BUG-01
- **Título**: Validación incorrecta de correo en formularios
- **Descripción**: El formulario de registro y recuperación de contraseña no validan correctamente el formato del correo electrónico
- **Prioridad**: Alta
- **Archivo**: issue-01-bug-validacion-correo.md

### Rama
- **Nombre**: fix/email-validation
- **Origen**: Creada a partir de main (`git checkout -b fix/email-validation`)
- **Objetivo**: Implementar validación de formato de email en los formularios de registro e inicio de sesión

### Commit
- **Mensaje**: `fix: agregar validación de correo en formularios de registro e inicio de sesión`
- **Autor**: Equipo de desarrollo
- **Cambios**: 
  - Agregado `validarEmail` function con patrón regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Agregado estado `errorEmail` en Registro y Login componentes
  - Validación en `manejarSubmit` antes de enviar al backend
  - Mostrar mensaje de error claro cuando el formato es inválido
- **Archivos modificados**: 
  - `frontend/src/pages/auth/Registro.jsx` (+12 líneas)
  - `frontend/src/pages/auth/Login.jsx` (+10 líneas)

### Pull Request
- **Número**: PR #1 (primer PR en el repositorio)
- **Rama origen**: fix/email-validation
- **Rama destino**: main
- **Descripción**: "Fix: agregar validación de correo en formularios de registro e inicio de sesión
  - Agregada validación regex en ambos formularios
  - Mensajes de error claros para el usuario
  - Previene envío de correos inválidos"
- **Issue relacionado**: Closes #01
- **Revisores**: Equipo de desarrollo
- **Estado**: Merge completado

### Integración y Versión
- **Merge a main**: `git checkout main && git merge fix/email-validation`
- **Versión**: v1.1.1 (incremento MINOR por nuevas funcionalidades y correcciones)
- **Tag creado**: v1.1.1
- **Justificación del versionado**: Incremento MINOR por agregado de validación de correo (mejora de calidad) y lazy-loading (mejora de performance), ambos backwards-compatible

### Evidencia
El recorrido se demuestra mediante:
1. El commit `7beb39f` en la rama `fix/email-validation`
2. El merge a main actualizando el código
3. El tag v1.1.1 creado para la versión
4. El CHANGELOG.md actualizado con el registro del fix

---

## Cambio 2: Mejora-02 - Lazy-loading del motor de visualización 3D

### Issue
- **ID**: Mejora-02
- **Título**: Lazy-loading del motor de visualización 3D
- **Descripción**: El motor visualizador 3D carga three.js, gsap y lenis de forma estática en el bundle principal, aumentando el Time-to-Interactive
- **Prioridad**: Media
- **Archivo**: issue-02-mejora-lazyload-visualizador.md

### Rama
- **Nombre**: mejora/lazyload-visualizador
- **Origen**: Creada a partir de main (`git checkout -b mejora/lazyload-visualizador`)
- **Objetivo**: Implementar lazy-loading para el componente Visor3D y sus dependencias

### Commit
- **Mensaje**: `mejora: implementar lazy-loading para Visor3D con React.lazy y Suspense`
- **Autor**: Equipo de frontend
- **Cambios**:
  - Agregado `const Visor3DLazy = lazy(() => import('../../components/Visor3D'));`
  - Envuelto `<Visor3D>` en `<Suspense fallback={...}>`
  - Reduce el tamaño del bundle inicial al cargar tres.js, gsap, lenis bajo demanda
- **Archivos modificados**: 
  - `frontend/src/pages/public/Visualizador.jsx` (+6 líneas, -1 eliminación)

### Pull Request
- **Número**: PR #2 siguiente PR en el repositorio
- **Rama origen**: mejora/lazyload-visualizador
- **Rama destino**: main
- **Descripción**: "Mejora: implementar lazy-loading para Visor3D con React.lazy y Suspense
  - Componente Visor3D cargado dinámicamente
  - Fallback visual mientras se carga
  - Reduce ~900KB del bundle inicial"
- **Issue relacionado**: Closes #02
- **Revisores**: Equipo de frontend
- **Estado**: Merge completado

### Integración y Versión
- **Merge a main**: `git checkout main && git merge mejora/lazyload-visualizador`
- **Versión**: v1.1.1 (incluye ambos cambios: validación de correo y lazy-loading)
- **Tag creado**: v1.1.1
- **Justificación del versionado**: La versión v1.1.1 incluye tanto la corrección de validación de correo (BUG-01) como la mejora de lazy-loading (MEJORA-02), más las refactorizaciones técnicas. Se incrementa MINOR por las nuevas funcionalidades y mejoras de performance.

### Evidencia
El recorrido se demuestra mediante:
1. El commit `ae37c27` en la rama `mejora/lazyload-visualizador`
2. El merge a main actualizando el código
3. El tag v1.1.1 creado para la versión
4. El CHANGELOG.md actualizado con el registro de la mejora
