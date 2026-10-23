"""Rota JWT_SECRET y DJANGO_SECRET_KEY en .env (hallazgo P3: secretos conocidos).

Al rotar JWT_SECRET se invalidan de inmediato todos los JWT emitidos antes de la
rotación (los tokens llevan firma vieja), lo cual es el objetivo: cortar el uso
de tokens creados con la clave anterior.

Uso:
    python manage.py rotar_secretos                # muestra un resumen sin escribir
    python manage.py rotar_secretos --aplicar      # escribe las claves nuevas en .env
    python manage.py rotar_secretos --aplicar --longitud 80

Después de aplicarla localmente recuerda copiar los valores nuevos al entorno de
Render (ver documentacion/). Con DEBUG=false y USUARIOS VERIFICADOS el impacto es
una sola desconexión forzada de sesiones activas.
"""
import os
import secrets

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

VARIABLES = ("JWT_SECRET", "DJANGO_SECRET_KEY")


class Command(BaseCommand):
    help = "Rota JWT_SECRET y DJANGO_SECRET_KEY del archivo .env."

    def add_arguments(self, parser):
        parser.add_argument(
            "--aplicar",
            action="store_true",
            help="Escribe las claves nuevas en el .env (sin esto solo muestra un resumen).",
        )
        parser.add_argument(
            "--longitud",
            type=int,
            default=64,
            help="Bytes de entropía por clave (por defecto 64).",
        )

    def handle(self, *args, **options):
        longitud = options["longitud"]
        if longitud < 32:
            raise CommandError("--longitud debe ser de al menos 32 bytes.")

        env_path = os.path.join(settings.BASE_DIR, ".env")
        if not os.path.exists(env_path):
            if not options["aplicar"]:
                raise CommandError(
                    f"No existe {env_path}. Pásale --aplicar para crearlo con claves nuevas."
                )
            with open(env_path, "w", encoding="utf-8", newline="") as fh:
                fh.write("")

        nuevas = {var: secrets.token_urlsafe(longitud) for var in VARIABLES}
        existia_antes = {
            var: self._existe(env_path, var) for var in VARIABLES
        }

        self.stdout.write("Rotación de secretos: JWT_SECRET y DJANGO_SECRET_KEY.")
        self.stdout.write(
            "Efecto: todos los JWT emitidos con la clave anterior quedan inválidos "
            "(los clientes deberán volver a iniciar sesión)."
        )
        if not options["aplicar"]:
            for var in VARIABLES:
                estado = "ya existe (se sustituirá)" if existia_antes[var] else "se creará"
                self.stdout.write(f"  {var}: {estado}")
            self.stdout.write(
                self.style.WARNING(
                    "Ejecuta con --aplicar para escribirlas en el .env. "
                    "Después actualiza las mismas variables en Render."
                )
            )
            return

        self._escribir(env_path, nuevas)
        for var in VARIABLES:
            self.stdout.write(
                self.style.SUCCESS(f"  {var}: {'sustituida' if existia_antes[var] else 'creada'}")
            )
        self.stdout.write(
            self.style.SUCCESS(
                "Listo. Copia los valores nuevos a Render (Dashboard > Environment) "
                "y reinicia el servicio."
            )
        )

    # ------------------------------------------------------------------ internos

    @staticmethod
    def _existe(env_path, variable):
        with open(env_path, encoding="utf-8") as fh:
            return any(
                linea.startswith(variable + "=") for linea in fh.read().splitlines()
            )

    @staticmethod
    def _escribir(env_path, nuevas):
        """Reemplaza o agrega las variables, preservando el resto del archivo."""
        with open(env_path, encoding="utf-8") as fh:
            lineas = fh.read().splitlines()

        def actualizada(var):
            return f"{var}={nuevas[var]}"

        salida = []
        faltantes = set(nuevas)
        for linea in lineas:
            variable = linea.split("=", 1)[0].strip()
            if variable in nuevas:
                salida.append(actualizada(variable))
                faltantes.discard(variable)
            else:
                salida.append(linea)
        for variable in faltantes:
            salida.append(actualizada(variable))

        with open(env_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(salida) + "\n")