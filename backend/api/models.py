import uuid
from datetime import date

from django.db import models
from django.utils import timezone

from .fields import PostgreSQLEnumField


class DatabaseModel(models.Model):
    class Meta:
        abstract = True
        managed = False


class AccessoryCategory(DatabaseModel):
    id_categoria = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_categoria")
    cat_nombre = models.TextField()
    cat_descripcion = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "categoria_accesorio"


class ProductCategory(DatabaseModel):
    id_categoria_producto = models.UUIDField(
        primary_key=True, default=uuid.uuid4, db_column="id_categoria_producto"
    )
    nombre = models.TextField()
    descripcion = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "categoria_producto"


class AccessoryType(DatabaseModel):
    id_tipo = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_tipo")
    nombre = models.TextField()
    descripcion = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "tipo_accesorio"


class Product(DatabaseModel):
    id_producto = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_producto")
    nombre = models.TextField()
    descripcion = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=50, default="disponible")
    categoria_producto = models.ForeignKey(
        ProductCategory,
        db_column="id_categoria_producto",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="productos",
    )
    imagen = models.TextField(null=True, blank=True)
    codigo_sku = models.TextField(null=True, blank=True, unique=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "producto"


class Accessory(DatabaseModel):
    id_accesorio = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_accesorio")
    categoria = models.ForeignKey(
        AccessoryCategory,
        db_column="id_categoria",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="accesorios",
    )
    peso = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    producto = models.ForeignKey(
        Product,
        db_column="id_producto",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="accesorios",
    )
    tipo = models.ForeignKey(
        AccessoryType,
        db_column="id_tipo",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="accesorios",
    )
    color = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "accesorio"


class MotorcycleBrand(DatabaseModel):
    id_marca = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_marca")
    marca_nombre = models.TextField()
    marca_pais = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "marca_moto"


class MotorcycleModel(DatabaseModel):
    id_modelo_moto = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_modelo_moto")
    marca = models.ForeignKey(
        MotorcycleBrand,
        db_column="id_marca",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="modelos",
    )
    modelo_nombre = models.TextField()
    modelo_descripcion = models.TextField(null=True, blank=True)
    cilindraje = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "modelo_moto"


class Motorcycle(DatabaseModel):
    id_moto = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_moto")
    modelo = models.ForeignKey(
        MotorcycleModel,
        db_column="id_modelo_moto",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="motos",
    )
    moto_anio = models.IntegerField(null=True, blank=True)
    moto_version = models.TextField(null=True, blank=True)
    moto_imagen = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "moto"


class AccessoryCompatibility(DatabaseModel):
    id_compatibilidad = models.UUIDField(
        primary_key=True, default=uuid.uuid4, db_column="id_compatibilidad"
    )
    accesorio = models.ForeignKey(
        Accessory,
        db_column="id_accesorio",
        on_delete=models.DO_NOTHING,
        related_name="compatibilidades",
    )
    modelo_moto = models.ForeignKey(
        MotorcycleModel,
        db_column="id_modelo_moto",
        on_delete=models.DO_NOTHING,
        related_name="compatibilidades",
    )
    anio_desde = models.IntegerField(null=True, blank=True)
    anio_hasta = models.IntegerField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "accesorio_modelo_moto"
        unique_together = (("accesorio", "modelo_moto"),)


class Model3D(DatabaseModel):
    id_modelo3d = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_modelo3d")
    accesorio = models.ForeignKey(
        Accessory,
        db_column="id_accesorio",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="modelos_3d",
    )
    url_modelo3d = models.TextField()
    formato_archivo = models.TextField(null=True, blank=True)
    estado_visualizacion = models.TextField(null=True, blank=True)
    modelo3d_fecha = models.DateField(null=True, blank=True, default=date.today)
    modelo3d_observaciones = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "modelo_3d"


class SubscriptionPlan(DatabaseModel):
    id_plan = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_plan")
    plan_nombre = models.TextField()
    plan_descripcion = models.TextField(null=True, blank=True)
    precio_mensual = models.DecimalField(max_digits=10, decimal_places=2)
    limite_productos = models.IntegerField(null=True, blank=True)
    limite_usuarios = models.IntegerField(null=True, blank=True)
    plan_estado = PostgreSQLEnumField(
        enum_type="plan_estado_enum",
        max_length=30,
        choices=[("activo", "activo"), ("inactivo", "inactivo"), ("suspendido", "suspendido")],
        default="activo",
    )

    class Meta(DatabaseModel.Meta):
        db_table = "plan_subscripcion"


class Store(DatabaseModel):
    id_tienda = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_tienda")
    plan = models.ForeignKey(
        SubscriptionPlan,
        db_column="id_plan",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="tiendas",
    )
    nombre_tienda = models.TextField()
    nit = models.TextField(null=True, blank=True, unique=True)
    direccion_tienda = models.TextField(null=True, blank=True)
    telefono_tienda = models.TextField(null=True, blank=True)
    email_tienda = models.TextField(null=True, blank=True)
    fecha_afiliacion = models.DateField(null=True, blank=True, default=date.today)
    estado_tienda = PostgreSQLEnumField(
        enum_type="tienda_estado_enum",
        max_length=30,
        choices=[("activa", "activa"), ("inactiva", "inactiva"), ("suspendida", "suspendida")],
        default="activa",
    )

    class Meta(DatabaseModel.Meta):
        db_table = "tienda"


class Role(DatabaseModel):
    id_rol = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_rol")
    nombre_rol = models.TextField()

    class Meta(DatabaseModel.Meta):
        db_table = "rol"


class User(DatabaseModel):
    id_usuario = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_usuario")
    tienda = models.ForeignKey(
        Store,
        db_column="id_tienda",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="usuarios",
    )
    usu_nombre = models.TextField()
    usu_email = models.TextField(unique=True)
    password_hash = models.TextField()
    fecha_registro = models.DateField(null=True, blank=True, default=date.today)
    estado_usuario = PostgreSQLEnumField(
        enum_type="usuario_estado_enum",
        max_length=30,
        choices=[("activo", "activo"), ("inactivo", "inactivo"), ("bloqueado", "bloqueado")],
        default="activo",
    )
    reset_token = models.TextField(null=True, blank=True)
    reset_token_expira = models.DateTimeField(null=True, blank=True)
    email_verificado = models.BooleanField(null=True, blank=True, default=False)
    verificacion_token = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "usuario"

    @property
    def is_authenticated(self):
        return True

    @property
    def id_tienda(self):
        return self.tienda_id

    @property
    def id_rol(self):
        return UserRole.objects.filter(id_usuario=self.id_usuario).values_list("id_rol", flat=True).first()

    @property
    def role_ids(self):
        return list(UserRole.objects.filter(id_usuario=self.id_usuario).values_list("id_rol", flat=True))


class UserRole(DatabaseModel):
    id_usuario = models.UUIDField(db_column="id_usuario")
    id_rol = models.UUIDField(db_column="id_rol")
    pk = models.CompositePrimaryKey("id_usuario", "id_rol")

    class Meta(DatabaseModel.Meta):
        db_table = "usuario_rol"


class Inventory(DatabaseModel):
    id_inventario = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_inventario")
    accesorio = models.ForeignKey(
        Accessory,
        db_column="id_accesorio",
        null=True,
        blank=True,
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="inventarios",
    )
    tienda = models.ForeignKey(
        Store,
        db_column="id_tienda",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="inventarios",
    )
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0)
    estado_inventario = PostgreSQLEnumField(
        enum_type="inventario_estado_enum",
        max_length=30,
        choices=[("normal", "normal"), ("bajo", "bajo"), ("agotado", "agotado")],
        default="normal",
    )
    fecha_actualizacion = models.DateField(null=True, blank=True, default=date.today)
    precio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    producto = models.ForeignKey(
        Product,
        db_column="id_producto",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="inventarios",
    )

    class Meta(DatabaseModel.Meta):
        db_table = "inventario"
        unique_together = (("tienda", "producto"),)


