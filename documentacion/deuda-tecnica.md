# Diagnóstico de deuda técnica — MotoPreview

## Deudas técnicas identificadas

| ID | Deuda técnica | Impacto | Riesgo | Prioridad | Acción propuesta |
|---|---|---|---|---|---|
| DT-01 | Código duplicado en efectos de carga de datos (Accesorios, Inventario, Usuarios, Tienda, Tiendas, ResumenTienda, Cotizaciones, Dashboard, Reportes, Seguridad repiten el patrón `useEffect` + `useRef` guard + fetch + setState) | Medio | Medio | Media | Refactorizar con un hook reutilizable `useCargaInicial` |
| DT-02 | Funciones extensas: `backend/api/views.py` (2243 líneas) y `frontend/src/pages/Seguridad.jsx` (641 líneas) concentran demasiada lógica | Alto | Medio | Alta | Dividir en módulos/servicios más pequeños |
| DT-03 | Ausencia de pruebas en frontend: solo 13 tests (Vitest) frente a 235 en backend; sin tests de integración de UI | Alto | Alto | Alta | Ampliar cobertura con Vitest + Testing Library |
| DT-04 | Dependencias pesadas en el bundle principal: `three.js` (~972 KB en el chunk del Visualizador), `gsap` + `lenis` importados estáticamente | Medio | Medio | Media | Lazy-load del motor de motion y optimización de imágenes |
| DT-05 | Código obsoleto: modelos `AccessoryCategory`, `AccessoryType`, `AccessoryCompatibility` quedan como placeholders `managed=False`, y la vista `CompatibilityByModelo` sigue existiendo aunque la compatibilidad por categoría se retiró | Medio | Bajo | Baja | Eliminar modelos y endpoints obsoletos |
| DT-06 | Manejo inadecuado de errores: varios `catch` silenciosos (`console.error`/`console.warn`) sin feedback al usuario (ej. `obtenerPermisosUsuario` falla silenciosamente) | Medio | Medio | Media | Mostrar toast/alertas y registrar errores |
| DT-07 | Configuración insegura potencial: `CORS_ALLOW_ALL_ORIGINS` podría activarse en desarrollo y filtrarse a producción; secretos en `.env` local | Alto | Alto | Crítica | Restringir orígenes por entorno y auditar secretos |

## Deudas corregidas en esta versión (v1.1.0)

- DT-01 parcial: se aplicó el patrón `useRef`-guard en 10 componentes para evitar fetches duplicados en React StrictMode.
- Manejo de estado booleano en el selector de rol (Seguridad.jsx) corregido.

## Deudas pendientes

- DT-02, DT-03, DT-04, DT-05, DT-06, DT-07 (parcial).
