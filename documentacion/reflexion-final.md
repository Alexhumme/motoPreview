# Reflexión final — MotoPreview (Semana 15)

## ¿Cuál es actualmente la principal deuda técnica del proyecto?

La principal deuda técnica es el código duplicado en los efectos de carga de datos del panel de administración (DT-01) y las funciones extensas en `views.py` (2243 líneas) y `Seguridad.jsx` (641 líneas) (DT-02). Ambas dificultan el mantenimiento y aumentan el riesgo de regresiones.

## ¿Qué riesgo representa no corregirla?

Un cambio en la lógica de carga o en la matriz de permisos obliga a editar múltiples archivos casi idénticos, con alto riesgo de inconsistencias y bugs silenciosos. Las funciones extensas son difíciles de probar y de revisar, lo que ralentiza la incorporación de nuevos desarrolladores.

## ¿Qué tipo de mantenimiento realizaron durante esta actividad?

Mantenimiento correctivo (fix del selector de estado del rol) y perfectivo (búsqueda en Usuarios, selectores en cascada en el Configurador). También se realizó mantenimiento preventivo al documentar la deuda técnica y establecer convenciones de contribución.

## ¿Qué ventajas encontraron al trabajar con ramas?

Las ramas permiten aislar cambios, experimentar sin afectar `main`, y revertir de forma segura. Facilitan la revisión por pares mediante Pull Requests y mantienen la rama principal siempre estable y desplegable.

## ¿Qué utilidad tuvieron los issues?

Los issues permiten registrar bugs, mejoras y deudas técnicas con prioridad y responsable, y sirven como punto de partida para las ramas y los commits. Dan trazabilidad entre el problema y la solución.

## ¿Cómo ayudan los commits a comprender la evolución del software?

Los commits con mensajes descriptivos (Conventional Commits) permiten reconstruir la historia del proyecto, entender qué cambió y por qué, y facilitan la localización de regresiones mediante `git bisect` o `git log`.

## ¿Qué utilidad tienen los tags y las versiones?

Los tags marcan puntos estables del historial (releases) que pueden desplegarse o revertirse con facilidad. Las versiones (SemVer) comunican el impacto del cambio (MAJOR/MINOR/PATCH) a usuarios y desarrolladores.

## ¿Qué podría suceder si varios desarrolladores modificaran el proyecto sin utilizar control de versiones?

Se perderían cambios, se sobrescribirían archivos, sería imposible reconstruir la historia o revertir errores, y la coordinación del equipo se volvería caótica, con alto riesgo de perder trabajo.

## ¿Consideran que otro desarrollador podría continuar trabajando fácilmente sobre su proyecto? Justifiquen.

Sí, en gran medida: el proyecto cuenta con README actualizado, CONTRIBUTING con convenciones, CHANGELOG, documentación técnica en `documentacion/`, pruebas automatizadas y estructura clara de ramas. Sin embargo, la deuda técnica (funciones extensas, código duplicado) y la cobertura de pruebas frontend baja aún dificultan el onboarding completo.

## ¿Qué aspecto del proyecto debería ser el siguiente en mantenerse o mejorarse?

El siguiente paso debería ser la reducción de la deuda técnica DT-02 (dividir `views.py` y `Seguridad.jsx`) y DT-03 (ampliar las pruebas del frontend), junto con la eliminación del código obsoleto (DT-05).
