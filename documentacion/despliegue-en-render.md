# Despliegue en Render — pasos pendientes

El código ya está listo; quedan acciones manuales en Render (por eso no se
aplicaron desde este entorno).

## 1. Activar HTTPS

En **Render → Dashboard → tu servicio backend → Environment**, agregar:

```text
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true
DJANGO_HSTS_SECONDS=31536000
DJANGO_HSTS_INCLUDE_SUBDOMAINS=true
DJANGO_HSTS_PRELOAD=true
```

> Render ya termina el TLS; con `DJANGO_SECURE_SSL_REDIRECT=true` el redireccionado es doble (seguro, no rompe nada). Si el servicio ya está solo en HTTPS se puede omitir el redirect.

## 2. Rotar los secretos

Los valores de `JWT_SECRET` y `DJANGO_SECRET_KEY` en Render deben coincidir con
los nuevos `backend/.env` (generados con `rotar_secretos --aplicar`):

1. Ejecuta `python manage.py rotar_secretos --aplicar` en local y copia los
   valores impresos (o mira `backend/.env`).
2. En Render, actualiza `JWT_SECRET` y `DJANGO_SECRET_KEY` con esos valores.
3. Reinicia el servicio.
4. Todos los clientes deberán volver a iniciar sesión (efecto esperado).

## 3. Marcar verificados a los usuarios existentes (ya aplicado en Neon)

Para no bloquear a los usuarios creados antes de la política de verificación:

```powershell
python manage.py marcar_verificados --permitir-remoto
```

Desde la caja de trabajo ya se ejecutó contra la base real de Neon
(3 clientes marcados). Si Render usa otra base, repetirlo ahí. Los registros
nuevos siguen exigiendo verificar su correo.

## 4. Base de datos y esquema

- Los modelos de negocio son `managed=False`: **no hay migraciones** de negocio.
  El esquema ya existe en Neon. Solo aplicar migraciones Django (`migrate`).
- Para operaciones DDL desde una consola (p. ej. crear la base de prueba de
  integración) usa el **host directo** de Neon (sin `-pooler`); el pooler no
  permite `CREATE/DROP DATABASE` y mantiene sesiones que impiden el `DROP`.

## 5. Verificación del despliegue

```bash
curl https://<tu-backend>.onrender.com/api/health
```

Responde `200` con `"ok": true, "database_connected": true` si la base conecta,
o `503` con `"ok": false` si no.

## 6. Contraseña del superusuario

En local y contra la base:

```powershell
python manage.py changepassword admin
```

Usa una contraseña fuerte que no sea la temporal conocida.

## 7. Pruebas automáticas en Render/CI

- **CI**: corre las 98 unitarias sin base de datos (configuración ya en
  `.github/workflows/ci.yml`).
- **Integración (opcional)**: requiere la URL directa de Neon con permisos de
  creación de bases:
  ```powershell
  $env:RUN_DB_TESTS = "1"
  python manage.py test api.test_integracion --keepdb -v 2
  ```
  Ver [pruebas-automaticas.md](pruebas-automaticas.md).