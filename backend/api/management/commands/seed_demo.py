"""Genera datos de prueba (accesorios, marcas, modelos y motos).

Uso:
    python manage.py seed_demo                 # crea 100 accesorios + catalogos
    python manage.py seed_demo --cantidad 250  # crea 250 accesorios
    python manage.py seed_demo --borrar        # elimina SOLO los datos de prueba

Todo lo que crea lleva el prefijo "[DEMO]" (o el SKU "DEMO-...") para poder
borrarlo despues sin tocar datos reales.

Seguridad: si la base NO es local, el comando se niega a escribir salvo que
agregues --permitir-remoto.
"""
import random

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import (
    Accessory,
    AccessoryCategory,
    AccessoryType,
    Motorcycle,
    MotorcycleBrand,
    MotorcycleModel,
    Product,
    ProductCategory,
)

PREFIJO = "[DEMO] "
LOCALES = {"localhost", "127.0.0.1", "::1", ""}

CATEGORIAS = ["Protección", "Iluminación", "Equipaje", "Comodidad", "Estética",
              "Seguridad", "Rendimiento", "Electrónica"]
TIPOS = ["Casco", "Guantes", "Maleta", "Parrilla", "Espejo", "Faro", "Escape",
         "Manillar", "Asiento", "Protector", "Soporte celular", "Cubierta"]
CATEGORIAS_PRODUCTO = ["Accesorios", "Repuestos", "Indumentaria", "Herramientas", "Electrónica"]
COLORES = ["Negro", "Rojo", "Azul", "Gris", "Blanco", "Naranja", "Plateado"]
MARCAS = [("Yamaha", "Japón"), ("Honda", "Japón"), ("Suzuki", "Japón"), ("Kawasaki", "Japón"),
          ("KTM", "Austria"), ("Ducati", "Italia"), ("Bajaj", "India"), ("AKT", "Colombia"),
          ("Royal Enfield", "India"), ("BMW Motorrad", "Alemania")]
CILINDRAJES = ["110 cc", "125 cc", "150 cc", "200 cc", "250 cc", "400 cc", "650 cc"]


class Command(BaseCommand):
    help = "Crea datos de prueba para la base de MotoPreview (o los borra con --borrar)."

    def add_arguments(self, parser):
        parser.add_argument("--cantidad", type=int, default=100, help="Accesorios a crear (minimo 1).")
        parser.add_argument("--borrar", action="store_true", help="Elimina los datos de prueba.")
        parser.add_argument("--permitir-remoto", action="store_true",
                            help="Permite escribir en una base que no es local (p. ej. Neon).")

    def handle(self, *args, **opts):
        host = (settings.DATABASES.get("default", {}) or {}).get("HOST", "")
        if not settings.DATABASES:
            raise CommandError("No hay base configurada. Revisa MOTOPREVIEW_DATABASE_URL en .env")
        if host not in LOCALES and not opts["permitir_remoto"]:
            raise CommandError(
                f"La base esta en '{host}', que no es local. Para no ensuciar una base compartida "
                "este comando se detiene. Usa una base local, o agrega --permitir-remoto "
                "si estas completamente seguro."
            )
        if opts["cantidad"] < 1:
            raise CommandError("--cantidad debe ser al menos 1.")

        if opts["borrar"]:
            self.borrar()
        else:
            if Product.objects.filter(codigo_sku__startswith="DEMO-").exists():
                raise CommandError(
                    "Ya hay datos de prueba. Ejecuta primero: python manage.py seed_demo --borrar"
                )
            self.crear(opts["cantidad"])

    @transaction.atomic
    def crear(self, cantidad):
        rnd = random.Random(42)

        cats = [AccessoryCategory.objects.create(cat_nombre=PREFIJO + n, cat_descripcion="Datos de prueba")
                for n in CATEGORIAS]
        tipos = [AccessoryType.objects.create(nombre=PREFIJO + n, descripcion="Datos de prueba")
                 for n in TIPOS]
        cats_prod = [ProductCategory.objects.create(nombre=PREFIJO + n, descripcion="Datos de prueba")
                     for n in CATEGORIAS_PRODUCTO]
        marcas = [MotorcycleBrand.objects.create(marca_nombre=PREFIJO + n, marca_pais=p) for n, p in MARCAS]

        modelos = []
        for marca in marcas:
            for i in range(1, 4):
                modelos.append(MotorcycleModel.objects.create(
                    marca=marca,
                    modelo_nombre=f"{PREFIJO}{marca.marca_nombre[len(PREFIJO):]} Modelo {i}",
                    modelo_descripcion="Modelo de prueba",
                    cilindraje=rnd.choice(CILINDRAJES),
                ))

        motos = 0
        for modelo in modelos:
            for anio in (2022, 2024):
                Motorcycle.objects.create(modelo=modelo, moto_anio=anio,
                                          moto_version=f"{PREFIJO}Versión {anio}")
                motos += 1

        for i in range(1, cantidad + 1):
            tipo = rnd.choice(tipos)
            nombre = f"{PREFIJO}{tipo.nombre[len(PREFIJO):]} {i:03d}"
            producto = Product.objects.create(
                nombre=nombre,
                descripcion="Producto de prueba generado automáticamente",
                estado="disponible",
                categoria_producto=rnd.choice(cats_prod),
                codigo_sku=f"DEMO-{i:05d}",
                precio=rnd.randrange(15000, 900000, 500),
            )
            Accessory.objects.create(
                categoria=rnd.choice(cats), producto=producto, tipo=tipo,
                peso=round(rnd.uniform(0.1, 6.0), 2), color=rnd.choice(COLORES),
            )

        total = (len(cats) + len(tipos) + len(cats_prod) + len(marcas) + len(modelos)
                 + motos + cantidad * 2)
        self.stdout.write(self.style.SUCCESS(
            f"Listo: {cantidad} accesorios (con su producto), {len(marcas)} marcas, "
            f"{len(modelos)} modelos, {motos} motos y {len(cats) + len(tipos) + len(cats_prod)} "
            f"categorías/tipos. Total de filas: {total}."
        ))

    @transaction.atomic
    def borrar(self):
        prods = Product.objects.filter(codigo_sku__startswith="DEMO-")
        n_acc = Accessory.objects.filter(producto__in=prods).delete()[0]
        n_prod = prods.delete()[0]
        n_moto = Motorcycle.objects.filter(moto_version__startswith=PREFIJO).delete()[0]
        n_mod = MotorcycleModel.objects.filter(modelo_nombre__startswith=PREFIJO).delete()[0]
        n_mar = MotorcycleBrand.objects.filter(marca_nombre__startswith=PREFIJO).delete()[0]
        n_cat = AccessoryCategory.objects.filter(cat_nombre__startswith=PREFIJO).delete()[0]
        n_tip = AccessoryType.objects.filter(nombre__startswith=PREFIJO).delete()[0]
        n_cp = ProductCategory.objects.filter(nombre__startswith=PREFIJO).delete()[0]
        total = n_acc + n_prod + n_moto + n_mod + n_mar + n_cat + n_tip + n_cp
        self.stdout.write(self.style.SUCCESS(f"Eliminados {total} registros de prueba."))
