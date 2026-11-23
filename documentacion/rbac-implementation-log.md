# Registro de implementación RBAC

Responsable: agente Qoder. Fecha de inicio: 2026-10-29.

## Estado del plan

`plan-rbac-completo.md` **no estaba accesible** al empezar (la ruta adjunta
`C:\Users\elkin aguas\Downloads\plan-rbac-completo.md` no existía en disco y no había
ningún `plan*` en el repositorio). Las fases F1 a F5 se ejecutaron sobre los criterios
entregados por el responsable en la solicitud y sobre la auditoría del código actual.

**El plan llegó el 2026-10-31**, antes de F6. Se re-verificaron las fases hechas y el
contrato coincide con lo implementado: denegar por defecto (regla 1), OR de roles sin
reglas de denegación (regla 2), acciones explícitas por método y por subruta (regla 3),
el mismo scope al autorizar y al filtrar (regla 4), Superadmin reservado (regla 6) y
lecturas públicas deliberadas (regla 7).

Dos puntos del plan sí cambiaron decisiones que estaban abiertas:

- **Regla 5** («si el recurso no tiene una dimensión real de tienda o propietario,
  rechazar una concesión `tienda`/`propio`; nunca convertirla en acceso global») fija
  el criterio de F6: rechazo explícito, no normalización benigna. Era justo la
  alternativa que quedaba por decidir.
- **Fase 3** pide exactamente un scope por combinación `rol + recurso_accion`. F5
  dejaba pasar dos filas del mismo par (la autorización las une), así que F6 lo cierra
  en la escritura.

**Fase 0, entregable aparte de las fases, quedó hecha el 2026-10-31** con
`documentacion/rbac-matriz-endpoints.md` (una fila por método HTTP, generada desde el
código con `backend/scripts/generar_matriz_endpoints.py`). Su registro está al final de
este documento, en «Fase 0 del plan — matriz de endpoints».

Estado: **F1 a F7 completadas y Fase 0 entregada**, cada una con su barrido de pruebas
sin base de datos (234 pruebas, 50 omitidas por falta de PostgreSQL en CI). Lo que
sigue abierto son decisiones de datos y de documentación, no de autorización: se listan
en «Pendientes al cerrar F7».

Criterios aplicados como especificación: denegar por defecto; la matriz del backend
es la autoridad; múltiples roles con OR; roles y usuarios inactivos no autorizan;
Superadmin no se autopercibe desde fuera; sin credenciales fijas; migrar todas las
rutas; los scopes se aplican al autorizar **y** al filtrar; concesiones normalizadas
y validadas antes de reemplazar; nada destructivo ni pruebas contra producción.

## Cambios ajenos respetados

El árbol de trabajo tenía cambios que no son de esta tarea y se conservaron sin
commitear: `frontend/src/pages/Seguridad.jsx` (ajuste de diseño traído del commit
`eb1f551`), tres PNG raíz eliminadas y `frontend/src/assets/motopreview_icono.png`
sin trackear.

## Auditoría verificada (antes de tocar nada)

Núcleo actual en `backend/api/security.py`:

- `get_recurso_from_view` (:23-39) solo lee `permiso_recurso`; si falta, loguea
  WARNING y devuelve un valor falsy — la denegación la hace el llamador.
- `get_accion_from_method` (:42-51) mapea duro GET→listar, POST→crear, PUT/PATCH→
  actualizar, DELETE→eliminar; cualquier otro método (HEAD, OPTIONS) cae en `"leer"`,
  una acción que no coincide con la de GET. No usa `Accion.metodo_http` (:models 313).
- `usuario_tiene_permiso` (:64-104): anónimo denegado (:70); Superadmin bypass total
  (:74-75); sin roles denegado (:77); **`scopes_validos` siempre incluye `global`**
  (:82) sin consultar `RecursoAccion.requiere_scope` (:models 342, decorativo hoy);
  `tienda` y `propio` se añaden comparando contra el **llamador** (:85-93), y el único
  llamador (`HasPermiso.has_permission` :118-129) pasa `request.user.id_tienda` /
  `request.user.id_usuario`, es decir compara al usuario consigo mismo. El scope de la
  fila objetivo nunca entra en la decisión; depende al 100 % del queryset de la vista.
- No se comprueba `estado_usuario` del usuario ni `activo` del rol en el camino de
  autorización (el filtro de `RolRecurso` sí exige `activo=True` en la concesión).
- `EscribirConPermiso` (:132-145) devuelve `True` para GET/HEAD/OPTIONS sin autenticar:
  la lectura es irrestricta en todas las colecciones genéricas.

Rutas que **no** pasan por la matriz (gobernadas solo por rol o abiertas): inventario
(:912, :983, :1005 `IsStoreStaff`), cotizaciones (:1073, :1155, :1683 `IsAuthenticated`),
estado de cotización (:1174), configuraciones (:1664, :1672), reportes/resumen (:1813),
compatibilidad (:800-802 y :886 `AllowAny`), accesorios (:1559-1561, :1595-1597),
tipos de movimiento (:1640, reusa recurso `inventario` sobre un catálogo global),
planes de suscripción (:1653, reusa recurso `tiendas`), roles (:574, lectura anónima).

Agujeros concretos verificados en código:

| # | Dónde | Riesgo |
|---|---|---|
| A | `views.py:213` + `:1099` + `serializers.py:521-525` | Un usuario sin tienda adscribe su cotización a **cualquier** tienda activa (`user.id_tienda or id_tienda_del_body`). |
| B | `views.py:1277` | Registro público acepta `id_tienda` del body. |
| C | `views.py:713,718,734-735` | `PUT /api/usuarios/<id>` reasigna `id_rol` sin guard: un admin de tienda con `usuarios:actualizar` se asciende a Superadmin, y el bypass de `security.py:74-75` le da acceso total. |
| D | `views.py:452-453` aplicado a `tipos-movimiento/<pk>`, `planes-suscripcion/<pk>`, `DELETE /api/roles/<pk>` | Filas globales mutables con scope `global` aceptado incondicionalmente. |
| E | `views.py:800-802`, `:1595-1597` | Admin de cualquier tienda escribe matrices globales sin pasar por la matriz. |
| F | `RolePermisosBulkUpdateView` `views.py:2001-2063` | Borra y recrea las concesiones sin validar antes; puede reescribir los permisos del rol Superadmin. |

Filtrado por tienda **correcto** hoy (no hay brecha, se conserva): inventario :921/:993,
movimientos :1024, cotizaciones :1081, estado :1201, historial :1688, configuraciones
:231-236, tiendas :623-629/:639-645, usuarios :667, y `?id_tienda=` restringido a
superadmin en :659 y :1819.

