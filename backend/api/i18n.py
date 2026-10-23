"""Soporte multilingüe (español / inglés) para el backend de MotoPreview.

Cómo se elige el idioma de cada petición (de mayor a menor prioridad):
  1. Parámetro en la URL:      ?lang=en
  2. Encabezado HTTP:          X-Language: en
  3. Cookie "mp_lang" (la guarda el selector de idioma de las páginas)
  4. Español (idioma por defecto)

`Accept-Language` no se usa en ninguna parte (ni en la API ni en las páginas
HTML), para que el frontend actual, en español, no reciba contenido en inglés
solo porque el navegador esté en inglés.

Para agregar otro idioma: añade su código en LANGUAGES, sus textos en UI y sus
traducciones en CATALOG / PATTERNS.
"""
import re

DEFAULT_LANGUAGE = "es"
LANGUAGES = {"es": "Español", "en": "English"}
COOKIE_NAME = "mp_lang"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365


def normalize(value):
    """'en-US' -> 'en'. Devuelve None si el idioma no está soportado."""
    if not value:
        return None
    code = str(value).strip().lower().replace("_", "-").split("-")[0]
    return code if code in LANGUAGES else None


def resolve_language(request):
    explicit = normalize(request.GET.get("lang"))
    if explicit:
        return explicit
    return (
        normalize(request.headers.get("X-Language"))
        or normalize(request.COOKIES.get(COOKIE_NAME))
        or DEFAULT_LANGUAGE
    )


