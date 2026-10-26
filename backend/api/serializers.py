from rest_framework import serializers

from .models import (
    AccessoryCategory,
    AccessoryCompatibility,
    AccessoryType,
    Accion,
    Configuration,
    ConfigurationDetail,
    Inventory,
    InventoryMovement,
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
    User,
)
from . import services


class AccessoryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessoryCategory
        fields = ("id_categoria", "cat_nombre", "cat_descripcion")


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ("id_categoria_producto", "nombre", "descripcion")


class AccessoryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessoryType
        fields = ("id_tipo", "nombre", "descripcion")


class ProductSerializer(serializers.ModelSerializer):
    id_categoria_producto = serializers.PrimaryKeyRelatedField(
        source="categoria_producto",
        queryset=ProductCategory.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Product
        fields = (
            "id_producto",
            "nombre",
            "descripcion",
            "estado",
            "id_categoria_producto",
            "imagen",
            "codigo_sku",
            "precio",
        )
        read_only_fields = ("id_producto",)


class AccesorioSerializer(serializers.Serializer):
    """Representa un accesorio (fila de Product con accesorio=TRUE) en la
    forma plana que consume el frontend: id_accesorio, acc_nombre, acc_precio,
    id_categoria y la categoría anidada."""

    def to_representation(self, instance):
        categoria = instance.categoria_accesorio
        return {
            "id_accesorio": str(instance.id_producto),
            "id_categoria": str(instance.categoria_accesorio_id) if instance.categoria_accesorio_id else None,
            "id_tipo": str(instance.tipo_accesorio_id) if instance.tipo_accesorio_id else None,
            "acc_nombre": instance.nombre,
            "acc_descripcion": instance.descripcion,
            "acc_precio": str(instance.precio) if instance.precio is not None else None,
            "acc_estado": instance.estado,
            "imagen": instance.imagen,
            "peso": str(instance.peso) if instance.peso is not None else None,
            "color": None,
            "codigo_sku": instance.codigo_sku,
            "categoria_accesorio": (
                {
                    "id_categoria": str(categoria.id_categoria),
                    "cat_nombre": categoria.cat_nombre,
                    "cat_descripcion": categoria.cat_descripcion,
                }
                if categoria
                else None
            ),
            "producto": ProductSerializer(instance).data,
        }


class AccesorioInputSerializer(serializers.Serializer):
    """Entrada de crear/editar accesorio (forma plana del panel de administración)."""

    acc_nombre = serializers.CharField(max_length=100)
    id_categoria = serializers.PrimaryKeyRelatedField(
        queryset=AccessoryCategory.objects.all(),
        source="categoria_accesorio",
        required=False,
        allow_null=True,
    )
    acc_descripcion = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    acc_precio = serializers.DecimalField(max_digits=10, decimal_places=2)
    peso = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True
    )
    codigo_sku = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    imagen = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    acc_estado = serializers.CharField(max_length=50, required=False, default="disponible")

    def to_fields(self, data):
        """Mapea la entrada plana a campos del modelo Product (parcial-safe)."""
        mapa = (
            ("acc_nombre", "nombre"),
            ("acc_descripcion", "descripcion"),
            ("acc_precio", "precio"),
            ("peso", "peso"),
            ("codigo_sku", "codigo_sku"),
            ("imagen", "imagen"),
            ("acc_estado", "estado"),
        )
        campos = {}
        for llave, campo in mapa:
            if llave not in data:
                continue
            valor = data[llave]
            if campo in ("codigo_sku", "imagen", "descripcion") and valor == "":
                valor = None
            campos[campo] = valor
        if "categoria_accesorio" in data:
            campos["categoria_accesorio"] = data["categoria_accesorio"]
        return campos


class MotorcycleBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = MotorcycleBrand
        fields = ("id_marca", "marca_nombre", "marca_pais")
        read_only_fields = ("id_marca",)


