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
        ordering = ["cat_nombre"]

    def __str__(self):
        return self.cat_nombre or str(self.id_categoria)


class ProductCategory(DatabaseModel):
    id_categoria_producto = models.UUIDField(
        primary_key=True, default=uuid.uuid4, db_column="id_categoria_producto"
    )
    nombre = models.TextField()
    descripcion = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "categoria_producto"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre or str(self.id_categoria_producto)


class AccessoryType(DatabaseModel):
    id_tipo = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_tipo")
    nombre = models.TextField()
    descripcion = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "tipo_accesorio"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre or str(self.id_tipo)


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
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre or str(self.id_producto)


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
        ordering = ["pk"]

    def __str__(self):
        return f"Accesorio {str(self.id_accesorio)[:8]}"


class MotorcycleBrand(DatabaseModel):
    id_marca = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_marca")
    marca_nombre = models.TextField()
    marca_pais = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "marca_moto"
        ordering = ["marca_nombre"]

    def __str__(self):
        return self.marca_nombre or str(self.id_marca)


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
        ordering = ["modelo_nombre"]

    def __str__(self):
        return self.modelo_nombre or str(self.id_modelo_moto)


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
        ordering = ["moto_anio", "pk"]

    def __str__(self):
        texto = " ".join(part for part in (self.moto_version or "", str(self.moto_anio or "")) if part)
        return texto or str(self.id_moto)


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
        ordering = ["pk"]

    def __str__(self):
        return f"Compatibilidad {str(self.id_compatibilidad)[:8]}"


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
        ordering = ["modelo3d_fecha", "pk"]

    def __str__(self):
        return f"Modelo 3D {str(self.id_modelo3d)[:8]}"


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
        ordering = ["plan_nombre"]

    def __str__(self):
        return self.plan_nombre or str(self.id_plan)


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
        ordering = ["nombre_tienda"]

    def __str__(self):
        return self.nombre_tienda or str(self.id_tienda)


class Role(DatabaseModel):
    id_rol = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_rol")
    nombre_rol = models.TextField()

    class Meta(DatabaseModel.Meta):
        db_table = "rol"
        ordering = ["nombre_rol"]

    def __str__(self):
        return self.nombre_rol or str(self.id_rol)


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
        ordering = ["usu_nombre"]

    def __str__(self):
        return self.usu_nombre or self.usu_email or str(self.id_usuario)

    @property
    def is_authenticated(self):
        return True

    @property
    def id_tienda(self):
        return self.tienda_id

    @property
    def role_ids(self):
        # Cache por instancia: antes cada acceso (id_rol, role_ids, has_any_role)
        # lanzaba su propia query a usuario_rol (3-4 por petición).
        cached = getattr(self, "_cached_role_ids", None)
        if cached is not None:
            return cached
        ids = list(UserRole.objects.filter(id_usuario=self.id_usuario).values_list("id_rol", flat=True))
        self._cached_role_ids = ids
        return ids

    @property
    def id_rol(self):
        ids = self.role_ids
        return ids[0] if ids else None


class UserRole(DatabaseModel):
    id_usuario = models.UUIDField(db_column="id_usuario")
    id_rol = models.UUIDField(db_column="id_rol")
    pk = models.CompositePrimaryKey("id_usuario", "id_rol")

    class Meta(DatabaseModel.Meta):
        db_table = "usuario_rol"

    def __str__(self):
        return f"{self.id_usuario} -> {self.id_rol}"


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
        ordering = ["fecha_actualizacion", "pk"]

    def __str__(self):
        return f"Inventario {str(self.id_inventario)[:8]}"


class MovementType(DatabaseModel):
    id_tipomov = models.UUIDField(primary_key=True, default=uuid.uuid4, db_column="id_tipomov")
    tipomov_nombre = models.TextField()
    descripcion_tipomov = models.TextField(null=True, blank=True)

    class Meta(DatabaseModel.Meta):
        db_table = "tipo_movimiento"
        ordering = ["tipomov_nombre"]

    def __str__(self):
        return self.tipomov_nombre or str(self.id_tipomov)


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
        ordering = ["-fecha_movimiento", "pk"]

    def __str__(self):
        return f"Movimiento {str(self.id_movimiento)[:8]}"


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
        ordering = ["-fecha_solicitud", "pk"]

    def __str__(self):
        return f"Cotización {str(self.id_cotizacion)[:8]}"


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
        ordering = ["pk"]

    def __str__(self):
        return f"Detalle {str(self.id_detalle_cotizacion)[:8]}"


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
        ordering = ["-fecha", "pk"]

    def __str__(self):
        return f"Historial {str(self.id_hist)[:8]}"


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
        ordering = ["pk"]

    def __str__(self):
        return self.nombre or str(self.id_configuracion)


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
        ordering = ["pk"]

    def __str__(self):
        return f"Detalle {str(self.id_detalle)[:8]}"


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
        ordering = ["pk"]

    def __str__(self):
        return f"Token {str(self.id_token)[:8]}"
