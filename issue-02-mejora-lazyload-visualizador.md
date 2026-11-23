# Issue Mejora-02: Lazy-loading del motor de visualización 3D

## Descripción
El motor visualizador 3D carga `three.js`, `gsap` y `lenis` de forma estática en el bundle principal, lo que aumenta significativamente el tiempo de carga inicial de la aplicación (aprox. 972 KB adicionales en el chunk principal).

## Problema
- `three.js`, `gsap` y `lenis` se importan al inicio en `Visualizador.jsx`
- Esto afecta el Time-to-Interactive (TTI) de la aplicación
- La mayoría de los usuarios no acceden al visualizador 3D en la primera visita

## Solución propuesta
- Implementar lazy-loading dinámico para los módulos de visualización 3D
- Mover las importaciones a nivel de función en su lugar de nivel de módulo
- Usar `import()` dinámico de JavaScript para cargar `three.js` y sus dependencias bajo demanda
- Mantener el fallback mientras se carga el visualizador

## Prioridad
Media

## Responsable
Equipo de frontend

## Criterio de solución considerado solucionado
- El componente `Visualizador` ya no incluye `three.js`, `gsap` o `lenis` en el bundle inicial
- Al acceder por primera vez al visualizador, se carga el módulo dinámicamente
- El tiempo de carga inicial del bundle principal se reduce en aproximadamente 900 KB
- El visualizador funciona correctamente después del carga dinámica
- Se conservan los tests existentes para el visualizador

## Issue relacionado
Closes #02
