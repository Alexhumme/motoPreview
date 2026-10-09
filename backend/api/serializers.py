from rest_framework import serializers

from .models import (
    Accessory,
    AccessoryCategory,
    AccessoryCompatibility,
    AccessoryType,
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
    Role,
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


class AccessorySerializer(serializers.Serializer):
    id_accesorio = serializers.UUIDField(read_only=True)
    id_categoria = serializers.PrimaryKeyRelatedField(
        queryset=AccessoryCategory.objects.all(), source="categoria", required=False, allow_null=True
    )
    id_tipo = serializers.PrimaryKeyRelatedField(
        queryset=AccessoryType.objects.all(), source="tipo", required=False, allow_null=True
    )
    id_producto = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="producto", required=False, allow_null=True
    )
    acc_nombre = serializers.CharField(required=False, allow_blank=False)
    acc_descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    acc_precio = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    acc_estado = serializers.CharField(required=False, allow_blank=False, default="disponible")
    imagen = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    peso = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    color = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    codigo_sku = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    categoria_accesorio = serializers.SerializerMethodField()
    producto = serializers.SerializerMethodField()

    def get_categoria_accesorio(self, instance):
        return (
            AccessoryCategorySerializer(instance.categoria).data
            if instance.categoria_id
            else None
        )

    def get_producto(self, instance):
        return ProductSerializer(instance.producto).data if instance.producto_id else None

    def to_representation(self, instance):
        product = instance.producto if instance.producto_id else None
        return {
            "id_accesorio": str(instance.id_accesorio),
            "id_categoria": str(instance.categoria_id) if instance.categoria_id else None,
            "id_tipo": str(instance.tipo_id) if instance.tipo_id else None,
            "id_producto": str(instance.producto_id) if instance.producto_id else None,
            "acc_nombre": product.nombre if product else None,
            "acc_descripcion": product.descripcion if product else None,
            "acc_precio": str(product.precio) if product and product.precio is not None else None,
            "acc_estado": product.estado if product else None,
            "imagen": product.imagen if product else None,
            "peso": str(instance.peso) if instance.peso is not None else None,
            "color": instance.color,
            "codigo_sku": product.codigo_sku if product else None,
            "categoria_accesorio": self.get_categoria_accesorio(instance),
            "producto": self.get_producto(instance),
        }

    def create(self, validated_data):
        product = validated_data.pop("producto", None)
        name = validated_data.pop("acc_nombre", "")
        description = validated_data.pop("acc_descripcion", None)
        price = validated_data.pop("acc_precio", None)
        product_state = validated_data.pop("acc_estado", "disponible")
        image = validated_data.pop("imagen", None)
        sku = validated_data.pop("codigo_sku", None)

        if product is None:
            product = Product.objects.create(
                nombre=name,
                descripcion=description,
                estado=product_state,
                imagen=image,
                codigo_sku=sku or None,
                precio=price,
            )
        else:
            self._apply_product_values(
                product,
                name=name,
                description=description,
                price=price,
                state=product_state,
                image=image,
                sku=sku,
            )
            product.save()
        return Accessory.objects.create(producto=product, **validated_data)

    def update(self, instance, validated_data):
        product = validated_data.pop("producto", instance.producto if instance.producto_id else None)
        name = validated_data.pop("acc_nombre", None)
        description = validated_data.pop("acc_descripcion", None)
        price = validated_data.pop("acc_precio", None)
        product_state = validated_data.pop("acc_estado", None)
        image = validated_data.pop("imagen", None)
        sku = validated_data.pop("codigo_sku", None)

        if product is None:
            if name is None:
                raise serializers.ValidationError({"acc_nombre": "El nombre es obligatorio."})
            product = Product.objects.create(nombre=name)

        self._apply_product_values(
            product,
            name=name,
            description=description,
            price=price,
            state=product_state,
            image=image,
            sku=sku,
        )
        product.save()

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.producto = product
        instance.save()
        return instance

    @staticmethod
    def _apply_product_values(product, *, name, description, price, state, image, sku):
        if name is not None:
            product.nombre = name
        if description is not None:
            product.descripcion = description
        if price is not None:
            product.precio = price
        if state is not None:
            product.estado = state
        if image is not None:
            product.imagen = image
        if sku is not None:
            product.codigo_sku = sku or None

    def validate(self, attrs):
        if self.instance is None:
            if not attrs.get("acc_nombre"):
                raise serializers.ValidationError({"acc_nombre": "El nombre del accesorio es obligatorio."})
            if "acc_precio" not in attrs or attrs["acc_precio"] is None:
                raise serializers.ValidationError({"acc_precio": "El precio del accesorio es obligatorio."})
        return attrs


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
        fields = ("id_rol", "nombre_rol")
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

    def get_id_rol(self, instance):
        role_id = instance.id_rol
        return str(role_id) if role_id else None

    def get_rol(self, instance):
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
        queryset=Accessory.objects.all(),
        required=False,
        allow_null=True,
    )
    accesorio = AccessorySerializer(read_only=True)

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
    id_accesorio = serializers.PrimaryKeyRelatedField(
        source="accesorio",
        queryset=Accessory.objects.all(),
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
            "id_accesorio",
            "id_modelo_moto",
            "anio_desde",
            "anio_hasta",
            "modelo_moto",
        )
        read_only_fields = ("id_compatibilidad",)


class InventorySerializer(serializers.ModelSerializer):
    id_accesorio = serializers.UUIDField(source="accesorio_id", read_only=True, allow_null=True)
    id_tienda = serializers.UUIDField(source="tienda_id", read_only=True, allow_null=True)
    id_producto = serializers.UUIDField(source="producto_id", read_only=True, allow_null=True)
    tienda = StoreSerializer(read_only=True)
    producto = ProductSerializer(read_only=True)
    accesorio = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = (
            "id_inventario",
            "id_tienda",
            "id_producto",
            "id_accesorio",
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
        accessory = (
            instance.accesorio
            if instance.accesorio_id
            else Accessory.objects.filter(producto_id=instance.producto_id).first()
        )
        return AccessorySerializer(accessory).data if accessory else None


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
    id_accesorio = serializers.UUIDField(source="accesorio_id", read_only=True, allow_null=True)
    accesorio = AccessorySerializer(read_only=True)

    class Meta:
        model = QuoteDetail
        fields = (
            "id_detalle_cotizacion",
            "id_cotizacion",
            "id_accesorio",
            "cantidad",
            "precio_unitario",
            "subtotal",
            "accesorio",
        )


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
    id_accesorio = serializers.UUIDField(source="accesorio_id", read_only=True, allow_null=True)

    class Meta:
        model = ConfigurationDetail
        fields = ("id_detalle", "id_configuracion", "id_accesorio", "cantidad")
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
