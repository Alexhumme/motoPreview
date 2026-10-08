import functools
import hashlib
import logging
import secrets
from datetime import timedelta
from uuid import UUID

import bcrypt
import jwt
from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, connection, transaction
from django.http import JsonResponse
from django.utils import timezone, translation
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, throttle_scope
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView as DRFAPIView

from . import i18n, services, tokens
from .models import (
    Accessory,
    AccessoryCategory,
    AccessoryCompatibility,
    Inventory,
    InventoryMovement,
    Model3D,
    Motorcycle,
    MotorcycleBrand,
    MotorcycleModel,
    MovementType,
    Product,
    Quote,
    QuoteDetail,
    QuoteStatusHistory,
    Role,
    Store,
    User,
    UserRole,
)
from .security import IsStoreAdmin, IsStoreStaff, ROLE_ADMIN, ROLE_CUSTOMER, ROLE_SELLER
from .serializers import (
    AccessoryCategorySerializer,
    AccessorySerializer,
    CompatibilitySerializer,
    InventoryInputSerializer,
    InventoryMovementSerializer,
    InventorySerializer,
    Model3DSerializer,
    MotorcycleBrandSerializer,
    MotorcycleModelSerializer,
    MotorcycleSerializer,
    ProductSerializer,
    QuoteCreateSerializer,
    QuoteSerializer,
    RoleSerializer,
    StoreSerializer,
    UserSerializer,
)


logger = logging.getLogger("motopreview.api")
QUOTE_STATES = services.QUOTE_STATES


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


def store_staff(user):
    roles = {role.lower() for role in user_role_ids(user)}
    return ROLE_ADMIN.lower() in roles or ROLE_SELLER.lower() in roles


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
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}token={token}"


def update_user_role(user_id, role_id):
    with connection.cursor() as cursor:
        cursor.execute('DELETE FROM "usuario_rol" WHERE "id_usuario" = %s', [user_id])
        cursor.execute(
            'INSERT INTO "usuario_rol" ("id_usuario", "id_rol") VALUES (%s, %s)',
            [user_id, role_id],
        )


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


