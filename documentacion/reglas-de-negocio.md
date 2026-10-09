# Reglas de negocio

Las reglas de negocio puras viven en `api/services.py`, sin acceso a base de
datos, para poder probarlas de forma unitaria y compartirlas entre vistas.

## Orden determinista

Todos los listados terminan con un `order_by` que incluye **la clave primaria**
para que la paginación no desordene ni repita filas:

- `UserCollection`: `order_by("usu_nombre", "pk")`
- `QuoteCollection`: `order_by("-fecha_solicitud", "pk")`
- `InventoryMovement` (listado de movimientos): `order_by("-fecha_movimiento", "pk")`

## Transiciones de cotización

Estados: `pendiente`, `aprobada`, `rechazada`, `completada`.

```python
QUOTE_TRANSITIONS = {
    "pendiente": {"aprobada", "rechazada"},
    "aprobada": {"completada", "rechazada"},
    "rechazada": {"pendiente"},
    "completada": set(),   # estado final
}
```

- `services.allow_state_transition(current, new)` valida por qué estado se
  puede pasar. `QuoteStatus.update_status` la usa y responde `400` con
  "No se puede pasar de 'x' a 'y'." en transiciones inválidas.
- Cada transición válida registra una fila en `cotizacion_estado_hist`
  (solo se registran las válidas).
- Un `coti_estado` fuera del conjunto es rechazado con
  "coti_estado debe ser uno de: …".

## Cotizaciones (calc_quote)

`services.calc_quote(items, accessories, max_items=100)`:

- Precio unitario desde `accesorio.producto.precio`.
- Subtotal = precio × cantidad, total = suma de subtotales.
- Lanza `BusinessError` si un accesorio no tiene precio configurado o si el
  número de líneas supera `QUOTE_MAX_ITEMS` (por defecto 100).
- `QuoteCollection.post` lo usa dentro de una transacción y crea las líneas en
  `detalle_cotizacion`.

## Inventario

- `services.inventory_status(stock, minimum)`:
  - `stock <= 0` → `agotado`
  - `stock <= minimum` → `bajo`
  - en otro caso → `normal`
- `services.apply_movement(amount, type_name)`:
  - `entrada` → `abs(amount)`
  - `salida` → `-abs(amount)`
  - otro tipo → se deja tal cual (para registros manuales).
- `InventoryMovementView.post` bloquea la fila con `select_for_update`,
  rechaza movimientos que dejen el stock en negativo ("El movimiento dejaría
  el stock en negativo.") y actualiza el estado del inventario en la misma
  transacción.

## Vistas que sombreaban modelos (bug corregido)

Las clases de vista `InventoryMovement` y `QuoteDetail` (ahora
`InventoryMovementView` y `QuoteDetailView`) tenían el mismo nombre que los
modelos y hacían imposible usar el ORM dentro de sus propias vistas. Ver
[hallazgos-y-correcciones.md](hallazgos-y-correcciones.md).