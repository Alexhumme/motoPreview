# Comandos de mantenimiento

Todos se ejecutan desde `backend/` con el entorno virtual activo:

```powershell
venv\Scripts\python.exe manage.py <comando> ...
```

## `rotar_secretos` — rotación de JWT_SECRET y DJANGO_SECRET_KEY

**Cuándo:** se llama una vez tras esta entrega porque los secretos eran
conocidos/poco seguros, y a partir de ahí cuando convenga rotar (compromiso,
cambio de personal, rotación periódica).

**Efecto:** al rotar `JWT_SECRET`, todos los JWT emitidos con la clave anterior
quedan inválidos de inmediato (los clientes vuelven a iniciar sesión). Los
tokens de verificación de correo pendientes también se invalidan.

```powershell
# Resumen sin escribir nada (muestra qué se sustituirá):
venv\Scripts\python.exe manage.py rotar_secretos

# Aplica la rotación al backend/.env:
venv\Scripts\python.exe manage.py rotar_secretos --aplicar

# Con más entropía (80 bytes por clave):
venv\Scripts\python.exe manage.py rotar_secretos --aplicar --longitud 80
```

Después de aplicarla **en local**, copia los mismos valores al entorno de
Render y reinicia el servicio (ver [despliegue-en-render.md](despliegue-en-render.md)).

El comando conserva el resto del `.env` y agrega las variables si no existían.
Está cubierto por pruebas en `api/test_comandos.py`.

## `marcar_verificados` — data-fix de verificación de correo

**Por qué existe:** el login ahora exige `email_verificado` (P2). Los usuarios
creados **antes** de esa política no tienen forma de recibir el enlace de
verificación, así que quedarían bloqueados fuera del sistema. Este comando los
habilita en bloque.

```powershell
# Marca a todos los usuarios cuyo correo NO esté verificado (localhost):
venv\Scripts\python.exe manage.py marcar_verificados

# Solo un rol (admin, vendedor, tienda=admin+vendedor, o un UUID):
venv\Scripts\python.exe manage.py marcar_verificados --rol tienda

# Contra la base remota de producción (Neon):
venv\Scripts\python.exe manage.py marcar_verificados --permitir-remoto
```

Imprime cuántos usuarios se marcaron. No toca a los que ya estaban verificados
y no cambia la política para registros nuevos (siguen exigiendo el enlace).

En la base real de MotoPreview se aplicó sobre 3 clientes pendientes.

## `asignar_rol` (existente)

Asigna roles (admin/vendedor/cliente) y lista quién tiene rol. Ver el docstring
del comando (`python manage.py asignar_rol --listar`).

## `seed_demo` (existente)

Genera datos de prueba `[DEMO]` para desarrollo. Se niega a escribir en una
base remota sin `--permitir-remoto`.

## Aviso sobre el superusuario

La cuenta `admin` del panel Django aún usa una contraseña temporal conocida.
**Debe cambiarse**:

```powershell
venv\Scripts\python.exe manage.py changepassword admin
```