import re

from django.urls import path, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from api import views
from api.admin import admin_site


_CONVERTER_RE = re.compile(r"<(uuid|str):(\w+)>")


def _converter_to_regex(match):
    kind, name = match.group(1), match.group(2)
    if kind == "uuid":
        return rf"(?P<{name}>[0-9a-fA-F-]{{36}})"
    return rf"(?P<{name}>[^/]+)"


def _api(ruta, vista):
    """Registra la ruta con `/` final opcional en UN solo patrón.

    La API se publica sin barra final (así la consume el frontend), pero se
    acepta también con barra para no fallar al probarla desde el navegador.
    Un solo patrón evita duplicados en el schema OpenAPI (antes cada ruta
    salía dos veces con sufijos numéricos).
    """
    patron = _CONVERTER_RE.sub(_converter_to_regex, ruta)
    return [re_path(rf"^{patron}/?$", vista)]


_RUTAS_API = [
    ("api/health", views.health),
    ("api/healthz", views.health),
    ("api/auth/register", views.register),
    ("api/auth/login", views.login),
    ("api/auth/logout", views.logout),
    ("api/auth/perfil", views.profile),
    ("api/auth/verificar/<str:token>", views.verify_email),
    ("api/auth/forgot-password", views.forgot_password),
    ("api/auth/reset-password", views.reset_password),
    ("api/categorias", views.CategoryCollection.as_view()),
    ("api/categorias/<uuid:pk>", views.CategoryDetail.as_view()),
    ("api/marcas", views.BrandCollection.as_view()),
    ("api/marcas/<uuid:pk>", views.BrandDetail.as_view()),
    ("api/modelos-moto", views.ModelCollection.as_view()),
    ("api/modelos-moto/<uuid:pk>", views.ModelDetail.as_view()),
    ("api/motos", views.MotorcycleCollection.as_view()),
    ("api/motos/<uuid:pk>", views.MotorcycleDetail.as_view()),
    ("api/roles", views.RoleCollection.as_view()),
    ("api/roles/<uuid:pk>", views.RoleDetail.as_view()),
    ("api/tiendas", views.StoreCollection.as_view()),
    ("api/tiendas/<uuid:pk>", views.StoreDetail.as_view()),
    ("api/usuarios", views.UserCollection.as_view()),
    ("api/usuarios/<uuid:pk>", views.UserDetail.as_view()),
    ("api/modelos-3d", views.Model3DCollection.as_view()),
    ("api/modelos-3d/accesorio/<uuid:id_accesorio>", views.Model3DByAccessory.as_view()),
    ("api/modelos-3d/<uuid:pk>", views.Model3DDetail.as_view()),
    ("api/productos", views.ProductCollection.as_view()),
    ("api/productos/<uuid:pk>", views.ProductDetail.as_view()),
    ("api/categorias-producto", views.ProductCategoryCollection.as_view()),
    ("api/categorias-producto/<uuid:pk>", views.ProductCategoryDetail.as_view()),
    ("api/tipos-accesorio", views.AccessoryTypeCollection.as_view()),
    ("api/tipos-accesorio/<uuid:pk>", views.AccessoryTypeDetail.as_view()),
    ("api/tipos-movimiento", views.MovementTypeCollection.as_view()),
    ("api/tipos-movimiento/<uuid:pk>", views.MovementTypeDetail.as_view()),
    ("api/planes-suscripcion", views.SubscriptionPlanCollection.as_view()),
    ("api/planes-suscripcion/<uuid:pk>", views.SubscriptionPlanDetail.as_view()),
    ("api/configuraciones", views.ConfigurationCollection.as_view()),
    ("api/configuraciones/<uuid:pk>", views.ConfigurationDetail.as_view()),
    ("api/accesorios", views.AccessoryCollection.as_view()),
    ("api/accesorios/<uuid:pk>", views.AccessoryDetail.as_view()),
    ("api/compatibilidad/modelo/<uuid:id_modelo_moto>", views.AccessoriesByModel.as_view()),
    ("api/compatibilidad/accesorio/<uuid:id_accesorio>", views.ModelsByAccessory.as_view()),
    ("api/compatibilidad", views.CompatibilityCollection.as_view()),
    ("api/compatibilidad/<uuid:pk>", views.CompatibilityDetail.as_view()),
    ("api/inventario", views.InventoryCollection.as_view()),
    ("api/inventario/movimiento", views.InventoryMovementView.as_view()),
    ("api/inventario/<uuid:pk>", views.InventoryDetail.as_view()),
    ("api/cotizaciones", views.QuoteCollection.as_view()),
    ("api/cotizaciones/<uuid:pk>", views.QuoteDetailView.as_view()),
    ("api/cotizaciones/<uuid:pk>/estado", views.QuoteStatus.as_view()),
    ("api/cotizaciones/<uuid:pk>/historial", views.QuoteHistoryView.as_view()),
]


from django.views.generic import RedirectView

urlpatterns = [
    path("admin/", admin_site.urls),
    # Sin barra final: redirect explícito (sin CommonMiddleware por
    # APPEND_SLASH=False). Va aparte para no duplicar el namespace del admin.
    path("admin", RedirectView.as_view(url="/admin/", permanent=False)),
    re_path(r"^api/schema/?$", SpectacularAPIView.as_view(), name="schema"),
    re_path(
        r"^api/docs/?$",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    re_path(
        r"^api/redoc/?$",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    path("", views.root),
    path("api", views.root),
    path("api/", views.root),
]

for _ruta, _vista in _RUTAS_API:
    urlpatterns += _api(_ruta, _vista)
