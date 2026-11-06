import functools
import hashlib
import logging
import secrets
from datetime import timedelta
from decimal import Decimal
from uuid import UUID

import bcrypt
import jwt
from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, connection, transaction
from django.db.models import Count, Sum
from django.utils import timezone, translation
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, throttle_scope
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView as DRFAPIView

from . import i18n, services, tokens
from .models import (
    AccessoryCategory,
    AccessoryCompatibility,
    AccessoryType,
    Accion,
    Configuration,
    ConfigurationDetail,
    Inventory,
    InventoryMovement,
    Marca,
    Model3D,
    Motorcycle,
    MotorcycleBrand,
    MotorcycleModel,
    MovementType,
    Product,
    ProductCategory,
    Quote,
    QuoteDetail,
    QuoteStatusHistory,
    Recurso,
    RecursoAccion,
    Role,
    RolRecurso,
    Store,
    SubscriptionPlan,
    TipoProducto,
    User,
    UserRole,
)
from .security import (
    EscribirConPermiso,
    HasPermiso,
    IsSuperAdmin,
    ROLE_ADMIN,
    ROLE_CUSTOMER,
    ROLE_SELLER,
    ROLE_SUPERADMIN,
    es_rol_de_sede,
    es_superadmin,
    filas_del_scope,
    politica_de_la_operacion,
    puede_asignar_rol,
    mismo_identificador,
    normalizar_concesiones,
    scopes_concedidos,
)
from .serializers import (
    AccionSerializer,
    AccesorioInputSerializer,
    AccesorioSerializer,
    TipoProductoSerializer,
    ConfigurationSerializer,
    ErrorSerializer,
    ForgotRequestSerializer,
    HealthSerializer,
    InventoryInputSerializer,
    InventoryMovementSerializer,
    InventorySerializer,
    MarcaSerializer,
    LoginRequestSerializer,
    LoginResponseSerializer,
    MessageSerializer,
    Model3DSerializer,
    MotorcycleBrandSerializer,
    MotorcycleModelSerializer,
    MotorcycleSerializer,
    MovementTypeSerializer,
    ProductCategorySerializer,
    ProductSerializer,
    ProfileResponseSerializer,
    QuoteCreateSerializer,
    QuoteSerializer,
    QuoteStatusHistorySerializer,
    QuoteStatusUpdateSerializer,
    RecursoAccionSerializer,
    RecursoConPermisosSerializer,
    RecursoSerializer,
    RegisterRequestSerializer,
    RegisterResponseSerializer,
    ResetRequestSerializer,
    RoleSerializer,
    RolRecursoSerializer,
    RootSerializer,
    StoreSerializer,
    SubscriptionPlanSerializer,
    UserSerializer,
)


logger = logging.getLogger("motopreview.api")
QUOTE_STATES = services.QUOTE_STATES

# Forma del resumen cuando no hay nada que medir (aún).
RESUMEN_VACIO = {
    clave: {"cantidad": 0, "total": Decimal("0")}
    for clave in ("ventas_dia", "por_cobrar", "pedidos_pendientes")
}


