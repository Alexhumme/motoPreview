import os
from urllib.parse import parse_qs, unquote, urlparse

from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or os.environ.get("SESSION_SECRET")
if not SECRET_KEY:
    raise ImproperlyConfigured("Define DJANGO_SECRET_KEY o SESSION_SECRET.")

JWT_SECRET = os.environ.get("JWT_SECRET") or os.environ.get("SESSION_SECRET")
JWT_ISSUER = os.environ.get("JWT_ISSUER", "motopreview")
JWT_LIFETIME_SECONDS = int(os.environ.get("JWT_LIFETIME_SECONDS", "28800"))

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,.onrender.com,.replit.dev,.repl.co"
    ).split(",")
    if host.strip()
]

# ---------------------------------------------------------------------------
# Endurecimiento HTTPS (actívalo explícitamente en producción; seguro para
# desarrollo local, donde no hay TLS).
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SECURE_SSL_REDIRECT", "false").lower() == "true"
SESSION_COOKIE_SECURE = os.environ.get("DJANGO_SESSION_COOKIE_SECURE", "false").lower() == "true"
CSRF_COOKIE_SECURE = os.environ.get("DJANGO_CSRF_COOKIE_SECURE", "false").lower() == "true"
SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get("DJANGO_HSTS_INCLUDE_SUBDOMAINS", "false").lower() == "true"
SECURE_HSTS_PRELOAD = os.environ.get("DJANGO_HSTS_PRELOAD", "false").lower() == "true"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "api.apps.ApiConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "api.middleware.LanguageMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.template.context_processors.i18n",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

ROOT_URLCONF = "motopreview.urls"
ASGI_APPLICATION = "motopreview.asgi.application"
WSGI_APPLICATION = "motopreview.wsgi.application"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
# Las rutas de la API se exponen con y sin barra final en urls.py; esto
# desactiva los redirects 301 silenciosos de CommonMiddleware para que un 404
# sea siempre una ruta inexistente.
APPEND_SLASH = False
USE_TZ = True
TIME_ZONE = "America/Bogota"
LANGUAGE_CODE = "es"
# Los tests unitarios no usan BD; solo los de integración (RUN_DB_TESTS=1) la crean.
TEST_RUNNER = "motopreview.test_runner.NoDbTestRunner"
USE_I18N = True
LANGUAGES = [("es", "Español"), ("en", "English")]

# Estáticos del admin de Django. WhiteNoise los sirve tanto con runserver como
# con gunicorn en Render (Django no los sirve solo, ni siquiera con DEBUG=false).
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
WHITENOISE_USE_FINDERS = True


def parse_database_url(value):
    parsed = urlparse(value)
    if parsed.scheme not in {"postgres", "postgresql", "postgresql+psycopg"}:
        raise ImproperlyConfigured(
            "MOTOPREVIEW_DATABASE_URL debe ser una URL de PostgreSQL."
        )

    options = {
        key: values[-1]
        for key, values in parse_qs(parsed.query, keep_blank_values=True).items()
    }
    database = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/")),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or ""),
        "CONN_MAX_AGE": int(os.environ.get("DB_CONN_MAX_AGE", "60")),
        "OPTIONS": options,
    }
    if not database["NAME"]:
        raise ImproperlyConfigured(
            "MOTOPREVIEW_DATABASE_URL no incluye el nombre de la base de datos."
        )
    return database


DATABASE_URL = os.environ.get("MOTOPREVIEW_DATABASE_URL", "").strip()
DATABASES = {"default": parse_database_url(DATABASE_URL)} if DATABASE_URL else {}

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://motopreview.vercel.app",
    *FRONTEND_ORIGINS,
]
CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://[a-zA-Z0-9-]+\.vercel\.app$"]
CORS_ALLOW_CREDENTIALS = True
# El frontend puede elegir idioma con ?lang=en o con el encabezado X-Language.
CORS_ALLOW_HEADERS = [*default_headers, "x-language"]
CORS_EXPOSE_HEADERS = ["Content-Language"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.JWTAuthentication",
    ],
    # Por defecto se exige sesión; cada vista abre explícitamente lo público.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Límites de peticiones: uno general y usos específicos y estrictos en
    # autenticación (fuerza bruta, spam de registros y de correos).
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "600/min",
        "user": "1000/min",
        # Login y restablecimiento de contraseña.
        "auth": "30/min",
        # Creación de cuentas públicas.
        "register": "10/min",
        # Verificación de correo y recuperación (usan el SMTP).
        "email": "10/hour",
    },
    "UNAUTHENTICATED_USER": "api.authentication.AnonymousPrincipal",
    "EXCEPTION_HANDLER": "api.errors.api_exception_handler",
    # JSON para el frontend (cabecera Accept: application/json) y, cuando se
    # entra desde un navegador, la interfaz navegable de DRF (HTML + formularios).
    # El orden importa: */* recibe JSON; text/html recibe la vista de DRF.
    "DEFAULT_RENDERER_CLASSES": [
        "api.renderers.TranslatedJSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# Límite de líneas por cotización (defensa contra payloads gigantes).
QUOTE_MAX_ITEMS = int(os.environ.get("QUOTE_MAX_ITEMS", "100"))

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "")
PASSWORD_RESET_URL = os.environ.get(
    "PASSWORD_RESET_URL", "http://localhost:5173/restablecer"
)
EMAIL_VERIFICATION_URL = os.environ.get(
    "EMAIL_VERIFICATION_URL", "http://localhost:5173/verificar"
)
