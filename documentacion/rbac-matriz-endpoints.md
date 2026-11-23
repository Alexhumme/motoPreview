# Matriz de endpoints (Fase 0 del plan RBAC)

Inventario de todas las rutas del backend con la política que las gobierna, una fila
por método HTTP. Es el documento que el plan pide antes de tocar la autorización: sin
él no se puede decir si una ruta quedó sin política ni si un scope tiene efecto real.

## Cómo se lee y cómo se regenera

Las dos primeras tablas no están escritas a mano: las produce el backend.

```bash
cd backend
python manage.py shell --no-imports -c \
  "exec(open('scripts/generar_matriz_endpoints.py', encoding='utf-8').read())"
```

El script ([backend/scripts/generar_matriz_endpoints.py](../backend/scripts/generar_matriz_endpoints.py))
cruza `_RUTAS_API` ([backend/motopreview/urls.py:36](../backend/motopreview/urls.py#L36))
con `operaciones_de_la_matriz()`, que barre las vistas de
[backend/api/views.py](../backend/api/views.py) y toma de cada una lo que ella declara:
`permiso_recurso`, `permiso_accion`, `permiso_detalle` y `lectura_sin_matriz`
([backend/api/views.py:471-482](../backend/api/views.py#L471-L482)). Si una ruta nueva se
protege con la matriz, aparece en la tabla sola; si se queda fuera, tiene que entrar a
la lista de justificaciones del script o el documento sale con `REVISAR`.

Tres columnas son verificables y una es criterio:

- **Recurso · acción**: lo que la vista declara. Nunca se deduce del rol que manda el
  frontend ni del JWT.
- **Autenticación**: `anónimo permitido` solo cuando la vista declara
  `lectura_sin_matriz = True` **y** ninguna de sus puertas exige sesión. `EscribirConPermiso`
  no exige sesión en lectura ([backend/api/security.py:533-541](../backend/api/security.py#L533-L541)).
- **Alcances concedibles**: los scopes que la matriz acepta para el recurso, los que
  devuelve `scopes_validos` ([backend/api/security.py:154](../backend/api/security.py#L154)).
  Un recurso sin columna de tienda solo admite `global`.
- **Filtrado de filas**: la columna de verdad. Si un recurso tiene dimensión de tienda
  pero la vista no pasa por `filtrar_por_scope`
  ([backend/api/views.py:193-219](../backend/api/views.py#L193-L219)), la concesión autoriza
  la operación y no acota ninguna fila; eso se dice, no se disimula.

## Operaciones gobernadas por la matriz

| Ruta | Método | Recurso · acción | Autenticación | Alcances concedibles | Filtrado de filas |
| --- | --- | --- | --- | --- | --- |
| `/api/categorias` | **GET** | `categorias` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias` | **POST** | `categorias` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias/<uuid:pk>` | **DELETE** | `categorias` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias/<uuid:pk>` | **GET** | `categorias` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias/<uuid:pk>` | **PATCH** | `categorias` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias/<uuid:pk>` | **PUT** | `categorias` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias-producto` | **GET** | `categorias` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias-producto` | **POST** | `categorias` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias-producto/<uuid:pk>` | **DELETE** | `categorias` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias-producto/<uuid:pk>` | **GET** | `categorias` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias-producto/<uuid:pk>` | **PATCH** | `categorias` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/categorias-producto/<uuid:pk>` | **PUT** | `categorias` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/compatibilidad` | **GET** | `compatibilidad` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/compatibilidad` | **POST** | `compatibilidad` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/compatibilidad/<uuid:pk>` | **DELETE** | `compatibilidad` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/compatibilidad/<uuid:pk>` | **GET** | `compatibilidad` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/compatibilidad/<uuid:pk>` | **PATCH** | `compatibilidad` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/compatibilidad/<uuid:pk>` | **PUT** | `compatibilidad` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/configuraciones` | **GET** | `configuraciones` · `listar` | sesión obligatoria | `global`, `tienda`, `propio` | `usuario__tienda` del dueño + `configuracion.usuario_id` |
| `/api/configuraciones/<uuid:pk>` | **GET** | `configuraciones` · `leer` | sesión obligatoria | `global`, `tienda`, `propio` | `usuario__tienda` del dueño + `configuracion.usuario_id` |
| `/api/cotizaciones` | **GET** | `cotizaciones` · `listar` | sesión obligatoria | `global`, `tienda`, `propio` | `cotizacion.id_tienda` + `cotizacion.id_usuario` |
| `/api/cotizaciones` | **POST** | `cotizaciones` · `crear` | sesión obligatoria | `global`, `tienda`, `propio` | `cotizacion.id_tienda` + `cotizacion.id_usuario` |
| `/api/cotizaciones/<uuid:pk>` | **GET** | `cotizaciones` · `leer` | sesión obligatoria | `global`, `tienda`, `propio` | `cotizacion.id_tienda` + `cotizacion.id_usuario` |
| `/api/cotizaciones/<uuid:pk>/historial` | **GET** | `cotizaciones` · `leer` | sesión obligatoria | `global`, `tienda`, `propio` | `cotizacion.id_tienda` + `cotizacion.id_usuario` |
| `/api/cotizaciones/<uuid:pk>/estado` | **PATCH** | `cotizaciones` · `actualizar` | sesión obligatoria | `global`, `tienda`, `propio` | `cotizacion.id_tienda` + `cotizacion.id_usuario` |
| `/api/cotizaciones/<uuid:pk>/estado` | **PUT** | `cotizaciones` · `actualizar` | sesión obligatoria | `global`, `tienda`, `propio` | `cotizacion.id_tienda` + `cotizacion.id_usuario` |
| `/api/inventario` | **GET** | `inventario` · `listar` | sesión obligatoria | `global`, `tienda` | `inventario.id_tienda` |
| `/api/inventario` | **POST** | `inventario` · `crear` | sesión obligatoria | `global`, `tienda` | `inventario.id_tienda` |
| `/api/inventario/<uuid:pk>` | **GET** | `inventario` · `leer` | sesión obligatoria | `global`, `tienda` | `inventario.id_tienda` |
| `/api/inventario/movimiento` | **POST** | `inventario` · `crear` | sesión obligatoria | `global`, `tienda` | `inventario.id_tienda` de la fila que recibe el asiento |
| `/api/tipos-movimiento` | **GET** | `inventario` · `listar` | sesión obligatoria | `global`, `tienda` | no acota: `inventario` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/tipos-movimiento` | **POST** | `inventario` · `crear` | sesión obligatoria | `global`, `tienda` | no acota: `inventario` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/tipos-movimiento/<uuid:pk>` | **DELETE** | `inventario` · `eliminar` | sesión obligatoria | `global`, `tienda` | no acota: `inventario` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/tipos-movimiento/<uuid:pk>` | **GET** | `inventario` · `leer` | sesión obligatoria | `global`, `tienda` | no acota: `inventario` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/tipos-movimiento/<uuid:pk>` | **PATCH** | `inventario` · `actualizar` | sesión obligatoria | `global`, `tienda` | no acota: `inventario` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/tipos-movimiento/<uuid:pk>` | **PUT** | `inventario` · `actualizar` | sesión obligatoria | `global`, `tienda` | no acota: `inventario` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/marcas` | **GET** | `marcas` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/marcas` | **POST** | `marcas` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/marcas/<uuid:pk>` | **DELETE** | `marcas` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/marcas/<uuid:pk>` | **GET** | `marcas` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/marcas/<uuid:pk>` | **PATCH** | `marcas` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/marcas/<uuid:pk>` | **PUT** | `marcas` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-moto` | **GET** | `modelos` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-moto` | **POST** | `modelos` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-moto/<uuid:pk>` | **DELETE** | `modelos` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-moto/<uuid:pk>` | **GET** | `modelos` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-moto/<uuid:pk>` | **PATCH** | `modelos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-moto/<uuid:pk>` | **PUT** | `modelos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-3d` | **GET** | `modelos3d` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-3d` | **POST** | `modelos3d` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-3d/<uuid:pk>` | **DELETE** | `modelos3d` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-3d/<uuid:pk>` | **GET** | `modelos3d` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-3d/<uuid:pk>` | **PATCH** | `modelos3d` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/modelos-3d/<uuid:pk>` | **PUT** | `modelos3d` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/motos` | **GET** | `motos` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/motos` | **POST** | `motos` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/motos/<uuid:pk>` | **DELETE** | `motos` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/motos/<uuid:pk>` | **GET** | `motos` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/motos/<uuid:pk>` | **PATCH** | `motos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/motos/<uuid:pk>` | **PUT** | `motos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/accesorios/<uuid:pk>` | **GET** | `productos` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/accesorios/<uuid:pk>` | **PUT** | `productos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/accesorios` | **GET** | `productos` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/accesorios` | **POST** | `productos` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/productos` | **GET** | `productos` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/productos` | **POST** | `productos` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/productos/<uuid:pk>` | **DELETE** | `productos` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/productos/<uuid:pk>` | **GET** | `productos` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/productos/<uuid:pk>` | **PATCH** | `productos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/productos/<uuid:pk>` | **PUT** | `productos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/roles` | **GET** | `roles` · `listar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/roles` | **POST** | `roles` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/roles/<uuid:pk>` | **DELETE** | `roles` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/roles/<uuid:pk>` | **GET** | `roles` · `leer` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/roles/<uuid:pk>` | **PATCH** | `roles` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/roles/<uuid:pk>` | **PUT** | `roles` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/tiendas` | **GET** | `tiendas` · `listar` | sesión obligatoria | `global`, `tienda` | `tienda.id_tienda` |
| `/api/tiendas` | **POST** | `tiendas` · `crear` | sesión obligatoria | `global`, `tienda` | `tienda.id_tienda` |
| `/api/tiendas/<uuid:pk>` | **DELETE** | `tiendas` · `eliminar` | sesión obligatoria | `global`, `tienda` | `tienda.id_tienda` |
| `/api/tiendas/<uuid:pk>` | **GET** | `tiendas` · `leer` | sesión obligatoria | `global`, `tienda` | `tienda.id_tienda` |
| `/api/tiendas/<uuid:pk>` | **PATCH** | `tiendas` · `actualizar` | sesión obligatoria | `global`, `tienda` | `tienda.id_tienda` |
| `/api/tiendas/<uuid:pk>` | **PUT** | `tiendas` · `actualizar` | sesión obligatoria | `global`, `tienda` | `tienda.id_tienda` |
| `/api/planes-suscripcion` | **GET** | `tiendas` · `listar` | sesión obligatoria | `global`, `tienda` | no acota: `tiendas` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/planes-suscripcion` | **POST** | `tiendas` · `crear` | sesión obligatoria | `global`, `tienda` | no acota: `tiendas` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/planes-suscripcion/<uuid:pk>` | **DELETE** | `tiendas` · `eliminar` | sesión obligatoria | `global`, `tienda` | no acota: `tiendas` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/planes-suscripcion/<uuid:pk>` | **GET** | `tiendas` · `leer` | sesión obligatoria | `global`, `tienda` | no acota: `tiendas` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/planes-suscripcion/<uuid:pk>` | **PATCH** | `tiendas` · `actualizar` | sesión obligatoria | `global`, `tienda` | no acota: `tiendas` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/planes-suscripcion/<uuid:pk>` | **PUT** | `tiendas` · `actualizar` | sesión obligatoria | `global`, `tienda` | no acota: `tiendas` tiene dimensión de tienda, pero la tabla de esta vista es catálogo global de ese área |
| `/api/tipos-accesorio` | **GET** | `tipos` · `listar` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/tipos-accesorio` | **POST** | `tipos` · `crear` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/tipos-accesorio/<uuid:pk>` | **DELETE** | `tipos` · `eliminar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/tipos-accesorio/<uuid:pk>` | **GET** | `tipos` · `leer` | anónimo permitido | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/tipos-accesorio/<uuid:pk>` | **PATCH** | `tipos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/tipos-accesorio/<uuid:pk>` | **PUT** | `tipos` · `actualizar` | sesión obligatoria | `global` | no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera |
| `/api/usuarios` | **GET** | `usuarios` · `listar` | sesión obligatoria | `global`, `tienda` | `usuario.id_tienda` |
| `/api/usuarios/<uuid:pk>` | **DELETE** | `usuarios` · `eliminar` | sesión obligatoria | `global`, `tienda` | `usuario.id_tienda` |
| `/api/usuarios/<uuid:pk>` | **GET** | `usuarios` · `leer` | sesión obligatoria | `global`, `tienda` | `usuario.id_tienda` |
| `/api/usuarios/<uuid:pk>` | **PATCH** | `usuarios` · `actualizar` | sesión obligatoria | `global`, `tienda` | `usuario.id_tienda` |
| `/api/usuarios/<uuid:pk>` | **PUT** | `usuarios` · `actualizar` | sesión obligatoria | `global`, `tienda` | `usuario.id_tienda` |
| `/api/reportes/resumen` | **GET** | `ventas` · `listar` | sesión obligatoria | `global`, `tienda` | agregados por `id_tienda`; la ruta no entrega filas |

100 operaciones (ruta × método) con recurso, acción y scope declarados en la propia vista; ninguna se autoriza por el rol que envía el frontend.

## Rutas fuera de la matriz

| Ruta | Método | Puerta actual | Por qué no la gobierna la matriz |
| --- | --- | --- | --- |
| `/api/health` | **GET** | AllowAny | estado del servicio; no entrega datos de negocio |
| `/api/healthz` | **GET** | AllowAny | estado del servicio; no entrega datos de negocio |
| `/api/auth/register` | **POST** | AllowAny | alta de cuentas: público solo cliente; el personal pide Admin autenticado y pasa por `puede_asignar_rol` (F4) |
| `/api/auth/login` | **GET** | AllowAny | emite la sesión; no autoriza una operación de negocio |
| `/api/auth/login` | **POST** | AllowAny | emite la sesión; no autoriza una operación de negocio |
| `/api/auth/logout` | **POST** | AllowAny | cierra la propia sesión |
| `/api/auth/perfil` | **GET** | IsAuthenticated | la propia cuenta del usuario autenticado |
| `/api/auth/verificar/<str:token>` | **GET** | AllowAny | activación de cuenta con el token recibido por correo |
| `/api/auth/forgot-password` | **POST** | AllowAny | recuperación de contraseña |
| `/api/auth/reset-password` | **POST** | AllowAny | recuperación de contraseña |
| `/api/modelos-3d/accesorio/<uuid:id_accesorio>` | **GET** | AllowAny | vidriera: visor 3D del accesorio, sin sesión |
| `/api/recursos` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recursos` | **POST** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recursos/<uuid:pk>` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recursos/<uuid:pk>` | **PUT** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recursos/<uuid:pk>` | **PATCH** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recursos/<uuid:pk>` | **DELETE** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/acciones` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/acciones` | **POST** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/acciones/<uuid:pk>` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/acciones/<uuid:pk>` | **PUT** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/acciones/<uuid:pk>` | **PATCH** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/acciones/<uuid:pk>` | **DELETE** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recurso-acciones` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recurso-acciones` | **POST** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recurso-acciones/<uuid:pk>` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recurso-acciones/<uuid:pk>` | **PUT** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recurso-acciones/<uuid:pk>` | **PATCH** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/recurso-acciones/<uuid:pk>` | **DELETE** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/rol-recursos` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/rol-recursos` | **POST** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/rol-recursos/<uuid:pk>` | **GET** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/rol-recursos/<uuid:pk>` | **PUT** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/rol-recursos/<uuid:pk>` | **PATCH** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/rol-recursos/<uuid:pk>` | **DELETE** | IsSuperAdmin | administración de la propia matriz (`IsSuperAdmin`) |
| `/api/roles/<uuid:pk>/permisos` | **PUT** | IsSuperAdmin | reasignar concesiones de un rol (`IsSuperAdmin`) |
| `/api/permisos/usuario` | **GET** | IsAuthenticated | el usuario lee sus propias concesiones (`IsAuthenticated`) |
| `/api/recursos-con-permisos` | **GET** | IsSuperAdmin | lectura de la matriz por rol (`IsSuperAdmin`) |
| `/api/compatibilidad/modelo/<uuid:id_modelo_moto>` | **GET** | AllowAny | vidriera: el configurador pide compatibilidad por modelo, sin sesión |
| `/api/compatibilidad/accesorio/<uuid:id_accesorio>` | **GET** | AllowAny | vidriera: el configurador pide compatibilidad por accesorio, sin sesión |

## Lecturas declaradas `lectura_sin_matriz = True`

Son las rutas donde la lectura **no** consulta la matriz. Cada una es una decisión tomada por ruta, no un default del framework.

| Vista | Rutas | Puerta real |
| --- | --- | --- |
| `AccesorioDetail` | `/api/accesorios/<uuid:pk>` | sin sesión (vidriera) |
| `AccesoriosCollection` | `/api/accesorios` | sin sesión (vidriera) |
| `AccessoryTypeCollection` | `/api/tipos-accesorio` | sin sesión (vidriera) |
| `AccessoryTypeDetail` | `/api/tipos-accesorio/<uuid:pk>` | sin sesión (vidriera) |
| `BrandCollection` | `/api/marcas` | sin sesión (vidriera) |
| `BrandDetail` | `/api/marcas/<uuid:pk>` | sin sesión (vidriera) |
| `CategoryCollection` | `/api/categorias` | sin sesión (vidriera) |
| `CategoryDetail` | `/api/categorias/<uuid:pk>` | sin sesión (vidriera) |
| `CompatibilityCollection` | `/api/compatibilidad` | sin sesión (vidriera) |
| `CompatibilityDetail` | `/api/compatibilidad/<uuid:pk>` | sin sesión (vidriera) |
| `Model3DCollection` | `/api/modelos-3d` | sin sesión (vidriera) |
| `Model3DDetail` | `/api/modelos-3d/<uuid:pk>` | sin sesión (vidriera) |
| `ModelCollection` | `/api/modelos-moto` | sin sesión (vidriera) |
| `ModelDetail` | `/api/modelos-moto/<uuid:pk>` | sin sesión (vidriera) |
| `MotorcycleCollection` | `/api/motos` | sin sesión (vidriera) |
| `MotorcycleDetail` | `/api/motos/<uuid:pk>` | sin sesión (vidriera) |
| `ProductCategoryCollection` | `/api/categorias-producto` | sin sesión (vidriera) |
| `ProductCategoryDetail` | `/api/categorias-producto/<uuid:pk>` | sin sesión (vidriera) |
| `ProductCollection` | `/api/productos` | sin sesión (vidriera) |
| `ProductDetail` | `/api/productos/<uuid:pk>` | sin sesión (vidriera) |
| `StoreCollection` | `/api/tiendas` | sesión obligatoria |
| `StoreDetail` | `/api/tiendas/<uuid:pk>` | sesión obligatoria |

## Avisos del generador

- Ninguno: toda vista con dimensión de tienda acota sus filas.

## Regla vigente y objetivo, por hallazgo

Los seis puntos que el lector del documento necesita para decidir, con su evidencia.

**1. El alta de personal no pasa por la matriz.** `/api/usuarios` solo define `GET`
([backend/api/views.py:764-789](../backend/api/views.py#L764-L789)): no hay
`usuarios:crear` consumido por ninguna ruta. Registrar una cuenta de tienda se hace por
`POST /api/auth/register`, que es pública y está acotada por F4 (cliente anónimo, o
Admin autenticado que pasa `puede_asignar_rol`,
[backend/api/views.py:1432-1448](../backend/api/views.py#L1432-L1448)).
*Vigente*: gobernar esa puerta por rol, no por celda de la matriz.
*Objetivo*: una `POST /api/usuarios` autorizada con `usuarios:crear` y la misma
restricción de rol; hasta entonces, la celda `usuarios:crear` no tiene efecto.

**2. `configuraciones` es lectura.** Las dos rutas de la tabla `configuracion` definen
solo `get` ([backend/api/views.py:1851-1876](../backend/api/views.py#L1851-L1876)) y ningún
servicio del frontend llama a `/api/configuraciones`. El filtrado por tienda está
resuelto y probado (`scope_configurations`,
[backend/api/views.py:293-308](../backend/api/views.py#L293-L308)), pero
`configuraciones:crear/actualizar/eliminar` son celdas que hoy no consume ninguna ruta.
*Objetivo*: declarar la escritura o dejar de concederlas, para que el panel no muestre
permisos sin efecto.

**3. `movimientos` no existe como recurso.** La semilla concede
`r.codigo IN ('inventario','movimientos')`
([documentacion/rbac_migration.sql:298-306](rbac_migration.sql#L298-L306)),
pero `movimientos` no está en la lista de recursos
([documentacion/rbac_migration.sql:184-200](rbac_migration.sql#L184-L200)):
el `INSERT ... SELECT` no falla, simplemente no inserta nada. El asiento de inventario
se autoriza con `inventario:crear` y acota por la tienda de la fila que lo recibe
([backend/api/views.py:1147-1168](../backend/api/views.py#L1147-L1168)).
*Objetivo*: crear el recurso `movimientos` con sus acciones si se quiere un permiso
distinto del de inventario, o quitar esa línea de la semilla.

**4. `ventas` es el recurso de los reportes y su `exportar` no tiene ruta.**
`/api/reportes/resumen` declara `permiso_recurso = "ventas"` con acción `listar`
([backend/api/views.py:2011-2018](../backend/api/views.py#L2011-L2018)); la semilla concede
a Vendedor `leer/listar/exportar` en scope `tienda`
([documentacion/rbac_migration.sql:328-336](rbac_migration.sql#L328-L336))
y a Admin todos los recursos en scope `global`
([documentacion/rbac_migration.sql:272-281](rbac_migration.sql#L272-L281)).
Ninguna vista consume la acción `exportar`, así que esa concesión no abre nada.
*Objetivo*: decidir si el resumen de tienda se expone (`ventas:exportar` con su ruta) o
si se retira la acción de la semilla.

**5. Dos catálogos usan el recurso de su área y no acotan filas.**
`/api/tipos-movimiento*` se gobierna con `inventario`
([backend/api/views.py:1819-1833](../backend/api/views.py#L1819-L1833)) y
`/api/planes-suscripcion*` con `tiendas`
([backend/api/views.py:1836-1848](../backend/api/views.py#L1836-L1848)). Sus tablas
(`movimiento_tipo`, `plan_suscripcion`) no tienen columna de tienda, así que no hay fila
que acotar: quien tiene `inventario:listar` ve todos los tipos de movimiento, que es lo
que son — catálogo global del área. *Vigente*: es correcto y queda documentado aquí.
*Objetivo*: si algún día cada tienda define sus tipos o sus planes, necesitan recurso
propio con dimensión de tienda; no se les puede añadir el filtro sin cambiar el esquema.

**6. `endpoint_base` de la tabla `recurso` es decorativa.** Solo se serializa para el
panel ([backend/api/serializers.py:572](../backend/api/serializers.py#L572) y
[:652](../backend/api/serializers.py#L652)); la autorización nunca la consulta. Por eso
`ventas` apunta a `/api/ventas` (ruta que no existe) y `tipos` a `/api/tipos` mientras la
ruta real es `/api/tipos-accesorio`. No afecta el permiseo, pero no debe leerse como
inventario de rutas: el inventario es este documento.

## Las lecturas sin matriz son decisiones, no defaults

El barrido de F7 congela la lista de vistas que leen sin consultar la matriz
([backend/api/test_rbac.py](../backend/api/test_rbac.py), `MatrizPermitirDenegarTests` y el
test que obliga a declarar `lectura_sin_matriz`). Son la vidriera: marcas, modelos,
motos, categorías, tipos, productos/accesorios, modelos 3D y compatibilidad, más las dos
vistas del configurador público y el visor 3D por accesorio.

`StoreCollection` y `StoreDetail` declaran `lectura_sin_matriz = True` **y** llevan
`IsAuthenticated & EscribirConPermiso`
([backend/api/views.py:721-753](../backend/api/views.py#L721-L753)). La ficha de una tienda
contiene NIT, dirección, teléfono y correo: no es material de vitrina y el anónimo no la
lee, porque la puerta exige sesión antes que la matriz. El `True` existe para otro caso:
el vendedor de esa tienda necesita su propia ficha en `/admin/tienda` y la semilla no le
concede `tiendas:leer`. *Decisión vigente*: sesión obligatoria + alcance de la propia
fila (`tienda.id_tienda`). *Objetivo*: si se prefiere gobernar por matriz, conceder
`tiendas:leer[tienda]` al rol Vendedor en la semilla y pasar `lectura_sin_matriz = False`;
es un cambio de concesión, no de código.

## Lo que la semilla concede y el esquema no expresa

F5 hace inertes las concesiones `tienda` sobre `productos`, `categorias`, `tipos` y
`movimientos` (tablas sin columna de tienda) y F6 rechaza reescribirlas: el panel
devuelve 400 en lugar de ampliarlas a `global`
([backend/api/security.py:171-196](../backend/api/security.py#L171-L196)). La corrección es
una decisión de privilegios — pasarlas a `global` o retirarlas — y **no se ejecutó nada
contra la base real**; el conteo de filas heredadas queda pendiente (bloqueo registrado
en [documentacion/rbac-implementation-log.md](rbac-implementation-log.md)).
