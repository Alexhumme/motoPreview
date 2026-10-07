"""Contexto común de las páginas HTML del backend (portada y tablas)."""
from urllib.parse import urlencode

from django.shortcuts import render

from . import i18n


def _query(request, **extra):
    params = {k: v for k, v in request.GET.items() if k not in {"lang", "format"}}
    params.update(extra)
    return params


def base_context(request, lang, path):
    T = i18n.ui(lang)
    nav = [
        {"href": href, "label": T[key], "active": href == path}
        for href, key in i18n.NAV_KEYS
    ]
    switch = [
        {
            "code": code,
            "url": f"{path}?{urlencode(_query(request, lang=code))}",
            "active": code == lang,
        }
        for code in i18n.LANGUAGES
    ]
    return {"lang": lang, "T": T, "nav": nav, "switch": switch}


def render_landing(request):
    lang = getattr(request, "lang", i18n.DEFAULT_LANGUAGE)
    return render(request, "api/landing.html", base_context(request, lang, "/"))
