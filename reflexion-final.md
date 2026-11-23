# Reflexión final

## 1. ¿Cuál es actualmente la principal deuda técnica del proyecto?
La principal deuda técnica actual es la **DT-07: Configuración insegura potencial** (CORS_ALLOW_ALL_ORIGINS podría activarse en desarrollo y filtrarse a producción, junto con secretos almacenados en `.env` local). Aunque el `.env` no se versiona, el `.env.example` contiene placeholders y la configuración de CORS permite orígenes genéricos. Otro candidato fuerte es la **DT-02: Funciones extensas** donde `views.py` tiene 2243 líneas y `Seguridad.jsx` 641 líneas, concentran demasiada lógica que debería estar distribuida en módulos más pequeños.

## 2. ¿Qué riesgo representa no corregirla?
No corregir la configuración insegura (DT-07) representa un riesgo **Crítico** porque podría permitir el acceso no autorizado al API desde dominios no autorizados, exponiendo datos sensibles y funcionalidades del sistema. En el caso de DT-02, el riesgo es **Alto** debido a la dificultad de mantenimiento, la posible introducción de bugs al modificar secciones aisladas y el mayor superficie de error en producciones con tráfico elevado.

## 3. ¿Qué tipo de mantenimiento realizaron durante esta actividad?
Durante esta actividad realizamos los siguientes tipos de mantenimiento:
- **Correctivo**: Fix de validación de correo en formularios (BUG-01)
- **Mejora/Perfectivo**: Implementación de lazy-loading para Visualizador 3D (MEJORA-02), refactorización con hook useCargaInicial (TÉCNICA-03)
- ** preventivo**: Actualización de documentación, creación de issues y templates, establecimiento de convenciones de branches y commits

## 4. ¿Qué ventajas encontraron al trabajar con ramas?
Las ventajas de trabajar con ramas incluyen:
- Aislamiento de cambios: Cada feature o fix se desarrolla de forma independiente sin afectar la rama main
- Seguridad: Los commits en rama no rompen el main hasta que son revisados y aprobados
- Colaboración paralela: Múltiples desarrolladores pueden trabajar en features diferentes simultáneamente
- Revisión de código: Los Pull Requests forzamos revisiones antes del merge
- Historial limpio: Es más fácil rastrear qué cambio introdujo cada feature o fix
- Rollback sencillo: Si un cambio causa problemas, se puede revertir la rama sin afectar el historial principal

## 5. ¿Qué utilidad tuvieron los issues?
Los issues fueron extremadamente útiles porque:
- Proporcionaron una estructura clara para tracking del trabajo
- Forzaron la definición de criterios de aceptación antes de comenzar el desarrollo
- Facilitaron la priorización del trabajo (Alta, Media, Baja)
- Mejoraron la comunicación entre los miembros del equipo
- Permitieron cerrar el círculo completo: Issue → Rama → Commit → PR → Versión
- Servvieron como documentación viviente de qué se necesitaba resolver

## 6. ¿Cómo ayudan los commits a comprender la evolución del software?
Los commits con mensajes convencionales (feat:, fix:, refactor:, etc.) ayudan porque:
- Permiten filtrar y buscar por tipo de cambio (solo bug fixes, solo nuevas features, etc.)
- Proporcionan un historial lineal y comprensible de los cambios
- Facilitan la generación automática de changelogs (como el que mantenemos en CHANGELOG.md)
- Hacen el `git blame` más útil al saber el tipo de cambio que introdujo una línea
- Ayonan el onboarding de nuevos desarrolladores que pueden entender la evolución rápidamente
- Soportan la filosofía "commits are the first-class citizens" del historial del proyecto

## 7. ¿Qué utilidad tienen los tags y las versiones?
Los tags y versiones tienen la siguiente utilidad:
- **Tags** (v1.1.1, v1.0.0, etc.): Marcan puntos específicos en la historia del repositorio, usualmente releases producidos. Permiten checkout a versiones específicas (`git checkout v1.1.1`) y son la base para el desplegamiento a producción.
- **Versionado semántico**: Ayuda a los desarrolladores y usuarios a entender el impacto de actualizar:
  - MAJOR: Cambios que rompen compatibilidad
  - MINOR: Nuevas funcionalidades backwards-compatible
  - PATCH: Correcciones de bugs backwards-compatible
- **Deployments**: Los tags suelen correlacionarse con releases desplegados a producción (Render, Vercel, etc.)

## 8. ¿Qué podría suceder si varios desarrolladores modificaran el proyecto sin utilizar control de versiones?
Si varios desarrolladores modificaran el proyecto sin control de versiones:
- **Conflictos de archivos**: Múltiples personas editando el mismo archivo simultáneamente provocaría sobrescrituras de trabajo
- **Pérdida de trabajo**: Los commits no guardados o archivos locales dañados podrían causar pérdida de código
- **Sin historial claro**: No habría forma de rastrear qué cambio causó un bug o cuándo se introdujo
- **Imposible rollback**: Un cambio que rompa la producción no podría deshacerse de manera segura
- **Conflictos de dependencias**: Las versiones de dependencias (npm, pip) se volverían inconsistentes
- **Integración difícil**: Unir años de trabajo sería extremadamente doloroso y propenso a errores
- **Falta de auditoría**: No habría rastreo de quién hizo qué cambio y cuándo

## 8. ¿Consideran que otro desarrollador podría continuar trabajando fácilmente sobre su proyecto? Justifiquen.
Sí,consideramos que otro desarrollador podría continuar trabajando sobre el proyecto con relativa facilidad, siempre y cuando:
- Conozca la pila tecnológica (React + Vite frontend, Django REST Framework backend, PostgreSQL)
- Siga las convenciones establecidas en CONTRIBUTING.md (nombres de ramas, commits convencionales, proceso PR)
- Tenga acceso a la documentación actualizada (README.md, CHANGELOG.md, documentación técnica en `documentacion/`)
- Entienda el flujo de trabajo: branch → commit → PR → merge → tag
- Los commits descriptivos y la estructura de ramas facilitan la incorporación de nuevo código
- El hook useCargaInicial y otros patrones consistentes reducen la curva de aprendizaje
- **Limitaciones**: El conocimiento del negocio específico y la arquitectura RBAC del proyecto requeriría tiempo de adaptación, pero la estructura técnica es coherente y bien documentada.

## 9. ¿Qué aspecto del proyecto debería ser el siguiente en mantenerse o mejorarse?
El siguiente aspecto crítico en mantenerse y mejorar es **la seguridad de la configuración** (DT-07), específicamente:
- Restringir CORS_ORIGINS por entorno (desarrollo vs producción)
- Migrar secretos a un gestor de variables de entorno seguro (GitHub Secrets, Render env vars, etc.)
- Implementar validación adicional en el backend para los orígenes permitidos
- También esPrioritario **ampliar la cobertura de tests** en frontend, particularmente tests de integración de UI con Testing Library, para reducir la deuda DT-03.

---
*Entregable: Repositorio actualizado con evidencia de todas las partes completadas.*