def root(request):
    lang = getattr(request, "lang", i18n.DEFAULT_LANGUAGE)
    return JsonResponse(
        {"mensaje": i18n.translate_text("API de MotoPreview con Django funcionando.", lang)}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    if not settings.DATABASE_URL:
        return JsonResponse(
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
    return JsonResponse(
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

    def get_permissions(self):
        # Lectura pública; la escritura de catálogos es exclusiva de administradores.
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsStoreAdmin()]

    def get_queryset(self):
        return self.model.objects.all()

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

    def get_permissions(self):
        # Lectura pública; la escritura de catálogos es exclusiva de administradores.
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsStoreAdmin()]

    def get_object(self, pk):
        return self.model.objects.get(pk=pk)

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
    model = AccessoryCategory
    serializer_class = AccessoryCategorySerializer


class CategoryDetail(ResourceDetail):
    model = AccessoryCategory
    serializer_class = AccessoryCategorySerializer
    not_found_message = "Categoría no encontrada."


class BrandCollection(ResourceCollection):
    model = MotorcycleBrand
    serializer_class = MotorcycleBrandSerializer


class BrandDetail(ResourceDetail):
    model = MotorcycleBrand
    serializer_class = MotorcycleBrandSerializer
    not_found_message = "Marca no encontrada."


class ModelCollection(ResourceCollection):
    model = MotorcycleModel
    serializer_class = MotorcycleModelSerializer

    def get_queryset(self):
        return MotorcycleModel.objects.select_related("marca").all()


class ModelDetail(ResourceDetail):
    model = MotorcycleModel
    serializer_class = MotorcycleModelSerializer
    not_found_message = "Modelo de moto no encontrado."

    def get_object(self, pk):
        return MotorcycleModel.objects.select_related("marca").get(pk=pk)


class MotorcycleCollection(ResourceCollection):
    model = Motorcycle
    serializer_class = MotorcycleSerializer

    def get_queryset(self):
        return Motorcycle.objects.select_related("modelo__marca").all()


class MotorcycleDetail(ResourceDetail):
    model = Motorcycle
    serializer_class = MotorcycleSerializer
    not_found_message = "Moto no encontrada."

    def get_object(self, pk):
        return Motorcycle.objects.select_related("modelo__marca").get(pk=pk)


class RoleCollection(ResourceCollection):
    model = Role
    serializer_class = RoleSerializer


class RoleDetail(ResourceDetail):
    model = Role
    serializer_class = RoleSerializer
    not_found_message = "Rol no encontrado."


class StoreCollection(ResourceCollection):
    model = Store
    serializer_class = StoreSerializer

    def get_queryset(self):
        return Store.objects.select_related("plan").all()


class StoreDetail(ResourceDetail):
    model = Store
    serializer_class = StoreSerializer
    not_found_message = "Tienda no encontrada."

    def get_object(self, pk):
        return Store.objects.select_related("plan").get(pk=pk)


class UserCollection(DatabaseGuardMixin):
    permission_classes = [IsStoreAdmin]

    def get(self, request):

        if not request.user.id_tienda:
            return Response({"error": "El usuario no tiene una tienda asignada."}, status=400)
        users = User.objects.filter(tienda_id=request.user.id_tienda).order_by("usu_nombre", "pk")
        return paginate_response(request, users, UserSerializer)


class UserDetail(DatabaseGuardMixin):
    permission_classes = [IsStoreAdmin]

    def get_target(self, request, pk):
        return User.objects.filter(pk=pk, tienda_id=request.user.id_tienda).first()

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
        if role_id is not None and not Role.objects.filter(pk=role_id).exists():
            return Response({"error": "El rol indicado no existe."}, status=400)
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
        user.estado_usuario = "bloqueado"
        user.save(update_fields=["estado_usuario"])
        return Response(
            {"mensaje": "Usuario desactivado.", "usuario": {"id_usuario": str(user.id_usuario)}}
        )


class Model3DCollection(ResourceCollection):
    model = Model3D
    serializer_class = Model3DSerializer

    def get_queryset(self):
        return Model3D.objects.select_related(
            "accesorio__producto", "accesorio__categoria", "accesorio__tipo"
        ).all()


class Model3DDetail(ResourceDetail):
    model = Model3D
    serializer_class = Model3DSerializer
    not_found_message = "Modelo 3D no encontrado."

    def get_object(self, pk):
        return Model3D.objects.select_related(
            "accesorio__producto", "accesorio__categoria", "accesorio__tipo"
        ).get(pk=pk)


class Model3DByAccessory(DatabaseGuardMixin):
    permission_classes = [AllowAny]

    def get(self, request, id_accesorio):

        model = Model3D.objects.filter(accesorio_id=id_accesorio).first()
        if not model:
            return Response(
                {"error": "Este accesorio no tiene modelo 3D asociado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(Model3DSerializer(model).data)


class AccessoryCollection(ResourceCollection):
    model = Accessory
    serializer_class = AccessorySerializer

    def get_queryset(self):
        return Accessory.objects.select_related("producto", "categoria", "tipo").all()


class AccessoryDetail(ResourceDetail):
    model = Accessory
    serializer_class = AccessorySerializer
    not_found_message = "Accesorio no encontrado."

    def get_object(self, pk):
        return Accessory.objects.select_related("producto", "categoria", "tipo").get(pk=pk)


class CompatibilityCollection(DatabaseGuardMixin):
    def get_permissions(self):
        # La matriz de compatibilidad solo la administra el administrador de tienda.
        return [AllowAny()] if self.request.method == "GET" else [IsStoreAdmin()]

    def post(self, request):

        serializer = CompatibilitySerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)
        try:
            instance = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "La compatibilidad entre este accesorio y modelo ya existe."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(CompatibilitySerializer(instance).data, status=status.HTTP_201_CREATED)


class CompatibilityDetail(ResourceDetail):
    model = AccessoryCompatibility
    serializer_class = CompatibilitySerializer
    not_found_message = "Compatibilidad no encontrada."


class AccessoriesByModel(DatabaseGuardMixin):
    permission_classes = [AllowAny]

    def get(self, request, id_modelo_moto):

        links = AccessoryCompatibility.objects.filter(modelo_moto_id=id_modelo_moto).select_related(
            "accesorio__producto", "accesorio__categoria", "accesorio__tipo"
        )
        accessories = [item.accesorio for item in links]
        return Response(AccessorySerializer(accessories, many=True).data)


class ModelsByAccessory(DatabaseGuardMixin):
    permission_classes = [AllowAny]

    def get(self, request, id_accesorio):

        links = AccessoryCompatibility.objects.filter(accesorio_id=id_accesorio).select_related(
            "modelo_moto__marca"
        )
        return Response(CompatibilitySerializer(links, many=True).data)


class InventoryCollection(DatabaseGuardMixin):
    permission_classes = [IsStoreStaff]

    def get_queryset(self, request):
        return Inventory.objects.select_related(
            "tienda__plan",
            "producto__categoria_producto",
            "accesorio__producto",
            "accesorio__categoria",
            "accesorio__tipo",
        ).filter(tienda_id=request.user.id_tienda)

    def get(self, request):

        if not request.user.id_tienda:
            return Response({"error": "El usuario no tiene una tienda asignada."}, status=400)
        rows = self.get_queryset(request)
        return paginate_response(request, rows, InventorySerializer)

    def post(self, request):

        if not request.user.id_tienda:
            return Response({"error": "El usuario no tiene una tienda asignada."}, status=400)

        input_serializer = InventoryInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response({"error": input_serializer.errors}, status=400)
        values = input_serializer.validated_data
        product_id = values.get("id_producto")
        accessory = None
        if values.get("id_accesorio"):
            accessory = Accessory.objects.select_related("producto").filter(
                pk=values["id_accesorio"]
            ).first()
            if not accessory or not accessory.producto_id:
                return Response(
                    {"error": "El accesorio no existe o no está vinculado a un producto."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            product_id = accessory.producto_id
        else:
            accessory = Accessory.objects.filter(producto_id=product_id).first()
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
                accesorio_id=accessory.id_accesorio if accessory else None,
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
    permission_classes = [IsStoreStaff]

    def get(self, request, pk):

        instance = Inventory.objects.select_related(
            "tienda__plan",
            "producto",
            "accesorio__producto",
            "accesorio__categoria",
            "accesorio__tipo",
        ).filter(
            pk=pk, tienda_id=request.user.id_tienda
        ).first()
        if not instance:
            return Response(
                {"error": "Registro de inventario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(InventorySerializer(instance).data)


class InventoryMovementView(DatabaseGuardMixin):
    permission_classes = [IsStoreStaff]

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

        try:
            with transaction.atomic():
                inventory = Inventory.objects.select_for_update().filter(
                    pk=request.data["id_inventario"], tienda_id=request.user.id_tienda
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

        return Response(
            {
                "movimiento": InventoryMovementSerializer(movement).data,
                "inventarioActualizado": InventorySerializer(inventory).data,
            },
            status=status.HTTP_201_CREATED,
        )


class QuoteCollection(DatabaseGuardMixin):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        queryset = Quote.objects.select_related(
            "tienda", "usuario", "moto__modelo__marca"
        ).prefetch_related("detalle_cotizacion__accesorio__producto")
        if store_staff(request.user):
            queryset = queryset.filter(tienda_id=request.user.id_tienda)
        else:
            queryset = queryset.filter(usuario_id=request.user.id_usuario)
        return paginate_response(
            request, queryset.order_by("-fecha_solicitud", "pk"), QuoteSerializer
        )

    def post(self, request):

        serializer = QuoteCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)
        values = serializer.validated_data
        motorcycle = Motorcycle.objects.filter(pk=values["id_moto"]).first()
        if not motorcycle:
            return Response({"error": "La moto indicada no existe."}, status=400)

        accessory_ids = [item["id_accesorio"] for item in values["items"]]
        accessories = {
            str(accessory.id_accesorio): accessory
            for accessory in Accessory.objects.select_related("producto").filter(
                pk__in=accessory_ids
            )
        }
        if len(accessories) != len(accessory_ids):
            return Response({"error": "Uno o más accesorios no existen."}, status=400)

        try:
            prepared, total = services.calc_quote(
                values["items"], accessories, max_items=settings.QUOTE_MAX_ITEMS
            )
        except services.BusinessError as error:
            return Response({"error": str(error)}, status=400)

        try:
            with transaction.atomic():
                quote = Quote.objects.create(
                    tienda_id=request.user.id_tienda,
                    usuario=request.user,
                    moto=motorcycle,
                    coti_estado="pendiente",
                    total=total,
                    coti_observaciones=values.get("coti_observaciones"),
                    nombre_configuracion=values.get("nombre_configuracion"),
                )
                for accessory, quantity, price, subtotal in prepared:
                    QuoteDetail.objects.create(
                        cotizacion=quote,
                        accesorio=accessory,
                        cantidad=quantity,
                        precio_unitario=price,
                        subtotal=subtotal,
                    )
        except IntegrityError:
            return Response({"error": "No se pudo guardar la cotización."}, status=409)
        quote = Quote.objects.select_related("tienda", "usuario", "moto__modelo__marca").prefetch_related(
            "detalle_cotizacion__accesorio__producto"
        ).get(pk=quote.id_cotizacion)
        return Response(QuoteSerializer(quote).data, status=status.HTTP_201_CREATED)


class QuoteDetailView(DatabaseGuardMixin):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):

        queryset = Quote.objects.select_related("tienda", "usuario", "moto__modelo__marca").prefetch_related(
            "detalle_cotizacion__accesorio__producto"
        )
        if store_staff(request.user):
            queryset = queryset.filter(tienda_id=request.user.id_tienda)
        else:
            queryset = queryset.filter(usuario_id=request.user.id_usuario)
        quote = queryset.filter(pk=pk).first()
        if not quote:
            return Response({"error": "Cotización no encontrada."}, status=404)
        return Response(QuoteSerializer(quote).data)


class QuoteStatus(DatabaseGuardMixin):
    permission_classes = [IsStoreStaff]

    def put(self, request, pk):
        return self.update_status(request, pk)

    def patch(self, request, pk):
        return self.update_status(request, pk)

    def update_status(self, request, pk):

        new_state = request.data.get("coti_estado")
        if new_state not in QUOTE_STATES:
            return Response(
                {"error": f"coti_estado debe ser uno de: {', '.join(sorted(QUOTE_STATES))}."},
                status=400,
            )
        try:
            with transaction.atomic():
                quote = Quote.objects.select_for_update().filter(
                    pk=pk, tienda_id=request.user.id_tienda
                ).first()
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
    )
    if not is_customer and not is_admin:
        return Response(
            {"error": "Solo un administrador autenticado puede registrar usuarios de tienda."},
            status=status.HTTP_403_FORBIDDEN,
        )

    store_id = request.user.id_tienda if not is_customer else request.data.get("id_tienda")
    if store_id:
        try:
            store_id = UUID(str(store_id))
        except (TypeError, ValueError):
            return Response({"error": "id_tienda debe ser un UUID válido."}, status=400)
        if not Store.objects.filter(pk=store_id).exists():
            return Response({"error": "La tienda indicada no existe."}, status=400)
    if not is_customer:
        store = Store.objects.select_related("plan").filter(pk=store_id).first()
        if not store:
            return Response({"error": "El administrador no tiene una tienda asignada."}, status=400)
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


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("auth")
@require_database
def login(request):
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
    return Response({"mensaje": "Login exitoso.", "token": token, "usuario": user_payload(user)})


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
        # Accept an unexpired legacy token created by the previous Node backend.
        user = User.objects.filter(
            reset_token=token,
            reset_token_expira__gt=timezone.now(),
        ).first()
    if not user:
        return Response({"error": "El enlace es inválido o ya expiró."}, status=400)

    user.password_hash = hash_password(password)
    user.reset_token = None
    user.reset_token_expira = None
    user.save(update_fields=["password_hash", "reset_token", "reset_token_expira"])
    return Response({"mensaje": "Contraseña actualizada con éxito."})
