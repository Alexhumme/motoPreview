from contextlib import nullcontext
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from django.test import SimpleTestCase

from .models import Product, TipoProducto
from .views import InventoryCollection, ProductCollection
from .serializers import (
    AccesorioInputSerializer,
    AccesorioSerializer,
    InventorySerializer,
    ProductSerializer,
)


def crear_tipo(accesorio=False, identificador=None):
    return TipoProducto(
        id_tipo_producto=identificador or uuid4(),
        nombre="Tipo de prueba",
        accesorio=accesorio,
    )


def crear_producto(es_accesorio=False, tipos=()):
    producto = SimpleNamespace(
        id_producto=uuid4(),
        nombre="Producto de prueba",
        descripcion="Descripción del producto",
        estado="disponible",
        categoria_producto=None,
        marca=None,
        es_accesorio=es_accesorio,
        peso=Decimal("1.25"),
        imagen=None,
        codigo_sku="PRODUCTO-1",
        precio=Decimal("125.50"),
        tipos=mock.MagicMock(),
    )
    producto.tipos.all.return_value = list(tipos)
    producto.tipos.__iter__.side_effect = lambda: iter(list(tipos))
    return producto


class ProductSerializerTests(SimpleTestCase):
    @mock.patch("api.serializers.TipoProducto.objects")
    def test_deriva_accesorio_desde_los_tipos(self, objetos):
        tipo_comun = crear_tipo()
        tipo_accesorio = crear_tipo(accesorio=True)
        objetos.filter.return_value = [tipo_comun, tipo_accesorio]
        serializer = ProductSerializer(
            data={
                "nombre": "Casco integral",
                "id_tipos": [
                    str(tipo_comun.id_tipo_producto),
                    str(tipo_accesorio.id_tipo_producto),
                ],
                "es_accesorio": False,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertTrue(serializer.validated_data["es_accesorio"])
        objetos.filter.assert_called_once_with(
            id_tipo_producto__in={
                tipo_comun.id_tipo_producto,
                tipo_accesorio.id_tipo_producto,
            }
        )

    @mock.patch("api.serializers.TipoProducto.objects")
    def test_lista_sin_tipos_accesorio_deriva_falso(self, objetos):
        tipo_comun = crear_tipo()
        objetos.filter.return_value = [tipo_comun]
        serializer = ProductSerializer(
            data={
                "nombre": "Producto común",
                "id_tipos": [str(tipo_comun.id_tipo_producto)],
                "es_accesorio": True,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertFalse(serializer.validated_data["es_accesorio"])

    @mock.patch("api.serializers.TipoProducto.objects")
    def test_lista_vacia_deriva_falso_sin_consultar_tipos(self, objetos):
        serializer = ProductSerializer(
            data={"nombre": "Producto común", "id_tipos": [], "es_accesorio": True}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertFalse(serializer.validated_data["es_accesorio"])
        objetos.filter.assert_not_called()

    def test_no_permite_forzar_accesorio_sin_tipos(self):
        serializer = ProductSerializer(
            data={"nombre": "Producto común", "es_accesorio": True}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("es_accesorio", serializer.validated_data)

    @mock.patch("api.serializers.TipoProducto.objects")
    def test_rechaza_tipos_inexistentes(self, objetos):
        tipo_existente = crear_tipo()
        objetos.filter.return_value = [tipo_existente]
        serializer = ProductSerializer(
            data={
                "nombre": "Casco integral",
                "id_tipos": [
                    str(tipo_existente.id_tipo_producto),
                    str(uuid4()),
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("id_tipos", serializer.errors)
        self.assertEqual(
            serializer.errors["id_tipos"][0],
            "Uno o más tipos de producto no existen.",
        )

    def test_representacion_incluye_peso_y_tipos_anidados(self):
        tipo = crear_tipo(accesorio=True)
        producto = crear_producto(es_accesorio=True, tipos=[tipo])

        datos = ProductSerializer(producto).data

        self.assertTrue(datos["es_accesorio"])
        self.assertEqual(datos["peso"], "1.25")
        self.assertNotIn("id_tipos", datos)
        self.assertEqual(
            datos["tipos"],
            [
                {
                    "id_tipo_producto": str(tipo.id_tipo_producto),
                    "nombre": tipo.nombre,
                    "descripcion": None,
                    "accesorio": True,
                    "activo": True,
                }
            ],
        )
        self.assertTrue(ProductSerializer().fields["tipos"].read_only)

    @mock.patch("api.serializers.transaction.atomic", return_value=nullcontext())
    @mock.patch("api.serializers.TipoProducto.objects")
    def test_create_aplica_tipos_y_conserva_los_demas_campos(
        self, objetos, atomico
    ):
        tipo = crear_tipo(accesorio=True)
        objetos.filter.return_value = [tipo]
        producto = SimpleNamespace(tipos=mock.Mock())
        serializer = ProductSerializer(
            data={
                "nombre": "Casco integral",
                "descripcion": "Casco para moto",
                "estado": "disponible",
                "imagen": "https://example.com/casco.jpg",
                "codigo_sku": "CASCO-1",
                "precio": "125.50",
                "peso": "1.25",
                "es_accesorio": False,
                "id_tipos": [str(tipo.id_tipo_producto)],
            }
        )
        serializer.fields["codigo_sku"].validators = []

        with mock.patch.object(
            Product._default_manager, "create", return_value=producto
        ) as crear:
            self.assertTrue(serializer.is_valid(), serializer.errors)
            resultado = serializer.save()

        self.assertIs(resultado, producto)
        crear.assert_called_once_with(
            nombre="Casco integral",
            descripcion="Casco para moto",
            estado="disponible",
            imagen="https://example.com/casco.jpg",
            codigo_sku="CASCO-1",
            precio=Decimal("125.50"),
            peso=Decimal("1.25"),
            es_accesorio=True,
        )
        producto.tipos.set.assert_called_once_with([tipo])
        atomico.assert_called_once_with()

    @mock.patch("api.serializers.transaction.atomic", return_value=nullcontext())
    @mock.patch("api.serializers.TipoProducto.objects")
    def test_update_aplica_tipos_y_conserva_los_demas_campos(
        self, objetos, atomico
    ):
        tipo_comun = crear_tipo()
        objetos.filter.return_value = [tipo_comun]
        producto = Product(
            nombre="Nombre original",
            descripcion="Descripción original",
            estado="disponible",
            precio=Decimal("100.00"),
            peso=Decimal("2.00"),
            es_accesorio=True,
        )
        serializer = ProductSerializer(
            producto,
            data={
                "id_tipos": [str(tipo_comun.id_tipo_producto)],
                "precio": "120.00",
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        with mock.patch.object(Product, "save") as guardar, mock.patch.object(
            Product, "tipos"
        ) as tipos:
            resultado = serializer.save()

        self.assertIs(resultado, producto)
        self.assertEqual(producto.nombre, "Nombre original")
        self.assertEqual(producto.descripcion, "Descripción original")
        self.assertEqual(producto.precio, Decimal("120.00"))
        self.assertFalse(producto.es_accesorio)
        guardar.assert_called_once_with()
        tipos.set.assert_called_once_with([tipo_comun])
        atomico.assert_called_once_with()

    @mock.patch("api.serializers.transaction.atomic", return_value=nullcontext())
    def test_update_sin_tipos_no_modifica_la_relacion(self, atomico):
        producto = Product(nombre="Nombre original", es_accesorio=True)
        serializer = ProductSerializer(
            producto, data={"nombre": "Nombre actualizado"}, partial=True
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        with mock.patch.object(Product, "save") as guardar, mock.patch.object(
            Product, "tipos"
        ) as tipos:
            serializer.save()

        self.assertEqual(producto.nombre, "Nombre actualizado")
        self.assertTrue(producto.es_accesorio)
        guardar.assert_called_once_with()
        tipos.set.assert_not_called()
        atomico.assert_called_once_with()


class AccesorioInputSerializerTests(SimpleTestCase):
    def test_acepta_y_mapea_categoria_y_es_accesorio(self):
        categoria = SimpleNamespace(id_categoria_producto=uuid4())
        consulta = mock.Mock()
        consulta.get.return_value = categoria
        serializer = AccesorioInputSerializer(
            data={
                "acc_nombre": "Casco integral",
                "acc_precio": "125.50",
                "id_categoria_producto": str(categoria.id_categoria_producto),
                "es_accesorio": True,
            }
        )
        serializer.fields["id_categoria_producto"].queryset = consulta

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIs(
            serializer.validated_data["categoria_producto"], categoria
        )
        self.assertTrue(serializer.validated_data["es_accesorio"])
        campos = serializer.to_fields(serializer.validated_data)
        self.assertTrue(campos["es_accesorio"])
        self.assertIs(campos["categoria_producto"], categoria)
        self.assertNotIn("id_categoria_producto", campos)
        self.assertEqual(
            serializer.fields["id_categoria_producto"].source,
            "categoria_producto",
        )

    @mock.patch("api.serializers.TipoProducto.objects")
    def test_deriva_accesorio_y_conserva_ids_para_los_tipos(self, objetos):
        tipo_comun = crear_tipo()
        tipo_accesorio = crear_tipo(accesorio=True)
        objetos.filter.return_value = [tipo_comun, tipo_accesorio]
        ids = [tipo_comun.id_tipo_producto, tipo_accesorio.id_tipo_producto]
        serializer = AccesorioInputSerializer(
            data={
                "acc_nombre": "Casco integral",
                "acc_precio": "125.50",
                "id_tipos": [str(identificador) for identificador in ids],
                "es_accesorio": False,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertTrue(serializer.validated_data["es_accesorio"])
        self.assertEqual(serializer.validated_data["id_tipos"], ids)
        self.assertEqual(serializer.to_fields(serializer.validated_data)["_tipos"], ids)

    @mock.patch("api.serializers.TipoProducto.objects")
    def test_lista_sin_tipos_accesorio_deriva_falso(self, objetos):
        tipo_comun = crear_tipo()
        objetos.filter.return_value = [tipo_comun]
        serializer = AccesorioInputSerializer(
            data={
                "acc_nombre": "Producto común",
                "acc_precio": "125.50",
                "id_tipos": [str(tipo_comun.id_tipo_producto)],
                "es_accesorio": True,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertFalse(serializer.validated_data["es_accesorio"])

    @mock.patch("api.serializers.TipoProducto.objects")
    def test_rechaza_tipos_inexistentes(self, objetos):
        tipo_existente = crear_tipo()
        objetos.filter.return_value = [tipo_existente]
        serializer = AccesorioInputSerializer(
            data={
                "acc_nombre": "Casco integral",
                "acc_precio": "125.50",
                "id_tipos": [
                    str(tipo_existente.id_tipo_producto),
                    str(uuid4()),
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("id_tipos", serializer.errors)


class ConsultasProductoTests(SimpleTestCase):
    def test_catalogo_precarga_relaciones_vigentes(self):
        queryset = ProductCollection().get_queryset()
        self.assertEqual(set(queryset.query.select_related), {"categoria_producto", "marca"})
        self.assertIn("tipos", queryset._prefetch_related_lookups)

    def test_inventario_precarga_producto_tipos_y_marca(self):
        queryset = InventoryCollection().get_queryset(None)
        relaciones_producto = queryset.query.select_related["producto"]
        self.assertIn("marca", relaciones_producto)
        self.assertIn("producto__tipos", queryset._prefetch_related_lookups)
        self.assertNotIn("categoria_accesorio", relaciones_producto)
        self.assertNotIn("tipo_accesorio", relaciones_producto)


class InventorySerializerTests(SimpleTestCase):
    def test_producto_comun_se_devuelve_en_el_campo_accesorio(self):
        producto = crear_producto(es_accesorio=False)
        inventario = SimpleNamespace(producto=producto)

        datos = InventorySerializer().get_accesorio(inventario)

        self.assertIsNotNone(datos)
        self.assertEqual(datos, AccesorioSerializer(producto).data)
        self.assertFalse(datos["es_accesorio"])
        self.assertEqual(datos["acc_nombre"], producto.nombre)
        self.assertEqual(datos["producto"]["id_producto"], str(producto.id_producto))
        self.assertIn("accesorio", InventorySerializer.Meta.fields)

    def test_inventario_sin_producto_mantiene_accesorio_en_null(self):
        inventario = SimpleNamespace(producto=None)

        self.assertIsNone(InventorySerializer().get_accesorio(inventario))
