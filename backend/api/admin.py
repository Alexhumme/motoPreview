"""Admin de Django para MotoPreview.

OJO: la app usa tablas existentes (managed=False) y login propio por JWT+bcrypt
(api.models.User / tabla "usuario"). El admin de Django usa su propia tabla
auth_user: crea un superusuario aparte con createsuperuser. No edites
password_hash desde aquí (rompe el login JWT del negocio).

El panel usa un AdminSite propio (MotopreviewAdminSite) que ordena los modelos
en sectores temáticos (Motos, Catálogo, Tiendas, Inventario, Cotizaciones,
Seguridad, Autenticación) en lugar de agruparlos por aplicación.
"""
from uuid import UUID
from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import GroupAdmin, UserAdmin as AuthUserAdmin
from django.contrib.auth.models import Group
from django.contrib.auth.models import User as AuthUser
from django.db import transaction
from django.utils.text import slugify

from .security import normalizar_concesiones, scopes_validos

from .models import (
    Accion,
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
    Recurso,
    RecursoAccion,
    Role,
    RolRecurso,
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
        # RBAC
        Recurso: "Recursos",
        Accion: "Acciones",
        RecursoAccion: "Recursos-Acciones",
        RolRecurso: "Permisos de rol",
    }

    # Cada sector temático agrupa sus modelos, en el orden en que se muestran.
    SECTIONS = [
        (
            "MOTOS",
            (Motorcycle, MotorcycleModel, MotorcycleBrand, AccessoryCompatibility),
        ),
        (
            "CATÁLOGO Y ACCESORIOS",
            (AccessoryType, AccessoryCategory, Product, ProductCategory, Model3D),
        ),
        ("TIENDAS Y USUARIOS", (Store, SubscriptionPlan, NegocioUserProxy)),
        ("INVENTARIO", (Inventory, InventoryMovement, MovementType)),
        (
            "COTIZACIONES Y CONFIGURACIÓN",
            (Quote, QuoteDetail, QuoteStatusHistory, Configuration, ConfigurationDetail),
        ),
        ("SEGURIDAD Y ACCESOS", (Role, AccessoryToken)),
        ("RBAC - PERMISOS", (Recurso, Accion, RecursoAccion, RolRecurso)),
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
    list_display = ("nombre_rol",)
    readonly_fields = ("id_rol",)
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Añadir campo de permisos como campo personalizado
        from django import forms
        from api.models import Recurso, Accion, RecursoAccion, RolRecurso
        
        if obj:
            # Obtener permisos actuales del rol
            permisos_actuales = RolRecurso.objects.filter(rol=obj, activo=True).select_related(
                "recurso_accion__recurso", "recurso_accion__accion"
            ).values_list("recurso_accion_id", "scope")
            permisos_dict = {str(ra_id): scope for ra_id, scope in permisos_actuales}
            
            # Añadir campo dinámico para permisos
            class PermisosField(forms.Field):
                widget = forms.CheckboxSelectMultiple
                required = False
                
                def __init__(self, *args, **kwargs):
                    # Generar choices dinámicamente
                    recursos = Recurso.objects.filter(activo=True).prefetch_related(
                        "recurso_acciones__accion"
                    ).order_by("orden")
                    
                    choices = []
                    for recurso in recursos:
                        for ra in recurso.recurso_acciones.filter(activo=True).select_related("accion").order_by("accion__orden"):
                            if ra.activo:
                                label = f"{recurso.nombre} → {ra.accion.nombre}"
                                # Solo los alcances que el recurso puede expresar:
                                # un `tienda` sobre una tabla sin columna de tienda
                                # no filtra filas y la casilla parecería un permiso.
                                nombres = {"global": "Global", "tienda": "Tienda",
                                           "propio": "Propio"}
                                for alcance in scopes_validos(recurso.codigo, ra.requiere_scope):
                                    choices.append((f"{ra.id_recurso_accion}:{alcance}",
                                                    f"{label} ({nombres[alcance]})"))
                    
                    kwargs["choices"] = choices
                    kwargs["initial"] = [
                        f"{ra_id}:{scope}" for ra_id, scope in permisos_dict.items()
                    ]
                    super().__init__(*args, **kwargs)
            
            form.base_fields["permisos_rbac"] = PermisosField(
                label="Permisos RBAC",
                required=False,
                help_text="Seleccione los permisos para este rol. Cada permiso tiene un scope: Global (todo), Tienda (su tienda), Propio (sus registros)."
            )
        
        return form
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        # Guardar permisos RBAC
        from api.models import RecursoAccion, RolRecurso
        if "permisos_rbac" in form.cleaned_data:
            entradas = []
            for permiso_str in form.cleaned_data.get("permisos_rbac", []):
                identificador, _, alcance = permiso_str.rpartition(":")
                try:
                    identificador = str(UUID(identificador.strip())).lower()
                except (ValueError, TypeError):
                    identificador = None
                entradas.append((identificador, alcance))

            # Las casillas del formulario solo ofrecen alcances válidos, pero el
            # estado que llega de la base puede traer los incompatibles que la
            # siembra antigua escribió; y dos casillas de la misma combinación
            # ("global" y "tienda") sí son dos decisiones contradictorias.
            ids = [clave for clave, _ in entradas if clave]
            combinaciones = {
                str(id_recurso_accion).lower(): (codigo_recurso, requiere_scope)
                for id_recurso_accion, codigo_recurso, requiere_scope in
                RecursoAccion.objects.filter(id_recurso_accion__in=ids).values_list(
                    "id_recurso_accion", "recurso__codigo", "requiere_scope"
                )
            }
            normalizados, errores = normalizar_concesiones(entradas, combinaciones)
            if errores:
                # Sin tocar la tabla: borrar y luego fallar deja al rol sin permisos.
                self.message_user(
                    request,
                    "No se guardaron los permisos RBAC: " + "; ".join(errores),
                    messages.ERROR,
                )
                return

            with transaction.atomic():
                RolRecurso.objects.filter(rol=obj).delete()
                RolRecurso.objects.bulk_create([
                    # concedido_por queda nulo: el usuario del panel es de auth_user,
                    # otra tabla, y no puede referenciar la FK de usuario (negocio).
                    RolRecurso(
                        rol=obj,
                        recurso_accion_id=entrada["id_recurso_accion"],
                        scope=entrada["scope"],
                        activo=True,
                    )
                    for entrada in normalizados
                ])


admin_site.register(Role, RoleAdmin)


class StoreAdmin(BaseAdmin):
    list_display = ("nombre_tienda", "nit", "estado_tienda")
    readonly_fields = ("id_tienda",)


admin_site.register(Store, StoreAdmin)


class NegocioUserAdmin(BaseAdmin):
    list_display = ("usu_email", "usu_nombre", "estado_usuario", "tienda")
    search_fields = ("usu_email", "usu_nombre")
    list_filter = ("estado_usuario",)
    # Credenciales o tokens: nunca se editan desde el admin.
    readonly_fields = ("password_hash", "reset_token", "verificacion_token", "id_usuario")


admin_site.register(NegocioUserProxy, NegocioUserAdmin)


class AccessoryTokenAdmin(BaseAdmin):
    list_display = ("usuario", "tipo", "expira_en", "usado")
    readonly_fields = ("id_token", "hash")


admin_site.register(AccessoryToken, AccessoryTokenAdmin)


class ProductAdmin(BaseAdmin):
    list_display = ("nombre", "es_accesorio", "categoria_producto", "precio")
    list_filter = ("es_accesorio", "categoria_producto")
    search_fields = ("nombre", "codigo_sku")
    readonly_fields = ("id_producto",)
    
    fieldsets = (
        ("Información básica", {
            "fields": ("nombre", "descripcion", "estado", "categoria_producto", "imagen", "codigo_sku", "precio")
        }),
        ("Configuración de accesorio", {
            "fields": ("es_accesorio", "categoria_accesorio", "tipo_accesorio"),
            "description": "Solo aplicar si el producto es un accesorio",
            "classes": ("collapse",),
        }),
    )

    def get_fieldsets(self, request, obj=None):
        """Mostrar/ocultar campos de accesorio según es_accesorio"""
        fieldsets = super().get_fieldsets(request, obj)
        if obj and not obj.es_accesorio:
            # Si NO es accesorio, ocultar la sección de configuración de accesorio
            return [fs for fs in fieldsets if fs[0] != "Configuración de accesorio"]
        return fieldsets

    def get_form(self, request, obj=None, **kwargs):
        """Hacer campos de accesorio no requeridos y añadir ayuda"""
        form = super().get_form(request, obj, **kwargs)
        if "categoria_accesorio" in form.base_fields:
            form.base_fields["categoria_accesorio"].required = False
            form.base_fields["categoria_accesorio"].help_text = "Solo requerido si es_accesorio=True"
        if "tipo_accesorio" in form.base_fields:
            form.base_fields["tipo_accesorio"].required = False
            form.base_fields["tipo_accesorio"].help_text = "Solo requerido si es_accesorio=True"
        return form


# Registro de modelos con admin personalizado
admin_models = [
    (AccessoryCategory, BaseAdmin),
    (ProductCategory, BaseAdmin),
    (AccessoryType, BaseAdmin),
    (Product, ProductAdmin),  # Admin personalizado para l�gica condicional
    (MotorcycleBrand, BaseAdmin),
    (MotorcycleModel, BaseAdmin),
    (Motorcycle, BaseAdmin),
    (AccessoryCompatibility, BaseAdmin),
    (Model3D, BaseAdmin),
    (SubscriptionPlan, BaseAdmin),
    (Inventory, BaseAdmin),
    (MovementType, BaseAdmin),
    (InventoryMovement, BaseAdmin),
    (Quote, BaseAdmin),
    (QuoteDetail, BaseAdmin),
    (QuoteStatusHistory, BaseAdmin),
    (Configuration, BaseAdmin),
    (ConfigurationDetail, BaseAdmin),
]

for model, admin_class in admin_models:
    try:
        admin_site.register(model, admin_class)
    except admin.sites.AlreadyRegistered:
        pass
# El panel también administra los usuarios y grupos propios de Django
# (auth_user / auth_group); Django los traduce a "Usuarios"/"Grupos".
admin_site.register(AuthUser, AuthUserAdmin)
admin_site.register(Group, GroupAdmin)