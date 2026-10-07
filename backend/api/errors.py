from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data.get("detail", response.data) if isinstance(response.data, dict) else response.data
    response.data = {"error": detail}
    return response
