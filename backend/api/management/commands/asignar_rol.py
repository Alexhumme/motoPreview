"""Asigna roles de usuario (admin, vendedor o cliente) y lista quién tiene rol.

El registro publico solo crea clientes; los demas roles nacen aqui.

Uso:
    python manage.py asignar_rol --listar
    python manage.py asignar_rol --email ana@x.com --rol admin
    python manage.py asignar_rol --email nuevo@x.com --rol vendedor --crear \
        --nombre "Ana Perez" --password "Secreto123" --tienda "RepuestosYa Barranquilla"
    python manage.py asignar_rol --email a@b.com --rol cliente --permitir-remoto

Los roles son UUIDs fijos (ver api/security.py): admin ...0001, vendedor ...0002,
cliente ...0003. Admin y vendedor exigen tienda asignada.

Seguridad: si la base NO es local, el comando se niega a escribir salvo que
agregues --permitir-remoto (mismo criterio que seed_demo).
"""
import uuid as uuid_lib

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Role, Store, User
from api.security import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_SELLER
from api.views import hash_password, update_user_role

ROLES_CONOCIDOS = {
    "admin": ROLE_ADMIN,
    "administrador": ROLE_ADMIN,
    "admin tienda": ROLE_ADMIN,
    "administrador de tienda": ROLE_ADMIN,
    "vendedor": ROLE_SELLER,
    "cliente": ROLE_CUSTOMER,
}
LOCALES = {"localhost", "127.0.0.1", "::1", ""}
ROLES_DE_TIENDA = {ROLE_ADMIN, ROLE_SELLER}


def resolver_rol(valor):
    """Traduce admin|vendedor|cliente|<uuid> a un UUID de rol.

    Devuelve None cuando hay que buscarlo por nombre exacto en la tabla rol.
    """
    normalizado = " ".join(str(valor).strip().lower().split())
    if normalizado in ROLES_CONOCIDOS:
        return ROLES_CONOCIDOS[normalizado]
    try:
        return str(uuid_lib.UUID(normalizado))
    except ValueError:
        return None


class Command(BaseCommand):
    help = "Asigna roles (admin/vendedor/cliente) a usuarios, o lista quien tiene rol."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Email del usuario.")
        parser.add_argument("--rol", help="admin, vendedor, cliente, un UUID o el nombre exacto del rol.")
        parser.add_argument("--crear", action="store_true", help="Crea el usuario si no existe (requiere --nombre y --password).")
        parser.add_argument("--nombre", help="Nombre completo (solo con --crear).")
        parser.add_argument("--password", help="Contraseña, minimo 8 caracteres (solo con --crear).")
        parser.add_argument("--tienda", help="UUID o nombre de la tienda (obligatoria para admin/vendedor nuevo).")
        parser.add_argument("--listar", action="store_true", help="Muestra todos los usuarios y sus roles.")
        parser.add_argument("--permitir-remoto", action="store_true", help="Permite escribir en una base que no es local (p. ej. Neon).")

    def handle(self, *args, **options):
        if options["listar"]:
            self.listar()
            return
        if not options["email"] or not options["rol"]:
            raise CommandError("Indica --email y --rol (o usa --listar para ver los roles actuales).")
        host = settings.DATABASES.get("default", {}).get("HOST", "") or ""
        if host not in LOCALES and not options["permitir_remoto"]:
            raise CommandError(
                f"La base no es local (HOST={host!r}); agrega --permitir-remoto para escribir en ella."
            )
        self.asignar(options)

    # ------------------------------------------------------------------ acciones

    def asignar(self, options):
        rol_id = resolver_rol(options["rol"])
        if rol_id is None:
            rol = Role.objects.filter(nombre_rol__iexact=options["rol"]).first()
            if not rol:
                raise CommandError(
                    f"No existe el rol '{options['rol']}'. Usa admin, vendedor, cliente o un UUID."
                )
            rol_id = str(rol.id_rol)
        rol_nombre = Role.objects.filter(pk=rol_id).values_list("nombre_rol", flat=True).first() or rol_id

        user = User.objects.filter(usu_email__iexact=options["email"]).first()
        if not user:
            if not options["crear"]:
                raise CommandError(
                    f"No existe ningun usuario con email '{options['email']}'. "
                    "Agrega --crear para darlo de alta."
                )
            user = self.crear_usuario(options, rol_id)
        elif options["crear"]:
            raise CommandError("El usuario ya existe; quita --crear para solo asignarle el rol.")

        if rol_id in ROLES_DE_TIENDA and not user.tienda_id:
            raise CommandError(
                "El rol de tienda requiere tienda asignada; usa --tienda al crearlo "
                "o corrige el campo id_tienda del usuario."
            )

        with transaction.atomic():
            update_user_role(user.id_usuario, rol_id)
        self.stdout.write(
            self.style.SUCCESS(
                f"{user.usu_email} -> {rol_nombre} (tienda: {user.tienda_id or 'ninguna'})"
            )
        )

    def crear_usuario(self, options, rol_id):
        nombre = (options.get("nombre") or "").strip()
        password = options.get("password") or ""
        if not nombre or not password:
            raise CommandError("--crear requiere --nombre y --password.")
        if len(password) < 8:
            raise CommandError("La contraseña debe tener al menos 8 caracteres.")
        tienda = self.resolver_tienda(options.get("tienda"), obligatoria=rol_id in ROLES_DE_TIENDA)
        return User.objects.create(
            tienda_id=tienda.id_tienda if tienda else None,
            usu_nombre=nombre,
            usu_email=options["email"].strip(),
            password_hash=hash_password(password),
            estado_usuario="activo",
            email_verificado=True,
        )

    def resolver_tienda(self, valor, obligatoria):
        if not valor:
            if obligatoria:
                raise CommandError("Este rol requiere tienda: agrega --tienda (UUID o nombre).")
            return None
        normalizado = " ".join(valor.strip().lower().split())
        try:
            tienda_id = str(uuid_lib.UUID(normalizado))
        except ValueError:
            tienda_id = None
        tienda = None
        if tienda_id:
            tienda = Store.objects.filter(pk=tienda_id).first()
        else:
            tienda = Store.objects.filter(nombre_tienda__iexact=valor).first()
        if not tienda:
            raise CommandError(f"No existe la tienda '{valor}' (ni por UUID ni por nombre).")
        return tienda

    def listar(self):
        nombres = {str(r.id_rol): r.nombre_rol for r in Role.objects.all()}
        filas = []
        for user in User.objects.order_by("usu_email"):
            roles = [str(rol) for rol in user.role_ids]
            filas.append(
                (
                    user.usu_email,
                    ", ".join(nombres.get(rol, rol) for rol in roles) or "SIN ROL",
                    str(user.tienda_id or "-"),
                    user.estado_usuario,
                )
            )
        if not filas:
            self.stdout.write("No hay usuarios en la base.")
            return
        ancho = max(len(f[0]) for f in filas)
        for email, rol, tienda, estado in filas:
            self.stdout.write(f"{email.ljust(ancho)} | {rol.ljust(20)} | {tienda} | {estado}")
        self.stdout.write(f"Total: {len(filas)} usuario(s)")
