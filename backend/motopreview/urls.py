from django.contrib import admin
from django.urls import path

from api import views


def _api(ruta, vista):
    """Registra la ruta con y sin '/' final.

    La API se publica sin barra final (así la consume el frontend), pero se
    acepta también con barra para no fallar al probarla desde el navegador.
    """
    return [path(ruta, vista), path(f"{ruta}/", vista)]


_RUTAS_API = [
    ("api/health", views.health),
    ("api/healthz", views.health),
    ("api/auth/register", views.register),
    ("api/auth/login", views.login),
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
]


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.root),
    path("api", views.root),
    path("api/", views.root),
]

for _ruta, _vista in _RUTAS_API:
    urlpatterns += _api(_ruta, _vista)