# --------------------------------------------------------------------------
# Mensajes de la API (el texto original del código está en español)
# --------------------------------------------------------------------------
CATALOG = {
    "en": {
        # Genéricos / CRUD
        "Registro no encontrado.": "Record not found.",
        "Categoría no encontrada.": "Category not found.",
        "Marca no encontrada.": "Brand not found.",
        "Modelo de moto no encontrado.": "Motorcycle model not found.",
        "Moto no encontrada.": "Motorcycle not found.",
        "Rol no encontrado.": "Role not found.",
        "Tienda no encontrada.": "Store not found.",
        "Modelo 3D no encontrado.": "3D model not found.",
        "Accesorio no encontrado.": "Accessory not found.",
        "Compatibilidad no encontrada.": "Compatibility not found.",
        "Registro eliminado.": "Record deleted.",
        "El registro entra en conflicto con una restricción de la base de datos.":
            "The record conflicts with a database constraint.",
        "La actualización entra en conflicto con datos existentes.":
            "The update conflicts with existing data.",
        "No se puede eliminar porque hay registros relacionados.":
            "It cannot be deleted because related records exist.",
        # Configuración
        "Falta configurar MOTOPREVIEW_DATABASE_URL con la conexión a la base PostgreSQL existente.":
            "MOTOPREVIEW_DATABASE_URL must be set with the connection to the existing PostgreSQL database.",
        "Configura JWT_SECRET o SESSION_SECRET para habilitar el inicio de sesión.":
            "Set JWT_SECRET or SESSION_SECRET to enable login.",
        "JWT_SECRET o SESSION_SECRET debe estar configurado.":
            "JWT_SECRET or SESSION_SECRET must be configured.",
        "API de MotoPreview con Django funcionando.": "MotoPreview API running on Django.",
        # Autenticación y permisos
        "Formato de token inválido.": "Invalid token format.",
        "El token expiró.": "The token has expired.",
        "Token inválido.": "Invalid token.",
        "El token no identifica un usuario.": "The token does not identify a user.",
        "Usuario no encontrado.": "User not found.",
        "Usuario inactivo o bloqueado.": "User is inactive or blocked.",
        "Se requiere un rol de administrador o vendedor.": "An administrator or seller role is required.",
        "Se requiere el rol de administrador.": "The administrator role is required.",
        "Email y contraseña son obligatorios.": "Email and password are required.",
        "Credenciales inválidas.": "Invalid credentials.",
        "Login exitoso.": "Login successful.",
        "Acceso concedido.": "Access granted.",
        "Usa POST con usu_email y password para iniciar sesión.":
            "Use POST with usu_email and password to log in.",
        "Sesión cerrada.": "Logged out.",
        # Usuarios
        "Faltan campos obligatorios: usu_nombre, usu_email, password, id_rol.":
            "Missing required fields: usu_nombre, usu_email, password, id_rol.",
        "La contraseña debe tener al menos 8 caracteres.": "The password must be at least 8 characters long.",
        "Ya existe un usuario con ese email.": "A user with that email already exists.",
        "El rol indicado no existe.": "The specified role does not exist.",
        "Solo un administrador autenticado puede registrar usuarios de tienda.":
            "Only an authenticated administrator can register store users.",
        "id_tienda debe ser un UUID válido.": "id_tienda must be a valid UUID.",
        "La tienda indicada no existe.": "The specified store does not exist.",
        "El administrador no tiene una tienda asignada.": "The administrator has no store assigned.",
        "El usuario no tiene una tienda asignada.": "The user has no store assigned.",
        "estado_usuario no es válido.": "estado_usuario is not valid.",
        "No se pudo actualizar el usuario.": "The user could not be updated.",
        "Usuario desactivado.": "User deactivated.",
        "Usuario creado con éxito.": "User created successfully.",
        "Usuario creado, pero no se pudo enviar el correo de verificación.":
            "User created, but the verification email could not be sent.",
        "Usuario creado. El envío de verificación requiere configurar el correo SMTP.":
            "User created. Sending the verification email requires SMTP to be configured.",
        "No se pudo registrar el usuario; revisa si el correo ya existe.":
            "The user could not be registered; check whether the email already exists.",
        # Correo y recuperación de contraseña
        "Enlace de verificación inválido.": "Invalid verification link.",
        "Correo verificado con éxito.": "Email verified successfully.",
        "El correo es obligatorio.": "The email is required.",
        "El servicio de correo SMTP no está configurado.": "The SMTP email service is not configured.",
        "Si el correo existe, enviaremos un enlace de recuperación.":
            "If the email exists, we will send a recovery link.",
        "No se pudo enviar el correo de recuperación.": "The recovery email could not be sent.",
        "Token y nueva contraseña son obligatorios.": "Token and new password are required.",
        "El enlace es inválido o ya expiró.": "The link is invalid or has expired.",
        "Contraseña actualizada con éxito.": "Password updated successfully.",
        "Recupera tu contraseña de MotoPreview": "Recover your MotoPreview password",
        "Verifica tu correo de MotoPreview": "Verify your MotoPreview email",
        "Actualización de tu cotización MotoPreview": "Update on your MotoPreview quote",
        # Accesorios, compatibilidad y 3D
        "Este accesorio no tiene modelo 3D asociado.": "This accessory has no associated 3D model.",
        "La compatibilidad entre este accesorio y modelo ya existe.":
            "Compatibility between this accessory and model already exists.",
        # Inventario
        "El accesorio no existe o no está vinculado a un producto.":
            "The accessory does not exist or is not linked to a product.",
        "El producto no existe.": "The product does not exist.",
        "Ya existe inventario para este producto en la tienda.":
            "Inventory already exists for this product in the store.",
        "Registro de inventario no encontrado.": "Inventory record not found.",
        "Registro de inventario no encontrado para esta tienda.":
            "Inventory record not found for this store.",
        "mov_cantidad debe ser un entero.": "mov_cantidad must be an integer.",
        "Tipo de movimiento no encontrado.": "Movement type not found.",
        "El movimiento dejaría el stock en negativo.": "The movement would leave the stock negative.",
        "No se pudo registrar el movimiento.": "The movement could not be recorded.",
        "Envía id_accesorio (o id_producto) para crear el inventario.":
            "Send id_accesorio (or id_producto) to create the inventory.",
        "Envía id_accesorio o id_producto, no ambos.": "Send id_accesorio or id_producto, not both.",
        # Cotizaciones
        "La moto indicada no existe.": "The specified motorcycle does not exist.",
        "Uno o más accesorios no existen.": "One or more accessories do not exist.",
        "No se pudo guardar la cotización.": "The quote could not be saved.",
        "Cotización no encontrada.": "Quote not found.",
        "Cotización no encontrada para esta tienda.": "Quote not found for this store.",
        "No se pudo actualizar el estado de la cotización.": "The quote status could not be updated.",
        # Validaciones de serializers
        "El nombre es obligatorio.": "The name is required.",
        "El nombre del accesorio es obligatorio.": "The accessory name is required.",
        "El precio del accesorio es obligatorio.": "The accessory price is required.",
        # Verificación de correo y contraseñas (endurecimiento)
        "Debes verificar tu correo antes de iniciar sesión.":
            "You must verify your email before signing in.",
        "La contraseña no puede superar los 72 bytes.":
            "The password cannot exceed 72 bytes.",
        "El enlace de verificación es inválido o ya fue usado.":
            "The verification link is invalid or has already been used.",
        "Correo ya verificado.": "Email already verified.",
    }
}