class MotorcycleModelSerializer(serializers.ModelSerializer):
    id_marca = serializers.PrimaryKeyRelatedField(
        source="marca",
        queryset=MotorcycleBrand.objects.all(),
        required=False,
        allow_null=True,
    )
    marca_moto = MotorcycleBrandSerializer(source="marca", read_only=True)

    class Meta:
        model = MotorcycleModel
        fields = (
            "id_modelo_moto",
            "id_marca",
            "modelo_nombre",
            "modelo_descripcion",
            "cilindraje",
            "marca_moto",
        )
        read_only_fields = ("id_modelo_moto",)


class MotorcycleSerializer(serializers.ModelSerializer):
    id_modelo_moto = serializers.PrimaryKeyRelatedField(
        source="modelo",
        queryset=MotorcycleModel.objects.all(),
        required=False,
        allow_null=True,
    )
    modelo_moto = MotorcycleModelSerializer(source="modelo", read_only=True)

    class Meta:
        model = Motorcycle
        fields = (
            "id_moto",
            "id_modelo_moto",
            "moto_anio",
            "moto_version",
            "moto_imagen",
            "modelo_moto",
        )
        read_only_fields = ("id_moto",)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id_rol", "nombre_rol", "activo", "es_superadmin")
        read_only_fields = ("id_rol",)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = (
            "id_plan",
            "plan_nombre",
            "plan_descripcion",
            "precio_mensual",
            "limite_productos",
            "limite_usuarios",
            "plan_estado",
        )
        read_only_fields = ("id_plan",)


class StoreSerializer(serializers.ModelSerializer):
    id_plan = serializers.PrimaryKeyRelatedField(
        source="plan",
        queryset=SubscriptionPlan.objects.all(),
        required=False,
        allow_null=True,
    )
    plan_subscripcion = SubscriptionPlanSerializer(source="plan", read_only=True)

    class Meta:
        model = Store
        fields = (
            "id_tienda",
            "id_plan",
            "nombre_tienda",
            "nit",
            "direccion_tienda",
            "telefono_tienda",
            "email_tienda",
            "fecha_afiliacion",
            "estado_tienda",
            "plan_subscripcion",
        )
        read_only_fields = ("id_tienda", "fecha_afiliacion")

    def to_representation(self, instance):
        """Oculta el NIT, teléfono y email de la tienda a quien no sea personal."""
        data = super().to_representation(instance)
        if not services.permite_datos_contacto(self.context.get("request")):
            for campo in ("nit", "telefono_tienda", "email_tienda"):
                data.pop(campo, None)
        return data


class UserSerializer(serializers.ModelSerializer):
    id_tienda = serializers.UUIDField(source="tienda_id", read_only=True, allow_null=True)
    id_rol = serializers.SerializerMethodField()
    rol = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id_usuario",
            "id_tienda",
            "usu_nombre",
            "usu_email",
            "fecha_registro",
            "estado_usuario",
            "email_verificado",
            "id_rol",
            "rol",
        )
        read_only_fields = fields

    def get_id_rol(self, instance) -> str | None:
        role_id = instance.id_rol
        return str(role_id) if role_id else None

    def get_rol(self, instance) -> dict | None:
        cached = getattr(instance, "_cached_role", "missing")
        if cached != "missing":
            return RoleSerializer(cached).data if cached else None
        role_id = instance.id_rol
        if not role_id:
            return None
        role = Role.objects.filter(pk=role_id).first()
        return RoleSerializer(role).data if role else None


class Model3DSerializer(serializers.ModelSerializer):
    id_accesorio = serializers.PrimaryKeyRelatedField(
        source="accesorio",
        queryset=AccessoryCategory.objects.all(),
        required=False,
        allow_null=True,
    )
    accesorio = AccessoryCategorySerializer(read_only=True)

    class Meta:
        model = Model3D
        fields = (
            "id_modelo3d",
            "id_accesorio",
            "url_modelo3d",
            "formato_archivo",
            "estado_visualizacion",
            "modelo3d_fecha",
            "modelo3d_observaciones",
            "accesorio",
        )
        read_only_fields = ("id_modelo3d", "modelo3d_fecha")


