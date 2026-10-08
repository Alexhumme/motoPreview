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
        "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,.replit.dev,.repl.co"
    ).split(",")
    if host.strip()
]

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
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "api.middleware.LanguageMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

STATIC_URL = "static/"

ROOT_URLCONF = "motopreview.urls"
ASGI_APPLICATION = "motopreview.asgi.application"
WSGI_APPLICATION = "motopreview.wsgi.application"

# Las rutas de la API son canónicas SIN barra final (/api/health, no /api/health/).
# Se exponen ambas variantes en api/urls.py; esto desactiva los redirects 301
# silenciosos de CommonMiddleware para que un 404 sea siempre "ruta inexistente".
APPEND_SLASH = False

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "America/Bogota"
LANGUAGE_CODE = "es"
USE_I18N = True
LANGUAGES = [("es", "Español"), ("en", "English")]


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
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "UNAUTHENTICATED_USER": "api.authentication.AnonymousPrincipal",
    "EXCEPTION_HANDLER": "api.errors.api_exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "api.renderers.TranslatedJSONRenderer",
    ],
}

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
