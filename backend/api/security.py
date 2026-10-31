import logging

from django.db.models import Q
from rest_framework.permissions import BasePermission
from django.utils.module_loading import import_string


logger = logging.getLogger(__name__)


ROLE_SUPERADMIN = "00000000-0000-0000-0000-000000000000"
ROLE_ADMIN = "11111111-0000-0000-0000-000000000001"      # Admin de tienda
ROLE_SELLER = "11111111-0000-0000-0000-000000000002"
ROLE_CUSTOMER = "11111111-0000-0000-0000-000000000003"


def has_any_role(user, role_ids):
    if not getattr(user, "is_authenticated", False):
        return False
    allowed = {str(value).lower() for value in role_ids}
    return any(str(value).lower() in allowed for value in user.role_ids)


_CACHE_SUPERADMIN = "rol_superadmin_vigente"


def es_superadmin(user):
    """Cuenta Superadmin vigente, no solo el rótulo del token.

    `role_ids` sale de `usuario_rol` sin mirar la tabla `rol`, así que un rol
    desactivado seguía abriendo todas las puertas con bypass. Aquí se exige que
    el rol fijo de sede esté activo, y la cuenta tiene que estarlo también.

    El resultado se guarda en el atributo `rol_superadmin_vigente` de la
    instancia: las vistas de listado preguntan varias veces por petición y la
    consulta a `rol` es la misma. Lo escribe esta función (o las pruebas).
    """
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "estado_usuario", None) not in (None, "activo"):
        return False
    role_ids = [str(rol).lower() for rol in (getattr(user, "role_ids", None) or [])]
    if ROLE_SUPERADMIN.lower() not in role_ids:
        return False

    cached = getattr(user, _CACHE_SUPERADMIN, None)
    if cached is not None:
        return cached

    from api.models import Role

    vigente = Role.objects.filter(pk=ROLE_SUPERADMIN, activo=True).exists()
    try:
        setattr(user, _CACHE_SUPERADMIN, vigente)
    except (AttributeError, TypeError):
        pass
    return vigente


def es_rol_de_sede(rol):
    """El rol privilegiado, por su marca o por el UUID fijo que usa el bypass.

    Se comprueban las dos cosas porque la marca la pone una siembra y el UUID es
    una constante del código: si solo se mira una, la fila del otro nombre queda
    desprotegida.
    """
    if rol is None:
        return False
    return (str(rol.pk).lower() == ROLE_SUPERADMIN.lower()
            or bool(getattr(rol, "es_superadmin", False)))


def puede_asignar_rol(solicitante, rol_destino):
    """Qué rol puede poner el solicitante en la cuenta de alguien.

    Sin esta traba un administrador de tienda —que tiene `usuarios:actualizar`
    en la semilla— se ascendía a sí mismo o a un tercero con `id_rol` de sede en
    `PUT /api/usuarios/<pk>`, y el registro público aceptaba cualquier rol
    existente. El rol de sede solo lo mueve un superadmin vigente.
    """
    if rol_destino is None:
        return True
    if es_superadmin(solicitante):
        return True
    return not es_rol_de_sede(rol_destino)


def get_recurso_from_view(view):
    """
    Recurso RBAC sobre el que actúa la vista.

    Lo único válido es el atributo `permiso_recurso` de la vista. Antes se
    infería del path con un mapa de prefijos, y eso autorizaba de forma
    silenciosa contra el recurso equivocado: `/api/modelos-moto` contenía
    "moto" y caía en `motos`, mientras `/api/modelos-3d` no matcheaba nada.
    Una vista sin el atributo se deniega y se registra, en vez de adivinar.
    """
    recurso = getattr(view, "permiso_recurso", None)
    if not recurso:
        logger.warning(
            "La vista %s no declara permiso_recurso; la operación se deniega.",
            type(view).__name__,
        )
    return recurso


def get_accion_from_method(method, detalle=False):
    """Mapea el método HTTP a la acción RBAC; `None` si la acción no existe.

    `leer` (detalle) y `listar` (colección) son acciones distintas de la matriz,
    así que una subclase debe saber en cuál de las dos está. Antes todo GET
    caía en `listar` y un `GET /api/usuarios/<pk>` se autorizaba con el permiso
    del listado. Un método fuera del mapeo devuelve `None` y la vista se deniega
    en vez de heredar `leer`.
    """
    if method in ("GET", "HEAD"):
        return "leer" if detalle else "listar"
    return {
        "POST": "crear",
        "PUT": "actualizar",
        "PATCH": "actualizar",
        "DELETE": "eliminar",
    }.get(method)


