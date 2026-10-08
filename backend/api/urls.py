from django.urls import path

from . import views


def both(route, view, name=None):
    """Expone la ruta canónica (sin /) y su variante con barra final.

    El frontend y los ejemplos usan las rutas sin barra (/api/health), pero
    los navegadores y curl suelen añadirla. Sin esto, /api/health/ era 404.
    """
    patterns = [path(route, view, name=name)]
    if route and not route.endswith("/"):
        patterns.append(path(route + "/", view))
    return patterns


urlpatterns = [
    path("", views.root),
    path("api", views.root),
    path("api/", views.root),
    *both("api/health", views.health),
    *both("api/healthz", views.health),
    *both("api/auth/register", views.register),
    *both("api/auth/login", views.login),
    *both("api/auth/perfil", views.profile),
    path("api/auth/verificar/<str:token>", views.verify_email),
    path("api/auth/verificar/<str:token>/", views.verify_email),
    *both("api/auth/forgot-password", views.forgot_password),
    *both("api/auth/reset-password", views.reset_password),
    *both("api/categorias", views.CategoryCollection.as_view()),
    path("api/categorias/<uuid:pk>", views.CategoryDetail.as_view()),
    path("api/categorias/<uuid:pk>/", views.CategoryDetail.as_view()),
    *both("api/marcas", views.BrandCollection.as_view()),
    path("api/marcas/<uuid:pk>", views.BrandDetail.as_view()),
    path("api/marcas/<uuid:pk>/", views.BrandDetail.as_view()),
    *both("api/modelos-moto", views.ModelCollection.as_view()),
    path("api/modelos-moto/<uuid:pk>", views.ModelDetail.as_view()),
    path("api/modelos-moto/<uuid:pk>/", views.ModelDetail.as_view()),
    *both("api/motos", views.MotorcycleCollection.as_view()),
    path("api/motos/<uuid:pk>", views.MotorcycleDetail.as_view()),
    path("api/motos/<uuid:pk>/", views.MotorcycleDetail.as_view()),
    *both("api/roles", views.RoleCollection.as_view()),
    path("api/roles/<uuid:pk>", views.RoleDetail.as_view()),
    path("api/roles/<uuid:pk>/", views.RoleDetail.as_view()),
    *both("api/tiendas", views.StoreCollection.as_view()),
    path("api/tiendas/<uuid:pk>", views.StoreDetail.as_view()),
    path("api/tiendas/<uuid:pk>/", views.StoreDetail.as_view()),
    *both("api/usuarios", views.UserCollection.as_view()),
    path("api/usuarios/<uuid:pk>", views.UserDetail.as_view()),
    path("api/usuarios/<uuid:pk>/", views.UserDetail.as_view()),
    *both("api/modelos-3d", views.Model3DCollection.as_view()),
    path(
        "api/modelos-3d/accesorio/<uuid:id_accesorio>",
        views.Model3DByAccessory.as_view(),
    ),
    path(
        "api/modelos-3d/accesorio/<uuid:id_accesorio>/",
        views.Model3DByAccessory.as_view(),
    ),
    path("api/modelos-3d/<uuid:pk>", views.Model3DDetail.as_view()),
    path("api/modelos-3d/<uuid:pk>/", views.Model3DDetail.as_view()),
    *both("api/accesorios", views.AccessoryCollection.as_view()),
    path("api/accesorios/<uuid:pk>", views.AccessoryDetail.as_view()),
    path("api/accesorios/<uuid:pk>/", views.AccessoryDetail.as_view()),
    path(
        "api/compatibilidad/modelo/<uuid:id_modelo_moto>",
        views.AccessoriesByModel.as_view(),
    ),
    path(
        "api/compatibilidad/modelo/<uuid:id_modelo_moto>/",
        views.AccessoriesByModel.as_view(),
    ),
    path(
        "api/compatibilidad/accesorio/<uuid:id_accesorio>",
        views.ModelsByAccessory.as_view(),
    ),
    path(
        "api/compatibilidad/accesorio/<uuid:id_accesorio>/",
        views.ModelsByAccessory.as_view(),
    ),
    *both("api/compatibilidad", views.CompatibilityCollection.as_view()),
    path("api/compatibilidad/<uuid:pk>", views.CompatibilityDetail.as_view()),
    path("api/compatibilidad/<uuid:pk>/", views.CompatibilityDetail.as_view()),
    *both("api/inventario", views.InventoryCollection.as_view()),
    *both("api/inventario/movimiento", views.InventoryMovement.as_view()),
    path("api/inventario/<uuid:pk>", views.InventoryDetail.as_view()),
    path("api/inventario/<uuid:pk>/", views.InventoryDetail.as_view()),
    *both("api/cotizaciones", views.QuoteCollection.as_view()),
    path("api/cotizaciones/<uuid:pk>", views.QuoteDetail.as_view()),
    path("api/cotizaciones/<uuid:pk>/", views.QuoteDetail.as_view()),
    path("api/cotizaciones/<uuid:pk>/estado", views.QuoteStatus.as_view()),
    path("api/cotizaciones/<uuid:pk>/estado/", views.QuoteStatus.as_view()),
]
