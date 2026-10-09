"""Admin de Django para MotoPreview.

OJO: la app usa tablas existentes (managed=False) y login propio por JWT+bcrypt
(api.models.User / tabla "usuario"). El admin de Django usa su propia tabla
auth_user: crea un superusuario aparte con createsuperuser. No edites
password_hash desde aquí (rompe el login JWT del negocio).

El panel usa un AdminSite propio (MotopreviewAdminSite) que ordena los modelos
en sectores temáticos (Motos, Catálogo, Tiendas, Inventario, Cotizaciones,
Seguridad, Autenticación) en lugar de agruparlos por aplicación.
"""
from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin, UserAdmin as AuthUserAdmin
from django.contrib.auth.models import Group
from django.contrib.auth.models import User as AuthUser
from django.utils.text import slugify

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


class NegocioUserProxy(User):
    """Proxy solo para mostrar la tabla negocio 'usuario' con otro nombre.

    Sin esto el admin muestra dos entradas idénticas "Users": la de
    auth_user (Django) y la de usuario (negocio).
    """

    class Meta:
        proxy = True
        verbose_name = "usuario (negocio)"
        verbose_name_plural = "usuarios (negocio)"


class MotopreviewAdminSite(admin.AdminSite):
    site_header = "Administración de MotoPreview"
    site_title = "Administración de MotoPreview"
    index_title = "Panel de administración"

    # Etiquetas en español que ve el panel (los modelos reflejan tablas
    # legadas con nombres en inglés; esto solo cambia la presentación).
    SPANISH_NAMES = {
        Motorcycle: "Motos",
        MotorcycleModel: "Modelos de moto",
        MotorcycleBrand: "Marcas de moto",
        AccessoryCompatibility: "Compatibilidades de accesorio",
        Accessory: "Accesorios",
        AccessoryType: "Tipos de accesorio",
        AccessoryCategory: "Categorías de accesorio",
        Product: "Productos",
        ProductCategory: "Categorías de producto",
        Model3D: "Modelos 3D",
        Store: "Tiendas",
        SubscriptionPlan: "Planes de suscripción",
        NegocioUserProxy: "Usuarios (negocio)",
        Inventory: "Inventarios",
        InventoryMovement: "Movimientos de inventario",
        MovementType: "Tipos de movimiento",
        Quote: "Cotizaciones",
        QuoteDetail: "Detalles de cotización",
        QuoteStatusHistory: "Historial de estados",
        Configuration: "Configuraciones",
        ConfigurationDetail: "Detalles de configuración",
        Role: "Roles",
        AccessoryToken: "Tokens de accesorio",
        AuthUser: "Usuarios",
        Group: "Grupos",
    }

    # Cada sector temático agrupa sus modelos, en el orden en que se muestran.
    SECTIONS = [
        (
            "MOTOS",
            (Motorcycle, MotorcycleModel, MotorcycleBrand, AccessoryCompatibility),
        ),
        (
            "CATÁLOGO Y ACCESORIOS",
            (Accessory, AccessoryType, AccessoryCategory, Product, ProductCategory, Model3D),
        ),
        ("TIENDAS Y USUARIOS", (Store, SubscriptionPlan, NegocioUserProxy)),
        ("INVENTARIO", (Inventory, InventoryMovement, MovementType)),
        (
            "COTIZACIONES Y CONFIGURACIÓN",
            (Quote, QuoteDetail, QuoteStatusHistory, Configuration, ConfigurationDetail),
        ),
        ("SEGURIDAD Y ACCESOS", (Role, AccessoryToken)),
        ("AUTENTICACIÓN Y AUTORIZACIÓN", (AuthUser, Group)),
    ]

    def get_app_list(self, request):
        """Agrupa los modelos en sectores temáticos en lugar de aplicaciones."""
        app_dict = self._build_app_dict(request)
        by_key = {}
        for app in app_dict.values():
            for model in app["models"]:
                by_key[(app["app_label"], model["object_name"])] = model

        app_list = []
        for section_name, model_classes in self.SECTIONS:
            models = []
            for model_class in model_classes:
                entry = by_key.get(
                    (model_class._meta.app_label, model_class._meta.object_name)
                )
                if entry is not None:
                    entry = dict(entry)
                    entry["name"] = self.SPANISH_NAMES.get(model_class, entry["name"])
                    models.append(entry)
            if not models:
                continue
            app_list.append(
                {
                    "name": section_name,
                    "app_label": slugify(section_name),
                    "app_url": next(
                        (m["admin_url"] for m in models if m["admin_url"]), "#"
                    ),
                    "has_module_perms": True,
                    "models": models,
                }
            )
        return app_list


# Sitio del panel: usa este objeto (no admin.site) en motopreview/urls.py.
admin_site = MotopreviewAdminSite(name="motopreview_admin")


class RoleAdmin(BaseAdmin):
    list_display = ("id_rol", "nombre_rol")


admin_site.register(Role, RoleAdmin)


class StoreAdmin(BaseAdmin):
    list_display = ("id_tienda", "nombre_tienda", "nit", "estado_tienda")


admin_site.register(Store, StoreAdmin)


class NegocioUserAdmin(BaseAdmin):
    list_display = ("id_usuario", "usu_email", "usu_nombre", "estado_usuario", "tienda")
    search_fields = ("usu_email", "usu_nombre")
    list_filter = ("estado_usuario",)
    # Credenciales o tokens: nunca se muestran ni se editan desde el admin.
    readonly_fields = ("password_hash", "reset_token", "verificacion_token")


admin_site.register(NegocioUserProxy, NegocioUserAdmin)


class AccessoryTokenAdmin(BaseAdmin):
    list_display = ("id_token", "usuario", "tipo", "expira_en", "usado")
    readonly_fields = ("hash",)


admin_site.register(AccessoryToken, AccessoryTokenAdmin)


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
        admin_site.register(model, BaseAdmin)
    except admin.sites.AlreadyRegistered:
        pass

# El panel también administra los usuarios y grupos propios de Django
# (auth_user / auth_group); Django los traduce a "Usuarios"/"Grupos".
admin_site.register(AuthUser, AuthUserAdmin)
admin_site.register(Group, GroupAdmin)