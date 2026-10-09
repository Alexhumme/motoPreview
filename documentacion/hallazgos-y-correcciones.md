# Hallazgos y correcciones (P0–P3)

Resumen de la revisión y de los cambios aplicados al backend. Los nombres de
prioridad **P0–P3** son los del encargo académico original.

## P0 — Vulnerabilidades críticas

| Hallazgo | Corrección |
| --- | --- |
| No había límite de peticiones en autenticación. | Rate limiting por alcance: registro `10/min`, login/recuperación `30/min`, verificación/recuperación `10/hour`; además `anon 600/min` y `user 1000/min` globales. Ver [seguridad-api.md](seguridad-api.md). |
| La fuerza bruta podía probar credenciales sin control. | El alcance `auth` limita a 30 intentos por minuto por IP/usuario. |
| Spam de registro de cuentas. | Alcance `register` limitado a 10/min. |
| Envío masivo de correos transaccionales. | Alcance `email` limitado a 10/hora. |

## P1 — Secretos y configuración

| Hallazgo | Corrección |
| --- | --- |
| `JWT_SECRET` y `DJANGO_SECRET_KEY` eran predecibles o estaban versionados. | Se rotaron en `backend/.env` con el comando `rotar_secretos` (ver [comandos-mantenimiento.md](comandos-mantenimiento.md)); `.env` ya no está bajo control de versiones. |
| Las claves de pruebas no alcanzaban 32 bytes y emitían `InsecureKeyLengthWarning`. | Claves de test de 32+ bytes en suites sin base de datos. |
| No había HTTPS en producción. | Variables de entorno `DJANGO_SECURE_SSL_REDIRECT`, `DJANGO_SESSION_COOKIE_SECURE`, `DJANGO_CSRF_COOKIE_SECURE`, `DJANGO_HSTS_*` (ver [seguridad-api.md](seguridad-api.md)). |

## P2 — Pruebas y reglas de negocio

| Hallazgo | Corrección |
| --- | --- |
| No había pruebas reales de servicios ni de integración. | `test_services.py` (23 pruebas puras) y `test_integracion.py` (12 flujos contra PostgreSQL real). Ver [pruebas-automaticas.md](pruebas-automaticas.md). |
| Verificación de correo: se probaba con mocks; además el hash se guardaba en la base. | Token firmado autocontenido (`tokens.py`), expira en 72 h y exige `iss`/`tipo`. El flujo completo se prueba en la BD real. |
| El login no exigía correo verificado. | El login devuelve `403` si la cuenta no está verificada; endpoint de verificación con soporte *legacy*. |
| Listados sin orden determinista. | `order_by` incluye siempre la clave primaria (ver [reglas-de-negocio.md](reglas-de-negocio.md)). |
| Transiciones de cotización sin validación. | Máquina de estados en `services.QUOTE_TRANSITIONS` y `allow_state_transition`. |
| Contraseñas de más de 72 bytes truncadas por bcrypt sin aviso. | `validar_password` rechaza todo lo que supere 72 bytes en registro, reset y detalle de usuario. |

## P3 — Código muerto y mantenimiento

| Hallazgo | Corrección |
| --- | --- |
| `parse_accept_language` duplicaba a `i18n.normalize`. | Eliminado (y su prueba asociada). |
| Guardas de base de datos colgantes (`return None` silencioso). | Sustituidas por `@require_database`, que responde `503` de forma consistente. |
| Mecanismo `filter_fields` sin uso real. | Eliminado. |
| `Decimal` importado en `views.py` sin uso tras refactor. | Importación eliminada. |
| Copia de `validar_password` en varias vistas. | Centralizada en `services.validar_password`. |

## Bug adicional detectado por los tests de integración

**Sombreado de modelos por vistas.** En `views.py` existían clases de vista
llamadas `InventoryMovement` y `QuoteDetail`, con el mismo nombre que los
modelos importados al inicio del módulo. Como las clases de vista se definen
después del `import`, cualquier referencia posterior a `InventoryMovement.objects`
o `QuoteDetail.objects` resolvía a la *vista* y reventaba con
`AttributeError: type object '...' has no attribute 'objects'`. Eso rompía la
creación de movimientos de inventario y de cotizaciones.

**Corrección:** las vistas se renombraron a `InventoryMovementView` y
`QuoteDetailView` (y su referencia en `motopreview/urls.py`), dejando los
nombres de los modelos intactos. Lo detectó `test_integracion.py`
(`QuoteFlowTests` y `InventoryFlowTests`).

**El endpoint de salud** ahora hace un probe real `SELECT 1` y responde `503`
si la base no está configurada o no conecta.