def database_unavailable():
    if settings.DATABASE_URL:
        return None
    return Response(
        {
            "error": (
                "Falta configurar MOTOPREVIEW_DATABASE_URL con la conexión "
                "a la base PostgreSQL existente."
            )
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


class ServiceUnavailable(APIException):
    """Base de datos no configurada: 503 con el mismo mensaje de siempre."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Servicio no disponible."


def require_database(view_func):
    """Para vistas-función: responde 503 si la base no está configurada.

    Se aplica por debajo de `@api_view`, de modo que la autenticación y los
    permisos se evalúan antes que la disponibilidad de la base.
    """

    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        unavailable = database_unavailable()
        if unavailable:
            return unavailable
        return view_func(request, *args, **kwargs)

    return wrapper


class DatabaseGuardMixin(DRFAPIView):
    """Para vistas-clase: comprueba la base tras autenticación y permisos.

    Levanta la excepción en `initial`, después de `super().initial()`, para
    conservar el orden de DRF (401/403 primero; 503 solo si la petición pasó
    los permisos).
    """

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        unavailable = database_unavailable()
        if unavailable:
            detail = unavailable.data.get("error") or ServiceUnavailable.default_detail
            raise ServiceUnavailable(detail)

    def check_object_permissions(self, request, obj):
        """Mismo recorrido que hace `GenericAPIView`, pero en vistas propias.

        Estas clases no heredan de `GenericAPIView`, así que DRF nunca llamaba
        el chequeo de objeto y la matriz solo se consultaba contra el usuario
        que firma, nunca contra la fila apuntada por el `pk`.
        """
        for permiso in self.get_permissions():
            if not permiso.has_object_permission(request, self, obj):
                self.permission_denied(
                    request,
                    message=getattr(permiso, "message", None),
                    code=getattr(permiso, "code", None),
                )

    def filtrar_por_scope(self, request, queryset, *, campo_tienda="tienda_id",
                          campo_dueno=None):
        """(queryset, None) con las filas del alcance concedido, o (None, Response).

        El `Q` sale de los mismos scopes con los que la petición pasó los
        permisos, así que manipular un `pk` o un `?id_tienda=` no abre filas de
        otra tienda ni de otro dueño. Devuelve el `Response` en vez de lanzar
        para conservar los mensajes propios de cada ruta.
        """
        politica = politica_de_la_operacion(request, self)
        if not politica:
            return None, Response(
                {"error": "No tiene un alcance de filas sobre este recurso."},
                status=status.HTTP_403_FORBIDDEN,
            )
        recurso, accion = politica
        predicado, error = filas_del_scope(
            request.user,
            recurso,
            scopes_concedidos(request.user, recurso, accion),
            campo_tienda=campo_tienda,
            campo_dueno=campo_dueno,
        )
        if error:
            estado, mensaje = error
            return None, Response({"error": mensaje}, status=estado)
        return queryset.filter(predicado), None


def can_send_email():
    return bool(settings.EMAIL_HOST and settings.DEFAULT_FROM_EMAIL)


def send_user_email(*, to, subject, body):
    if not can_send_email():
        return False
    lang = translation.get_language() or i18n.DEFAULT_LANGUAGE
    subject = i18n.translate_text(subject, i18n.normalize(lang) or i18n.DEFAULT_LANGUAGE)
    body = i18n.translate_text(body, i18n.normalize(lang) or i18n.DEFAULT_LANGUAGE)
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        return True
    except Exception:
        logger.exception("No se pudo enviar un correo transaccional.")
        return False


def user_role_ids(user):
    return [str(role_id) for role_id in user.role_ids]


def es_cuenta_de_sede(user):
    """El usuario lleva el rol fijo de sede, lo haya activado la matriz o no."""
    return ROLE_SUPERADMIN.lower() in {str(rol).lower() for rol in (user_role_ids(user))}


def denegar_edicion_de_cuenta(request, user, *, toca_privilegios):
    """Los dos casos que la matriz no ve porque no son de una tienda.

    `usuarios:actualizar` es un permiso de personal: no puede bloquear ni
    desascender una cuenta de la sede, y nadie se reescribe el propio rol o el
    propio estado (así el bloqueo accidental de la única cuenta de sede queda
    cerrado). La autoelevación la cierra `puede_asignar_rol`.
    """
    if not toca_privilegios:
        return None
    if es_cuenta_de_sede(user) and not es_superadmin(request.user):
        return Response(
            {"error": "No está autorizado a editar una cuenta de la sede."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if mismo_identificador(
            getattr(user, "id_usuario", None), getattr(request.user, "id_usuario", None)):
        return Response(
            {"error": "El propio rol y el propio estado los cambia otra cuenta."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def resolver_tienda_cotizacion(user, tienda_solicitada=None):
    """Devuelve (id_tienda, error) para la cotización que se va a crear.

    Gana la tienda del usuario autenticado; el ``id_tienda`` de la petición solo
    se usa cuando el usuario no pertenece a ninguna, y aun así tiene que ser
    una tienda activa. Se resuelve al crear porque una cotización con tienda
    nula no aparece en el panel de ninguna tienda: queda huérfana.
    """
    tienda_id = getattr(user, "id_tienda", None) or tienda_solicitada
    if not tienda_id:
        return None, (
            "No se pudo determinar la tienda de la cotización. "
            "Inicia sesión desde una tienda o envía id_tienda."
        )
    tienda = Store.objects.filter(pk=tienda_id, estado_tienda="activa").first()
    if not tienda:
        return None, "La tienda indicada no existe o no está activa."
    return tienda.id_tienda, None


def scope_configurations(view, request, *, pk=None):
    """(queryset, None) o (None, Response) con las configuraciones del alcance.

    `tienda` se alcanza por el dueño de la ficha (`usuario__tienda`): la tabla
    `configuracion` no tiene columna de tienda, así que el personal de tienda ve
    las fichas de los usuarios de su tienda y el cliente las suyas.
    """
    queryset = Configuration.objects.select_related("usuario", "moto__modelo__marca").prefetch_related(
        "detalles__categoria_accesorio"
    )
    queryset, error = view.filtrar_por_scope(
        request, queryset, campo_tienda="usuario__tienda", campo_dueno="usuario_id"
    )
    if error:
        return None, error
    return (queryset.filter(pk=pk), None) if pk else (queryset, None)


def prime_user_roles(users):
    """Precarga los roles de una lista de usuarios en 2 queries (evita el N+1 del serializer)."""
    users = list(users)
    if not users:
        return
    ids = [u.id_usuario for u in users]
    by_user = {}
    for row in UserRole.objects.filter(id_usuario__in=ids).values("id_usuario", "id_rol"):
        by_user.setdefault(row["id_usuario"], []).append(row["id_rol"])
    roles = {
        r.id_rol: r for r in Role.objects.filter(pk__in={rid for v in by_user.values() for rid in v})
    }
    for u in users:
        u._cached_role_ids = by_user.get(u.id_usuario, [])
        first = u._cached_role_ids[0] if u._cached_role_ids else None
        u._cached_role = roles.get(first) if first else None


def user_payload(user):
    return UserSerializer(user).data


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def password_matches(password, stored_hash):
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def issue_jwt(user):
    if not settings.JWT_SECRET:
        raise APIException("Configura JWT_SECRET o SESSION_SECRET para habilitar el inicio de sesión.")
    now = timezone.now()
    role_id = user.id_rol
    return jwt.encode(
        {
            "id_usuario": str(user.id_usuario),
            "id_rol": str(role_id) if role_id else None,
            "id_tienda": str(user.id_tienda) if user.id_tienda else None,
            "iat": now,
            "exp": now + timedelta(seconds=settings.JWT_LIFETIME_SECONDS),
            "iss": settings.JWT_ISSUER,
        },
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def link_with_token(base_url, token):
    # Enlace estilo path (/verificar/<token>, /restablecer/<token>) para
    # coincidir con las rutas del frontend (App.jsx: /verificar/:token y
    # /restablecer/:token).
    return f"{base_url.rstrip('/')}/{token}"


def update_user_role(user_id, role_id):
    # ORM en vez del SQL crudo anterior (mismo efecto, sin identificadores
    # entrecomillados a mano y dentro de la transacción del llamador).
    UserRole.objects.filter(id_usuario=user_id).delete()
    UserRole.objects.create(id_usuario=user_id, id_rol=role_id)


def inventory_status(stock, minimum):
    return services.inventory_status(stock, minimum)


DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
PAGE_PARAMS = "Parámetros de paginación: ?pagina=<n> y ?por_pagina=<1-100>."


def paginate_response(request, queryset, serializer_class, *, context=None):
    """Respuesta de listado con paginación opcional de servidor.

    Sin `?pagina=` devuelve el array plano histórico (compatible con el
    frontend actual). Con `?pagina=` devuelve:
    ``{count, pagina, por_pagina, total_paginas, resultados: [...]}``.
    """
    serializer_kwargs = {"context": context if context is not None else {"request": request}}
    page_value = request.query_params.get("pagina")
    if page_value is None:
        return Response(serializer_class(queryset, many=True, **serializer_kwargs).data)

    try:
        page = int(page_value)
    except (TypeError, ValueError):
        page = 0
    if page < 1:
        return Response(
            {"error": f"pagina debe ser un número entero mayor que 0. {PAGE_PARAMS}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    size_value = request.query_params.get("por_pagina", DEFAULT_PAGE_SIZE)
    try:
        page_size = int(size_value)
    except (TypeError, ValueError):
        page_size = 0
    if page_size < 1 or page_size > MAX_PAGE_SIZE:
        return Response(
            {"error": f"por_pagina debe estar entre 1 y {MAX_PAGE_SIZE}. {PAGE_PARAMS}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    total = queryset.count()
    total_pages = max((total + page_size - 1) // page_size, 1)
    offset = (page - 1) * page_size
    rows = list(queryset[offset : offset + page_size])
    return Response(
        {
            "count": total,
            "pagina": page,
            "por_pagina": page_size,
            "total_paginas": total_pages,
            "resultados": serializer_class(rows, many=True, **serializer_kwargs).data,
        }
    )


@extend_schema(responses={200: RootSerializer})
@api_view(["GET"])
@permission_classes([AllowAny])
def root(request):
    lang = getattr(request, "lang", i18n.DEFAULT_LANGUAGE)
    return Response(
        {"mensaje": i18n.translate_text("API de MotoPreview con Django funcionando.", lang)}
    )


@extend_schema(responses={200: HealthSerializer, 503: HealthSerializer})
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    if not settings.DATABASE_URL:
        return Response(
            {"ok": False, "database_configured": False, "database_connected": False},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    connected = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        connected = True
    except Exception:
        connected = False
    return Response(
        {
            "ok": connected,
            "database_configured": True,
            "database_connected": connected,
        },
        status=200 if connected else status.HTTP_503_SERVICE_UNAVAILABLE,
    )


class ResourceCollection(DatabaseGuardMixin):
    model = None
    serializer_class = None

    permission_classes = [EscribirConPermiso]

    # La subclase debe declarar el recurso RBAC que protege sus mutaciones.
    permiso_recurso = None
    permiso_accion = None
    permiso_detalle = False
    # `None` obliga a declarar: True = la lectura es la vidriera del catálogo y
    # se sirve sin sesión; False = leer también pasa por la matriz.
    lectura_sin_matriz = None

    # Relaciones que anida el serializer. Sin esto cada fila dispara un SELECT
    # por relación, y contra una base remota ese coste es un viaje de red por fila.
    queryset_relaciones = ()

    def get_queryset(self):
        queryset = self.model.objects.all()
        if self.queryset_relaciones:
            queryset = queryset.select_related(*self.queryset_relaciones)
        return queryset

    def get(self, request):
        queryset = self.get_queryset()
        return paginate_response(request, queryset, self.serializer_class)

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                instance = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "El registro entra en conflicto con una restricción de la base de datos."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            self.serializer_class(instance, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ResourceDetail(DatabaseGuardMixin):
    model = None
    serializer_class = None
    not_found_message = "Registro no encontrado."

    permission_classes = [EscribirConPermiso]

    # La subclase debe declarar el recurso RBAC que protege sus mutaciones.
    permiso_recurso = None
    permiso_accion = None
    # Un `pk` en la ruta es detalle (`leer`), no listado (`listar`): son acciones
    # distintas de la matriz y conceder una no concede la otra.
    permiso_detalle = True

    queryset_relaciones = ()

    def get_object(self, pk):
        queryset = self.model.objects.all()
        if self.queryset_relaciones:
            queryset = queryset.select_related(*self.queryset_relaciones)
        instance = queryset.get(pk=pk)
        self.check_object_permissions(self.request, instance)
        return instance

    def get(self, request, pk):

        try:
            instance = self.get_object(pk)
        except self.model.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)
        return Response(self.serializer_class(instance, context={"request": request}).data)

    def put(self, request, pk):
        return self.update(request, pk, partial=False)

    def patch(self, request, pk):
        return self.update(request, pk, partial=True)

    def update(self, request, pk, *, partial):

        try:
            instance = self.get_object(pk)
        except self.model.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(
            instance, data=request.data, partial=partial, context={"request": request}
        )
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                updated = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "La actualización entra en conflicto con datos existentes."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(self.serializer_class(updated, context={"request": request}).data)

    def delete(self, request, pk):

        try:
            instance = self.get_object(pk)
        except self.model.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)
        try:
            with transaction.atomic():
                instance.delete()
        except IntegrityError:
            return Response(
                {"error": "No se puede eliminar porque hay registros relacionados."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response({"mensaje": "Registro eliminado."})


class CategoryCollection(ResourceCollection):
    model = ProductCategory
    serializer_class = ProductCategorySerializer
    permiso_recurso = "categorias"
    lectura_sin_matriz = True


class CategoryDetail(ResourceDetail):
    model = ProductCategory
    serializer_class = ProductCategorySerializer
    permiso_recurso = "categorias"
    not_found_message = "Categoría no encontrada."
    lectura_sin_matriz = True


class BrandCollection(ResourceCollection):
    model = MotorcycleBrand
    serializer_class = MotorcycleBrandSerializer
    permiso_recurso = "marcas"
    lectura_sin_matriz = True


class BrandDetail(ResourceDetail):
    model = MotorcycleBrand
    serializer_class = MotorcycleBrandSerializer
    permiso_recurso = "marcas"
    not_found_message = "Marca no encontrada."
    lectura_sin_matriz = True


class ModelCollection(ResourceCollection):
    model = MotorcycleModel
    serializer_class = MotorcycleModelSerializer
    permiso_recurso = "modelos"
    lectura_sin_matriz = True

    def get_queryset(self):
        return MotorcycleModel.objects.select_related("marca").all()


class ModelDetail(ResourceDetail):
    model = MotorcycleModel
    serializer_class = MotorcycleModelSerializer
    permiso_recurso = "modelos"
    not_found_message = "Modelo de moto no encontrado."
    queryset_relaciones = ("marca",)
    lectura_sin_matriz = True


class MotorcycleCollection(ResourceCollection):
    model = Motorcycle
    serializer_class = MotorcycleSerializer
    permiso_recurso = "motos"
    lectura_sin_matriz = True

    def get_queryset(self):
        return Motorcycle.objects.select_related("modelo__marca").all()


class MotorcycleDetail(ResourceDetail):
    model = Motorcycle
    serializer_class = MotorcycleSerializer
    permiso_recurso = "motos"
    not_found_message = "Moto no encontrada."
    queryset_relaciones = ("modelo__marca",)
    lectura_sin_matriz = True


class RoleCollection(ResourceCollection):
    model = Role
    serializer_class = RoleSerializer
    permiso_recurso = "roles"
    # La lista de roles ya es información de administración: qué roles existen y
    # cuáles están activos no le sirve a la vidriera.
    lectura_sin_matriz = False


class RoleDetail(ResourceDetail):
    model = Role
    serializer_class = RoleSerializer
    permiso_recurso = "roles"
    not_found_message = "Rol no encontrado."
    lectura_sin_matriz = False

    def update(self, request, pk, *, partial):
        try:
            role = self.get_object(pk)
        except self.model.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)
        if es_rol_de_sede(role) and not es_superadmin(request.user):
            # `activo=False` en el rol de sede apaga el bypass para toda la
            # plataforma: es un apagón, no una edición de catálogo.
            return Response(
                {"error": "El rol de la sede solo lo edita la sede."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, pk, partial=partial)

    def delete(self, request, pk):
        from api.models import RolRecurso

        try:
            role = self.get_object(pk)
        except self.model.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)

        if es_rol_de_sede(role):
            return Response(
                {"error": "No se puede eliminar el rol de Superadmin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Los permisos del rol se eliminan con él (no tienen sentido solos)
            RolRecurso.objects.filter(rol=role).delete()
            try:
                role.delete()
            except IntegrityError:
                # FK restantes: usuarios con este rol en usuario_rol
                return Response(
                    {
                        "error": "No se puede eliminar el rol porque hay usuarios "
                        "asignados. Reasígnalos a otro rol primero."
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        return Response({"mensaje": "Rol eliminado."})


class StoreCollection(ResourceCollection):
    model = Store
    serializer_class = StoreSerializer
    permiso_recurso = "tiendas"
    # A diferencia del resto del catálogo (categorías, marcas, motos), la ficha
    # de una tienda lleva NIT, dirección, teléfono y correo: no es material de
    # vitrina y no debe leerse sin sesión.
    permission_classes = [IsAuthenticated & EscribirConPermiso]
    # `True` aquí no abre la lectura al anónimo (eso lo cierra `IsAuthenticated`):
    # deja que el vendedor lea su propia ficha en `/admin/tienda`, que es lo que
    # hace hoy y la semilla no le concede `tiendas:leer`.
    lectura_sin_matriz = True

    def get_queryset(self):
        # La ficha de la propia tienda no se filtra por la matriz: el vendedor
        # tiene declarada la lectura sin concesión `tiendas:leer` (así carga
        # /admin/tienda) y un filtro por scopes le habría quitado su propia fila.
        # El resultado es el mismo que daría la matriz: sede = todas, tienda = una.
        if es_superadmin(self.request.user):
            return Store.objects.select_related("plan").all()
        # El listado completo de tiendas es del superadmin; el personal solo
        # obtiene la suya.
        tienda_id = getattr(self.request.user, "id_tienda", None)
        return Store.objects.select_related("plan").filter(id_tienda=tienda_id)


class StoreDetail(ResourceDetail):
    model = Store
    serializer_class = StoreSerializer
    permiso_recurso = "tiendas"
    permission_classes = [IsAuthenticated & EscribirConPermiso]
    not_found_message = "Tienda no encontrada."
    lectura_sin_matriz = True

    def get_object(self, pk):
        queryset = Store.objects.select_related("plan")
        if not es_superadmin(self.request.user):
            # El id del path no abre las fichas de otras tiendas: un administrador
            # autenticado solo ve la suya (y quien no tiene tienda, ninguna).
            queryset = queryset.filter(id_tienda=getattr(self.request.user, "id_tienda", None))
        return queryset.get(pk=pk)


class UserCollection(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    permiso_recurso = "usuarios"
    serializer_class = UserSerializer

    def get(self, request):

        queryset, error = self.filtrar_por_scope(request, User.objects.all())
        if error:
            return error
        # El filtro por tienda del query es una acotación encima del alcance: un
        # personal de tienda que pida otra tienda no recibe filas, no la otra.
        tienda_filtro = request.query_params.get("id_tienda")
        if tienda_filtro:
            try:
                tienda_filtro = UUID(str(tienda_filtro))
            except (TypeError, ValueError):
                return Response({"error": "id_tienda debe ser un UUID válido."}, status=400)
            queryset = queryset.filter(tienda_id=tienda_filtro)
        queryset = queryset.order_by("usu_nombre", "pk")
        if request.query_params.get("pagina") is None:
            # Sin paginación: precarga los roles en 2 queries (evita el N+1).
            users = list(queryset)
            prime_user_roles(users)
            return Response(UserSerializer(users, many=True).data)
        return paginate_response(request, queryset, UserSerializer)


class UserDetail(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    permiso_recurso = "usuarios"
    permiso_detalle = True
    serializer_class = UserSerializer

    def get_target(self, request, pk):
        queryset, error = self.filtrar_por_scope(request, User.objects.all())
        if error is not None:
            # Sin alcance de filas no hay usuario que mostrar: la ficha responde
            # 404, como cuando el `pk` es de otra tienda.
            return None
        user = queryset.filter(pk=pk).first()
        if user is not None:
            # El filtro de arriba ya cierra la puerta; esto es la comprobación
            # de la matriz contra la tienda del usuario editado.
            self.check_object_permissions(request, user)
        return user

    def get(self, request, pk):

        user = self.get_target(request, pk)
        if not user:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)

    def put(self, request, pk):
        return self.update_user(request, pk)

    def patch(self, request, pk):
        return self.update_user(request, pk)

    def update_user(self, request, pk):

        user = self.get_target(request, pk)
        if not user:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get("usu_nombre")
        state = request.data.get("estado_usuario")
        role_id = request.data.get("id_rol")
        password = request.data.get("password")
        valid_states = {"activo", "inactivo", "bloqueado"}
        if state is not None and state not in valid_states:
            return Response({"error": "estado_usuario no es válido."}, status=400)
        rol_destino = None
        if role_id is not None:
            rol_destino = Role.objects.filter(pk=role_id).first()
            if not rol_destino:
                return Response({"error": "El rol indicado no existe."}, status=400)
            if not puede_asignar_rol(request.user, rol_destino):
                return Response(
                    {"error": "No está autorizado a asignar el rol indicado."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        error = denegar_edicion_de_cuenta(
            request, user, toca_privilegios=(state is not None or rol_destino is not None))
        if error:
            return error
        if password is not None:
            password_error = services.validar_password(password)
            if password_error:
                return Response({"error": password_error}, status=400)

        try:
            with transaction.atomic():
                if name is not None:
                    user.usu_nombre = name
                if state is not None:
                    user.estado_usuario = state
                if password:
                    user.password_hash = hash_password(password)
                user.save()
                if role_id is not None:
                    update_user_role(user.id_usuario, role_id)
        except IntegrityError:
            return Response({"error": "No se pudo actualizar el usuario."}, status=409)
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):

        user = self.get_target(request, pk)
        if not user:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        error = denegar_edicion_de_cuenta(request, user, toca_privilegios=True)
        if error:
            return error
        user.estado_usuario = "bloqueado"
        user.save(update_fields=["estado_usuario"])
        return Response(
            {"mensaje": "Usuario desactivado.", "usuario": {"id_usuario": str(user.id_usuario)}}
        )


class Model3DCollection(ResourceCollection):
    model = Model3D
    serializer_class = Model3DSerializer
    permiso_recurso = "modelos3d"
    lectura_sin_matriz = True

    def get_queryset(self):
        return Model3D.objects.select_related("accesorio").all()


class Model3DDetail(ResourceDetail):
    model = Model3D
    serializer_class = Model3DSerializer
    permiso_recurso = "modelos3d"
    not_found_message = "Modelo 3D no encontrado."
    queryset_relaciones = ("accesorio",)
    lectura_sin_matriz = True


class CompatibilityByModelo(DatabaseGuardMixin):
    """Accesorios para el configurador (catálogo público).

    Tras el cambio de esquema la compatibilidad ya no se filtra por
    categoría/moto: se devuelven todos los productos marcados como
    accesorio. El filtrado por tipo se hace en el frontend.
    """
    permission_classes = [AllowAny]
    serializer_class = AccesorioSerializer
    permiso_recurso = "productos"
    lectura_sin_matriz = True

    def get(self, request, id_modelo_moto):
        productos = (
            Product.objects.filter(es_accesorio=True)
            .select_related("categoria_producto", "marca")
            .prefetch_related("tipos")
            .order_by("nombre")
        )
        return Response(AccesorioSerializer(productos, many=True).data)


class Model3DByAccessory(DatabaseGuardMixin):
    permission_classes = [AllowAny]
    serializer_class = Model3DSerializer

    def get(self, request, id_accesorio):
        # El parámetro es el id del accesorio (producto); el modelo 3D se
        # asocia a su categoría. También acepta un id de categoría directo.
        categoria_id = None
        producto = Product.objects.filter(pk=id_accesorio).only(
            "id_producto", "categoria_accesorio_id"
        ).first()
        if producto:
            categoria_id = producto.categoria_accesorio_id
        model = None
        if categoria_id:
            model = Model3D.objects.filter(accesorio_id=categoria_id).first()
        if not model:
            model = Model3D.objects.filter(accesorio_id=id_accesorio).first()
        if not model:
            return Response(
                {"error": "Este accesorio no tiene modelo 3D asociado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(Model3DSerializer(model).data)


# (Compatibilidad por categoria retirada: el Configurador ahora filtra por tipo de producto)

class InventoryCollection(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = InventorySerializer
    permiso_recurso = "inventario"

    def get_queryset(self, request):
        return Inventory.objects.select_related(
            "tienda__plan",
            "producto__categoria_producto",
            "producto__categoria_accesorio",
            "producto__tipo_accesorio",
        )

    def get(self, request):

        rows, error = self.filtrar_por_scope(request, self.get_queryset(request))
        if error:
            return error
        return paginate_response(request, rows, InventorySerializer)

    @extend_schema(
        request=InventoryInputSerializer,
        responses={201: InventorySerializer, 400: ErrorSerializer, 403: ErrorSerializer, 409: ErrorSerializer},
    )
    def post(self, request):

        if not request.user.id_tienda:
            return Response({"error": "El usuario no tiene una tienda asignada."}, status=400)

        input_serializer = InventoryInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response({"error": input_serializer.errors}, status=400)
        values = input_serializer.validated_data
        # Los accesorios viven en la tabla producto: id_accesorio e
        # id_producto identifican la misma fila de producto.
        product_id = values.get("id_producto") or values.get("id_accesorio")
        product = Product.objects.filter(pk=product_id).first()
        if not product:
            return Response({"error": "El producto no existe."}, status=400)

        store = Store.objects.select_related("plan").filter(pk=request.user.id_tienda).first()
        if not store:
            return Response({"error": "Tienda no encontrada."}, status=400)
        current_count = Inventory.objects.filter(tienda_id=store.id_tienda).count()
        product_limit = store.plan.limite_productos if store.plan_id else None
        if product_limit is not None and current_count >= product_limit:
            return Response(
                {"error": f"Se alcanzó el límite de {product_limit} productos de este plan."},
                status=status.HTTP_403_FORBIDDEN,
            )

        stock = values["stock_actual"]
        minimum = values["stock_minimo"]
        price = values.get("precio", product.precio)
        try:
            instance = Inventory.objects.create(
                tienda_id=store.id_tienda,
                producto_id=product_id,
                stock_actual=stock,
                stock_minimo=minimum,
                estado_inventario=inventory_status(stock, minimum),
                fecha_actualizacion=timezone.localdate(),
                precio=price,
            )
        except IntegrityError:
            return Response(
                {"error": "Ya existe inventario para este producto en la tienda."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(InventorySerializer(instance).data, status=status.HTTP_201_CREATED)


class InventoryDetail(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = InventorySerializer
    permiso_recurso = "inventario"
    permiso_detalle = True

    def get(self, request, pk):

        queryset, error = self.filtrar_por_scope(
            request,
            Inventory.objects.select_related(
                "tienda__plan",
                "producto",
                "producto__categoria_accesorio",
                "producto__tipo_accesorio",
            ),
        )
        if error:
            return error
        instance = queryset.filter(pk=pk).first()
        if not instance:
            return Response(
                {"error": "Registro de inventario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(InventorySerializer(instance).data)


class InventoryMovementView(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = InventoryMovementSerializer
    # La tabla `movimiento_inventario` no tiene recurso propio sembrado: el
    # asiento de inventario se autoriza con `inventario:crear`.
    permiso_recurso = "inventario"

    def post(self, request):

        required = ("id_inventario", "id_tipomov", "mov_cantidad")
        missing = [field for field in required if field not in request.data]
        if missing:
            return Response(
                {"error": f"Campos obligatorios: {', '.join(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            amount = int(request.data["mov_cantidad"])
        except (TypeError, ValueError):
            return Response({"error": "mov_cantidad debe ser un entero."}, status=400)

        filas, error = self.filtrar_por_scope(request, Inventory.objects.all())
        if error:
            return error

        try:
            with transaction.atomic():
                inventory = filas.select_for_update().filter(
                    pk=request.data["id_inventario"]
                ).first()
                if not inventory:
                    return Response(
                        {"error": "Registro de inventario no encontrado para esta tienda."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                movement_type = MovementType.objects.filter(pk=request.data["id_tipomov"]).first()
                if not movement_type:
                    return Response({"error": "Tipo de movimiento no encontrado."}, status=404)

                type_name = movement_type.tipomov_nombre.lower()
                amount = services.apply_movement(amount, type_name)
                new_stock = inventory.stock_actual + amount
                if new_stock < 0:
                    return Response(
                        {"error": "El movimiento dejaría el stock en negativo."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                movement = InventoryMovement.objects.create(
                    inventario=inventory,
                    tipo=movement_type,
                    usuario=request.user,
                    mov_cantidad=amount,
                    observaciones=request.data.get("observaciones"),
                )
                inventory.stock_actual = new_stock
                inventory.estado_inventario = inventory_status(new_stock, inventory.stock_minimo)
                inventory.fecha_actualizacion = timezone.localdate()
                inventory.save(
                    update_fields=["stock_actual", "estado_inventario", "fecha_actualizacion"]
                )
        except IntegrityError:
            return Response({"error": "No se pudo registrar el movimiento."}, status=409)
        except services.BusinessError as error:
            return Response({"error": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "movimiento": InventoryMovementSerializer(movement).data,
                "inventarioActualizado": InventorySerializer(inventory).data,
            },
            status=status.HTTP_201_CREATED,
        )


class QuoteCollection(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = QuoteSerializer
    permiso_recurso = "cotizaciones"

    def get(self, request):

        queryset, error = self.filtrar_por_scope(
            request,
            Quote.objects.select_related(
                "tienda", "usuario", "moto__modelo__marca"
            ).prefetch_related("detalle_cotizacion__categoria_accesorio"),
            campo_dueno="usuario_id",
        )
        if error:
            return error
        return paginate_response(
            request, queryset.order_by("-fecha_solicitud", "pk"), QuoteSerializer
        )

    @extend_schema(
        request=QuoteCreateSerializer,
        responses={201: QuoteSerializer, 400: ErrorSerializer, 409: ErrorSerializer},
    )
    def post(self, request):

        serializer = QuoteCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)
        values = serializer.validated_data
        tienda_id, tienda_error = resolver_tienda_cotizacion(
            request.user, values.get("id_tienda")
        )
        if tienda_error:
            return Response({"error": tienda_error}, status=400)
        motorcycle = None
        if values.get("id_moto"):
            motorcycle = Motorcycle.objects.filter(pk=values["id_moto"]).first()
            if not motorcycle:
                return Response({"error": "La moto indicada no existe."}, status=400)

        accessory_ids = [item["id_accesorio"] for item in values["items"]]
        # Los accesorios son filas de producto (tabla unificada); el detalle
        # de la cotización guarda su categoría.
        productos = {
            str(producto.id_producto): producto
            for producto in Product.objects.filter(
                pk__in=accessory_ids, es_accesorio=True
            )
        }
        if len(productos) != len(accessory_ids):
            return Response({"error": "Uno o más accesorios no existen."}, status=400)

        try:
            prepared, total = services.calc_quote(
                values["items"], productos, max_items=settings.QUOTE_MAX_ITEMS
            )
        except services.BusinessError as error:
            return Response({"error": str(error)}, status=400)

        try:
            with transaction.atomic():
                quote = Quote.objects.create(
                    tienda_id=tienda_id,
                    usuario=request.user,
                    moto=motorcycle,
                    coti_estado="pendiente",
                    total=total,
                    coti_observaciones=values.get("coti_observaciones"),
                    nombre_configuracion=values.get("nombre_configuracion"),
                )
                for producto, quantity, price, subtotal in prepared:
                    QuoteDetail.objects.create(
                        cotizacion=quote,
                        categoria_accesorio_id=producto.categoria_accesorio_id,
                        cantidad=quantity,
                        precio_unitario=price,
                        subtotal=subtotal,
                    )
        except IntegrityError:
            return Response({"error": "No se pudo guardar la cotización."}, status=409)
        quote = Quote.objects.select_related("tienda", "usuario", "moto__modelo__marca").prefetch_related(
            "detalle_cotizacion__categoria_accesorio"
        ).get(pk=quote.id_cotizacion)
        return Response(QuoteSerializer(quote).data, status=status.HTTP_201_CREATED)


class QuoteDetailView(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = QuoteSerializer
    permiso_recurso = "cotizaciones"
    permiso_detalle = True

    def get(self, request, pk):

        queryset, error = self.filtrar_por_scope(
            request,
            Quote.objects.select_related("tienda", "usuario", "moto__modelo__marca").prefetch_related(
                "detalle_cotizacion__categoria_accesorio"
            ),
            campo_dueno="usuario_id",
        )
        if error:
            return error
        quote = queryset.filter(pk=pk).first()
        if not quote:
            return Response({"error": "Cotización no encontrada."}, status=404)
        return Response(QuoteSerializer(quote).data)


class QuoteStatus(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = QuoteSerializer
    permiso_recurso = "cotizaciones"
    permiso_detalle = True
    # Cambiar el estado es una actualización de la cotización, no una creación,
    # y el verbo POST no lo puede deducir la matriz.
    permiso_accion = "actualizar"

    @extend_schema(
        request=QuoteStatusUpdateSerializer,
        responses={200: QuoteSerializer, 400: ErrorSerializer, 404: ErrorSerializer},
    )
    def put(self, request, pk):
        return self.update_status(request, pk)

    @extend_schema(
        request=QuoteStatusUpdateSerializer,
        responses={200: QuoteSerializer, 400: ErrorSerializer, 404: ErrorSerializer},
    )
    def patch(self, request, pk):
        return self.update_status(request, pk)

    def update_status(self, request, pk):

        new_state = request.data.get("coti_estado")
        if new_state not in QUOTE_STATES:
            return Response(
                {"error": f"coti_estado debe ser uno de: {', '.join(sorted(QUOTE_STATES))}."},
                status=400,
            )
        filas, error = self.filtrar_por_scope(
            request, Quote.objects.all(), campo_dueno="usuario_id"
        )
        if error:
            return error

        try:
            with transaction.atomic():
                quote = filas.select_for_update().filter(pk=pk).first()
                if not quote:
                    return Response({"error": "Cotización no encontrada para esta tienda."}, status=404)
                if not services.allow_state_transition(quote.coti_estado, new_state):
                    return Response(
                        {
                            "error": f"No se puede pasar de '{quote.coti_estado}' a '{new_state}'."
                        },
                        status=400,
                    )
                quote.coti_estado = new_state
                quote.save(update_fields=["coti_estado"])
                QuoteStatusHistory.objects.create(
                    cotizacion=quote,
                    estado=new_state,
                    fecha=timezone.now(),
                    usuario=request.user,
                )
        except IntegrityError:
            return Response({"error": "No se pudo actualizar el estado de la cotización."}, status=409)

        if quote.usuario_id:
            recipient = quote.usuario
            send_user_email(
                to=recipient.usu_email,
                subject="Actualización de tu cotización MotoPreview",
                body=(
                    f"Hola {recipient.usu_nombre}, el estado de tu cotización "
                    f"cambió a {new_state}. Total: {quote.total}."
                ),
            )
        return Response(QuoteSerializer(quote).data)


@extend_schema(
    request=RegisterRequestSerializer,
    responses={201: RegisterResponseSerializer, 400: ErrorSerializer, 403: ErrorSerializer, 409: ErrorSerializer},
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("register")
@require_database
def register(request):
    name = str(request.data.get("usu_nombre", "")).strip()
    email = str(request.data.get("usu_email", "")).strip()
    password = request.data.get("password", "")
    role_id = str(request.data.get("id_rol", "")).strip()
    if not name or not email or not password or not role_id:
        return Response(
            {"error": "Faltan campos obligatorios: usu_nombre, usu_email, password, id_rol."},
            status=400,
        )
    password_error = services.validar_password(password)
    if password_error:
        return Response({"error": password_error}, status=400)
    if User.objects.filter(usu_email__iexact=email).exists():
        return Response({"error": "Ya existe un usuario con ese email."}, status=409)
    role = Role.objects.filter(pk=role_id).first()
    if not role:
        return Response({"error": "El rol indicado no existe."}, status=400)

    role_name = role.nombre_rol.lower()
    is_customer = role_id.lower() == ROLE_CUSTOMER.lower() or role_name == "cliente"
    is_admin = bool(getattr(request.user, "is_authenticated", False)) and (
        ROLE_ADMIN.lower() in {role.lower() for role in user_role_ids(request.user)}
        or es_superadmin(request.user)
    )
    if not is_customer and not is_admin:
        return Response(
            {"error": "Solo un administrador autenticado puede registrar usuarios de tienda."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not puede_asignar_rol(request.user, role):
        # El rol de sede no se autopercibe desde el registro: un administrador de
        # tienda con `usuarios:crear` crearía una cuenta global con solo cambiar
        # `id_rol` en el body.
        return Response(
            {"error": "No está autorizado a asignar el rol indicado."},
            status=status.HTTP_403_FORBIDDEN,
        )

    user_store = getattr(request.user, "id_tienda", None)
    es_autenticado = bool(getattr(request.user, "is_authenticated", False))
    es_super = es_autenticado and es_superadmin(request.user)

    # La vidriera pública es la única que trae tienda en el body. Cuando registra
    # el personal, la cuenta nace en la tienda de quien registra: si no, un
    # administrador adscribe clientes a la tienda vecina. El superadmin puede
    # elegir la tienda (o dejarla global = None) para crear usuarios sin tienda.
    if es_autenticado and not es_super:
        store_id = user_store
    else:
        store_id = request.data.get("id_tienda")
        if store_id in (None, "", "null"):
            store_id = None

    if store_id is not None:
        try:
            store_id = UUID(str(store_id))
        except (TypeError, ValueError):
            return Response({"error": "id_tienda debe ser un UUID válido."}, status=400)
        if not Store.objects.filter(pk=store_id, estado_tienda="activa").exists():
            return Response(
                {"error": "La tienda indicada no existe o no está activa."}, status=400
            )

    if not is_customer:
        if store_id is None:
            if not es_super:
                return Response(
                    {"error": "El administrador no tiene una tienda asignada."}, status=400
                )
            # Usuario global (sin tienda): solo el superadmin puede crearlo.
        else:
            store = Store.objects.select_related("plan").filter(pk=store_id).first()
            if not store:
                return Response(
                    {"error": "La tienda indicada no existe o no está activa."}, status=400
                )
            plan = store.plan
            limit = plan.limite_usuarios if plan else None
            active_staff = User.objects.filter(
                tienda_id=store_id,
                id_usuario__in=UserRole.objects.filter(
                    id_rol__in=[ROLE_ADMIN, ROLE_SELLER]
                ).values("id_usuario"),
            ).exclude(estado_usuario="bloqueado").count()
            if limit is not None and active_staff >= limit:
                return Response(
                    {"error": f"Se alcanzó el límite de {limit} empleados del plan."},
                    status=status.HTTP_403_FORBIDDEN,
                )

    try:
        with transaction.atomic():
            user = User.objects.create(
                tienda_id=store_id,
                usu_nombre=name,
                usu_email=email,
                password_hash=hash_password(password),
                estado_usuario="activo",
                email_verificado=not is_customer,
            )
            update_user_role(user.id_usuario, role.id_rol)
    except IntegrityError:
        return Response(
            {"error": "No se pudo registrar el usuario; revisa si el correo ya existe."},
            status=status.HTTP_409_CONFLICT,
        )

    message = "Usuario creado con éxito."
    if is_customer:
        if can_send_email():
            raw_token = tokens.verification_token_for(user)
            link = link_with_token(settings.EMAIL_VERIFICATION_URL, raw_token)
            sent = send_user_email(
                to=email,
                subject="Verifica tu correo de MotoPreview",
                body=f"Hola {name}, confirma tu correo en este enlace: {link}",
            )
            if not sent:
                message = "Usuario creado, pero no se pudo enviar el correo de verificación."
        else:
            message = "Usuario creado. El envío de verificación requiere configurar el correo SMTP."
    return Response(
        {"mensaje": message, "usuario": user_payload(user)},
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    methods=["POST"],
    request=LoginRequestSerializer,
    responses={200: LoginResponseSerializer, 400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer},
)
@extend_schema(methods=["GET"], responses={200: MessageSerializer})
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("auth")
@require_database
def login(request):
    if request.method == "GET":
        # Solo para mostrar el formulario en el DRF navegable.
        return Response(
            {"mensaje": "Usa POST con usu_email y password para iniciar sesión."}
        )
    email = str(request.data.get("usu_email", "")).strip()
    password = request.data.get("password", "")
    if not email or not password:
        return Response({"error": "Email y contraseña son obligatorios."}, status=400)
    user = User.objects.filter(usu_email__iexact=email).first()
    if not user or not password_matches(password, user.password_hash):
        return Response({"error": "Credenciales inválidas."}, status=401)
    if user.estado_usuario != "activo":
        return Response({"error": "Usuario inactivo o bloqueado."}, status=403)
    if not user.email_verificado:
        return Response(
            {"error": "Debes verificar tu correo antes de iniciar sesión."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        token = issue_jwt(user)
    except APIException as error:
        return Response({"error": str(error.detail)}, status=503)
    payload = user_payload(user)
    # Puente para el navegador: guarda el token y el rol en la sesión para
    # que el DRF navegable los use solos en las siguientes peticiones.
    # No debe bloquear el login si la sesión falla (el token ya va en la respuesta).
    try:
        request.session["jwt"] = token
        request.session["usu_nombre"] = user.usu_nombre
        request.session["rol_nombre"] = (payload.get("rol") or {}).get("nombre_rol")
    except Exception:  # noqa: BLE001
        pass
    return Response({"mensaje": "Login exitoso.", "token": token, "usuario": payload})


@extend_schema(responses={200: ProfileResponseSerializer})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    return Response(
        {
            "mensaje": "Acceso concedido.",
            "datos_del_token": {
                "id_usuario": str(request.user.id_usuario),
                "id_rol": str(request.user.id_rol) if request.user.id_rol else None,
                "id_tienda": str(request.user.id_tienda) if request.user.id_tienda else None,
            },
        }
    )


@extend_schema(responses={200: MessageSerializer})
@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    request.session.flush()
    return Response({"mensaje": "Sesión cerrada."})


@extend_schema(responses={200: MessageSerializer, 400: ErrorSerializer})
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("email")
@require_database
def verify_email(request, token):
    user = None
    try:
        payload = tokens.parse_verification_token(token)
        user = User.objects.filter(pk=payload.get("id_usuario")).first()
    except jwt.PyJWTError:
        # Compatibilidad: enlaces generados antes de los tokens firmados.
        user = User.objects.filter(verificacion_token=token).first()
    if not user:
        return Response(
            {"error": "El enlace de verificación es inválido o ya fue usado."}, status=400
        )
    if user.email_verificado:
        return Response({"mensaje": "Correo ya verificado."})
    user.email_verificado = True
    user.verificacion_token = None
    user.save(update_fields=["email_verificado", "verificacion_token"])
    return Response({"mensaje": "Correo verificado con éxito."})


@extend_schema(
    request=ForgotRequestSerializer,
    responses={200: MessageSerializer, 400: ErrorSerializer, 503: ErrorSerializer},
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("email")
@require_database
def forgot_password(request):
    email = str(request.data.get("usu_email", "")).strip()
    if not email:
        return Response({"error": "El correo es obligatorio."}, status=400)
    if not can_send_email():
        return Response(
            {"error": "El servicio de correo SMTP no está configurado."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    user = User.objects.filter(usu_email__iexact=email).first()
    generic_message = "Si el correo existe, enviaremos un enlace de recuperación."
    if not user:
        return Response({"mensaje": generic_message})

    raw_token = secrets.token_urlsafe(32)
    user.reset_token = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    user.reset_token_expira = timezone.now() + timedelta(hours=1)
    user.save(update_fields=["reset_token", "reset_token_expira"])
    link = link_with_token(settings.PASSWORD_RESET_URL, raw_token)
    sent = send_user_email(
        to=user.usu_email,
        subject="Recupera tu contraseña de MotoPreview",
        body=f"Hola {user.usu_nombre}, solicita una nueva contraseña en este enlace: {link}",
    )
    if not sent:
        return Response({"error": "No se pudo enviar el correo de recuperación."}, status=503)
    return Response({"mensaje": generic_message})


@extend_schema(
    request=ResetRequestSerializer,
    responses={200: MessageSerializer, 400: ErrorSerializer},
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("auth")
@require_database
def reset_password(request):
    token = request.data.get("token")
    password = request.data.get("password")
    if not token or not password:
        return Response({"error": "Token y nueva contraseña son obligatorios."}, status=400)
    password_error = services.validar_password(password)
    if password_error:
        return Response({"error": password_error}, status=400)

    token_hash = hashlib.sha256(str(token).encode("utf-8")).hexdigest()
    user = User.objects.filter(
        reset_token=token_hash,
        reset_token_expira__gt=timezone.now(),
    ).first()
    if not user:
        return Response({"error": "El enlace es inválido o ya expiró."}, status=400)

    user.password_hash = hash_password(password)
    user.reset_token = None
    user.reset_token_expira = None
    user.save(update_fields=["password_hash", "reset_token", "reset_token_expira"])
    return Response({"mensaje": "Contraseña actualizada con éxito."})


# ---------------------------------------------------------------------------
# Recursos de catálogo adicionales (lectura pública, escritura por la matriz)
# ---------------------------------------------------------------------------
class ProductCollection(ResourceCollection):
    model = Product
    serializer_class = ProductSerializer
    permiso_recurso = "productos"
    lectura_sin_matriz = True

    def get_queryset(self):
        return Product.objects.select_related(
            "categoria_producto", "categoria_accesorio", "tipo_accesorio"
        ).all()

    def get(self, request):
        # La vidriera lista TODOS los productos (accesorio o no) en la forma plana
        # que consumen tarjeta, carrito y cotización; la escritura sigue el
        # contrato de ProductSerializer.
        return paginate_response(request, self.get_queryset(), AccesorioSerializer)


class ProductDetail(ResourceDetail):
    model = Product
    serializer_class = ProductSerializer
    permiso_recurso = "productos"
    not_found_message = "Producto no encontrado."
    queryset_relaciones = ("categoria_producto", "categoria_accesorio", "tipo_accesorio")
    lectura_sin_matriz = True

    def get(self, request, pk):
        try:
            instance = self.get_object(pk)
        except Product.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)
        return Response(AccesorioSerializer(instance).data)


class ProductCategoryCollection(ResourceCollection):
    model = ProductCategory
    serializer_class = ProductCategorySerializer
    permiso_recurso = "categorias"
    lectura_sin_matriz = True


class ProductCategoryDetail(ResourceDetail):
    model = ProductCategory
    serializer_class = ProductCategorySerializer
    permiso_recurso = "categorias"
    not_found_message = "Categoría de producto no encontrada."
    lectura_sin_matriz = True


class TipoProductoCollection(ResourceCollection):
    model = TipoProducto
    serializer_class = TipoProductoSerializer
    permiso_recurso = "tipos"
    lectura_sin_matriz = True


class TipoProductoDetail(ResourceDetail):
    model = TipoProducto
    serializer_class = TipoProductoSerializer
    permiso_recurso = "tipos"
    not_found_message = "Tipo de producto no encontrado."
    lectura_sin_matriz = True

class MarcaCollection(ResourceCollection):
    model = Marca
    serializer_class = MarcaSerializer
    permiso_recurso = "marcas"
    lectura_sin_matriz = True


class MarcaDetail(ResourceDetail):
    model = Marca
    serializer_class = MarcaSerializer
    permiso_recurso = "marcas"
    not_found_message = "Marca no encontrada."
    lectura_sin_matriz = True



class AccesoriosCollection(ResourceCollection):
    model = Product
    serializer_class = AccesorioSerializer
    permiso_recurso = "productos"
    lectura_sin_matriz = True

    def get_queryset(self):
        return Product.objects.select_related(
            "categoria_producto", "marca"
        ).prefetch_related("tipos").filter(es_accesorio=True)

    def get(self, request):
        return paginate_response(request, self.get_queryset(), AccesorioSerializer)

    @extend_schema(
        request=AccesorioInputSerializer,
        responses={201: AccesorioSerializer, 400: ErrorSerializer, 409: ErrorSerializer},
    )
    def post(self, request):
        input_serializer = AccesorioInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response({"error": input_serializer.errors}, status=400)
        campos = input_serializer.to_fields(input_serializer.validated_data)
        tipos = campos.pop("_tipos", None)
        try:
            with transaction.atomic():
                instance = Product.objects.create(es_accesorio=True, **campos)
                if tipos is not None:
                    instance.tipos.set(tipos)
        except IntegrityError:
            return Response(
                {"error": "Ya existe un accesorio con ese código SKU."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(AccesorioSerializer(instance).data, status=status.HTTP_201_CREATED)


class AccesorioDetail(DatabaseGuardMixin):
    serializer_class = AccesorioSerializer
    not_found_message = "Accesorio no encontrado."
    permission_classes = [EscribirConPermiso]
    permiso_recurso = "productos"
    permiso_detalle = True
    lectura_sin_matriz = True

    def get_object(self, pk):
        # Sin filtro por `es_accesorio`: el visualizador abre cualquier producto
        # del catálogo, y la ficha plana es la misma para accesorios y no accesorios.
        return Product.objects.select_related(
            "categoria_producto", "marca"
        ).prefetch_related("tipos").get(pk=pk)

    def get(self, request, pk):
        try:
            instance = self.get_object(pk)
        except Product.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)
        return Response(AccesorioSerializer(instance).data)

    @extend_schema(
        request=AccesorioInputSerializer,
        responses={200: AccesorioSerializer, 400: ErrorSerializer, 404: ErrorSerializer},
    )
    def put(self, request, pk):
        try:
            instance = self.get_object(pk)
        except Product.DoesNotExist:
            return Response({"error": self.not_found_message}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, instance)
        input_serializer = AccesorioInputSerializer(instance, data=request.data, partial=True)
        if not input_serializer.is_valid():
            return Response({"error": input_serializer.errors}, status=400)
        campos = input_serializer.to_fields(input_serializer.validated_data)
        tipos = campos.pop("_tipos", None)
        for campo, valor in campos.items():
            setattr(instance, campo, valor)
        try:
            with transaction.atomic():
                instance.save()
                if tipos is not None:
                    instance.tipos.set(tipos)
        except IntegrityError:
            return Response(
                {"error": "Ya existe un accesorio con ese código SKU."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(AccesorioSerializer(instance).data)


class MovementTypeCollection(ResourceCollection):
    model = MovementType
    serializer_class = MovementTypeSerializer
    permiso_recurso = "inventario"
    # Los tipos de movimiento son catálogo interno de inventario: se listan con
    # `inventario:listar`, no como vidriera.
    lectura_sin_matriz = False


class MovementTypeDetail(ResourceDetail):
    model = MovementType
    serializer_class = MovementTypeSerializer
    permiso_recurso = "inventario"
    not_found_message = "Tipo de movimiento no encontrado."
    lectura_sin_matriz = False


class SubscriptionPlanCollection(ResourceCollection):
    model = SubscriptionPlan
    serializer_class = SubscriptionPlanSerializer
    permiso_recurso = "tiendas"
    lectura_sin_matriz = False


class SubscriptionPlanDetail(ResourceDetail):
    model = SubscriptionPlan
    serializer_class = SubscriptionPlanSerializer
    permiso_recurso = "tiendas"
    not_found_message = "Plan de suscripción no encontrado."
    lectura_sin_matriz = False


class ConfigurationCollection(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = ConfigurationSerializer
    permiso_recurso = "configuraciones"

    def get(self, request):
        queryset, error = scope_configurations(self, request)
        if error:
            return error
        return paginate_response(request, queryset, ConfigurationSerializer)


class ConfigurationDetail(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = ConfigurationSerializer
    permiso_recurso = "configuraciones"
    permiso_detalle = True

    def get(self, request, pk):
        queryset, error = scope_configurations(self, request, pk=pk)
        if error:
            return error
        instance = queryset.first()
        if not instance:
            return Response({"error": "Configuración no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ConfigurationSerializer(instance).data)


class QuoteHistoryView(DatabaseGuardMixin):
    permission_classes = [HasPermiso]
    serializer_class = QuoteStatusHistorySerializer
    permiso_recurso = "cotizaciones"
    permiso_detalle = True

    def get(self, request, pk):
        filas, error = self.filtrar_por_scope(
            request, Quote.objects.all(), campo_dueno="usuario_id"
        )
        if error:
            return error
        if not filas.filter(pk=pk).exists():
            return Response({"error": "Cotización no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        history = QuoteStatusHistory.objects.filter(cotizacion_id=pk).select_related("usuario").order_by(
            "-fecha", "pk"
        )
        return Response(QuoteStatusHistorySerializer(history, many=True).data)


def _magnitud(agregado):
    """Fila de ``aggregate()``/``values().annotate()`` con ceros por defecto.

    Una tienda sin cotizaciones en el grupo simplemente no aparece, así que el
    agregado llega vacío.
    """
    return {
        "cantidad": agregado.get("cantidad") or 0,
        "total": agregado.get("total") or Decimal("0"),
    }


def resumen_tienda(tienda_id, hoy):
    """Métricas del día de una sola tienda.

    ``ventas_dia`` usa el historial de estados (la fecha real del cambio a
    ``completada``), no ``fecha_solicitud``; el ``id__in`` deduplica las
    cotizaciones con varias entradas del mismo día.
    """
    cotizaciones = Quote.objects.filter(tienda_id=tienda_id)
    ventas_ids = QuoteStatusHistory.objects.filter(
        estado="completada", fecha__date=hoy, cotizacion__tienda_id=tienda_id
    ).values_list("cotizacion_id", flat=True)

    return {
        "ventas_dia": _magnitud(
            Quote.objects.filter(id_cotizacion__in=list(ventas_ids)).aggregate(
                cantidad=Count("id_cotizacion"), total=Sum("total")
            )
        ),
        "por_cobrar": _magnitud(
            cotizaciones.filter(coti_estado="aprobada").aggregate(
                cantidad=Count("id_cotizacion"), total=Sum("total")
            )
        ),
        "pedidos_pendientes": _magnitud(
            cotizaciones.filter(coti_estado="pendiente").aggregate(
                cantidad=Count("id_cotizacion"), total=Sum("total")
            )
        ),
    }


def _por_tienda(consulta):
    return {fila["tienda_id"]: fila for fila in consulta}


def resumen_global(hoy):
    """Consolidado de todas las tiendas activas, con su desglose en ``tiendas``.

    Agrupa por tienda en tres consultas en lugar de medir tienda por tienda: con
    varias tiendas, el bucle habría hecho 12+ consultas en cada carga del panel.
    """
    ventas = _por_tienda(
        Quote.objects.filter(
            id_cotizacion__in=list(
                QuoteStatusHistory.objects.filter(estado="completada", fecha__date=hoy).values_list(
                    "cotizacion_id", flat=True
                )
            )
        )
        .exclude(tienda_id__isnull=True)
        .values("tienda_id")
        .annotate(cantidad=Count("id_cotizacion"), total=Sum("total"))
    )
    por_cobrar = _por_tienda(
        Quote.objects.exclude(tienda_id__isnull=True)
        .filter(coti_estado="aprobada")
        .values("tienda_id")
        .annotate(cantidad=Count("id_cotizacion"), total=Sum("total"))
    )
    pendientes = _por_tienda(
        Quote.objects.exclude(tienda_id__isnull=True)
        .filter(coti_estado="pendiente")
        .values("tienda_id")
        .annotate(cantidad=Count("id_cotizacion"), total=Sum("total"))
    )

    tiendas = []
    consolidado = {
        clave: {"cantidad": 0, "total": Decimal("0")}
        for clave in ("ventas_dia", "por_cobrar", "pedidos_pendientes")
    }
    for tienda in Store.objects.filter(estado_tienda="activa").order_by("nombre_tienda"):
        clave = tienda.id_tienda
        fila = {
            "id_tienda": str(clave),
            "nombre": tienda.nombre_tienda,
            "estado": tienda.estado_tienda,
            "ventas_dia": _magnitud(ventas.get(clave, {})),
            "por_cobrar": _magnitud(por_cobrar.get(clave, {})),
            "pedidos_pendientes": _magnitud(pendientes.get(clave, {})),
        }
        tiendas.append(fila)
        for nombre_metrica, magnitud in fila.items():
            if nombre_metrica in consolidado:
                consolidado[nombre_metrica]["cantidad"] += magnitud["cantidad"]
                consolidado[nombre_metrica]["total"] += magnitud["total"]

    consolidado["tiendas"] = tiendas
    return consolidado


class ReporteResumenView(DatabaseGuardMixin):
    """Resumen del día para el panel.

    * Personal de tienda: siempre las métricas de SU tienda; ``id_tienda`` no
      abre una brecha entre tiendas.
    * Superadmin: sin ``id_tienda`` recibe el consolidado de todas las tiendas
      activas (con el desglose en ``tiendas``); con ``?id_tienda=`` recibe solo
      esa tienda, que es como llega desde el inventario de tiendas.

    No pasa por :meth:`filtrar_por_scope` porque no entrega filas: mide
    agregados. La decisión es la misma que sale de los scopes (sede = todas,
    tienda = la suya, cuenta sin tienda = ninguna) y el ``?id_tienda=`` solo lo
    mira la sede, así que no abre el resumen de otra tienda.
    """

    permission_classes = [HasPermiso]
    permiso_recurso = "ventas"

    def get(self, request):
        hoy = timezone.localdate()

        if es_superadmin(request.user):
            tienda_id = request.query_params.get("id_tienda")
            if not tienda_id:
                return Response({"fecha": hoy.isoformat(), **resumen_global(hoy)})
            try:
                tienda_id = UUID(str(tienda_id))
            except (TypeError, ValueError):
                return Response({"error": "id_tienda debe ser un UUID válido."}, status=400)
            tienda = Store.objects.filter(pk=tienda_id).first()
            if not tienda:
                return Response({"error": "Tienda no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            return Response(
                {
                    "fecha": hoy.isoformat(),
                    "tienda": {"id_tienda": str(tienda.id_tienda), "nombre": tienda.nombre_tienda},
                    **resumen_tienda(tienda.id_tienda, hoy),
                }
            )

        tienda_id = request.user.id_tienda
        if not tienda_id:
            # Personal de tienda mal asignado (sin tienda): ceros en vez de un 400
            # que dejaría el panel sin cargar.
            return Response({"fecha": hoy.isoformat(), **RESUMEN_VACIO})
        return Response({"fecha": hoy.isoformat(), **resumen_tienda(tienda_id, hoy)})


# ============================================================================
# RBAC Views
# ============================================================================

class RecursoCollection(ResourceCollection):
    model = Recurso
    serializer_class = RecursoSerializer
    permission_classes = [IsSuperAdmin]


class RecursoDetail(ResourceDetail):
    model = Recurso
    serializer_class = RecursoSerializer
    permission_classes = [IsSuperAdmin]
    not_found_message = "Recurso no encontrado."


class AccionCollection(ResourceCollection):
    model = Accion
    serializer_class = AccionSerializer
    permission_classes = [IsSuperAdmin]


class AccionDetail(ResourceDetail):
    model = Accion
    serializer_class = AccionSerializer
    permission_classes = [IsSuperAdmin]
    not_found_message = "Acción no encontrada."


class RecursoAccionCollection(ResourceCollection):
    model = RecursoAccion
    serializer_class = RecursoAccionSerializer
    # El catálogo recurso-acción es global: un admin de tienda no debe poder
    # crear ni borrar combinaciones que luego verá toda la organización.
    permission_classes = [IsSuperAdmin]
    queryset_relaciones = ("recurso", "accion")


class RecursoAccionDetail(ResourceDetail):
    model = RecursoAccion
    serializer_class = RecursoAccionSerializer
    permission_classes = [IsSuperAdmin]
    not_found_message = "Recurso-Acción no encontrado."


class RolRecursoCollection(ResourceCollection):
    model = RolRecurso
    serializer_class = RolRecursoSerializer
    permission_classes = [IsSuperAdmin]
    # Anida la combinación, y esa anida recurso y acción: sin el join serían
    # tres consultas por concesión.
    queryset_relaciones = ("recurso_accion__recurso", "recurso_accion__accion")


class RolRecursoDetail(ResourceDetail):
    model = RolRecurso
    serializer_class = RolRecursoSerializer
    permission_classes = [IsSuperAdmin]
    not_found_message = "Permiso de rol no encontrado."


class RecursoConPermisosCollection(DatabaseGuardMixin):
    """Obtiene recursos con sus permisos para un rol específico"""
    permission_classes = [IsSuperAdmin]
    serializer_class = RecursoConPermisosSerializer

    def get(self, request):
        rol_id = request.query_params.get("rol_id")
        if not rol_id:
            return Response({"error": "Se requiere rol_id"}, status=status.HTTP_400_BAD_REQUEST)

        from api.models import Recurso, RecursoAccion, RolRecurso
        recursos = list(Recurso.objects.filter(activo=True).order_by("orden"))

        # Dos consultas globales en vez de dos por recurso (evita N+1)
        combos_por_recurso = {}
        for ra in (
            RecursoAccion.objects.filter(activo=True)
            .select_related("accion")
            .order_by("recurso__orden", "accion__orden")
        ):
            combos_por_recurso.setdefault(ra.recurso_id, []).append(ra)
        concedidos = {
            rr.recurso_accion_id: rr.scope
            for rr in RolRecurso.objects.filter(rol_id=rol_id, activo=True)
        }

        serializer = self.serializer_class(
            recursos,
            many=True,
            context={
                "rol_id": rol_id,
                "combos_por_recurso": combos_por_recurso,
                "concedidos": concedidos,
            },
        )
        return Response(serializer.data)


# ============================================================================
# RBAC - Permisos de usuario y roles
# ============================================================================

class PermisosUsuarioView(DatabaseGuardMixin):
    """Obtiene los permisos del usuario autenticado"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from api.models import RolRecurso, RecursoAccion
        user = request.user
        
        # Superadmin tiene todos los permisos
        if es_superadmin(user):
            # Obtener todos los recurso-acción activos
            from api.models import RecursoAccion
            raqs = RecursoAccion.objects.filter(activo=True).select_related(
                "recurso", "accion"
            ).order_by("recurso__orden", "accion__orden")
            permisos = []
            for ra in raqs:
                permisos.append({
                    "id_recurso_accion": str(ra.id_recurso_accion),
                    "recurso": ra.recurso.codigo,
                    "recurso_nombre": ra.recurso.nombre,
                    "accion": ra.accion.codigo,
                    "accion_nombre": ra.accion.nombre,
                    "scope": "global",
                    "activo": True,
                })
            return Response({"permisos": permisos})
        
        # Usuario normal: permisos de sus roles
        permisos_qs = RolRecurso.objects.filter(
            rol_id__in=user.role_ids,
            activo=True,
            # Los mismos filtros con los que decide la autorización: un rol
            # desactivado no puede seguir pintando puertas en la interfaz.
            rol__activo=True,
            recurso_accion__activo=True,
            recurso_accion__recurso__activo=True,
            recurso_accion__accion__activo=True,
        ).select_related(
            "recurso_accion__recurso", "recurso_accion__accion", "rol"
        ).order_by("recurso_accion__recurso__orden", "recurso_accion__accion__orden")
        
        permisos = []
        for rr in permisos_qs:
            permisos.append({
                "id_recurso_accion": str(rr.recurso_accion.id_recurso_accion),
                "recurso": rr.recurso_accion.recurso.codigo,
                "recurso_nombre": rr.recurso_accion.recurso.nombre,
                "accion": rr.recurso_accion.accion.codigo,
                "accion_nombre": rr.recurso_accion.accion.nombre,
                "scope": rr.scope,
                "activo": rr.activo,
            })
        return Response({"permisos": permisos})


class RolePermisosBulkUpdateView(DatabaseGuardMixin):
    """Actualización masiva de permisos para un rol (solo superadmin)"""
    permission_classes = [IsSuperAdmin]

    def put(self, request, pk):
        from api.models import Role, RolRecurso, RecursoAccion
        try:
            role = Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return Response({"error": "Rol no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        permisos = request.data.get("permisos", [])
        if not isinstance(permisos, list):
            return Response({"error": "Se espera una lista de permisos"}, status=status.HTTP_400_BAD_REQUEST)

        entradas = [
            (p.get("id_recurso_accion"), p.get("scope", "global")) if isinstance(p, dict)
            else (None, None)
            for p in permisos
        ]
        ids = [str(identificador).strip().lower()
               for identificador, _ in entradas if identificador]
        # Una sola lectura de la matriz: el identificador normalizado, el código del
        # recurso y si la combinación admite alcance. Con esto se valida antes de borrar.
        combinaciones = {
            str(id_recurso_accion).strip().lower(): (codigo_recurso, requiere_scope)
            for id_recurso_accion, codigo_recurso, requiere_scope in
            RecursoAccion.objects.filter(id_recurso_accion__in=ids).values_list(
                "id_recurso_accion", "recurso__codigo", "requiere_scope"
            )
        }
        normalizados, errores = normalizar_concesiones(entradas, combinaciones)
        if errores:
            return Response(
                {"error": "; ".join(errores), "errores": errores},
                status=status.HTTP_400_BAD_REQUEST,
            )

        concedente = getattr(request, "user", None)
        if concedente is not None and not getattr(concedente, "is_authenticated", False):
            concedente = None

        with transaction.atomic():
            # Aquí es donde el reemplazo es destructivo: todo lo que el body podía
            # echar a perder ya se rechazó arriba con 400.
            RolRecurso.objects.filter(rol=role).delete()
            RolRecurso.objects.bulk_create([
                RolRecurso(
                    rol_id=role.id_rol,
                    recurso_accion_id=entrada["id_recurso_accion"],
                    scope=entrada["scope"],
                    concedido_por=concedente,
                    activo=True,
                )
                for entrada in normalizados
            ])

        return Response({
            "mensaje": "Permisos actualizados correctamente",
            "permisos_creados": len(normalizados),
        }, status=status.HTTP_200_OK)
