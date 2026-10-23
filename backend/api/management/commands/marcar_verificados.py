"""Marca como verificado el correo de los usuarios existentes (data-fix).

El login ahora exige ``email_verificado`` (requisito P2: verificación de correo).
Los usuarios creados ANTES de esa política nacieron sin correo verificado y no
tienen forma de recibir el enlace nuevo, así que este comando los habilita en
bloque para que no queden bloqueados fuera del sistema.

Por defecto marca a todos los usuarios cuyo correo NO esté ya verificado.
Con ``--rol`` se limita a un rol concreto. Imprime un resumen de cuántos cambió.

Uso:
    python manage.py marcar_verificados                    # todos, requiere --permitir-remoto
    python manage.py marcar_verificados --rol admin        # solo admin/vendedor
    python manage.py marcar_verificados --permitir-remoto  # escribir en Neon

Seguridad: si la base NO es local, el comando se niega a escribir salvo que
agregues --permitir-remoto (mismo criterio que seed_demo y asignar_rol).
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import User, UserRole
from api.security import ROLE_ADMIN, ROLE_SELLER

LOCALES = {"localhost", "127.0.0.1", "::1", ""}
ROLES_POR_NOMBRE = {
    "admin": ROLE_ADMIN,
    "administrador": ROLE_ADMIN,
    "vendedor": ROLE_SELLER,
    "tienda": (ROLE_ADMIN, ROLE_SELLER),
}


class Command(BaseCommand):
    help = "Marca como verificados los correos de los usuarios existentes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--rol",
            default="",
            help="admin, vendedor, tienda, un UUID o un nombre de rol. Vacío = todos.",
        )
        parser.add_argument(
            "--permitir-remoto",
            action="store_true",
            help="Permite escribir en una base que no es local (p. ej. Neon).",
        )

    def handle(self, *args, **options):
        host = settings.DATABASES.get("default", {}).get("HOST", "") or ""
        if host not in LOCALES and not options["permitir_remoto"]:
            raise CommandError(
                f"La base no es local (HOST={host!r}); agrega --permitir-remoto para escribir en ella."
            )

        rol = (options["rol"] or "").strip()
        if rol:
            rol_ids = self._resolver_roles(rol)
        else:
            rol_ids = None

        con_estado = User.objects.filter(email_verificado__isnull=True) | User.objects.filter(
            email_verificado=False
        )
        if rol_ids is not None:
            usuarios_filtrados = UserRole.objects.filter(
                id_usuario__in=con_estado.values("id_usuario"), id_rol__in=rol_ids
            ).values_list("id_usuario", flat=True)
            pendientes = User.objects.filter(id_usuario__in=usuarios_filtrados)
        else:
            pendientes = con_estado

        total = pendientes.count()
        if total == 0:
            self.stdout.write("No hay usuarios pendientes de verificación.")
            return
        self.stdout.write(
            f"Se marcarán {total} usuario(s): los que no tienen el correo verificado."
        )

        with transaction.atomic():
            actualizados = pendientes.update(email_verificado=True)

        self.stdout.write(
            self.style.SUCCESS(f"Verificados: {actualizados} usuario(s).")
        )
        self.stdout.write(
            "A partir de ahora pueden iniciar sesión con normalidad; los nuevos "
            "registros de clientes seguirán exigiendo verificar su correo."
        )

    @staticmethod
    def _resolver_roles(valor):
        normalizado = " ".join(valor.lower().split())
        if normalizado in ROLES_POR_NOMBRE:
            roles = ROLES_POR_NOMBRE[normalizado]
            return roles if isinstance(roles, tuple) else (roles,)
        return (valor,)