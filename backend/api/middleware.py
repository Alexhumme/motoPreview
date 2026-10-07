from django.utils import translation
from django.utils.cache import patch_vary_headers

from . import i18n


class LanguageMiddleware:
    """Detecta el idioma, lo activa durante la petición y lo deja en request.lang.

    - Activa el idioma en Django, así los mensajes propios de Django/DRF
      (por ejemplo "Este campo es requerido.") salen traducidos.
    - Si la URL trae ?lang=es|en, guarda la elección en una cookie para que el
      selector de idioma de las páginas recuerde la preferencia.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        lang = i18n.resolve_language(request)
        request.lang = lang
        with translation.override(lang):
            response = self.get_response(request)

        response["Content-Language"] = lang
        patch_vary_headers(response, ["Accept-Language", "Cookie", "X-Language"])
        if i18n.normalize(request.GET.get("lang")):
            response.set_cookie(
                i18n.COOKIE_NAME, lang, max_age=i18n.COOKIE_MAX_AGE, samesite="Lax"
            )
        return response
