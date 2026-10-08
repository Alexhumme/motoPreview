"""Admin de Django para MotoPreview.

OJO: la app usa tablas existentes (managed=False) y login propio por JWT+bcrypt
(api.models.User / tabla "usuario"). El admin de Django usa su propia tabla
auth_user: crea un superusuario aparte con createsuperuser. No edites
password_hash desde aquí (rompe el login JWT del negocio).
"""
from django.contrib import admin

from .models import (
    Accessory,
    AccessoryCategory,
    AccessoryCompatibility,
    AccessoryToken,
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


class BaseAdmin(admin.ModelAdmin):
    list_per_page = 50


@admin.register(Role)
class RoleAdmin(BaseAdmin):
    list_display = ("id_rol", "nombre_rol")


@admin.register(Store)
class StoreAdmin(BaseAdmin):
    list_display = ("id_tienda", "nombre_tienda", "nit", "estado_tienda")


class NegocioUser(User):
    """Proxy solo para mostrar la tabla negocio 'usuario' con otro nombre.

    Sin esto el admin muestra dos entradas idénticas "Users": la de
    auth_user (Django) y la de usuario (negocio).
    """

    class Meta:
        proxy = True
        verbose_name = "usuario (negocio)"
        verbose_name_plural = "usuarios (negocio)"


@admin.register(NegocioUser)
class NegocioUserAdmin(BaseAdmin):
    list_display = ("id_usuario", "usu_email", "usu_nombre", "estado_usuario", "tienda")
    search_fields = ("usu_email", "usu_nombre")
    list_filter = ("estado_usuario",)
    # Credenciales o tokens: nunca se muestran ni se editan desde el admin.
    readonly_fields = ("password_hash", "reset_token", "verificacion_token")


@admin.register(AccessoryToken)
class AccessoryTokenAdmin(BaseAdmin):
    list_display = ("id_token", "usuario", "tipo", "expira_en", "usado")
    readonly_fields = ("hash",)


for model in (
    AccessoryCategory,
    ProductCategory,
    AccessoryType,
    Product,
    Accessory,
    MotorcycleBrand,
    MotorcycleModel,
    Motorcycle,
    AccessoryCompatibility,
    Model3D,
    SubscriptionPlan,
    Inventory,
    MovementType,
    InventoryMovement,
    Quote,
    QuoteDetail,
    QuoteStatusHistory,
    Configuration,
    ConfigurationDetail,
):
    try:
        admin.site.register(model, BaseAdmin)
    except admin.sites.AlreadyRegistered:
        pass