class MovementType(DatabaseModel):
    id_tipomov = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_tipomov")
    tipomov_nombre = models.TextField()
    descripcion_tipomov = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "tipo_movimiento"


class InventoryMovement(DatabaseModel):
    id_movimiento = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_movimiento")
    inventario = models.ForeignKey(
        Inventory,
        db_column="id_inventario",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="movimientos",
    )
    tipo = models.ForeignKey(
        MovementType,
        db_column="id_tipomov",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="movimientos",
    )
    usuario = models.ForeignKey(
        User,
        db_column="id_usuario",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="movimientos",
    )
    mov_cantidad = models.IntegerField()
    fecha_movimiento = models.DateTimeField(null=True, blank=True, default=timezone.now)
    observaciones = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "movimiento_inventario"


class Quote(DatabaseModel):
    id_cotizacion = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_cotizacion")
    tienda = models.ForeignKey(
        Store,
        db_column="id_tienda",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="cotizaciones",
    )
    usuario = models.ForeignKey(
        User,
        db_column="id_usuario",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="cotizaciones",
    )
    moto = models.ForeignKey(
        Motorcycle,
        db_column="id_moto",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="cotizaciones",
    )
    fecha_solicitud = models.DateTimeField(null=True, blank=True, default=timezone.now)
    coti_estado = PostgreSQLEnumField(
        enum_type="cotizacion_estado_enum",
        max_length=30,
        choices=[
            ("pendiente", "pendiente"),
            ("aprobada", "aprobada"),
            ("rechazada", "rechazada"),
            ("completada", "completada"),
        ],
        default="pendiente",
    )
    total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    coti_observaciones = models.TextField(null=True, blank=True)
    nombre_configuracion = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "cotizacion"