class CompatibilitySerializer(serializers.ModelSerializer):
    id_categoria_accesorio = serializers.PrimaryKeyRelatedField(
        source="categoria_accesorio",
        queryset=AccessoryCategory.objects.all(),
    )
    id_modelo_moto = serializers.PrimaryKeyRelatedField(
        source="modelo_moto",
        queryset=MotorcycleModel.objects.all(),
    )
    modelo_moto = MotorcycleModelSerializer(read_only=True)

    class Meta:
        model = AccessoryCompatibility
        fields = (
            "id_compatibilidad",
            "id_categoria_accesorio",
            "id_modelo_moto",
            "anio_desde",
            "anio_hasta",
            "modelo_moto",
        )
        read_only_fields = ("id_compatibilidad",)


class InventorySerializer(serializers.ModelSerializer):
    id_tienda = serializers.UUIDField(source="tienda_id", read_only=True, allow_null=True)
    id_producto = serializers.UUIDField(source="producto_id", read_only=True, allow_null=True)
    tienda = StoreSerializer(read_only=True)
    producto = ProductSerializer(read_only=True)
    # Forma plana del producto (si es accesorio) para el panel de inventario.
    accesorio = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = (
            "id_inventario",
            "id_tienda",
            "id_producto",
            "stock_actual",
            "stock_minimo",
            "estado_inventario",
            "fecha_actualizacion",
            "precio",
            "tienda",
            "producto",
            "accesorio",
        )
        read_only_fields = ("id_inventario", "id_tienda", "id_producto", "estado_inventario")

    def get_accesorio(self, instance):
        producto = instance.producto
        if producto and producto.es_accesorio:
            return AccesorioSerializer(producto).data
        return None


class InventoryMovementSerializer(serializers.ModelSerializer):
    id_inventario = serializers.PrimaryKeyRelatedField(source="inventario", queryset=Inventory.objects.all())
    id_tipomov = serializers.PrimaryKeyRelatedField(source="tipo", queryset=MovementType.objects.all())
    id_usuario = serializers.UUIDField(source="usuario_id", read_only=True, allow_null=True)

    class Meta:
        model = InventoryMovement
        fields = (
            "id_movimiento",
            "id_inventario",
            "id_tipomov",
            "id_usuario",
            "mov_cantidad",
            "fecha_movimiento",
            "observaciones",
        )
        read_only_fields = ("id_movimiento", "id_usuario", "fecha_movimiento")


class MovementTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovementType
        fields = ("id_tipomov", "tipomov_nombre", "descripcion_tipomov")
        read_only_fields = ("id_tipomov",)


class QuoteDetailSerializer(serializers.ModelSerializer):
    id_cotizacion = serializers.UUIDField(source="cotizacion_id", read_only=True, allow_null=True)
    id_categoria_accesorio = serializers.UUIDField(
        source="categoria_accesorio_id", read_only=True, allow_null=True
    )
    categoria_accesorio = AccessoryCategorySerializer(read_only=True)
    # Forma plana para el frontend: el ítem de cotización identifica a la
    # categoría del accesorio; el nombre visible es el de la categoría.
    accesorio = serializers.SerializerMethodField()

    class Meta:
        model = QuoteDetail
        fields = (
            "id_detalle_cotizacion",
            "id_cotizacion",
            "id_categoria_accesorio",
            "cantidad",
            "precio_unitario",
            "subtotal",
            "categoria_accesorio",
            "accesorio",
        )

    def get_accesorio(self, instance):
        categoria = instance.categoria_accesorio
        if not categoria:
            return None
        return {
            "id_categoria": str(categoria.id_categoria),
            "acc_nombre": categoria.cat_nombre,
            "acc_descripcion": categoria.cat_descripcion,
        }


