"""Genera datos de prueba de productos, marcas, modelos y motos.

Uso:
    python manage.py seed_demo
    python manage.py seed_demo --cantidad 250
    python manage.py seed_demo --borrar

Todo lo creado lleva el prefijo "[DEMO]" o el SKU "DEMO-...". El comando
rechaza bases remotas salvo que se indique --permitir-remoto.
"""
import random

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import (
    Marca,
    Motorcycle,
    MotorcycleBrand,
    MotorcycleModel,
    Product,
    TipoProducto,
)

PREFIJO = "[DEMO] "
LOCALES = {"localhost", "127.0.0.1", "::1", ""}
TIPOS = ["Casco", "Guantes", "Maleta", "Parrilla", "Espejo", "Faro", "Escape",
         "Manillar", "Asiento", "Protector", "Soporte celular", "Cubierta"]
MARCAS_PRODUCTO = ["Yamaha", "Honda", "Suzuki", "Kawasaki", "KTM", "Ducati",
                   "Bajaj", "AKT", "Royal Enfield", "BMW Motorrad"]
MARCAS_MOTO = [("Yamaha", "Japón"), ("Honda", "Japón"), ("Suzuki", "Japón"),
               ("Kawasaki", "Japón"), ("KTM", "Austria"), ("Ducati", "Italia"),
               ("Bajaj", "India"), ("AKT", "Colombia"),
               ("Royal Enfield", "India"), ("BMW Motorrad", "Alemania")]
CILINDRAJES = ["110 cc", "125 cc", "150 cc", "200 cc", "250 cc", "400 cc", "650 cc"]


class Command(BaseCommand):
    help = "Crea datos de prueba para la base de MotoPreview (o los borra con --borrar)."

    def add_arguments(self, parser):
        parser.add_argument("--cantidad", type=int, default=100, help="Productos a crear (mínimo 1).")
        parser.add_argument("--borrar", action="store_true", help="Elimina los datos de prueba.")
        parser.add_argument("--permitir-remoto", action="store_true",
                            help="Permite escribir en una base que no es local.")

    def handle(self, *args, **opts):
        host = (settings.DATABASES.get("default", {}) or {}).get("HOST", "")
        if not settings.DATABASES:
            raise CommandError("No hay base configurada. Revisa MOTOPREVIEW_DATABASE_URL en .env.")
        if host not in LOCALES and not opts["permitir_remoto"]:
            raise CommandError(
                f"La base está en '{host}', que no es local. Para no ensuciar una base compartida "
                "este comando se detiene. Usa una base local o agrega --permitir-remoto."
            )
        if opts["borrar"]:
            self.borrar()
        else:
            if opts["cantidad"] < 1:
                raise CommandError("--cantidad debe ser al menos 1.")
            if Product.objects.filter(codigo_sku__startswith="DEMO-").exists():
                raise CommandError("Ya hay datos de prueba. Ejecuta primero: python manage.py seed_demo --borrar")
            self.crear(opts["cantidad"])

    @transaction.atomic
    def crear(self, cantidad):
        rnd = random.Random(42)
        marcas = [Marca.objects.create(nombre=PREFIJO + nombre) for nombre in MARCAS_PRODUCTO]
        tipos = [TipoProducto.objects.create(nombre=PREFIJO + nombre, accesorio=nombre != "Herramientas")
                 for nombre in TIPOS]
        marcas_moto = [MotorcycleBrand.objects.create(marca_nombre=PREFIJO + nombre, marca_pais=pais)
                       for nombre, pais in MARCAS_MOTO]
        modelos = []
        for marca in marcas_moto:
            for numero in range(1, 4):
                modelos.append(MotorcycleModel.objects.create(
                    marca=marca,
                    modelo_nombre=f"{PREFIJO}{marca.marca_nombre[len(PREFIJO):]} Modelo {numero}",
                    modelo_descripcion="Modelo de prueba",
                    cilindraje=rnd.choice(CILINDRAJES),
                ))
        motos = 0
        for modelo in modelos:
            for anio in (2022, 2024):
                Motorcycle.objects.create(modelo=modelo, moto_anio=anio,
                                          moto_version=f"{PREFIJO}Versión {anio}")
                motos += 1
        for numero in range(1, cantidad + 1):
            tipo = rnd.choice(tipos)
            producto = Product.objects.create(
                nombre=f"{PREFIJO}{tipo.nombre[len(PREFIJO):]} {numero:03d}",
                descripcion="Producto de prueba generado automáticamente",
                estado="disponible",
                marca=rnd.choice(marcas),
                es_accesorio=tipo.accesorio,
                codigo_sku=f"DEMO-{numero:05d}",
                precio=rnd.randrange(15000, 900000, 500),
                peso=round(rnd.uniform(0.1, 6.0), 2),
            )
            producto.tipos.add(tipo)
        self.stdout.write(self.style.SUCCESS(
            f"Listo: {cantidad} productos, {len(marcas)} marcas de producto, {len(tipos)} tipos, "
            f"{len(modelos)} modelos y {motos} motos."
        ))

    @transaction.atomic
    def borrar(self):
        prods = Product.objects.filter(codigo_sku__startswith="DEMO-")
        n_prod = prods.delete()[0]
        n_moto = Motorcycle.objects.filter(moto_version__startswith=PREFIJO).delete()[0]
        n_mod = MotorcycleModel.objects.filter(modelo_nombre__startswith=PREFIJO).delete()[0]
        n_mar = MotorcycleBrand.objects.filter(marca_nombre__startswith=PREFIJO).delete()[0]
        n_mp = Marca.objects.filter(nombre__startswith=PREFIJO).delete()[0]
        n_tip = TipoProducto.objects.filter(nombre__startswith=PREFIJO).delete()[0]
        total = n_prod + n_moto + n_mod + n_mar + n_mp + n_tip
        self.stdout.write(self.style.SUCCESS(f"Eliminados {total} registros de prueba."))