Credenciales fijas encontradas:

| Dónde | Qué |
|---|---|
| `README.md:37` | Usuario y contraseña reales del panel de administración. |
| `frontend/README.md:7` | Contraseña demo del superadmin. |
| `backend/scripts/verificar_rbac.ps1:7` | La misma contraseña demo en un script. |
| `backend/scripts/sembrar_superadmin.py:19` | Contraseña demo como constante; en `:54` **restablece** la contraseña de un superadmin existente a la demo. |

Migraciones: `DatabaseModel` es `managed=False` (:models 10-13) salvo `Recurso` (:301),
`Accion` (:320), `RecursoAccion` (:349) y `RolRecurso` (:390), que son `managed=True`
para tests mientras producción se aplica con `documentacion/rbac_migration.sql`.
Existen `0001_initial`, `0003`, `0004`, `0005`, `0006` (falta `0002`, hueco en la
secuencia). No se ejecutó `migrate` ni SQL contra ninguna base: el estado aplicado en
Neon no se verificó y se reporta como pendiente.

Pruebas: runner `backend/motopreview/test_runner.py` (`NoDbTestRunner`) salta los casos
que piden base salvo `RUN_DB_TESTS=1`. Suite actual: 149 encontradas, sin base corren
99 y se saltan 50.

## Fases

### F1 — credenciales fijas fuera del repo (completada)

Cambios:

| Archivo | Qué cambió |
|---|---|
| `README.md:37` | La fila del panel ya no publica usuario ni contraseña; remite a `python manage.py createsuperuser`. |
| `frontend/README.md:6-7` | Borrado el bloque con el correo y la contraseña demo. |
| `backend/scripts/verificar_rbac.ps1` | Lee `MOTOPREVIEW_ADMIN_EMAIL` / `MOTOPREVIEW_ADMIN_PASSWORD`; si faltan, pide `Get-Credential`. Se quitó además el `Write-Host` que imprimía los primeros 20 caracteres del token JWT (era una sesión válida en consola). |
| `backend/scripts/sembrar_superadmin.py` | La contraseña sale de `MOTOPREVIEW_SUPERADMIN_PASSWORD` o de `getpass`, y se valida con `api.services.validar_password`. El correo se puede fijar con `MOTOPREVIEW_SUPERADMIN_EMAIL`. Si el usuario ya existe **ya no se le reescribe la contraseña**: solo se asegura `email_verificado`. |
| `backend/scripts/restablecer_password_superadmin.py` | Nuevo, para el caso que el sembrado no cubre: la cuenta ya existe y hay que cambiarle la puerta maestra. Lee la contraseña por `getpass` (o `MOTOPREVIEW_SUPERADMIN_NEW_PASSWORD`), la valida con `validar_password`, escribe el hash bcrypt que verifica `password_matches` y comprueba el resultado con `bcrypt.checkpw` contra la fila recién escrita. `SOLO_VERIFICAR=1` informa base destino y estado de la cuenta sin escribir; contra una base remota la escritura exige `MOTOPREVIEW_CONFIRMAR_BASE_REMOTA=1`. No usa `manage.py changepassword`: ese comando deja un hash PBKDF2 que el login rechaza y cierra la cuenta. |

Verificación ejecutada:

- `python -m py_compile scripts/sembrar_superadmin.py` → OK; `django.setup()` + `import api.services` → OK (la ruta de importación del script dentro de `manage.py shell` funciona).
- Parseo estático de `verificar_rbac.ps1` con `Parser::ParseFile` → 0 errores.
- `MOTOPREVIEW_DATABASE_URL= python manage.py check` → `System check identified no issues (0 silenced).`
- `MOTOPREVIEW_DATABASE_URL= python manage.py test api` → `Ran 149 tests in 0.727s — OK (skipped=50)` (idéntico a la línea base previa a F1).

Ninguna prueba nueva: F1 solo mueve secretos de archivos que no cubrían los tests.

Limitación real: sacar la cadena del repo **no** invalida la credencial. Sigue válida
en `auth_user` (panel) y en la fila del superadmin hasta que se cambie con
`manage.py changepassword`. El autor decidió no rotar secretos, así que no se ejecutó
ese cambio; `documentacion/comandos-mantenimiento.md:69-76` ya lo recomienda.

### F2 — núcleo de autorización (completada)

`backend/api/security.py`:

- `scopes_aplicables(user, recurso, tienda_destino, usuario_destino)` es ahora la
  única que decide qué scopes llegan a la consulta, y lo hace **contra el
  objetivo**. El `global` dejó de ser incondicional: un usuario atado a una tienda
  no alcanza filas de otra tienda en recursos con dimensión de tienda (`inventario`,
  `cotizaciones`, `configuraciones`, `ventas`, `usuarios`), aunque la semilla le dé
  scope `global`. Un usuario sin tienda (sede) conserva el alcance total. Esta es la
  decisión importante que el plan no traía resuelta: **criterio más seguro compatible
  con el comportamiento actual**, porque ningún flujo legítimo cruza tiendas (los
  listados de otra tienda ya estaban reservados al superadmin en `views.py:659` y
  `:1818`).
- `usuario_tiene_permiso` ahora: (1) deniega al usuario con `estado_usuario`
  distinto de `activo` aunque se llame fuera del filtro de autenticación; (2) exige
  `rol__activo=True`, así que un rol desactivado deja de autorizar aunque conserve
  sus concesiones; (3) conserva la combinación OR de varios roles (`rol_id__in`) y
  el bypass de Superadmin; (4) si el objetivo es otra tienda, devuelve `False` sin
  consultar la matriz.
- `get_accion_from_method(method, detalle=False)`: `leer` para el detalle y `listar`
  para la colección (antes todo GET pedía `listar`, así que `GET /api/usuarios/<pk>`
  se colaba con el permiso del listado) y `None` para cualquier verbo fuera del
  mapeo (antes `HEAD`/`TRACE`/`OPTIONS` caían en `leer` y se autorizaban).
- `HasPermiso` divide la política en `_politica()`: `None` = no hay política
  declarada → denegar (fallo seguro, ya no se adivina el recurso); `()` = OPTIONS,
  metadatos de DRF sin filas. Añade `has_object_permission`, que revalida con
  `tienda_del_objeto` / `propietario_del_objeto` de la fila resuelta por el `pk`.
- `EscribirConPermiso` propaga el chequeo de objeto a las escrituras y lo deja
  abierto en lectura (misma política pública de catálogo de hoy; F3 la declara).

`backend/api/views.py`:

- `DatabaseGuardMixin.check_object_permissions(request, obj)`: estas vistas no
  heredan de `GenericAPIView`, así que DRF nunca recorría los permisos de objeto.
