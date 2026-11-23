# Documentación de MotoPreview — Corrección P0–P3

Índice de los documentos de esta entrega. Todo está en español.

| Documento | Contenido |
| --- | --- |
| [Hallazgos y correcciones](hallazgos-y-correcciones.md) | Resumen de las prioridades P0–P3 revisadas y qué se cambió en cada una, incluido un bug nuevo detectado por los tests de integración. |
| [Seguridad de la API](seguridad-api.md) | Rate limiting, verificación de correo con token firmado, límite de 72 bytes, permisos estrictos, privacidad de la tienda, HTTPS y secretos. |
| [Reglas de negocio](reglas-de-negocio.md) | Lógica movida a `services` (consultas, states, transiciones, cotizaciones, inventario) y orden determinista en listados. |
| [Pruebas automáticas](pruebas-automaticas.md) | Suite unitaria sin base de datos, tests de integración con PostgreSQL real (`RUN_DB_TESTS=1`) y su ejecución en CI/local. |
| [Comandos de mantenimiento](comandos-mantenimiento.md) | Rotación de secretos (`rotar_secretos`) y data-fix de verificación (`marcar_verificados`), más `asignar_rol` y `seed_demo`. |
| [Despliegue en Render](despliegue-en-render.md) | Pasos pendientes en el entorno de Render: rotar secretos, marcar verificados, HTTPS y nuevos comandos. |

## Resumen de la entrega

El backend de MotoPreview quedó con:

- **Rate limiting** real en autenticación (registro, login, recuperación y verificación).
- **Verificación de correo** con token JWT firmado y expirable (72 h), sin necesidad de guardar el hash en la base; compatibilidad con los enlaces viejos.
- **Login bloqueado** para cuentas con correo sin verificar (`403`).
- **Contraseñas limitadas a 72 bytes** (límite de bcrypt) en registro, reset y detalle de usuario.
- **Permisos estrictos** por defecto (`IsAuthenticated`) y validación real de la base de datos en cada endpoint leer/escribir.
- **Privacidad de tienda**: NIT/teléfono/email de la tienda solo visibles para admin/vendedor autenticados.
- **Orden determinista** en todos los listados (`order_by` con clave primaria).
- **Transiciones de estado** de cotización validadas contra una máquina de estados.
- **HTTPS opcional** por variables de entorno, lista para activar en Render.
- **Secretos rotados** y fuera del repositorio.
- **110 pruebas**: 98 unitarias (sin BD) + 12 de integración contra PostgreSQL real.