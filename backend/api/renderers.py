"""Renderizador JSON que traduce los campos de mensaje al idioma de la petición."""
from rest_framework.renderers import JSONRenderer

from . import i18n


def _language(request):
    return getattr(request, "lang", i18n.DEFAULT_LANGUAGE)


class TranslatedJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        request = (renderer_context or {}).get("request")
        if request is not None:
            data = i18n.translate_payload(data, _language(request))
        return super().render(data, accepted_media_type, renderer_context)