"""Matriz de endpoints del RBAC (Fase 0 del plan): el cuerpo de ese documento.

    python manage.py shell --no-imports -c \\
      "exec(open('scripts/generar_matriz_endpoints.py', encoding='utf-8').read())"

Escribe por stdout las tablas de `documentacion/rbac-matriz-endpoints.md`. Todo sale
del código: las rutas de `motopreview.urls`, las declaraciones `permiso_*` de cada
vista y las columnas reales de los modelos, para que el documento no se separe del
backend. Las columnas de juicio (objetivo, decisiones de la vidriera) se escriben a
mano en el documento; este script solo fija lo que se puede verificar.
"""
import inspect

from api.security import RECURSOS_CON_TIENDA, IsSuperAdmin, scopes_validos
from api.test_rbac import _clases_de_permiso, operaciones_de_la_matriz
import api.views as module
from motopreview.urls import _RUTAS_API

FUERA_DE_LA_MATRIZ = {
    "health": "estado del servicio; no entrega datos de negocio",
    "healthz": "estado del servicio; no entrega datos de negocio",
    "register": "alta de cuentas: público solo cliente; el personal pide Admin autenticado y pasa por `puede_asignar_rol` (F4)",
    "login": "emite la sesión; no autoriza una operación de negocio",
    "logout": "cierra la propia sesión",
    "profile": "la propia cuenta del usuario autenticado",
    "verify_email": "activación de cuenta con el token recibido por correo",
    "forgot_password": "recuperación de contraseña",
    "reset_password": "recuperación de contraseña",
    "Model3DByAccessory": "vidriera: visor 3D del accesorio, sin sesión",
    "CompatibilityByModelo": "vidriera: el configurador pide compatibilidad por modelo, sin sesión",
    "CompatibilityByAccesorio": "vidriera: el configurador pide compatibilidad por accesorio, sin sesión",
    "RecursoCollection": "administración de la propia matriz (`IsSuperAdmin`)",
    "RecursoDetail": "administración de la propia matriz (`IsSuperAdmin`)",
    "AccionCollection": "administración de la propia matriz (`IsSuperAdmin`)",
    "AccionDetail": "administración de la propia matriz (`IsSuperAdmin`)",
    "RecursoAccionCollection": "administración de la propia matriz (`IsSuperAdmin`)",
    "RecursoAccionDetail": "administración de la propia matriz (`IsSuperAdmin`)",
    "RolRecursoCollection": "administración de la propia matriz (`IsSuperAdmin`)",
    "RolRecursoDetail": "administración de la propia matriz (`IsSuperAdmin`)",
    "RecursoConPermisosCollection": "lectura de la matriz por rol (`IsSuperAdmin`)",
    "RolePermisosBulkUpdateView": "reasignar concesiones de un rol (`IsSuperAdmin`)",
    "PermisosUsuarioView": "el usuario lee sus propias concesiones (`IsAuthenticated`)",
}

# Columna con la que la matriz acota las filas de cada recurso con dimensión.
DIMENSION = {
    "inventario": "`inventario.id_tienda`",
    "cotizaciones": "`cotizacion.id_tienda` + `cotizacion.id_usuario`",
    "configuraciones": "`usuario__tienda` del dueño + `configuracion.usuario_id`",
    "usuarios": "`usuario.id_tienda`",
    "tiendas": "`tienda.id_tienda`",
    "ventas": "agregados por `id_tienda`; la ruta no entrega filas",
}

# Las vistas que no heredan de un `model` propio y sin embargo sí acotan filas.
SIN_MODELO = {"InventoryMovementView", "QuoteCollection", "QuoteDetailView", "QuoteStatus",
              "QuoteHistoryView", "InventoryCollection", "InventoryDetail", "UserCollection",
              "UserDetail", "StoreCollection", "StoreDetail", "ConfigurationCollection",
              "ConfigurationDetail", "ReporteResumenView"}

LECTURA_ANONIMA = ("GET", "HEAD", "OPTIONS")
# Puertas que exigen sesión sea cual sea el método. `EscribirConPermiso` solo la
# exige en las mutaciones: su lectura depende de `lectura_sin_matriz`.
PUERTAS_DE_SESION = {"IsAuthenticated", "IsSuperAdmin", "HasPermiso"}
GENERICAS = {"DatabaseGuardMixin", "ResourceCollection", "ResourceDetail"}

OPERACIONES = list(operaciones_de_la_matriz())
NOMBRES_GOBERNADOS = {fila[0] for fila in OPERACIONES}


def nombre_de_la_vista(vista):
    clase = getattr(vista, "cls", None)
    return clase.__name__ if clase is not None else getattr(vista, "__name__", "?")


ruta_por_clase = {}
for ruta, vista in _RUTAS_API:
    ruta_por_clase.setdefault(nombre_de_la_vista(vista), []).append(ruta)


def cuerpo_de_la_clase(clase):
    """Solo el código de la vista concreta, sin las bases genéricas del archivo."""
    texto = ""
    for padre in clase.__mro__:
        if padre.__module__ == "api.views" and padre.__name__ not in GENERICAS:
            texto += inspect.getsource(padre)
    return texto


def acota_filas(clase):
    texto = cuerpo_de_la_clase(clase)
    return "filtrar_por_scope" in texto or "scope_configurations" in texto