class QuoteSerializer(serializers.ModelSerializer):
    id_tienda = serializers.UUIDField(source="tienda_id", read_only=True, allow_null=True)
    id_usuario = serializers.UUIDField(source="usuario_id", read_only=True, allow_null=True)
    id_moto = serializers.UUIDField(source="moto_id", read_only=True, allow_null=True)
    coti_fecha = serializers.DateTimeField(source="fecha_solicitud", read_only=True, allow_null=True)
    moto = MotorcycleSerializer(read_only=True)
    usuario = UserSerializer(read_only=True)
    detalle_cotizacion = QuoteDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Quote
        fields = (
            "id_cotizacion",
            "id_tienda",
            "id_usuario",
            "id_moto",
            "fecha_solicitud",
            "coti_fecha",
            "coti_estado",
            "total",
            "coti_observaciones",
            "nombre_configuracion",
            "moto",
            "usuario",
            "detalle_cotizacion",
        )
        read_only_fields = fields


class QuoteStatusHistorySerializer(serializers.ModelSerializer):
    id_cotizacion = serializers.UUIDField(source="cotizacion_id", read_only=True, allow_null=True)
    id_usuario = serializers.UUIDField(source="usuario_id", read_only=True, allow_null=True)

    class Meta:
        model = QuoteStatusHistory
        fields = ("id_hist", "id_cotizacion", "estado", "fecha", "id_usuario")
        read_only_fields = ("id_hist",)


class ConfigurationDetailSerializer(serializers.ModelSerializer):
    id_configuracion = serializers.UUIDField(source="configuracion_id", read_only=True, allow_null=True)
    id_categoria_accesorio = serializers.UUIDField(
        source="categoria_accesorio_id", read_only=True, allow_null=True
    )

    class Meta:
        model = ConfigurationDetail
        fields = ("id_detalle", "id_configuracion", "id_categoria_accesorio", "cantidad")
        read_only_fields = ("id_detalle",)


class ConfigurationSerializer(serializers.ModelSerializer):
    id_usuario = serializers.UUIDField(source="usuario_id", read_only=True, allow_null=True)
    id_moto = serializers.UUIDField(source="moto_id", read_only=True, allow_null=True)
    detalles = ConfigurationDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Configuration
        fields = ("id_configuracion", "id_usuario", "id_moto", "nombre", "detalles")
        read_only_fields = ("id_configuracion",)


class InventoryInputSerializer(serializers.Serializer):
    id_accesorio = serializers.UUIDField(required=False)
    id_producto = serializers.UUIDField(required=False)
    stock_actual = serializers.IntegerField(required=False, min_value=0, default=0)
    stock_minimo = serializers.IntegerField(required=False, min_value=0, default=0)
    precio = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get("id_accesorio") and not attrs.get("id_producto"):
            raise serializers.ValidationError(
                {"id_accesorio": "Envía id_accesorio (o id_producto) para crear el inventario."}
            )
        if attrs.get("id_accesorio") and attrs.get("id_producto"):
            raise serializers.ValidationError(
                {"id_producto": "Envía id_accesorio o id_producto, no ambos."}
            )
        return attrs


class QuoteItemSerializer(serializers.Serializer):
    id_accesorio = serializers.UUIDField()
    cantidad = serializers.IntegerField(min_value=1)


class QuoteCreateSerializer(serializers.Serializer):
    id_moto = serializers.UUIDField()
    coti_observaciones = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    nombre_configuracion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    items = QuoteItemSerializer(many=True, allow_empty=False)


# ---------------------------------------------------------------------------
# Serializers solo para documentar el schema OpenAPI (los formularios de
# login/registro de Swagger). No validan nada en las vistas.
# ---------------------------------------------------------------------------


class ErrorSerializer(serializers.Serializer):
    error = serializers.JSONField()


class MessageSerializer(serializers.Serializer):
    mensaje = serializers.CharField()


class RootSerializer(serializers.Serializer):
    mensaje = serializers.CharField()


class HealthSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    database_configured = serializers.BooleanField()
    database_connected = serializers.BooleanField(required=False)


# ============================================================================
# RBAC Serializers
# ============================================================================

class AccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accion
        fields = ("id_accion", "codigo", "nombre", "descripcion", "metodo_http", "orden", "activo")
        read_only_fields = ("id_accion",)


class RecursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recurso
        fields = ("id_recurso", "codigo", "nombre", "descripcion", "endpoint_base", "icono", "orden", "activo", "creado_en", "actualizado_en")
        read_only_fields = ("id_recurso", "creado_en", "actualizado_en")


