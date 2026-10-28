"""Reglas de negocio puras de MotoPreview (sin acceso a base de datos).

Centralizar aquí la lógica que antes vivía duplicada en las vistas permite
probarla sin montar PostgreSQL y reutilizarla entre endpoints.
"""
from decimal import Decimal

from .security import ROLE_ADMIN, ROLE_SELLER, has_any_role

QUOTE_STATES = {"pendiente", "aprobada", "rechazada", "completada"}
QUOTE_TRANSITIONS = {
    "pendiente": {"aprobada", "rechazada"},
    "aprobada": {"completada", "rechazada"},
    "rechazada": {"pendiente"},
    "completada": set(),
}

MIN_PASSWORD_LENGTH = 8
# bcrypt ignora bytes a partir de 72; rechazamos antes de que reviente o trunque.
MAX_PASSWORD_BYTES = 72


class BusinessError(Exception):
    """Una regla de negocio no se cumple; el mensaje se devuelve como 400."""


def validar_password(password):
    """Devuelve un mensaje de error si la contraseña no es válida; None si es válida."""
    if len(password) < MIN_PASSWORD_LENGTH:
        return "La contraseña debe tener al menos 8 caracteres."
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return "La contraseña no puede superar los 72 bytes."
    return None


def inventory_status(stock, minimum):
    if stock <= 0:
        return "agotado"
    if stock <= minimum:
        return "bajo"
    return "normal"


def apply_movement(amount, type_name):
    """Normaliza la cantidad según el tipo de movimiento.

    ``entrada`` suma y ``salida`` resta siempre, sea cual sea el signo enviado.
    Los demás tipos (p. ej. ``Ajuste``) se aplican con el signo tal cual: un
    ajuste puede corregir hacia arriba o hacia abajo.
    """
    if amount == 0:
        raise BusinessError("mov_cantidad no puede ser cero.")
    if type_name == "entrada":
        return abs(amount)
    if type_name == "salida":
        return -abs(amount)
    return amount


def allow_state_transition(current, new_state):
    return new_state in QUOTE_TRANSITIONS.get(current, set())


def permite_datos_contacto(request):
    """¿Puede esta petición ver NIT/teléfono/email de las tiendas?

    Solo el personal (admin/vendedor autenticado) ve los datos de contacto;
    la API pública de tiendas los oculta.
    """
    if not request:
        return False
    return has_any_role(getattr(request, "user", None), (ROLE_ADMIN, ROLE_SELLER))


def calc_quote(items, productos, max_items=100):
    """Calcula las líneas y el total de una cotización.

    Parámetros:
        items: [{"id_accesorio": str, "cantidad": int}] — el id del ítem es el
               id del producto (los accesorios viven en la tabla producto).
        productos: mapeo {id_producto (str): Product con .precio}

    Devuelve (prepared, total) donde cada elemento de prepared es
    (producto, cantidad, precio_unitario, subtotal).

    Lanza BusinessError si no hay precio configurado o se supera 'max_items'.
    """
    if len(items) > max_items:
        raise BusinessError(f"La cotización supera el límite de {max_items} accesorios.")
    prepared = []
    total = Decimal("0.00")
    for item in items:
        producto = productos.get(str(item["id_accesorio"])) if productos else None
        if not producto or producto.precio is None:
            raise BusinessError(
                f"El accesorio {item['id_accesorio']} no tiene un precio configurado."
            )
        price = producto.precio
        subtotal = price * item["cantidad"]
        total += subtotal
        prepared.append((producto, item["cantidad"], price, subtotal))
    return prepared, total