- `ResourceDetail.get_object` ahora aplica `select_related` con
  `queryset_relaciones` y llama el chequeo de objeto. Cuatro subclases
  (`ModelDetail`, `MotorcycleDetail`, `Model3DDetail`, `ProductDetail`) repetían el
  `get_object` solo para el join; se Borra la duplicación y queda el atributo.
- `ResourceCollection.permiso_detalle = False`, `ResourceDetail.permiso_detalle = True`,
  `UserDetail.permiso_detalle = True` y su `get_target` revalida la fila.
- `StoreDetail` y `AccesorioDetail` conservan sus `get_object` propios (ya filtran
  por tienda en el queryset); el `recurso` `tiendas` no tiene dimensión de tienda,
  así que el chequeo de objeto sería un no-op.

Pruebas (`MOTOPREVIEW_DATABASE_URL= python manage.py test api`): `Ran 163 tests in
0.653s — OK (skipped=50)`. Antes de F2: 149. Se añadieron 14, entre ellas
`test_tienda_ajena_se_deniega_sin_consultar_la_matriz`,
`test_consulta_solo_roles_vigentes`, `test_roles_multiples_se_combinan_con_or`,
`test_usuario_bloqueado_no_autoriza`, `test_metodo_fuera_de_la_matriz_no_hereda_una_accion`,
`test_deniega_la_fila_de_otra_tienda_aun_con_concesion_global`,
`test_la_ruta_de_detalle_revalida_la_fila` y el guard estructural
`test_toda_vista_gobernada_por_la_matriz_declara_su_recurso` (recorre las 28 vistas
gobernadas por la matriz, incluidas las compuestas con `IsAuthenticated &`, y exige
`permiso_recurso` válido). `python manage.py check` sin problemas.

`RecursoAccion.requiere_scope` sigue sin leerse en la ruta de autorización, y es
deliberado: como `global` siempre es admisible, una combinación con
`requiere_scope=False` solo autoriza si su concesión está guardada con scope
`global`; la restricción correcta es de **escritura** de la concesión y se aplica
en F6, no en la lectura.

Limitación: el bypass de Superadmin y `has_any_role` (las puertas por rol
`IsSuperAdmin`, y las `IsStoreAdmin`/`IsStoreStaff` que todavía existían) leían
`role_ids` sin mirar `rol.activo`. Cerrarlo exigía una consulta extra sobre `rol`
en cada petición, así que se pospone a F4, donde vive la integridad del rol
Superadmin — y ahí se cerró. Las pruebas que
necesitan PostgreSQL siguen saltadas (50): no se corrieron contra la base real.

### F3 — todas las rutas quedan gobernadas por la matriz

`backend/api/security.py`:

- `EscribirConPermiso` deja de abrir la lectura por defecto. La abre solo cuando
  la vista declara `lectura_sin_matriz = True` (`LECTURA_ABIERTA = ("GET", "HEAD",
  "OPTIONS")`, :247-273). Sin declarar, el GET pasa por la matriz: negar por defecto
  también aplica a la lectura. La misma regla rige `has_object_permission`.
- Se eliminan `IsStoreStaff` e `IsStoreAdmin` (:class`IsSuperAdmin` sigue): después
  de migrar las vistas ya no los usaba nadie, y dejarlos abiertos invita a volver a
  gobernar por rol en lugar de por matriz.

`backend/api/views.py` — la política de lectura se declara por ruta, no en el centro:

- `lectura_sin_matriz = True` (22 vistas de vidriera): categorías, marcas, modelos,
  motos, modelos 3D, productos, categorias-producto, tipos de accesorio, el catálogo
  de accesorios y su detalle, y la matriz de compatibilidad. Son las páginas públicas
  que el frontend carga sin sesión: las cuatro rutas públicas de `App.tsx`
  (`pages/public/{Catalogo,Carrito,Visualizador,Configurador}.jsx`), que leen
  `/accesorios`, `/categorias`, `/compatibilidad`, `/modelos-3d`, `/motos` y sus detalles.
- `lectura_sin_matriz = True` compuesto con `IsAuthenticated` en `StoreCollection` y
  `StoreDetail`: la ficha lleva NIT, dirección y correo, no es vitrina, pero el
  vendedor la necesita para abrir `/admin/tienda`.
- `lectura_sin_matriz = False` (6 vistas): roles, tipos de movimiento y planes de
  suscripción — leerlas ya es información de administración.
- Se borran los tres `get_permissions()` que saltaban la matriz (compatibilidad,
  accesorios y detalle de accesorio, ~:843/:1559/:1595 de la versión anterior), donde
  el GET era `AllowAny` y la escritura un rol fijo. Quedan con
  `permission_classes = [EscribirConPermiso]` + `permiso_recurso`.
- Migradas a `[HasPermiso]` con su recurso declarado: configuraciones (colección y
  detalle), cotizaciones (`QuoteCollection`, `QuoteDetailView`, `QuoteHistoryView`,
  `QuoteStatus` con `permiso_accion = "actualizar"`), inventario (colección, detalle y
  `InventoryMovementView` — `movimiento_inventario` no tiene recurso sembrado, usa
  `inventario`), `UserCollection`/`UserDetail` (`usuarios`) y `ReporteResumenView`
  (`ventas`). Antes eran `IsAuthenticated` o `IsStoreStaff`, es decir: cualquier cuenta
  activa, incluido un cliente, podía cambiar el estado de una cotización ajena.
- Fuera de la matriz quedan 14 rutas, cada una con su razón escrita y vigilada por
  `test_las_rutas_fuera_de_la_matriz_quedan_listadas`: las 10 de administración de la
  propia matriz (`IsSuperAdmin`: recursos, acciones, recurso-acción, rol-recurso,
  matriz de un rol, reasignación masiva de concesiones), `PermisosUsuarioView` (un
  usuario lee lo suyo) y las 4 lecturas públicas por relación (`Model3DByAccessory`,
  `CompatibilityByModelo`, `CompatibilityByAccesorio`, todas `AllowAny`). Las rutas de
  autenticación (`/auth/register`, `/auth/login`, `/auth/forgot-password`,
  `/auth/reset-password`, `/auth/verificar/<token>`, `/health`) son funciones con
  `@permission_classes([AllowAny])` y se tratan en F4, donde vive el registro público.

