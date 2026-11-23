# Seguridad de la API

## Rate limiting

Configurado en `REST_FRAMEWORK.DEFAULT_THROTTLE_RATES` (`motopreview/settings.py`):

| Alcance | Límite | Endpoints |
| --- | --- | --- |
| `anon` | 600 peticiones/min | Todos los endpoints sin sesión |
| `user` | 1000 peticiones/min | Todos los endpoints autenticados |
| `register` | 10 peticiones/min | `POST /api/auth/register` |
| `auth` | 30 peticiones/min | `POST /api/auth/login`, `POST /api/auth/reset-password` |
| `email` | 10 peticiones/hora | `GET /api/auth/verificar/…`, `POST /api/auth/forgot-password` |

El throttling se comprueba **antes** de tocar la base de datos, así que un
atacante no puede agotar conexiones ni regresar `503`s para degradar el
servicio. El límite del alcance `register` se verifica con
`RateLimitTests.test_register_agota_su_cuota_y_responde_429`.

Los límites por alcance se aplican solo a esos endpoints mediante
`@throttle_classes([ScopedRateThrottle])` + `@throttle_scope(...)`.

## Verificación de correo

- El registro crea una cuenta con `email_verificado=False` y responde `201`.
- El login devuelve `403` ("Debes verificar tu correo antes de iniciar sesión.")
  mientras la cuenta no esté verificada.
- El enlace de verificación es un **JWT firmado y autocontenido**
  (`api/tokens.py`) con `exp` (72 h), `iss`, `tipo` e `id_usuario`. No se
  guarda nada en la base.
- `GET /api/auth/verificar/<token>` valida firma, emisor y expiración; si el
  token es inválido responde `400` ("El enlace de verificación es inválido o ya
  fue usado.").
- **Compatibilidad legacy**: si el endpoint recibe un token que coincide con la
  columna `verificacion_token` del usuario (mecanismo anterior), también lo
  verifica y limpia la columna.
- `verification_token_for`/`parse_verification_token` tienen pruebas
  unitarias (round-trip, expirado, emisor equivocado, manipulado) y el flujo
  completo se prueba contra PostgreSQL real en `AuthFlowTests`.

## Contraseñas

- Mínimo 8 caracteres y máximo **72 bytes** (límite de bcrypt). Se valida en
  `services.validar_password` y se aplica en `register`, `reset_password` y
  `UserDetail` (cambio de contraseña).
- Los hashes se generan con bcrypt (rounds=12).

## Permisos estrictos

- `DEFAULT_PERMISSION_CLASSES = IsAuthenticated`: nada es público por defecto.
- `IsStoreStaff` (admin/vendedor) e `IsStoreAdmin` (solo admin).
- El registro y las verificaciones usan `AllowAny` de forma explícita.
- Todas las operaciones leer/escribir pasan por `@require_database`, que
  responde `503` de forma consistente si la base no está configurada o no
  conecta.

## Privacidad de la tienda

`nit`, `telefono_tienda` y `email_tienda` de una tienda solo aparecen en las
respuestas cuando el usuario autenticado tiene rol admin/vendedor
(`StoreSerializer.to_representation` usando `services.permite_datos_contacto`).
La API pública de tiendas los oculta. Ver la prueba
`test_services.permite_datos_contacto`.

## HTTPS (activación opcional)

Variable | Efecto
--- | ---
`DJANGO_SECURE_SSL_REDIRECT=true` | Redirige HTTP → HTTPS
`DJANGO_SESSION_COOKIE_SECURE=true` | Cookie de sesión solo por HTTPS
`DJANGO_CSRF_COOKIE_SECURE=true` | Cookie CSRF solo por HTTPS
`DJANGO_HSTS_SECONDS=31536000` | HSTS por un año
`DJANGO_HSTS_INCLUDE_SUBDOMAINS=true` | HSTS incluye subdominios
`DJANGO_HSTS_PRELOAD=true` | Apto para preload de HSTS

Recomendado activarlas en Render (ver [despliegue-en-render.md](despliegue-en-render.md)).

## Secretos

- `JWT_SECRET` firma los JWT de sesión y los tokens de verificación de correo.
- `DJANGO_SECRET_KEY` es el secreto de Django.
- Ambos se rotan con `python manage.py rotar_secretos --aplicar`
  (ver [comandos-mantenimiento.md](comandos-mantenimiento.md)).
- `.env` quedó **fuera del repositorio** (el archivo se marcó como borrado en
  git pero sigue en disco). OJO: las versiones antiguas del `.env` con claves
  previas siguen en el historial del git; para eliminarlas del historial hace
  falta una reescritura de historial deliberada (fuera del alcance de esta
  entrega).