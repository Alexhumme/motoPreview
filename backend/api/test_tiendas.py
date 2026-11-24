from contextlib import nullcontext
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from django.db import IntegrityError
from django.test import SimpleTestCase, override_settings
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import Store
from .security import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_SUPERADMIN
from .serializers import StoreSerializer
from .views import StoreCollection, StoreDetail

TIENDA = uuid4()
OTRA_TIENDA = uuid4()
USUARIO = uuid4()


def usuario(roles, *, tienda=None, superadmin_vigente=False, scopes=()):
    return SimpleNamespace(
        is_authenticated=True,
        is_anonymous=False,
        pk=USUARIO,
        id_usuario=USUARIO,
        id_rol=roles[0] if roles else None,
        id_tienda=tienda,
        role_ids=list(roles),
        estado_usuario="activo",
        rol_superadmin_vigente=superadmin_vigente,
        _scopes_concedidos_cache={
            ("tiendas", accion): set(scopes)
            for accion in ("crear", "actualizar", "eliminar")
        },
    )


def crear_tienda(identificador=TIENDA, **datos):
    valores = {
        "id_tienda": identificador,
        "nombre_tienda": "Tienda de prueba",
        "nit": "900123456-7",
        "direccion_tienda": "Calle 1",
        "telefono_tienda": "3001234567",
        "email_tienda": "tienda@example.com",
        "estado_tienda": "activa",
        "plan": None,
    }
    valores.update(datos)
    return Store(**valores)


class ConsultaTiendas(list):
    def count(self):
        return len(self)