Pruebas (`MOTOPREVIEW_DATABASE_URL= python manage.py test api`): `Ran 161 tests in
0.626s — OK (skipped=50)`. Cambios: se quitan `RolDeAccesoTests` y las tres pruebas de
`IsStoreStaff`/`IsStoreAdmin` (las clases ya no existen) y se sustituyen por
`test_superadmin_admite_su_rol`; se añaden `test_toda_vista_de_escritura_declara_si_su_
lectura_es_publica`, `test_las_rutas_fuera_de_la_matriz_quedan_listadas` y
`test_la_lectura_sin_declarar_revalida_la_fila_con_la_matriz`. `python manage.py check`
sin problemas.

Verificación de comportamiento (sin base de datos, usuario y matriz falsificados, para
no tocar la producción):

- Anónimo: `GET /api/categorias` y `GET /api/productos` llegan al guard de base de
  datos (**503**, o sea, el permiso pasó); `GET` de tiendas, inventario, usuarios,
  cotizaciones y configuraciones → **401**. `POST` anónimo → **401** en todas.
- Autenticado con rol Admin de tienda, matriz falsificada en `False`: `POST
  /api/categorias`, `PUT /api/productos`, `POST /api/tiendas`, `POST /api/planes`, `POST
  /api/roles`, `POST /api/tipos-movimiento`, `POST /api/compatibilidad`, `POST
  /api/accesorios` → **403**, y la consulta sale con el recurso, la acción y los scopes
  correctos (`inventario` y su tipo de movimiento con `['global','tienda']`; el resto,
  `['global']`).
- Cliente autenticado: `POST /api/cotizaciones` → `cotizaciones/crear` con
  `['global','propio']`; `POST /api/configuraciones` → `configuraciones/crear` con
  `['global','propio']`; el historial → `cotizaciones/leer` igual. Coincide con lo que
  siembra `documentacion/rbac_migration.sql:374-392`.

Consecuencias deliberadas sobre la semilla, que hay que resolver al normalizar (F6) y
que aquí solo se documentan:

1. **Vendedor y catálogo compartido.** `producto`, `categoria_producto` y
   `tipo_accesorio` no tienen columna de tienda (así está en la BD), así que un
   privilegio con scope `tienda` sobre `productos`/`categorias`/`tipos` no describe
   ninguna fila concreta: `scopes_aplicables` solo admite `global` en esos recursos y
   el vendedor deja de escribir en el catálogo. Es el comportamiento que ya tenía el
   panel (esos endpoints exigían `IsStoreAdmin` y `/admin/catalogo` es de superadmin);
   la semilla debería dejar de concedérselo con `tienda` o pasarlos a `global` si se
   quiere que el vendedor edite la vidriera común.
2. **Vendedor y ficha de su tienda.** `PUT /api/tiendas/<id>` se gobierna por `tiendas`
   y la semilla no da nada de `tiendas` al rol Vendedor, así que `/admin/tienda` solo
   guarda para el rol Admin. Ya era así antes de F3 (`tiendas` nunca estuvo entre los
   privilegios del vendedor); la opción es sembrar `tiendas:leer/actualizar` con scope
   `tienda` — que requiere añadir `tiendas` a `RECURSOS_CON_TIENDA` — o retirar la
   página al vendedor. Decide el usuario; mientras no se decida, no se amplía el
   privilegio.
3. **El cliente ya no cambia el estado de una cotización.** `QuoteStatus` pide
   `cotizaciones:actualizar`, que la semilla solo da al vendedor y al admin. El frontend
   no lo usa desde `MisCotizaciones.jsx` (solo pinta la etiqueta del estado), así que no
   hay flujo roto: es un privilegio que pasa de "cualquiera con cuenta" a la matriz.

Las documentaciones de `documentacion/` (`01-vision-general.md`, `02-arquitectura.md`,
`04-api-rest.md`, `06-flujos.md`, `08-seguridad.md`, `10-guia-desarrollador.md`,
`seguridad-api.md` y los diagramas `.mmd`) todavía describen `IsStoreStaff` /
`IsStoreAdmin` como la puerta de estas rutas; se refrescan al final, cuando el RBAC
quede cerrado, para no documentar tres veces el mismo cambio.

### F4 — cerrada la escalada de privilegios

`backend/api/security.py`:

- `es_superadmin(user)` (:26) es ahora la única puerta del bypass. Antes bastaba
  con que `usuario_rol` tuviera la fila del rol de sede; ahora exige cuenta activa
  **y** que la fila `rol` del UUID fijo siga vigente, así que desactivar el rol de
  sede sí apaga el acceso global. El resultado se cachea en el atributo
  `rol_superadmin_vigente` de la instancia porque las vistas de listado preguntan
  varias veces por la misma petición (una sola consulta a `rol`).
- El bypass de `usuario_tiene_permiso` (:212) llama a esa función en lugar de
  comparar el UUID contra `role_ids` a secas, y `IsSuperAdmin` (:342) también.
- `es_rol_de_sede(rol)` (:57) reconoce el rol privilegiado por su marca
  `es_superadmin` **o** por el UUID fijo; `puede_asignar_rol(solicitante, rol)`
  (:71) solo deja entregarlo a un superadmin vigente.
- `mismo_identificador` dejó de ser privada (`_mismo_identificador`): la usan las
  dos capas de guardas de `views.py`.

`backend/api/views.py`:

- Se elimina el `es_superadmin` local (era `has_any_role` sobre `role_ids`, sin
  mirar la tabla `rol`) y se importa el de la capa de seguridad. `has_any_role`
  queda solo para los roles de tienda (`services.py:72`).
- `denegar_edicion_de_cuenta(request, user, toca_privilegios=)` (:222) cubre los
  dos casos que la matriz no ve porque no son de ninguna tienda: nadie con permiso
  de personal bloquea ni desasciende una **cuenta de sede**, y nadie se cambia el
  propio rol o el propio estado (el bloqueo accidental de la única cuenta de sede
  deja la plataforma sin administración). Lo llaman `UserDetail.update_user` y
  `UserDetail.delete`.
- `UserDetail.update_user` (:778) resuelve el `Role` del body y lo pasa por
  `puede_asignar_rol` antes de escribir: con `usuarios:actualizar` —que la semilla
  da al rol Admin de tienda en scope `global`— un administrador se ascendía a sí
  mismo con solo mandar `id_rol` de sede.
- `register` (:1342) aplica la misma guarda y además deja de aceptar tienda del
  body cuando quien registra está autenticado: la cuenta nueva nace en la tienda
  de quien registra (antes un admin podía adscribir clientes a la tienda vecina).
  La vidriera pública sigue trayendo su tienda en el body —así la necesita
  `pages/public/Carrito.jsx`, que manda `usuario.id_tienda` al cotizar— pero ahora
  la tienda tiene que estar **activa** (`estado_tienda='activa'`, antes alcanzaba
  con que existiera).