# Recursos cuya tabla sí tiene la dimensión del scope. Un alcance 'tienda'
# sobre `producto` no se puede satisfacer: la tabla no tiene columna de tienda,
# así que la semilla grantaría escritura global a una tienda concreta. Esas
# concesiones se deniegan en vez de convertirse en un acceso entre tiendas;
# la corrección correcta está en los datos, no aquí.
# `configuraciones` no tiene columna de tienda propia: la alcanza por el dueño
# de la ficha (`usuario__tienda`), y `tiendas` es su propia fila (`id_tienda`).
RECURSOS_CON_TIENDA = {"inventario", "cotizaciones", "configuraciones", "ventas",
                       "usuarios", "tiendas"}
# Recursos con dueño individual (`id_usuario`), únicos donde 'propio' limita.
RECURSOS_CON_PROPIETARIO = {"cotizaciones", "configuraciones"}
# Los tres alcances que sabe leer la matriz. Fuera de esta lista una concesión
# no autoriza nada: `scope` es texto libre en la tabla y alguien puede escribir
# `todos`.
SCOPES = ("global", "tienda", "propio")


def normalizar_scope(scope):
    """El scope como lo lee la matriz: minúsculas, sin espacios, vacío es `global`.

    La columna es texto libre y la autorización cruza contra los tres valores de
    `SCOPES`, así que `Tienda ` o `TODOS` quedan guardados como concesiones que no
    autorizan nada pero que en el panel parecen un permiso vigente.
    """
    normalizado = str(scope if scope is not None else "").strip().lower()
    return normalizado or "global"


def scopes_validos(recurso_codigo, requiere_scope=True):
    """Alcances que una concesión sobre este recurso puede expresar.

    `global` siempre; los demás solo si la tabla tiene la dimensión con la que el
    filtrado los usaría (`RECURSOS_CON_TIENDA` / `RECURSOS_CON_PROPIETARIO`). Una
    combinación marcada `requiere_scope=False` se concede sobre todo el catálogo,
    no tiene fila a la que acotar.
    """
    opciones = ["global"]
    if requiere_scope:
        if recurso_codigo in RECURSOS_CON_TIENDA:
            opciones.append("tienda")
        if recurso_codigo in RECURSOS_CON_PROPIETARIO:
            opciones.append("propio")
    return tuple(opciones)


def validar_concesion(recurso_codigo, scope, requiere_scope=True):
    """(scope normalizado, None) o (None, motivo) antes de escribir una concesión.

    Se rechaza en lugar de corregir: reescribir un `tienda` inerte a `global`
    ampliaría el alcance sin que nadie lo pidiera. El que concede ve el motivo y
    elige; guardar la fila inerte sería peor, porque en el panel parece un permiso
    vigente y ocupa el lugar de la concesión real.
    """
    normalizado = normalizar_scope(scope)
    if normalizado not in SCOPES:
        return None, (f"scope '{scope}' no existe en la matriz; "
                      f"los válidos son {', '.join(SCOPES)}")
    admisibles = scopes_validos(recurso_codigo, requiere_scope)
    if normalizado not in admisibles:
        if not requiere_scope:
            return None, (f"'{recurso_codigo}' es una combinación sin alcance "
                          f"(requiere_scope=False); se concede en 'global'")
        return None, (f"'{recurso_codigo}' no tiene dimensión de '{normalizado}', así "
                      f"que esa concesión no filtraría filas; use "
                      f"{', '.join(admisibles)}")
    return normalizado, None


