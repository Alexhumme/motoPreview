"""Renderizadores de la API.

- TranslatedJSONRenderer: JSON normal; traduce los campos de mensaje
  ("error", "mensaje", ...) al idioma de la petición.
- HTMLTableRenderer: cuando se abre una ruta desde el navegador, muestra una
  tabla con diseño (plantilla api/table.html). Los clientes que piden JSON
  (frontend, curl) no se ven afectados.
"""
import json
from urllib.parse import urlencode

from django.template.loader import render_to_string
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.utils.encoders import JSONEncoder

from . import i18n
from .pages import _query, base_context


def _language(request):
    return getattr(request, "lang", i18n.DEFAULT_LANGUAGE)


class TranslatedJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        request = (renderer_context or {}).get("request")
        if request is not None:
            data = i18n.translate_payload(data, _language(request))
        return super().render(data, accepted_media_type, renderer_context)


def _cell(value):
    if value is None or value == "":
        return {"kind": "na"}
    if isinstance(value, bool):
        return {"kind": "yes" if value else "no"}
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False, cls=JSONEncoder)
        return {"kind": "code", "text": text if len(text) <= 80 else text[:77] + "…", "title": text}
    text = str(value)
    return {"kind": "text", "text": text if len(text) <= 120 else text[:117] + "…", "title": text}


def _rows_table(rows):
    if not all(isinstance(row, dict) for row in rows):
        rows = [{"valor": row} for row in rows]
    columns = []
    for row in rows:
        for key in row:
            if key not in columns:
                columns.append(key)
    return {
        "columns": columns,
        "rows": [[_cell(row.get(col)) for col in columns] for row in rows],
        "pairs": False,
    }


def _title(path, T):
    parts = [p for p in path.strip("/").split("/") if p and p != "api" and len(p) < 30]
    if not parts:
        return "MotoPreview API"
    return " / ".join(T.get(p, p.replace("-", " ").capitalize()) for p in parts)


class HTMLTableRenderer(BaseRenderer):
    media_type = "text/html"
    format = "html"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        ctx = renderer_context or {}
        request = ctx["request"]
        response = ctx.get("response")
        code = getattr(response, "status_code", 200)
        lang = _language(request)
        path = request.path

        context = base_context(request, lang, path)
        T = context["T"]
        data = i18n.translate_payload(data, lang)
        context.update(
            title=_title(path, T),
            json_url=f"{path}?{urlencode(_query(request, format='json', lang=lang))}",
            status_code=code,
            error=None,
            table=None,
            total=None,
            searchable=False,
        )

        if code >= 400:
            message = data.get("error", data) if isinstance(data, dict) else data
            if isinstance(message, (dict, list)):
                message = json.dumps(message, ensure_ascii=False, cls=JSONEncoder)
            context["error"] = message
        elif isinstance(data, (list, tuple)):
            context.update(table=_rows_table(list(data)), total=len(data), searchable=bool(data))
        elif isinstance(data, dict):
            context["table"] = {
                "columns": [],
                "rows": [[{"kind": "text", "text": k, "title": k}, _cell(v)] for k, v in data.items()],
                "pairs": True,
            }
        return render_to_string("api/table.html", context, request=request).encode("utf-8")