def tabla_de(clase):
    modelo = getattr(clase, "model", None)
    if modelo is None:
        serializer = getattr(clase, "serializer_class", None)
        modelo = getattr(getattr(serializer, "Meta", None), "model", None)
    return getattr(modelo, "_meta", None)


def campo_de_tienda(clase):
    meta = tabla_de(clase)
    if meta is None:
        return None
    for nombre in ("id_tienda", "tienda"):
        try:
            meta.get_field(nombre)
        except Exception:
            continue
        return f"`{meta.db_table}.{nombre}`"
    return None


avisos = []
filas = []
for nombre, _vista, metodo, recurso, accion in sorted(
        OPERACIONES, key=lambda f: (f[3], f[0], f[2])):
    clase = getattr(module, nombre)
    rutas = sorted(set(ruta_por_clase.get(nombre, [f"(sin ruta: {nombre})"])))
    puertas = set(_clases_de_permiso(clase.permission_classes))
    nombres_de_puerta = {getattr(p, "__name__", str(p)) for p in puertas}
    if IsSuperAdmin in puertas:
        autenticacion = "solo sede"
    elif (metodo in LECTURA_ANONIMA
          and getattr(clase, "lectura_sin_matriz", False)
          and not (nombres_de_puerta & PUERTAS_DE_SESION)):
        autenticacion = "anónimo permitido"
    else:
        autenticacion = "sesión obligatoria"

    alcances = ", ".join(f"`{s}`" for s in scopes_validos(recurso))
    if recurso not in RECURSOS_CON_TIENDA:
        filtrado = "no acota: catálogo sin columna de tienda ni dueño; `global` es la tabla entera"
    elif acota_filas(clase):
        filtrado = DIMENSION.get(recurso, campo_de_tienda(clase) or "campo de la fila")
        if nombre == "InventoryMovementView":
            filtrado = "`inventario.id_tienda` de la fila que recibe el asiento"
    elif nombre in SIN_MODELO:
        filtrado = DIMENSION.get(recurso, "campo de la fila")
    elif campo_de_tienda(clase):
        filtrado = "**no acota** aunque la tabla tiene columna de tienda"
        avisos.append(f"- `{nombre}` lee `{recurso}:{accion}` y su tabla tiene columna de tienda "
                      "pero la consulta no pasa por `filtrar_por_scope`.")
    else:
        filtrado = (f"no acota: `{recurso}` tiene dimensión de tienda, pero la tabla de esta "
                    "vista es catálogo global de ese área")

    for ruta in rutas:
        filas.append(
            f"| `/{ruta}` | **{metodo}** | `{recurso}` · `{accion}` | {autenticacion} "
            f"| {alcances} | {filtrado} |")

print("## Operaciones gobernadas por la matriz")
print()
print("| Ruta | Método | Recurso · acción | Autenticación | Alcances concedibles | Filtrado de filas |")
print("| --- | --- | --- | --- | --- | --- |")
print("\n".join(filas))
print()
print(f"{len(filas)} operaciones (ruta × método) con recurso, acción y scope declarados en la "
      "propia vista; ninguna se autoriza por el rol que envía el frontend.")
print()
print("## Rutas fuera de la matriz")
print()
print("| Ruta | Método | Puerta actual | Por qué no la gobierna la matriz |")
print("| --- | --- | --- | --- |")
for ruta, vista in _RUTAS_API:
    nombre = nombre_de_la_vista(vista)
    if nombre in NOMBRES_GOBERNADOS:
        continue
    clase = getattr(vista, "cls", None)
    metodos = [m for m in ("GET", "POST", "PUT", "PATCH", "DELETE")
               if clase is not None and hasattr(clase, m.lower())] or ["(función)"]
    puerta = " + ".join(getattr(p, "__name__", str(p)) for p in
                        (_clases_de_permiso(clase.permission_classes) if clase else [])) or "—"
    for metodo in metodos:
        print(f"| `/{ruta}` | **{metodo}** | {puerta} | "
              f"{FUERA_DE_LA_MATRIZ.get(nombre, 'REVISAR: sin justificación escrita')} |")
print()
print("## Lecturas declaradas `lectura_sin_matriz = True`")
print()
print("Son las rutas donde la lectura **no** consulta la matriz. Cada una es una decisión "
      "tomada por ruta, no un default del framework.")
print()
print("| Vista | Rutas | Puerta real |")
print("| --- | --- | --- |")
for nombre in sorted(NOMBRES_GOBERNADOS):
    clase = getattr(module, nombre)
    if not getattr(clase, "lectura_sin_matriz", False):
        continue
    puertas = {getattr(p, "__name__", str(p)) for p in _clases_de_permiso(clase.permission_classes)}
    rutas = ", ".join(f"`/{r}`" for r in sorted(set(ruta_por_clase.get(nombre, [nombre]))))
    abierta = "sesión obligatoria" if puertas & PUERTAS_DE_SESION else "sin sesión (vidriera)"
    print(f"| `{nombre}` | {rutas} | {abierta} |")

print()
print("## Avisos del generador")
print()
print("\n".join(avisos) if avisos else "- Ninguno: toda vista con dimensión de tienda acota sus filas.")