class QuoteDetail(DatabaseModel):
    id_detalle_cotizacion = models.UUIDField(
        primary_key=True, default=uuid.uuid4, db_column="id_detalle_cotizacion"
    )
    cotizacion = models.ForeignKey(
        Quote,
        db_column="id_cotizacion",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="detalle_cotizacion",
    )
    accesorio = models.ForeignKey(
        Accessory,
        db_column="id_accesorio",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
        related_name="detalles_cotizacion",
    )
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta(DatabaseModel.Meta):
        db_table = "detalle_cotizacion"


class QuoteStatusHistory(DatabaseModel):
    id_hist = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_hist")
    cotizacion = models.ForeignKey(
        Quote,
        db_column="id_cotizacion",
        on_delete=models.DO_NOTHING,
        related_name="historial_estados",
    )
    estado = models.CharField(max_length=50)
    fecha = models.DateTimeField(default=timezone.now)
    usuario = models.ForeignKey(
        User,
        db_column="id_usuario",
        on_delete=models.DO_NOTHING,
        related_name="historial_cotizaciones",
    )

    class Meta(DatabaseModel.Meta):
        db_table = "cotizacion_estado_hist"


class Configuration(DatabaseModel):
    id_configuracion = models.UUIDField(
        primary_key=True, default=uuid.uuid4, db_column="id_configuracion"
    )
    usuario = models.ForeignKey(
        User,
        db_column="id_usuario",
        on_delete=models.DO_NOTHING,
        related_name="configuraciones",
    )
    moto = models.ForeignKey(
        Motorcycle,
        db_column="id_moto",
        on_delete=models.DO_NOTHING,
        related_name="configuraciones",
    )
    nombre = models.CharField(max_length=100)

    class Meta(DatabaseModel.Meta):
        db_table = "configuracion"


class ConfigurationDetail(DatabaseModel):
    id_detalle = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_detalle")
    configuracion = models.ForeignKey(
        Configuration,
        db_column="id_configuracion",
        on_delete=models.DO_NOTHING,
        related_name="detalles",
    )
    accesorio = models.ForeignKey(
        Accessory,
        db_column="id_accesorio",
        on_delete=models.DO_NOTHING,
        related_name="configuraciones",
    )
    cantidad = models.IntegerField(default=1)

    class Meta(DatabaseModel.Meta):
        db_table = "configuracion_detalle"


class AccessoryToken(DatabaseModel):
    id_token = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_token")
    usuario = models.ForeignKey(
        User,
        db_column="id_usuario",
        on_delete=models.DO_NOTHING,
        related_name="tokens",
    )
    tipo = models.CharField(max_length=50)
    hash = models.TextField()
    expira_en = models.DateTimeField()
    usado = models.BooleanField(null=True, blank=True, default=False)

    class Meta(DatabaseModel.Meta):
        db_table = "token"