- `RoleDetail.update` (:645) rechaza que alguien que no sea la sede edite el rol de
  sede: `activo=False` en esa fila es un apagón global, no una edición de catálogo.
  `RoleDetail.delete` (:659) usaba solo la marca `es_superadmin`; ahora también el
  UUID fijo, que es con lo que decide el bypass.
- `RoleSerializer` (`api/serializers.py:204-210`) pone `es_superadmin` como
  `read_only`: el panel no puede marcar como privilegiado un rol de tienda.

Pruebas: `Ran 173 tests in 0.616s — OK (skipped=50)` (antes de F4: 161). Nueve
pruebas nuevas en `api.test_rbac.EscaladaDePrivilegiosTests`, más
`test_rol_de_sede_desactivado_no_autoriza` y `test_la_vigencia_del_rol_se_consulta_una_sola_vez`:
el admin no asigna el rol de sede (ni el fijo ni uno nuevo marcado
`es_superadmin`), el superadmin sí, los roles de tienda quedan libres, el rol de
sede desactivado no autoriza y cae a la matriz, `PUT /api/usuarios/<pk>` devuelve
403 al ascender a sede / editarse el propio estado / bloquear una cuenta de sede,
`DELETE` idem, `POST /api/auth/register` devuelve 403 con el body que intenta el
ascenso, y el guard no estorba cuando no se tocan privilegios. `python manage.py
check` sin problemas. Los fixtures de prueba precargan `rol_superadmin_vigente`
(`test_rbac.usuario()`, `test_endpoints.usuario_falso()`) para no tocar la base.

Verificación **solo de lectura** contra la base real (ningún INSERT/UPDATE/DELETE,
ninguna migración, ninguna prueba con `RUN_DB_TESTS`): la tabla `rol` trae
`Superadmin = 00000000-…-000` con `activo=TRUE, es_superadmin=TRUE` y una cuenta
activa con ese rol, así que la nueva exigencia de vigencia no deja fuera el panel.
También aparece un rol suelto `controll` (`f3cf11a1-…`) sin marca privilegiada.

Decisiones y lo que queda abierto:

- El bypass sigue existiendo (es el comportamiento actual del producto y la sede no
  puede administrarse a sí misma con la matriz). Lo que se cerró es su *fuente*:
  cuenta activa + rol vigente, y que nadie más lo pueda entregar ni apagar.
- `resolver_tienda_cotizacion` (`views.py:226`) sigue admitiendo el `id_tienda` del
  body cuando el usuario no tiene tienda: es el flujo de la vidriera, pero un
  visitante sin cuenta puede colocar su cotización en cualquier tienda activa. Es
  un asunto de **creación** entre tiendas, así que va con F5, no aquí.
- El registro público no fija una tienda de sede en el servidor (no hay configuración
  para eso y `.env` no se toca); sigue viniendo del cliente y solo se valida que la
  tienda exista y esté activa. Si se decide cerrar del todo, hace falta una variable
  `MOTOPREVIEW_TIENDA_PRINCIPAL` y su decisión es del responsable.

### F5 — El mismo scope que autoriza es el que filtra las filas

Lo que arrive aquí es la segunda mitad del criterio: global / tienda / propio tiene que
aplicarse **al autorizar y al filtrar**, en listas, detalles, cambios, eliminaciones y
creación. Hasta ahora la autorización leía la matriz y el filtrado era una línea
escrita a mano por ruta (`queryset.filter(id_tienda=request.user.id_tienda)`), con lo
que las dos respuestas podían contradecirse. La corrección es que el filtro se construya
con las concesiones que ya se consultaron para decidir el permiso.

`backend/api/security.py`:

- `scopes_concedidos(user, recurso, accion)` (:216) es la lectura de `rol_recurso` de
  siempre, pero devuelve el **conjunto de scopes** en vez de un `sí`. Mismo filtro de
  vigencia (`activo`, `rol__activo`, `recurso_accion__activo`, recurso y acción activos)
  y mismo bypass: la sede vigente recibe `set(SCOPES)` sin consultar la tabla. El
  resultado se cachea en la instancia por `(recurso, accion)` (`_scopes_concedidos_cache`)
  porque autorización y filtrado preguntan por el mismo par en la misma petición; sin el
  cache se recuperaría el N+1 que costó quince segundos en el catálogo (commit 5ba77cb).
- `usuario_tiene_permiso` (:273) pasa a ser `bool(concedidos & aplicables)`: la concesión
  y el alcance del objetivo se cruzan en un solo sitio. Una concesión en un scope que la
  operación no puede usar queda inerte, y un scope aplicable sin concesión también.
- `scopes_aplicables` (:175) cambia la regla de la cuenta sin tienda: `global` solo
  alcanza una **fila concreta** cuando el usuario es la sede. Antes, una cuenta de
  personal sin `id_tienda` con `global` en un recurso con dimensión de tienda llegaba a la
  fila de la tienda vecina con solo escribir el `pk`; ahora ese par devuelve lista vacía.
  La contraparte es la lista de la sede: sin tienda asignada ya no recibe 400, ve todo.
- `filas_del_scope(user, recurso, scopes, *, campo_tienda="tienda_id", campo_dueno=None)`
  (:288) traduce el conjunto a `Q`. `global` sobre un recurso sin dimensión de tienda →
  `Q()`; `global` o `tienda` con dimensión → `Q(campo_tienda=<su tienda>)`, y 400 si la
  cuenta no tiene tienda; `propio` → `Q(campo_dueno=<su usuario>)`; varios scopes se
  combinan con OR. Devuelve `(Q, None)` o `(None, (status, mensaje))` — el fallo seguro
  es explícito, no un queryset vacío que parece "no hay datos".
- `politica_de_la_operacion(request, view)` (:332) es ahora la única fuente de
  `(recurso, acción)`; `HasPermiso._politica` llama ahí, así que la vista y el permiso
  resuelven la misma política.

`backend/api/views.py`:

- `DatabaseGuardMixin.filtrar_por_scope(request, queryset, *, campo_tienda, campo_dueno)`
  añade el filtro a la consulta y devuelve `(queryset, None)` o `(None, Response)` con el
  403 (sin política o sin scope) o el 400 (cuenta sin tienda). Ruta sin política declarada
  no filtra: se deniega.
- `store_staff` se elimina: después de esto no quedaba ninguna ruta que lo usara.
- Rutas migradas al filtrado por matriz: `InventoryCollection.get` (deja de filtrar por
  `request.user.id_tienda` a mano), `InventoryDetail.get`, `InventoryMovementView.post`,
  `QuoteCollection.get`, `QuoteDetailView.get`, `QuoteStatus.update_status`,
  `QuoteHistoryView.get`, `UserCollection.get`, `UserDetail.get_target`,
  `ConfigurationCollection` y `ConfigurationDetail` (ambas por `scope_configurations`,
  que ahora delega en `filtrar_por_scope`).
