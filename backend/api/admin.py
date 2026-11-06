"""Admin de Django para MotoPreview.

OJO: la app usa tablas existentes (managed=False) y login propio por JWT+bcrypt
(api.models.User / tabla "usuario"). El admin de Django usa su propia tabla
auth_user: crea un superusuario aparte con createsuperuser. La sección
"Usuarios de la plataforma" sí escribe en `usuario`; su formulario calcula el
hash bcrypt de la contraseña y guarda el rol en `usuario_rol`. No edites
password_hash a mano (rompe el login JWT del negocio).

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
from django.db.models import OuterRef, Q, Subquery
from django.utils.text import slugify

from .security import (
    ROLE_ADMIN,
    ROLE_SELLER,
    ROLE_SUPERADMIN,
    es_rol_de_sede,
    normalizar_concesiones,
    scopes_validos,
)
from .services import validar_password

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
    UserRole,
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
        NegocioUserProxy: "Usuarios de la plataforma",
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
        AuthUser: "Usuarios del panel (Django)",
        Group: "Grupos",
        # RBAC
        Recurso: "Recursos",
        Accion: "Acciones",
        RecursoAccion: "Recursos-Acciones",
        RolRecurso: "Permisos de rol",
        UserRole: "Roles por usuario",
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
        ("RBAC - PERMISOS", (Recurso, Accion, RecursoAccion, RolRecurso, UserRole)),
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


class PermisosRBACField(forms.MultipleChoiceField):
    """Casillas de permisos (recurso, acción, scope) de un rol.

    Antes era un ``forms.Field`` al que se le pasaba ``choices``; ``Field`` no
    acepta ese argumento y el formulario de rol reventaba con un 500. Además,
    el campo se inyectaba después de construir el formulario, así que tampoco
    aparecía en la página. Al ser un campo declarado del ModelForm se valida y
    se renderiza como cualquier otro.
    """

    widget = forms.CheckboxSelectMultiple


class RoleAdminForm(forms.ModelForm):
    permisos_rbac = PermisosRBACField(
        label="Permisos RBAC",
        required=False,
        help_text=(
            "Seleccione los permisos para este rol. Cada permiso tiene un scope: "
            "Global (todo), Tienda (su tienda), Propio (sus registros)."
        ),
    )

    class Meta:
        model = Role
        fields = ("nombre_rol", "activo", "es_superadmin")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        permisos_dict = {}
        if self.instance and not self.instance._state.adding:
            permisos_actuales = RolRecurso.objects.filter(
                rol=self.instance, activo=True
            ).values_list("recurso_accion_id", "scope")
            permisos_dict = {str(ra_id): scope for ra_id, scope in permisos_actuales}

        choices = []
        nombres_alcance = {"global": "Global", "tienda": "Tienda", "propio": "Propio"}
        recursos = (
            Recurso.objects.filter(activo=True)
            .prefetch_related("recurso_acciones__accion")
            .order_by("orden")
        )
        for recurso in recursos:
            for ra in (
                recurso.recurso_acciones.filter(activo=True)
                .select_related("accion")
                .order_by("accion__orden")
            ):
                label = f"{recurso.nombre} → {ra.accion.nombre}"
                # Solo los alcances que el recurso puede expresar: un `tienda`
                # sobre una tabla sin columna de tienda no filtra filas y la
                # casilla parecería un permiso vigente.
                for alcance in scopes_validos(recurso.codigo, ra.requiere_scope):
                    choices.append(
                        (
                            f"{ra.id_recurso_accion}:{alcance}",
                            f"{label} ({nombres_alcance[alcance]})",
                        )
                    )

        self.fields["permisos_rbac"] = PermisosRBACField(
            label="Permisos RBAC",
            required=False,
            choices=choices,
            initial=[
                f"{ra_id}:{scope}" for ra_id, scope in permisos_dict.items()
            ],
            help_text=(
                "Seleccione los permisos para este rol. Cada permiso tiene un scope: "
                "Global (todo), Tienda (su tienda), Propio (sus registros)."
            ),
        )


class RoleAdmin(BaseAdmin):
    form = RoleAdminForm
    list_display = ("nombre_rol", "activo", "es_superadmin")
    list_filter = ("activo", "es_superadmin")
    search_fields = ("nombre_rol",)
    readonly_fields = ("id_rol",)
    fields = ("nombre_rol", "activo", "es_superadmin", "permisos_rbac")
    help_texts = {
        "es_superadmin": (
            f"Solo el rol con UUID {ROLE_SUPERADMIN} habilita el bypass de "
            "superadmin; marcar otro rol no le da acceso total."
        )
    }

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        # Guardar permisos RBAC
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


class RecursoAdmin(BaseAdmin):
    list_display = ("codigo", "nombre", "endpoint_base", "orden", "activo")
    list_filter = ("activo",)
    search_fields = ("codigo", "nombre", "endpoint_base")
    readonly_fields = ("id_recurso",)
    ordering = ("orden", "nombre")


class AccionAdmin(BaseAdmin):
    list_display = ("codigo", "nombre", "metodo_http", "orden", "activo")
    list_filter = ("activo",)
    search_fields = ("codigo", "nombre", "metodo_http")
    readonly_fields = ("id_accion",)
    ordering = ("orden", "nombre")


class RecursoAccionAdmin(BaseAdmin):
    list_display = ("recurso", "accion", "requiere_scope", "activo")
    list_filter = ("activo", "recurso", "accion")
    search_fields = (
        "recurso__codigo",
        "recurso__nombre",
        "accion__codigo",
        "accion__nombre",
    )
    readonly_fields = ("id_recurso_accion",)
    list_select_related = ("recurso", "accion")


class RolRecursoAdmin(BaseAdmin):
    list_display = ("rol", "recurso_accion", "scope", "activo", "concedido_en")
    list_filter = ("activo", "scope", "rol")
    search_fields = (
        "rol__nombre_rol",
        "recurso_accion__recurso__codigo",
        "recurso_accion__accion__codigo",
    )
    readonly_fields = ("id_rol_recurso",)
    list_select_related = ("rol", "recurso_accion__recurso", "recurso_accion__accion")


class UserRoleAdmin(BaseAdmin):
    """Vista de solo lectura de la tabla puente usuario-rol.

    ``UserRole`` tiene clave primaria compuesta y el admin de Django no sabe
    abrir su ficha de cambio. La asignación se hace en el formulario del usuario
    de negocio; aquí solo se consulta qué rol tiene cada cuenta.
    """

    list_display = ("usuario_email", "rol_nombre")
    list_display_links = None
    actions = None
    ordering = ("id_usuario", "id_rol")
    search_fields = ("id_usuario", "id_rol")

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        usuario = User.objects.filter(pk=OuterRef("id_usuario")).values("usu_email")[:1]
        rol = Role.objects.filter(pk=OuterRef("id_rol")).values("nombre_rol")[:1]
        return queryset.annotate(
            usuario_email=Subquery(usuario),
            rol_nombre=Subquery(rol),
        )

    @admin.display(description="Usuario")
    def usuario_email(self, obj):
        return obj.usuario_email or obj.id_usuario

    @admin.display(description="Rol")
    def rol_nombre(self, obj):
        return obj.rol_nombre or obj.id_rol

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin_site.register(Recurso, RecursoAdmin)
admin_site.register(Accion, AccionAdmin)
admin_site.register(RecursoAccion, RecursoAccionAdmin)
admin_site.register(RolRecurso, RolRecursoAdmin)
# ``AdminSite.register()`` rechaza cualquier modelo con clave primaria
# compuesta. UserRole no tiene ficha de cambio, pero su listado de solo lectura
# sí es útil para auditar quién tiene qué rol. Se registra a mano saltando esa
# validación; las URLs de cambio/borrado quedan deshabilitadas en el ModelAdmin.
admin_site._registry[UserRole] = UserRoleAdmin(UserRole, admin_site)


class StoreAdmin(BaseAdmin):
    list_display = ("nombre_tienda", "nit", "estado_tienda")
    readonly_fields = ("id_tienda",)


admin_site.register(Store, StoreAdmin)


class NegocioUserForm(forms.ModelForm):
    """Alta y edición de usuarios de la plataforma desde el admin.

    ``usuario`` no guarda el rol en una columna: vive en ``usuario_rol``. Por
    eso el rol es un campo declarado del formulario y se escribe a mano en
    ``save_model``. La contraseña se guarda como hash bcrypt con el mismo
    formato que valida el login JWT; sin ella la cuenta no podría entrar.
    """

    password = forms.CharField(
        label="Contraseña",
        required=False,
        strip=False,
        min_length=8,
        max_length=72,
        widget=forms.PasswordInput(render_value=False),
        help_text=(
            "Obligatoria al crear el usuario. Al editarlo, déjala vacía para "
            "conservar la contraseña actual."
        ),
    )
    rol = forms.ModelChoiceField(
        queryset=Role.objects.none(),
        label="Rol en la plataforma",
        required=True,
        empty_label="Seleccione un rol",
    )
    email_verificado = forms.BooleanField(
        label="Correo verificado",
        required=False,
        initial=True,
        help_text="Necesario para que la cuenta pueda iniciar sesión.",
    )

    class Meta:
        model = NegocioUserProxy
        fields = ("usu_nombre", "usu_email", "tienda", "estado_usuario", "email_verificado")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        es_nuevo = self.instance._state.adding
        rol_actual = None
        if not es_nuevo:
            rol_actual = (
                UserRole.objects.filter(id_usuario=self.instance.pk)
                .values_list("id_rol", flat=True)
                .first()
            )

        filtro = Q(activo=True)
        if rol_actual:
            filtro |= Q(pk=rol_actual)
        self.fields["rol"].queryset = Role.objects.filter(filtro).order_by("nombre_rol")
        if rol_actual:
            self.fields["rol"].initial = rol_actual

        if es_nuevo:
            self.fields["password"].required = True
            # Las cuentas creadas por un administrador no pasan por el enlace
            # de verificación; si no, no podrían iniciar sesión.
            self.fields["email_verificado"].initial = True

    def clean(self):
        cleaned = super().clean()
        password = cleaned.get("password")
        rol = cleaned.get("rol")
        tienda = cleaned.get("tienda")

        if self.instance._state.adding and not password:
            self.add_error("password", "La contraseña es obligatoria para crear el usuario.")
        if password:
            error = validar_password(password)
            if error:
                self.add_error("password", error)

        if rol:
            if str(rol.pk).lower() in {ROLE_ADMIN.lower(), ROLE_SELLER.lower()} and not tienda:
                self.add_error("tienda", "Este rol requiere una tienda asignada.")
            solicitante = getattr(getattr(self, "request", None), "user", None)
            if es_rol_de_sede(rol) and not getattr(solicitante, "is_superuser", False):
                self.add_error(
                    "rol",
                    "Solo un superusuario del panel puede asignar el rol de sede.",
                )
        return cleaned


class NegocioUserAdmin(BaseAdmin):
    form = NegocioUserForm
    list_display = (
        "usu_email",
        "usu_nombre",
        "rol_actual",
        "tienda",
        "estado_usuario",
        "email_verificado",
    )
    search_fields = ("usu_email", "usu_nombre")
    list_filter = ("estado_usuario", "email_verificado", "tienda")
    list_select_related = ("tienda",)
    # Credenciales o tokens: nunca se editan desde el admin (la contraseña se
    # escribe con el campo de arriba y se guarda como hash).
    readonly_fields = ("password_hash", "reset_token", "verificacion_token", "id_usuario")
    fieldsets = (
        (
            "Datos del usuario",
            {
                "fields": (
                    "usu_nombre",
                    "usu_email",
                    "tienda",
                    "estado_usuario",
                    "email_verificado",
                )
            },
        ),
        (
            "Acceso a la plataforma",
            {
                "fields": ("password", "rol"),
                "description": (
                    "El rol se guarda en la tabla usuario_rol. Sin rol la cuenta "
                    "puede iniciar sesión, pero no tendrá permisos en la API."
                ),
            },
        ),
    )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # El formulario necesita saber si quien edita es superusuario del panel
        # para impedir que un staff se asigne el rol de sede.
        form.request = request
        return form

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        rol = UserRole.objects.filter(id_usuario=OuterRef("pk")).values("id_rol")[:1]
        nombre_rol = Role.objects.filter(pk=Subquery(rol)).values("nombre_rol")[:1]
        return queryset.annotate(rol_nombre=Subquery(nombre_rol))

    @admin.display(description="Rol")
    def rol_actual(self, obj):
        return obj.rol_nombre or "SIN ROL"

    def save_model(self, request, obj, form, change):
        password = form.cleaned_data.get("password")
        if password:
            # Import perezoso: api.views es un módulo grande y admin se carga
            # durante el autodescubrimiento de Django.
            from .views import hash_password

            obj.password_hash = hash_password(password)
        super().save_model(request, obj, form, change)

        rol = form.cleaned_data.get("rol")
        if rol:
            with transaction.atomic():
                UserRole.objects.filter(id_usuario=obj.id_usuario).delete()
                UserRole.objects.create(id_usuario=obj.id_usuario, id_rol=rol.id_rol)


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