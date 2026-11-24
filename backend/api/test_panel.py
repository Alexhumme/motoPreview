from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from .security import ROLE_ADMIN, ROLE_CUSTOMER
from .views import (
    PanelResumenView,
    _queryset_con_acceso,
    _rango_resumen,
    _serie_diaria,
    _ventas_por_fecha,
)


def solicitud(parametros=None):
    return SimpleNamespace(query_params=parametros or {})


def usuario(rol=ROLE_CUSTOMER, tienda=None):
    return SimpleNamespace(
        is_authenticated=True,
        is_anonymous=False,
        pk="cccccccc-0000-0000-0000-000000000003",
        id_usuario="cccccccc-0000-0000-0000-000000000003",
        id_tienda=tienda,
        id_rol=rol,
        role_ids=[rol],
        estado_usuario="activo",
        rol_superadmin_vigente=False,
    )


class RangoResumenTests(SimpleTestCase):
    @mock.patch("api.views.timezone.localdate", return_value=date(2026, 11, 23))
    def test_rango_por_defecto_cubre_treinta_dias(self, _):
        desde, hasta, error = _rango_resumen(solicitud())
        self.assertIsNone(error)
        self.assertEqual(desde, date(2026, 10, 25))
        self.assertEqual(hasta, date(2026, 11, 23))

    @mock.patch("api.views.timezone.localdate", return_value=date(2026, 11, 23))
    def test_rango_invalido_se_rechaza(self, _):
        for parametros in (
            {"desde": "23-11-2026"},
            {"desde": "2026-11-24", "hasta": "2026-11-23"},
            {"desde": "2025-01-01", "hasta": "2026-11-23"},
        ):
            with self.subTest(parametros=parametros):
                desde, hasta, error = _rango_resumen(solicitud(parametros))
                self.assertIsNone(desde)
                self.assertIsNone(hasta)
                self.assertEqual(error.status_code, 400)


class SerieDiariaTests(SimpleTestCase):
    def test_completa_dias_vacios_y_suma_montos(self):
        cotizaciones = [
            {
                "fecha_solicitud__date": date(2026, 11, 1),
                "tienda_id": "tienda-a",
                "cantidad": 2,
                "total": Decimal("300.00"),
            }
        ]
        ventas = [
            {
                "fecha": date(2026, 11, 1),
                "tienda_id": "tienda-a",
                "total": Decimal("120.00"),
            },
            {
                "fecha": date(2026, 11, 3),
                "tienda_id": "tienda-a",
                "total": Decimal("80.00"),
            },
        ]
        serie = _serie_diaria(cotizaciones, ventas, date(2026, 11, 1), date(2026, 11, 3))
        self.assertEqual([fila["fecha"] for fila in serie], ["2026-11-01", "2026-11-02", "2026-11-03"])
        self.assertEqual(serie[0]["cotizaciones"]["cantidad"], 2)
        self.assertEqual(serie[0]["ventas_completadas"]["total"], Decimal("120.00"))
        self.assertEqual(serie[1]["cotizaciones"]["cantidad"], 0)
        self.assertEqual(serie[2]["ventas_completadas"]["cantidad"], 1)


class VentasPorFechaTests(SimpleTestCase):
    @mock.patch("api.views.Quote.objects")
    @mock.patch("api.views.QuoteStatusHistory.objects")
    def test_deduplica_por_dia_cotizacion_y_tienda(self, historial, cotizaciones):
        fechas = [
            {
                "cotizacion_id": "cotizacion-a",
                "fecha__date": date(2026, 11, 1),
                "cotizacion__tienda_id": "tienda-a",
            }
        ]
        consulta = historial.filter.return_value.order_by.return_value.values.return_value
        consulta.distinct.return_value = fechas
        cotizaciones.filter.return_value.values_list.return_value = [
            ("cotizacion-a", Decimal("100.00"))
        ]
        ventas = _ventas_por_fecha(mock.Mock(), date(2026, 11, 1), date(2026, 11, 1))
        self.assertEqual(ventas, [{
            "fecha": date(2026, 11, 1),
            "tienda_id": "tienda-a",
            "total": Decimal("100.00"),
        }])
        historial.filter.return_value.order_by.return_value.values.assert_called_once_with(
            "cotizacion_id", "fecha__date", "cotizacion__tienda_id"
        )
        consulta.distinct.assert_called_once_with()
        self.assertEqual(historial.filter.call_count, 1)
        self.assertEqual(cotizaciones.filter.call_count, 1)


class AccesosPanelTests(SimpleTestCase):
    @mock.patch("api.views.filas_del_scope")
    @mock.patch("api.views.scopes_concedidos", return_value={"propio"})
    def test_cliente_solo_obtiene_su_queryset(self, scopes, filas):
        queryset = mock.Mock()
        predicado = object()
        filas.return_value = (predicado, None)
        resultado, alcances = _queryset_con_acceso(
            usuario(), "cotizaciones", queryset, campo_dueno="usuario_id"
        )
        self.assertIs(resultado, queryset.filter.return_value)
        self.assertEqual(alcances, {"propio"})
        filas.assert_called_once_with(
            usuario(), "cotizaciones", {"propio"}, campo_tienda="tienda_id", campo_dueno="usuario_id"
        )

    @mock.patch("api.views.filas_del_scope")
    @mock.patch("api.views.scopes_concedidos", return_value=set())
    def test_sin_permiso_no_se_consulta_el_queryset(self, _, __):
        queryset = mock.Mock()
        resultado, alcances = _queryset_con_acceso(usuario(ROLE_ADMIN), "inventario", queryset)
        self.assertIsNone(resultado)
        self.assertEqual(alcances, set())
        queryset.filter.assert_not_called()


@override_settings(DATABASE_URL="")
class PanelResumenAutenticacionTests(SimpleTestCase):
    def test_anonimo_recibe_401(self):
        respuesta = APIClient().get("/api/panel/resumen")
        self.assertEqual(respuesta.status_code, 401)

    @mock.patch("api.views.database_unavailable", return_value=None)
    @mock.patch("api.views._queryset_con_acceso", return_value=(None, set()))
    @mock.patch("api.views.timezone.localdate", return_value=date(2026, 11, 23))
    def test_sin_capacidades_responde_panel_vacio(self, *_):
        request = APIRequestFactory().get("/api/panel/resumen")
        force_authenticate(request, user=usuario(ROLE_ADMIN, "tienda-a"))
        respuesta = PanelResumenView.as_view()(request)
        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(respuesta.data["capacidades"]["cotizaciones"])
        self.assertFalse(respuesta.data["capacidades"]["inventario"])
        self.assertIsNone(respuesta.data["actual"])
        self.assertEqual(respuesta.data["diario"], [])