- El recurso `configuraciones` no tiene columna de tienda: su dimensión es la tienda del
  dueño, así que filtra con `campo_tienda="usuario__tienda"` y `campo_dueno="usuario_id"`.
- En las rutas de detalle y de escritura el `Q` de scope se **AND-a** con el `pk`:
  `filas.select_for_update().filter(pk=...)` sobre el queryset ya acotado. Manipular el
  `pk` por uno de otra tienda o de otro dueño devuelve 404 en vez de escribir fuera.
- `UserCollection.get` aplica el scope y después AND-a el `?id_tienda=` del query: el
  filtro del panel puede achicar, nunca ampliar.
- `PermisosUsuarioView`: el bypass pasa a `es_superadmin(user)` (era comparar el UUID con
  `role_ids`) y la rama de personal añade `rol__activo=True` y
  `recurso_accion__accion__activo=True`, para que la pantalla de permisos muestre
  exactamente lo que el guard autoriza.

Compilación verificada **sin conectar a ninguna base** (URL falsa local, solo
`str(qs.query)`). Las cuatro cláusulas que producen las consultas nuevas:

```
configuraciones tienda -> ("usuario"."id_tienda" = %s AND "configuracion"."id_configuracion" = %s)
configuraciones propio -> "configuracion"."id_usuario" = %s
inventario  (detalle)  -> ("inventario"."id_tienda" = %s AND "inventario"."id_inventario" = %s)
cotizaciones (tienda OR propio) -> ("cotizacion"."id_tienda" = %s OR "cotizacion"."id_usuario" = %s)
```

`sql_with_params()` no se pudo ejecutar: pide conexión real y eso está fuera del
criterio. El texto SQL es la prueba suficiente de que los lookups existen (`usuario__tienda`
resuelve el join, el OR compone bien).

Pruebas: `Ran 201 tests in 0.633s — OK (skipped=50)` (antes de F5: 173). Veintiocho
pruebas nuevas, en tres clases de `api/test_rbac.py`: `FiltradoDeFilasTests` (:281, el `Q`
por shape de concesión: sede, tienda, propio, `usuario__tienda`, OR combinado, 403 sin
scope, 400 sin tienda), `RutasFiltranSusFilasTests` (:449, cada ruta registra el `Q` que
aplica — 404 con `pk` ajeno, `Q()` para la sede sin tienda, 403 sin concesión y **cero
consultas** cuando la autorización ya negó) y `ScopeConfigurationsTests` (:565). Además
`test_scope_configurations_filtra_por_la_matriz` y
`test_ningun_listado_repite_la_tienda_del_usuario`, que fallan si una ruta vuelve a
escribir su propio filtro por tienda (las dos excepciones legítimas están nombradas en el
docstring de la prueba: `POST /api/inventario` y el resumen del panel). La matriz se
consulta una sola vez por par: `test_la_matriz_se_consulta_una_sola_vez_por_par_recurso_accion`
exige `consultas == 2` para dos peticiones del mismo `(recurso, acción)`. `python
manage.py check` sin problemas.

No se tocó, y es decisión tomada:

- `StoreCollection` / `StoreDetail`: el vendedor lee su propia ficha sin tener concesión
  en `tiendas` (la semilla no le da ninguna); filtrar por la matriz le vaciaba la pantalla
  donde el producto muestra su tienda. Sigue con su lógica propia y documentada.
- `ReporteResumenView`: mide agregados, no filas, y su decisión ya era equivalente a la
  del scope; el `?id_tienda=` solo lo acata la sede.
- `InventoryCollection.post`: la tienda del body es el **destino** de la fila nueva, no un
  filtro; se valida que la cuenta la tenga, igual que antes.
- `resolver_tienda_cotizacion`: sigue admitiendo la tienda del body para la vidriera. Es
  creación entre tiendas y su decisión es del responsable del negocio, no un filtro de
  filas, así que queda fuera de F5 (está documentado arriba, en F4).
- `GET /api/inventario?id_tienda=`: la ruta nunca hizo caso del parámetro (el frontend lo
  manda en `services/inventario.js` pero ningún consumidor lo necesita); no se amplió la
  superficie de consulta con un filtro que nadie pidió.

Impacto en el frontend verificado: `pages/Usuarios.jsx` manda `id_tienda =
usuario.id_tienda` —su propia tienda, o `undefined` para la sede—, así que el AND no
cambia ningún caso legítimo.

### F6 — Concesiones normalizadas y validadas antes de reemplazar (completada)

Regla 5 y fase 3 del plan: un alcance que el recurso no puede expresar se
**rechaza**, nunca se convierte en `global`; `requiere_scope=False` solo acepta
`global`; una combinación lleva un solo scope; y «el backend debe validar todo antes
de borrar los permisos anteriores y guardar en una transacción» (fase 5). El caso 9
de la fase 6 lo remata: «rechaza IDs inexistentes, scopes inválidos, duplicados y
combinaciones incompatibles **sin dejar el rol parcialmente actualizado**».

Lo que estaba abierto al cerrar F5 era la dureza del rechazo. El plan lo resuelve, y
con él quedaron resueltas las dos dudas que F5 documentó: se rechaza y se nombra el
motivo, en lugar de guardar la fila inerte o reescribirla.

Verificado contra el esquema antes de escribir la regla (sin consultar la base):
`producto`, `categoria_producto`, `tipo_accesorio` y `movimiento_inventario` no tienen
columna de tienda — `movimiento_inventario` solo tiene `id_usuario` (el que mueve) y su
tienda se alcanza por la fila de `inventario`. Por eso `scopes_validos` deja `global`
para esos recursos, igual que hace `scopes_aplicables` al autorizar.

`backend/api/security.py`:

- `normalizar_scope` (:143): minúsculas, sin espacios, vacío es `global`. La columna es
  texto libre y `Tienda ` o `TODOS` quedaban guardados como concesiones que no
  autorizan nada pero que en el panel parecían un permiso.
- `scopes_validos(recurso_codigo, requiere_scope=True)` (:154): los alcances que la
  tabla del recurso puede expresar, derivados de los mismos conjuntos con los que F5
  filtra filas. Es la única fuente: la consumen el panel, el admin de Django y la
  validación de escritura, así que no puede ofrecerse una casilla que luego se rechace.
- `validar_concesion` (:171): devuelve el scope normalizado o el motivo. Rechazar, no
  reescribir — pasar `tienda` a `global` daría el catálogo entero a quien pidió su
  tienda.