@override_settings(DATABASE_URL="postgresql://prueba:prueba@localhost/motopreview")
class TiendaVistasTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def solicitar(self, vista, metodo, user, *, datos=None, pk=None, ruta=None):
        if ruta is None:
            ruta = f"/api/tiendas/{pk}" if pk is not None else "/api/tiendas"
        if datos is None:
            request = getattr(self.factory, metodo)(ruta)
        else:
            request = getattr(self.factory, metodo)(ruta, datos, format="json")
        force_authenticate(request, user=user)
        kwargs = {"pk": pk} if pk is not None else {}
        return vista.as_view()(request, **kwargs)

    def assert_contacto_visible(self, datos):
        for campo in ("nit", "telefono_tienda", "email_tienda"):
            self.assertIn(campo, datos)

    def test_superadmin_listado_paginado_ve_contacto(self):
        tienda = crear_tienda()
        superadmin = usuario([ROLE_SUPERADMIN], superadmin_vigente=True)
        consulta = mock.Mock()
        consulta.all.return_value = ConsultaTiendas([tienda])

        with mock.patch.object(Store.objects, "select_related", return_value=consulta):
            response = self.solicitar(
                StoreCollection, "get", superadmin, ruta="/api/tiendas?pagina=1"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_contacto_visible(response.data["resultados"][0])
        consulta.filter.assert_not_called()

    def test_admin_listado_se_acota_y_ve_contacto(self):
        tienda = crear_tienda()
        admin = usuario([ROLE_ADMIN], tienda=TIENDA)
        consulta = mock.Mock()
        consulta.filter.return_value = ConsultaTiendas([tienda])

        with mock.patch.object(Store.objects, "select_related", return_value=consulta):
            response = self.solicitar(StoreCollection, "get", admin)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_contacto_visible(response.data[0])
        consulta.filter.assert_called_once_with(id_tienda=TIENDA)

    def test_admin_detalle_propio_ve_contacto(self):
        tienda = crear_tienda()
        admin = usuario([ROLE_ADMIN], tienda=TIENDA)
        consulta = mock.Mock()
        consulta.filter.return_value.get.return_value = tienda

        with mock.patch.object(Store.objects, "select_related", return_value=consulta):
            response = self.solicitar(StoreDetail, "get", admin, pk=TIENDA)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_contacto_visible(response.data)
        consulta.filter.assert_called_once_with(id_tienda=TIENDA)

    def test_cliente_detalle_oculta_contacto(self):
        tienda = crear_tienda()
        cliente = usuario([ROLE_CUSTOMER], tienda=TIENDA)
        consulta = mock.Mock()
        consulta.filter.return_value.get.return_value = tienda

        with mock.patch.object(Store.objects, "select_related", return_value=consulta):
            response = self.solicitar(StoreDetail, "get", cliente, pk=TIENDA)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for campo in ("nit", "telefono_tienda", "email_tienda"):
            self.assertNotIn(campo, response.data)

    def test_admin_detalle_ajeno_no_encontrado(self):
        admin = usuario([ROLE_ADMIN], tienda=TIENDA)
        consulta = mock.Mock()
        consulta.filter.return_value.get.side_effect = Store.DoesNotExist

        with mock.patch.object(Store.objects, "select_related", return_value=consulta):
            response = self.solicitar(StoreDetail, "get", admin, pk=OTRA_TIENDA)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        consulta.filter.assert_called_once_with(id_tienda=TIENDA)

    def test_alta_global_sin_tienda_permitida(self):
        admin = usuario([ROLE_ADMIN], scopes={"global"})
        tienda = crear_tienda()
        datos = {
            "nombre_tienda": "Tienda nueva",
            "nit": "900987654-3",
            "telefono_tienda": "3009876543",
            "email_tienda": "nueva@example.com",
        }

        with mock.patch(
            "rest_framework.validators.UniqueValidator.__call__", return_value=None
        ), mock.patch.object(
            Store._default_manager, "create", return_value=tienda
        ) as crear, mock.patch(
            "api.views.transaction.atomic", return_value=nullcontext()
        ):
            response = self.solicitar(StoreCollection, "post", admin, datos=datos)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assert_contacto_visible(response.data)
        crear.assert_called_once_with(
            nombre_tienda="Tienda nueva",
            nit="900987654-3",
            telefono_tienda="3009876543",
            email_tienda="nueva@example.com",
        )

    def test_admin_con_tienda_no_puede_crear_aunque_tenga_global(self):
        admin = usuario([ROLE_ADMIN], tienda=TIENDA, scopes={"global"})

        with mock.patch.object(StoreCollection, "serializer_class") as serializer:
            response = self.solicitar(
                StoreCollection, "post", admin, datos={"nombre_tienda": "No permitida"}
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        serializer.assert_not_called()

    def test_alta_sin_scope_global_denegada(self):
        admin = usuario([ROLE_ADMIN], scopes={"tienda"})

        with mock.patch.object(StoreCollection, "serializer_class") as serializer:
            response = self.solicitar(
                StoreCollection, "post", admin, datos={"nombre_tienda": "No permitida"}
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        serializer.assert_not_called()

    def test_superadmin_puede_crear(self):
        superadmin = usuario([ROLE_SUPERADMIN], superadmin_vigente=True)
        tienda = crear_tienda()

        with mock.patch(
            "rest_framework.validators.UniqueValidator.__call__", return_value=None
        ), mock.patch.object(
            Store._default_manager, "create", return_value=tienda
        ), mock.patch(
            "api.views.transaction.atomic", return_value=nullcontext()
        ):
            response = self.solicitar(
                StoreCollection, "post", superadmin, datos={"nombre_tienda": "Tienda sede"}
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assert_contacto_visible(response.data)

    def test_conflicto_nit_al_guardar_devuelve_409(self):
        admin = usuario([ROLE_ADMIN], scopes={"global"})

        with mock.patch(
            "rest_framework.validators.UniqueValidator.__call__", return_value=None
        ), mock.patch.object(
            Store._default_manager, "create", side_effect=IntegrityError
        ), mock.patch(
            "api.views.transaction.atomic", return_value=nullcontext()
        ):
            response = self.solicitar(
                StoreCollection,
                "post",
                admin,
                datos={"nombre_tienda": "Tienda en conflicto", "nit": "900000000-0"},
            )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("conflicto", response.data["error"])

    def test_put_y_patch_propios_actualizan_y_ven_contacto(self):
        admin = usuario([ROLE_ADMIN], tienda=TIENDA, scopes={"global"})
        casos = (
            ("put", {"nombre_tienda": "Tienda actualizada", "nit": "900111111-1"}),
            ("patch", {"telefono_tienda": "3001111111"}),
        )

        for metodo, datos in casos:
            with self.subTest(metodo=metodo):
                tienda = crear_tienda()
                consulta = mock.Mock()
                consulta.filter.return_value.get.return_value = tienda
                with mock.patch(
                    "rest_framework.validators.UniqueValidator.__call__", return_value=None
                ), mock.patch.object(
                    Store.objects, "select_related", return_value=consulta
                ), mock.patch.object(
                    Store, "save"
                ) as guardar, mock.patch(
                    "api.views.transaction.atomic", return_value=nullcontext()
                ):
                    response = self.solicitar(
                        StoreDetail, metodo, admin, pk=TIENDA, datos=datos
                    )

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assert_contacto_visible(response.data)
                guardar.assert_called_once_with()
                consulta.filter.assert_called_once_with(id_tienda=TIENDA)
                if metodo == "put":
                    self.assertEqual(response.data["nombre_tienda"], "Tienda actualizada")
                else:
                    self.assertEqual(response.data["telefono_tienda"], "3001111111")

    def test_edicion_ajena_no_encontrada(self):
        admin = usuario([ROLE_ADMIN], tienda=TIENDA, scopes={"global"})
        consulta = mock.Mock()
        consulta.filter.return_value.get.side_effect = Store.DoesNotExist

        with mock.patch.object(
            Store.objects, "select_related", return_value=consulta
        ), mock.patch.object(Store, "save") as guardar:
            response = self.solicitar(
                StoreDetail,
                "patch",
                admin,
                pk=OTRA_TIENDA,
                datos={"nombre_tienda": "No permitida"},
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        guardar.assert_not_called()
        consulta.filter.assert_called_once_with(id_tienda=TIENDA)

    def test_delete_logico_propio_desactiva_tienda(self):
        tienda = crear_tienda()
        admin = usuario([ROLE_ADMIN], tienda=TIENDA, scopes={"global"})
        consulta = mock.Mock()
        consulta.filter.return_value.get.return_value = tienda
        serializer = mock.Mock(wraps=StoreSerializer)

        with mock.patch.object(
            Store.objects, "select_related", return_value=consulta
        ), mock.patch.object(
            StoreDetail, "serializer_class", serializer
        ), mock.patch.object(
            Store, "save"
        ) as guardar, mock.patch.object(
            Store, "delete"
        ) as borrar, mock.patch(
            "api.views.transaction.atomic", return_value=nullcontext()
        ) as atomico:
            response = self.solicitar(StoreDetail, "delete", admin, pk=TIENDA)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, {"mensaje": "Tienda desactivada.", "estado": "inactiva"}
        )
        self.assertEqual(tienda.estado_tienda, "inactiva")
        guardar.assert_called_once_with(update_fields=["estado_tienda"])
        borrar.assert_not_called()
        atomico.assert_called_once_with()
        self.assertIs(serializer.call_args.kwargs["context"]["request"].user, admin)

    def test_delete_ajeno_no_encontrado(self):
        admin = usuario([ROLE_ADMIN], tienda=TIENDA, scopes={"global"})
        consulta = mock.Mock()
        consulta.filter.return_value.get.side_effect = Store.DoesNotExist

        with mock.patch.object(
            Store.objects, "select_related", return_value=consulta
        ), mock.patch.object(Store, "save") as guardar, mock.patch.object(
            Store, "delete"
        ) as borrar:
            response = self.solicitar(StoreDetail, "delete", admin, pk=OTRA_TIENDA)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        guardar.assert_not_called()
        borrar.assert_not_called()
        consulta.filter.assert_called_once_with(id_tienda=TIENDA)

    def test_delete_sin_permiso_denegado(self):
        admin = usuario([ROLE_ADMIN], tienda=TIENDA)
        consulta = mock.Mock()

        with mock.patch.object(
            Store.objects, "select_related", return_value=consulta
        ), mock.patch.object(Store, "save") as guardar, mock.patch.object(
            Store, "delete"
        ) as borrar:
            response = self.solicitar(StoreDetail, "delete", admin, pk=TIENDA)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        consulta.filter.assert_not_called()
        guardar.assert_not_called()
        borrar.assert_not_called()