def normalizar_concesiones(entradas, combinaciones):
    """([entrada], errores) para reemplazar la matriz de un rol sin medias tintas.

    `combinaciones` es `{id_recurso_accion_normalizado: (codigo_recurso,
    requiere_scope)}` — la lectura única que hace quien escribe. Cada entrada es
    `(id_recurso_accion, scope)` y sale con el scope normalizado.

    Se valida todo antes de tocar la tabla: el reemplazo borra las concesiones
    vigentes, así que una entrada descartada en silencio deja al rol con menos
    permisos de los que la pantalla creía guardar. Por el mismo motivo un alcance
    que el recurso no puede expresar **se rechaza con su motivo**; reescribirlo a
    `global` daría acceso a todo el catálogo a quien pidió su tienda.

    Una combinación recibe un solo scope: la autorización une los scopes de todas
    las filas del rol, así que dos filas para el mismo par serían dos decisiones
    contradictorias y la interfaz solo muestra una (`concedidos` es un dict).
    """
    por_combinacion = {}
    errores = []
    for indice, (identificador, scope) in enumerate(entradas):
        if not identificador:
            errores.append(f"permisos[{indice}]: id_recurso_accion ausente o mal formado")
            continue
        clave = str(identificador).strip().lower()
        if clave not in combinaciones:
            errores.append(f"permisos[{indice}]: la combinación {clave[:8]}… no existe")
            continue
        codigo_recurso, requiere_scope = combinaciones[clave]
        normalizado, motivo = validar_concesion(
            codigo_recurso, scope, requiere_scope=requiere_scope
        )
        if motivo:
            errores.append(f"permisos[{indice}] ({codigo_recurso}): {motivo}")
            continue
        if clave in por_combinacion and por_combinacion[clave] != normalizado:
            errores.append(
                f"permisos[{indice}] ({codigo_recurso}): la combinación ya está "
                f"concedida en '{por_combinacion[clave]}'; una combinación lleva "
                f"un solo scope"
            )
            continue
        por_combinacion[clave] = normalizado
    return (
        [{"id_recurso_accion": clave, "scope": scope}
         for clave, scope in por_combinacion.items()],
        errores,
    )


def mismo_identificador(a, b):
    return a is not None and b is not None and str(a) == str(b)


def tienda_del_objeto(objeto):
    """Tienda a la que pertenece la fila, sin forzar la carga de la FK.

    `*_id` es la columna ya resuelta; `tienda` solo se lee cuando la vista no
    trae el join (una consulta por objeto, en rutas de escritura).
    """
    for nombre in ("id_tienda", "tienda_id"):
        valor = getattr(objeto, nombre, None)
        if valor is not None:
            return valor
    relacion = getattr(objeto, "tienda", None)
    if relacion is not None:
        return getattr(relacion, "id_tienda", None) or getattr(relacion, "pk", None)
    return None


def propietario_del_objeto(objeto):
    """Dueño individual de la fila (`id_usuario`), si la tabla lo tiene."""
    for nombre in ("id_usuario", "usuario_id"):
        valor = getattr(objeto, nombre, None)
        if valor is not None:
            return valor
    relacion = getattr(objeto, "usuario", None)
    if relacion is not None:
        return getattr(relacion, "id_usuario", None) or getattr(relacion, "pk", None)
    return None


def scopes_aplicables(user, recurso_codigo, tienda_destino=None, usuario_destino=None):
    """Scopes de la matriz que alcanzan al **objetivo**, no al llamador.

    `global` deja de ser incondicional. La semilla actual concede scope `global`
    al rol Admin de tienda en todos los recursos; leído al pie de la letra, un
    admin con tienda asignada podría escribir en la tienda vecina con solo
    cambiar el `pk`. Como ninguna pantalla legítima cruza tiendas (los listados
    de otras tiendas ya están restringidos al superadmin), la regla es:
    un usuario atado a una tienda no usa `global` sobre recursos con dimensión
    de tienda; un usuario sin tienda (sede) sí conserva el alcance total.
    """
    propia_tienda = getattr(user, "id_tienda", None)
    scopes = []

    if recurso_codigo in RECURSOS_CON_TIENDA:
        if propia_tienda:
            if tienda_destino is None or mismo_identificador(tienda_destino, propia_tienda):
                scopes.extend(("global", "tienda"))
            # Lo contrario es una fila de otra tienda: ningún alcance de este
            # usuario la cubre, así que no se ofrece ninguno.
        elif tienda_destino is None:
            # Cuenta sin tienda y sin fila concreta: se ofrece `global` para que
            # la pasen los permisos y el listado responda con el error de la
            # tienda asignada, que es el que muestra el panel. Con una fila
            # destino delante, `global` sería recorrer las tiendas ajenas.
            scopes.append("global")
    else:
        scopes.append("global")

    # 'propio' = sus registros: aplica cuando el destino es él mismo o no se
    # indicó destino (el filtrado por fila lo hace el queryset de la vista).
    if recurso_codigo in RECURSOS_CON_PROPIETARIO and (
            usuario_destino is None or mismo_identificador(usuario_destino,
                                                            getattr(user, "id_usuario", None))):
        scopes.append("propio")
    return scopes


