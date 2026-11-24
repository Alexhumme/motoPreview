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

## Cambio 2: Búsqueda y selectores en la aplicación (feature/busqueda-usuarios)

### Issue
- **ID**: BUG-02 / Mejora-02
- **Título**: Búsqueda y selectores en la aplicación
- **Descripción**: Implementar búsqueda en tiempo real en la tabla de usuarios y selectores en cascada (marca → modelo → año) en el configurador
- **Prioridad**: Alta
- **Archivo**: issue-02-mejora-lazyload-visualizador.md (título y contenido actualizados)

### Rama
- **Nombre**: feature/busqueda-usuarios
- **Origen**: Creada a partir de main (`git checkout -b feature/busqueda-usuarios`)
- **Objetivo**: Implementar búsqueda en tiempo real y selectores en cascada para la selección de motocicletas

### Commit
- **Mensaje**: `feat: implementar búsqueda y selectores en cascada a la aplicación`
- **Autor**: Equipo de desarrollo
- **Cambios**: 
  - Actualizada validación de búsqueda en tabla de usuarios
  - Implementados selectores en cascada marca → modelo → año en Configurador
  - Agregada barra de búsqueda de moto en Configurador
  - Implementado filtro por tipo (multi-select) en Catálogo y Configurador
- **Archivos modificados**: 
  - `CHANGELOG.md` (registro de v1.1.0)
  - `README.md` (actualización de credenciales)
  - `issue-02-mejora-lazyload-visualizador.md` (título y criterio de aceptación)

### Pull Request
- **Número**: PR #5
- **Rama origen**: feature/busqueda-usuarios
- **Rama destino**: main
- **Descripción**: "Feat: implementar búsqueda y selectores en cascada a la aplicación
  - Búsqueda en tiempo real en tabla de usuarios con contador
  - Selectores en cascada marca → modelo → año en configurador
  - Barra de búsqueda de moto en configurador
  - Filtro por tipo (multi-select) en catálogo y configurador"
- **Issue relacionado**: Closes #02
- **Revisores**: Equipo de desarrollo
- **Estado**: Merge completado con estrategia ort (no fast-forward)

### Integración y Versión
- **Merge a main**: `git checkout main && git merge --no-ff feature/busqueda-usuarios -m "PR #5: feat: implementar búsqueda y selectores en cascada"`
- **Versión**: v1.1.1 (incremento MINOR por nuevas funcionalidades sin romper compatibilidad)
- **Tag creado**: v1.1.1
- **Justificación del versionado**: MINOR porque se agregan funcionalidades nuevas (búsqueda y selectores) sin romper compatibilidad con versiones anteriores. Incremento menor según Semantic Versioning.

### Evidencia
El recorrido se demuestra mediante:
1. El commit `59d4870` en la rama `feature/busqueda-usuarios`
2. El merge a main con estrategia no fast-forward actualizando el código
3. El tag v1.1.1 creado para la versión
4. El CHANGELOG.md actualizado con el registro de la mejora