- `normalizar_concesiones(entradas, combinaciones)` (:196): la validación del reemplazo
  masivo. Acumula **todos** los motivos (no solo el primero), exige un solo scope por
  combinación, ignora el identificador desconocido en vez de dejarlo pasar y devuelve
  las entradas ya normalizadas.

`backend/api/views.py` — `RolePermisosBulkUpdateView.put` (:2209):

- Una sola lectura de `recurso_accion` (`values_list("id_recurso_accion",
  "recurso__codigo", "requiere_scope")`) da el código del recurso y la marca de alcance;
  con eso `normalizar_concesiones` decide antes de tocar la tabla.
- **Antes**, la existencia se comparaba con `str(uuid_de_la_base)` contra
  `str(valor_del_body)` sin normalizar: un UUID en mayúsculas o con espacios no
  matcheaba y la creación la saltaba el `if ra_id in ra_existentes` — el rol se quedaba
  sin esa concesión **después** de haber borrado las anteriores, con 200 y un
  `permisos_creados` más bajo. Ahora el formato se normaliza por los dos lados y una
  entrada inexistente es un 400.
- El scope se validaba contra un set literal de tres valores; no se miraba ni el
  recurso ni `requiere_scope`, y se guardaba tal cual llegaba.
- Las duplicadas provocaban `IntegrityError` a mitad del reemplazo (`unique_together
  (rol, recurso_accion, scope)`) y el `transaction.atomic()` revertía todo con 500. Hoy
  se resuelven antes de abrir la transacción.
- La creación pasa a `bulk_create` dentro del `atomic`, con `concedido_por` solo cuando
  hay sesión auténtica.

`backend/api/serializers.py`:

- `RolRecursoSerializer.validate` (:619): `POST/PATCH /api/rol-recursos` era la puerta
  ancha — aceptaba cualquier scope sobre cualquier recurso, sin pasar por la matriz.
  Ahora normaliza y rechaza con el motivo en el campo `scope`.
- `RecursoConPermisosSerializer.get_acciones` (:664) expone `requiere_scope` y
  `scopes_validos` por combinación, que es lo que el panel usa para poblar el selector.

`backend/api/admin.py` (`RoleAdmin`):

- Las casillas se generan con `scopes_validos` en lugar de ofrecer los tres alcances a
  todo lo que tuviera `requiere_scope` (:196).
- `save_model` (:223) usa el mismo `normalizar_concesiones`; si hay cualquier error
  **no toca la tabla** y reporta el motivo con `message_user`. Antes borraba las
  concesiones y las recreaba sin transacción: un fallo a mitad dejaba el rol sin
  permisos.

`frontend/src/pages/Seguridad.jsx`:

- `scopesDe(accion)` (:141) limita el `<select>` a lo que el backend devuelve; si la
  base ya trae un valor incompatible (lo escribió la siembra antigua), se muestra
  marcado como `no compatible` para que quien edita vea el conflicto en vez de
  reenviarlo a ciegas. El backend sigue siendo la autoridad: la restricción de la
  interfaz es comodidad, no permiso.

`backend/scripts/verificar_rbac.ps1`: el paso 5 otorgaba `productos:leer` en scope
`tienda` — precisamente una de las combinaciones incompatibles; ahora pide `global` y
el script sirve para verificar la matriz sin pelearse con la validación.

Pruebas: `Ran 225 tests in 0.668s — OK (skipped=50)` (antes de F6: 201). Veinticuatro
pruebas nuevas en `api/test_rbac.py`: `NormalizacionDeConcesionesTests` (normalización,
`scopes_validos` por recurso sembrado, rechazo del scope fuera de la matriz, rechazo sin
reescribir, y el inventario de la prueba `test_autorizar_y_ofrecer_usan_el_mismo_criterio`
que cruza lo que se ofrece contra lo que `scopes_aplicables` autoriza para **todos** los
códigos sembrados), `ReemplazoDeConcesionesTests` (id inexistente, incombinable, segundo
scope del mismo par, repetición idéntica colapsada, `requiere_scope=False`, entrada sin
identificador, lista vacía legítima y acumulación de motivos) y
`ElReemplazoValidaAntesDeBorrarTests` (el `put` llama a `normalizar_concesiones` antes
del `.delete()`, está dentro de `transaction.atomic()`, el serializador rechaza y
normaliza, y la matriz expone los alcances). `python manage.py check` sin problemas y
`npx vite build` del frontend compila (`✓ built in 3.16s`).

Bloqueo registrado, y es una decisión del responsable:

- La siembra de `documentacion/rbac_migration.sql` concede `tienda` a Vendedor sobre
  `productos`, `categorias`, `tipos` y `movimientos` (líneas 290-308), que son recursos
  sin columna de tienda. Son exactamente las concesiones que la regla 5 prohíbe: bajo F5
  ya no autorizan nada (la cuenta con tienda no recibe `global` y `tienda` no se ofrece
  sobre un recurso sin dimensión), y bajo F6 el panel devuelve 400 al intentar
  re-salvar ese rol mientras la fila siga ahí. La corrección está en los datos, no en el
  código, y tiene dos salidas legítimas con consecuencias opuestas: convertir esas
  cuatro concesiones a `global` (devuelve al vendedor la escritura del catálogo
  compartido que tenía antes de F5) o retirarlas (el catálogo pasa a ser solo de la
  sede). El plan lo prohíbe como arreglo automático — «no dar acceso administrativo
  amplio como arreglo automático a permisos faltantes» (fase 3) —, así que no se tocó la
  siembra ni se ejecutó SQL alguno.
- Para decidir hace falta el inventario real de concesiones (fase 0: «exportación de las
  concesiones actuales»). El intento de auditar la matriz de producción en solo-lectura
  fue rechazado, así que no se sabe cuántas filas hay fuera de la regla ni en qué roles;
  el número exacto queda como pendiente.
- La restricción única de la base sigue siendo `(rol, recurso_accion, scope)`, que
  permite dos scopes del mismo par. El código ya no escribe ese estado; convertir el
  índice en `(rol, recurso_accion)` es un `DROP INDEX`/`CREATE UNIQUE INDEX` sobre una
  tabla `managed=False` con producción gestionada por SQL externo, y no se ejecuta aquí.
  Hay que preparar el SQL idempotente y aplicarlo en la copia de staging (fase 7).

### F7 — Permitir y denegar por operación, con la lista derivada del código (completada)

El plan (fase 6, casos 5 a 9) pide una prueba de permitir y una de denegar **por
operación**. Escrita a mano, esa lista se queda corta el día que aparece una ruta
nueva, así que primero se derivó del código:

- `operaciones_de_la_matriz()` ([backend/api/test_rbac.py:1086](../backend/api/test_rbac.py#L1086))
  barre `api/views.py`, toma las clases que heredan de `DatabaseGuardMixin` y declaran
  `permiso_recurso`, y por cada método HTTP que la vista implementa resuelve la acción
  con la misma función que usa el permiso (`permiso_accion` explícito o
  `get_accion_from_method` con `permiso_detalle`). Hoy sale: **100 operaciones,
  40 vistas, 5 acciones** (`actualizar`, `crear`, `eliminar`, `leer`, `listar`). Una
  ruta que se proteja con la matriz entra sola en las pruebas; una que se quede sin
  declarar recurso no aparece y lo denuncia el test de rutas fuera de la matriz (F3).

`MatrizPermitirDenegarTests` ([backend/api/test_rbac.py:1113](../backend/api/test_rbac.py#L1113))
barre esas 100 operaciones en ocho pruebas, cada una con su espejo:

| Prueba | Barrido sobre las 100 operaciones |
| --- | --- |
| `test_sin_concesion_se_deniega_cada_operacion` | ninguna pasa sin fila en `rol_recurso` |
| `test_con_la_concesion_se_permite_cada_operacion` | todas pasan con la concesión debida |
| `test_la_fila_de_otra_tienda_se_deniega_aun_con_concesion` | `has_object_permission` niega la fila ajena aunque el rol tenga `global` y `tienda` (caso 5) |
| `test_la_fila_propia_se_permite_con_concesion` | la misma llamada sobre la propia fila sí autoriza |
| `test_el_anonimo_no_autoriza_ninguna_operacion_de_la_matriz` | sin sesión, ninguna |
| `test_la_cuenta_bloqueada_no_autoriza_ninguna_operacion` | `estado_usuario = bloqueado` no autoriza, con concesión (regla 2) |
| `test_la_lectura_publica_declara_y_la_demas_quedan_cerradas` | congela en 22 la lista de vistas con `lectura_sin_matriz = True` (caso 8) |
| `test_toda_operacion_de_escritura_pasa_por_la_matriz` | `lectura_sin_matriz = True` no abre el `POST/PUT/PATCH/DELETE` de esa misma ruta |

Se corre sobre la capa de permiso, no sobre HTTP: la denegación ocurre antes del guard
de base de datos ([backend/api/views.py:193-219](../backend/api/views.py#L193-L219)) y
los casos de permitir tendrían que consultar filas reales para decir algo. Las pruebas
de ruta completa con cliente HTTP siguen en `api/test_endpoints.py`.

Pruebas: `Ran 234 tests in 0.791s — OK (skipped=50)` (antes de F7: 225). El módulo solo:
`Ran 110 tests in 0.048s — OK`. Las 50 omitidas son las que piden base de datos; se
omiten con `MOTOPREVIEW_DATABASE_URL=` vacío y vuelven con `RUN_DB_TESTS=1` en un
PostgreSQL de servicio (tarea #13, sigue pendiente).

### Fase 0 del plan — matriz de endpoints (entregada)

Creada [documentacion/rbac-matriz-endpoints.md](rbac-matriz-endpoints.md) con una fila
por método HTTP y su generador
[backend/scripts/generar_matriz_endpoints.py](../backend/scripts/generar_matriz_endpoints.py),
que se ejecuta con `manage.py shell --no-imports` y produce las tablas desde el código
(rutas de `_RUTAS_API`, declaraciones `permiso_*` de cada vista, columnas reales de los
modelos y `scopes_validos` del recurso). Las tablas no se copian a mano: si la
autorización cambia, el documento se regenera.

Seis hallazgos que el documento registra como vigente/objetivo, verificados en el
código y en la siembra antes de escribirlos:

1. `usuarios:crear` no lo consume ninguna ruta: `/api/usuarios` solo define `GET` y el
   alta de personal pasa por `POST /api/auth/register` con la puerta de F4.
2. `configuraciones:crear/actualizar/eliminar` tampoco: las dos rutas de `configuracion`
   son lectura y ningún servicio del frontend las llama.
3. `movimientos` **no existe como recurso** sembrado, pero la siembra lo concede
   (`rbac_migration.sql:298-306`): el `INSERT ... SELECT` no falla, inserta cero filas.
   El asiento se autoriza con `inventario:crear`.
4. `ventas:exportar` se concede a Vendedor y ninguna vista usa la acción `exportar`; el
   resumen usa `ventas:listar`.
5. `tipos-movimiento` y `planes-suscripcion` se gobiernan con el recurso de su área
   (`inventario`, `tiendas`) y no acotan filas porque sus tablas no tienen columna de
   tienda: es catálogo global, y así queda dicho en la tabla en vez de fingir un filtro.
6. `recurso.endpoint_base` es decorativo (solo se serializa para el panel; la
   autorización nunca lo lee), por eso `ventas` apunta a `/api/ventas`, que no existe.

El documento también fija la decisión de la vidriera: 20 vistas leen sin matriz porque
son catálogo público y 2 (`StoreCollection`, `StoreDetail`) declaran `lectura_sin_matriz
= True` con `IsAuthenticated & EscribirConPermiso`, es decir sesión obligatoria y
alcance de la propia fila — el `True` existe para que el vendedor lea su ficha, y la
alternativa (conceder `tiendas:leer[tienda]` en la siembra y poner `False`) está
documentada como decisión del responsable, no como defecto.

Nada de esto se ejecutó contra la base real: ni SQL, ni siembra, ni migraciones, ni
pruebas con `RUN_DB_TESTS=1`.

## Pendientes al cerrar F7

- **#13**: PostgreSQL de servicio en CI con `RUN_DB_TESTS=1` para recuperar las 50
  pruebas omitidas (las de endpoints y las de rutas con base real).
- La decisión de datos de F6 (concesiones `tienda` sobre recursos sin dimensión) sigue
  en manos del responsable, con el inventario de la base real sin hacer porque el
  intento de auditoría en solo-lectura fue rechazado.
- `documentacion/01,02,04,06,08,10`, `seguridad-api.md` y los `.mmd` todavía nombran
  `IsStoreStaff` / `IsStoreAdmin`, que ya no existen. Es documentación de arquitectura,
  no de RBAC, y queda por refrescar.
- Sin commit ni push de F1 a F7 (no se pidieron). El árbol de trabajo conserva los
  cambios ajenos listados arriba; `frontend/src/pages/Seguridad.jsx` mezcla el ajuste
  de diseño ajeno con el cambio de `scopesDe`.
- Sin desplegar ni publicar nada.