_CACHE_SCOPES = "_scopes_concedidos_cache"


def scopes_concedidos(user, recurso_codigo, accion_codigo):
    """Scopes vigentes que la matriz concede para (recurso, acción).

    Es la misma lectura de `rol_recurso` que decide el permiso, pero devuelve
    los alcances en lugar de un `sí`, para que la vista filtre las filas con la
    decisión con la que se autorizó la petición. El resultado se guarda en la
    instancia porque autorización y filtrado preguntan por el mismo par en la
    misma petición: volver a la matriz por cada fila es el N+1 que ya costó
    quince segundos en el catálogo.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    # La autenticación ya rechaza al usuario bloqueado; se comprueba aquí porque
    # esta función también se llama desde scripts y desde el panel.
    if getattr(user, "estado_usuario", None) not in (None, "activo"):
        return set()
    if es_superadmin(user):
        # El bypass existe justo para no pedirle concesiones a la matriz.
        return set(SCOPES)

    clave = (str(recurso_codigo), str(accion_codigo))
    cache = getattr(user, _CACHE_SCOPES, None)
    if isinstance(cache, dict) and clave in cache:
        return cache[clave]

    role_ids = getattr(user, "role_ids", None)
    if not role_ids:
        concedidos = set()
    else:
        from api.models import RolRecurso

        concedidos = set(
            RolRecurso.objects.filter(
                rol_id__in=role_ids,
                activo=True,
                # Un rol desactivado no autoriza: la concesión sigue en la
                # tabla, pero nadie la tiene vigente.
                rol__activo=True,
                scope__in=SCOPES,
                recurso_accion__activo=True,
                recurso_accion__recurso__activo=True,
                recurso_accion__accion__activo=True,
                recurso_accion__recurso__codigo=recurso_codigo,
                recurso_accion__accion__codigo=accion_codigo,
            ).values_list("scope", flat=True)
        )

    if not isinstance(cache, dict):
        cache = {}
        try:
            setattr(user, _CACHE_SCOPES, cache)
        except (AttributeError, TypeError):
            pass
    cache[clave] = concedidos
    return concedidos


def usuario_tiene_permiso(user, recurso_codigo, accion_codigo, tienda_id=None, usuario_id=None):
    """
    Verifica si un usuario tiene permiso para una acción sobre un recurso.

    Comprueba la tabla rol_recurso con el scope correspondiente. Los varios roles
    del usuario se combinan con OR: basta una concesión en cualquiera de ellos
    que además alcance al objetivo. Superadmin tiene acceso total sin necesidad
    de permisos explícitos.
    """
    aplicables = set(scopes_aplicables(user, recurso_codigo, tienda_id, usuario_id))
    if not aplicables:
        return False
    return bool(scopes_concedidos(user, recurso_codigo, accion_codigo) & aplicables)


def filas_del_scope(user, recurso_codigo, scopes, *, campo_tienda="tienda_id", campo_dueno=None):
    """(Q, None) con las filas que alcanzan los scopes, o (None, (estado, mensaje)).

    El filtrado de listados, fichas y mutaciones sale de la misma matriz que
    autorizó la petición. Repetir a mano `request.user.id_tienda` daba los dos
    errores contrarios: el usuario de sede sin tienda asignada se quedaba sin
    filas propias y un cliente con scope `propio` recibía la tienda entera.
    """
    if es_superadmin(user):
        return Q(), None

    concedidos = set(scopes or ())
    if not concedidos:
        return None, (403, "No tiene un alcance de filas sobre este recurso.")

    con_dimension_tienda = recurso_codigo in RECURSOS_CON_TIENDA
    if "global" in concedidos and not con_dimension_tienda:
        # Tabla de catálogo, sin columna de tienda ni dueño: `global` es la
        # tabla completa, que es lo que es la vidriera.
        return Q(), None

    predicados = []
    if concedidos & set(("global", "tienda")) and con_dimension_tienda:
        propia_tienda = getattr(user, "id_tienda", None)
        if propia_tienda:
            predicados.append(Q(**{campo_tienda: propia_tienda}))
        elif campo_dueno is None:
            return None, (400, "El usuario no tiene una tienda asignada.")
    if (
            "propio" in concedidos
            and campo_dueno
            and recurso_codigo in RECURSOS_CON_PROPIETARIO):
        dueno = getattr(user, "id_usuario", None) or getattr(user, "pk", None)
        if dueno is not None:
            predicados.append(Q(**{campo_dueno: dueno}))

    if not predicados:
        return None, (403, "No tiene un alcance de filas sobre este recurso.")
    combinado = predicados[0]
    for predicado in predicados[1:]:
        combinado |= predicado
    return combinado, None


def politica_de_la_operacion(request, view):
    """(recurso, acción) de la matriz para esta petición.

    `None` cuando no hay política decidable: es el fallo seguro, sin recurso o
    sin acción no se adivina. Se deja fuera el caso de `OPTIONS`, que es
    metadatos de DRF y no entrega filas: quien lo necesite lo trata como
    petición sin política propia.
    """
    if getattr(request, "method", None) == "OPTIONS":
        return None
    recurso = get_recurso_from_view(view)
    accion = getattr(view, "permiso_accion", None) or get_accion_from_method(
        getattr(request, "method", None), detalle=getattr(view, "permiso_detalle", False)
    )
    if not recurso or not accion:
        return None
    return recurso, accion


class HasPermiso(BasePermission):
    """
    Permission class que verifica permisos usando el nuevo sistema RBAC.

    Uso en views:
        permission_classes = [HasPermiso]
        permiso_recurso = "productos"
        permiso_accion = "crear"   # opcional; por defecto se deriva del método
    """
    message = "No tiene permisos para realizar esta acción."

    def _politica(self, request, view):
        """(recurso, acción) de la matriz para esta petición.

        `()` cuando la petición no se rige por la matriz (OPTIONS: metadatos de
        DRF, no entrega filas) y `None` cuando no hay política declarable, que
        es el fallo seguro: sin recurso o sin acción no se adivina, se deniega.
        """
        if request.method == "OPTIONS":
            return ()
        return politica_de_la_operacion(request, view)

    def has_permission(self, request, view):
        politica = self._politica(request, view)
        if politica is None:
            return False
        if not politica:
            return True

        recurso, accion = politica
        # Todavía no hay fila concreta, así que el destino se toma del propio
        # usuario. `has_object_permission` revalida contra la fila cuando la
        # vista resuelve el `pk`.
        return usuario_tiene_permiso(
            request.user,
            recurso,
            accion,
            getattr(request.user, "id_tienda", None),
            getattr(request.user, "id_usuario", None),
        )

    def has_object_permission(self, request, view, obj):
        """Revalida contra la tienda y el dueño de la fila, no contra el autor.

        Sin esto, cambiar el `pk` por uno de otra tienda bastaba para escribir
        fuera del alcance concedido.
        """
        politica = self._politica(request, view)
        if politica is None:
            return False
        if not politica:
            return True

        recurso, accion = politica
        return usuario_tiene_permiso(
            request.user,
            recurso,
            accion,
            tienda_id=tienda_del_objeto(obj),
            usuario_id=propietario_del_objeto(obj),
        )



LECTURA_ABIERTA = ("GET", "HEAD", "OPTIONS")


class EscribirConPermiso(BasePermission):
    """Lectura según lo que declare la vista; mutaciones siempre por la matriz.

    Las vistas genéricas de catálogo declaraban `permission_classes`
    (IsSuperAdmin, IsStoreAdmin) encima de un `get_permissions()` que las
    ignoraba, así que el catálogo RBAC se leía sin autenticar. Al ser una
    clase de permiso, la subclase puede reemplazarla de verdad.

    La lectura la decide `lectura_sin_matriz`, que cada vista declara:
    `True` en el catálogo (la vidriera se enseña sin sesión) y `False` donde
    leer ya es información de administración. Sin declarar, la lectura pasa
    por la matriz: negar por defecto también aplica al GET.
    """
    message = HasPermiso.message

    def has_permission(self, request, view):
        if request.method in LECTURA_ABIERTA and getattr(view, "lectura_sin_matriz", False):
            return True
        return HasPermiso().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.method in LECTURA_ABIERTA and getattr(view, "lectura_sin_matriz", False):
            return True
        return HasPermiso().has_object_permission(request, view, obj)


class IsSuperAdmin(BasePermission):
    message = "Se requiere el rol de superadministrador."

    def has_permission(self, request, view):
        return es_superadmin(request.user)