# Mensajes con datos variables: (expresión regular en español, plantilla en inglés)
PATTERNS = {
    "en": [
        (re.compile(r"^Se alcanzó el límite de (?P<n>.+) productos de este plan\.$"),
         "The limit of {n} products for this plan has been reached."),
        (re.compile(r"^Se alcanzó el límite de (?P<n>.+) empleados del plan\.$"),
         "The limit of {n} employees for this plan has been reached."),
        (re.compile(r"^Campos obligatorios: (?P<list>.+)\.$"), "Required fields: {list}."),
        (re.compile(r"^coti_estado debe ser uno de: (?P<list>.+)\.$"), "coti_estado must be one of: {list}."),
        (re.compile(r"^El accesorio (?P<id>.+) no tiene un precio configurado\.$"),
         "Accessory {id} has no price configured."),
        (re.compile(r"^Hola (?P<n>.+), solicita una nueva contraseña en este enlace: (?P<link>.+)$"),
         "Hi {n}, request a new password using this link: {link}"),
        (re.compile(r"^Hola (?P<n>.+), confirma tu correo en este enlace: (?P<link>.+)$"),
         "Hi {n}, confirm your email using this link: {link}"),
        (re.compile(r"^Hola (?P<n>.+), el estado de tu cotización cambió a (?P<s>.+)\. Total: (?P<t>.+)\.$"),
         "Hi {n}, the status of your quote changed to {s}. Total: {t}."),
        (re.compile(r"^No se puede pasar de '(?P<actual>.+)' a '(?P<nuevo>.+)'\.$"),
         "It is not allowed to change from '{actual}' to '{nuevo}'."),
        (re.compile(r"^La cotización supera el límite de (?P<n>.+) accesorios\.$"),
         "The quote exceeds the limit of {n} accessories."),
    ]
}


def translate_text(text, lang):
    """Traduce un mensaje del español al idioma pedido; si no lo conoce, lo deja igual."""
    if lang == DEFAULT_LANGUAGE or not isinstance(text, str):
        return text
    exact = CATALOG.get(lang, {}).get(text)
    if exact:
        return exact
    for pattern, template in PATTERNS.get(lang, []):
        match = pattern.match(text)
        if match:
            return template.format(**match.groupdict())
    return text


def translate_tree(value, lang):
    """Traduce todos los textos dentro de listas / diccionarios anidados."""
    if isinstance(value, str):
        return translate_text(value, lang)
    if isinstance(value, dict):
        return {key: translate_tree(item, lang) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [translate_tree(item, lang) for item in value]
    return value


MESSAGE_KEYS = {"error", "mensaje", "detail", "message"}


def translate_payload(data, lang):
    """Traduce solo los campos de mensaje de una respuesta (no los listados de datos)."""
    if lang == DEFAULT_LANGUAGE or not isinstance(data, dict):
        return data
    return {
        key: translate_tree(value, lang) if key in MESSAGE_KEYS else value
        for key, value in data.items()
    }
