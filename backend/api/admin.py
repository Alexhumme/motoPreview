"""Admin de Django para inspeccionar y corregir las tablas existentes.

Los modelos son `managed=False`: Django no crea ni migra estas tablas, solo las
lee/escribe con el ORM. El admin es útil, por ejemplo, para revisar `usuario_rol`
o corregir un dato puntual. Las altas de usuarios de la aplicación deben hacerse
con `manage.py asignar_rol` (crea el hash bcrypt correcto).
"""
from django.apps import apps
from django.contrib import admin
from django.contrib.admin.sites import AlreadyRegistered
from django.db.models import CompositePrimaryKey

# Credenciales o tokens: nunca se muestran ni se editan desde el admin.
CAMPOS_OCULTOS = {
    "User": ["password_hash", "reset_token", "verificacion_token"],
    "AccessoryToken": ["hash"],
}

# Tablas de detalle o unión: se consultan y se borran, pero no se dan de alta a mano.
SIN_ALTA = {
    "User",
    "AccessoryCompatibility",
    "InventoryMovement",
    "QuoteDetail",
    "QuoteStatusHistory",
}


class BaseAdmin(admin.ModelAdmin):
    list_per_page = 50

    def get_exclude(self, request, obj=None):
        return CAMPOS_OCULTOS.get(self.model.__name__)

    def has_add_permission(self, request):
        if self.model.__name__ in SIN_ALTA:
            return False
        return super().has_add_permission(request)


def registrar_tablas():
    for model in apps.get_models():
        if model._meta.app_label != "api" or model._meta.abstract:
            continue
        if isinstance(model._meta.pk, CompositePrimaryKey):
            # El admin no admite PK compuestas (usuario_rol). Se gestiona con
            # `manage.py asignar_rol`.
            continue
        try:
            admin.site.register(model, BaseAdmin)
        except AlreadyRegistered:
            continue


registrar_tablas()

admin.site.site_header = "MotoPreview"
admin.site.site_title = "MotoPreview"