class RecursoAccionSerializer(serializers.ModelSerializer):
    recurso = RecursoSerializer(read_only=True)
    accion = AccionSerializer(read_only=True)
    id_recurso = serializers.PrimaryKeyRelatedField(
        source="recurso",
        queryset=Recurso.objects.all(),
        write_only=True,
    )
    id_accion = serializers.PrimaryKeyRelatedField(
        source="accion",
        queryset=Accion.objects.all(),
        write_only=True,
    )

    class Meta:
        model = RecursoAccion
        fields = ("id_recurso_accion", "id_recurso", "id_accion", "recurso", "accion", "descripcion", "requiere_scope", "activo")
        read_only_fields = ("id_recurso_accion",)


class RolRecursoSerializer(serializers.ModelSerializer):
    recurso_accion = RecursoAccionSerializer(read_only=True)
    id_rol = serializers.PrimaryKeyRelatedField(
        source="rol",
        queryset=Role.objects.all(),
        write_only=True,
    )
    id_recurso_accion = serializers.PrimaryKeyRelatedField(
        source="recurso_accion",
        queryset=RecursoAccion.objects.all(),
        write_only=True,
    )
    concedido_por = serializers.PrimaryKeyRelatedField(
        source="concedido_por",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = RolRecurso
        fields = ("id_rol_recurso", "id_rol", "id_recurso_accion", "rol_recurso", "recurso_accion", "scope", "concedido_por", "concedido_en", "activo")
        read_only_fields = ("id_rol_recurso", "concedido_en")


class RecursoConPermisosSerializer(serializers.ModelSerializer):
    """Recurso con sus acciones y estado de permiso para un rol específico"""
    acciones = serializers.SerializerMethodField()
    
    class Meta:
        model = Recurso
        fields = ("id_recurso", "codigo", "nombre", "descripcion", "endpoint_base", "icono", "orden", "activo", "acciones")
    
    def get_acciones(self, obj):
        rol_id = self.context.get("rol_id")
        if not rol_id:
            return []
        
        from api.models import RolRecurso, RecursoAccion
        permisos = RolRecurso.objects.filter(
            rol_id=rol_id,
            recurso_accion__recurso=obj,
            activo=True,
            recurso_accion__activo=True,
        ).select_related("recurso_accion__accion").order_by("recurso_accion__accion__orden")
        
        return [
            {
                "id_recurso_accion": str(p.recurso_accion.id_recurso_accion),
                "accion_codigo": p.recurso_accion.accion.codigo,
                "accion_nombre": p.recurso_accion.accion.nombre,
                "scope": p.scope,
                "activo": p.activo,
            }
            for p in permisos
        ]


# ============================================================================
# Existing Serializers (existing code continues below)
# ============================================================================

class LoginRequestSerializer(serializers.Serializer):
    usu_email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class LoginResponseSerializer(serializers.Serializer):
    mensaje = serializers.CharField()
    token = serializers.CharField()
    usuario = UserSerializer(read_only=True)


class RegisterRequestSerializer(serializers.Serializer):
    usu_nombre = serializers.CharField()
    usu_email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    id_rol = serializers.UUIDField()
    id_tienda = serializers.UUIDField(required=False, allow_null=True)


class RegisterResponseSerializer(serializers.Serializer):
    mensaje = serializers.CharField()
    usuario = UserSerializer(read_only=True)


class ForgotRequestSerializer(serializers.Serializer):
    usu_email = serializers.EmailField()


class ResetRequestSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)


class QuoteStatusUpdateSerializer(serializers.Serializer):
    coti_estado = serializers.ChoiceField(
        choices=["pendiente", "aprobada", "rechazada", "completada"]
    )


class TokenDataSerializer(serializers.Serializer):
    id_usuario = serializers.CharField()
    id_rol = serializers.CharField(allow_null=True)
    id_tienda = serializers.CharField(allow_null=True)


class ProfileResponseSerializer(serializers.Serializer):
    mensaje = serializers.CharField()
    datos_del_token = TokenDataSerializer()
