"""Pruebas del soporte multilingüe. No necesitan base de datos.

Ejecutar:  python manage.py test api
"""
from django.test import SimpleTestCase, override_settings

from . import i18n


class TranslationTests(SimpleTestCase):
    def test_exact_message(self):
        self.assertEqual(i18n.translate_text("Credenciales inválidas.", "en"), "Invalid credentials.")

    def test_spanish_is_untouched(self):
        self.assertEqual(i18n.translate_text("Credenciales inválidas.", "es"), "Credenciales inválidas.")

    def test_unknown_message_is_kept(self):
        self.assertEqual(i18n.translate_text("Algo nuevo.", "en"), "Algo nuevo.")

    def test_message_with_variables(self):
        self.assertEqual(
            i18n.translate_text("Se alcanzó el límite de 5 productos de este plan.", "en"),
            "The limit of 5 products for this plan has been reached.",
        )

    def test_mensajes_de_verificacion_y_passwords(self):
        self.assertEqual(
            i18n.translate_text("Debes verificar tu correo antes de iniciar sesión.", "en"),
            "You must verify your email before signing in.",
        )
        self.assertEqual(
            i18n.translate_text("La contraseña no puede superar los 72 bytes.", "en"),
            "The password cannot exceed 72 bytes.",
        )
        self.assertEqual(
            i18n.translate_text("El enlace de verificación es inválido o ya fue usado.", "en"),
            "The verification link is invalid or has already been used.",
        )
        self.assertEqual(i18n.translate_text("Correo ya verificado.", "en"), "Email already verified.")

    def test_transicion_de_estado_de_cotizacion_se_traduce(self):
        self.assertEqual(
            i18n.translate_text("No se puede pasar de 'pendiente' a 'completada'.", "en"),
            "It is not allowed to change from 'pendiente' to 'completada'.",
        )

    def test_limite_de_accesorios_se_traduce(self):
        self.assertEqual(
            i18n.translate_text("La cotización supera el límite de 100 accesorios.", "en"),
            "The quote exceeds the limit of 100 accessories.",
        )

    def test_nested_serializer_errors(self):
        data = {"error": {"acc_nombre": ["El nombre es obligatorio."]}}
        self.assertEqual(
            i18n.translate_payload(data, "en"),
            {"error": {"acc_nombre": ["The name is required."]}},
        )

    def test_listings_are_not_translated(self):
        data = [{"nombre": "Credenciales inválidas."}]
        self.assertEqual(i18n.translate_payload(data, "en"), data)

    def test_every_pattern_message_formats(self):
        for _, template in i18n.PATTERNS["en"]:
            self.assertTrue(template)


@override_settings(DATABASE_URL="")
class LanguageSelectionTests(SimpleTestCase):
    def test_default_is_spanish(self):
        response = self.client.get("/api/accesorios", HTTP_ACCEPT="*/*")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response["Content-Language"], "es")
        self.assertIn("Falta configurar", response.json()["error"])

    def test_query_param_switches_to_english(self):
        response = self.client.get("/api/accesorios?lang=en", HTTP_ACCEPT="*/*")
        self.assertEqual(response["Content-Language"], "en")
        self.assertIn("must be set", response.json()["error"])

    def test_header_switches_to_english(self):
        response = self.client.get("/api/accesorios", HTTP_ACCEPT="*/*", HTTP_X_LANGUAGE="en")
        self.assertIn("must be set", response.json()["error"])

    def test_json_api_ignores_accept_language(self):
        response = self.client.get(
            "/api/accesorios", HTTP_ACCEPT="application/json", HTTP_ACCEPT_LANGUAGE="en-US"
        )
        self.assertEqual(response["Content-Language"], "es")

    def test_browser_request_gets_browsable_html(self):
        # Un navegador (Accept: text/html) recibe la interfaz navegable de DRF;
        # el cliente JSON sigue recibiendo application/json.
        response = self.client.get(
            "/", HTTP_ACCEPT="text/html,application/xhtml+xml,*/*;q=0.8"
        )
        self.assertTrue(response["Content-Type"].startswith("text/html"))
        self.assertIn(b"rest_framework", response.content)

        json_response = self.client.get("/", HTTP_ACCEPT="application/json")
        self.assertEqual(json_response["Content-Type"], "application/json")
        self.assertIn("mensaje", json_response.json())

    def test_cookie_remembers_choice(self):
        first = self.client.get("/?lang=en", HTTP_ACCEPT="*/*")
        self.assertEqual(first.cookies["mp_lang"].value, "en")
        second = self.client.get("/", HTTP_ACCEPT="*/*")
        self.assertEqual(second.json()["mensaje"], "MotoPreview API running on Django.")
        back = self.client.get("/?lang=es", HTTP_ACCEPT="*/*")
        self.assertEqual(back.json()["mensaje"], "API de MotoPreview con Django funcionando.")

    def test_unsupported_language_falls_back(self):
        response = self.client.get("/?lang=xx", HTTP_ACCEPT="*/*")
        self.assertEqual(response.json()["mensaje"], "API de MotoPreview con Django funcionando.")

    def test_root_json_is_translated(self):
        self.assertEqual(
            self.client.get("/?lang=en", HTTP_ACCEPT="*/*").json()["mensaje"],
            "MotoPreview API running on Django.",
        )


