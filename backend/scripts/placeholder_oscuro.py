"""Genera la variante OScura del placeholder de fotos.

Parte de frontend/public/placeholder_pendiente.png (fondo claro) y
produce placeholder_pendiente_oscuro.png con el mismo diseno pero apto
para el tema oscuro:
  - El fondo casi blanco se vuelve transparente y se pega sobre el
    color de tarjeta oscura.
  - Los trazos grises (casco, circulo punteado, textos grises) se
    invierten a tonos claros.
  - El naranja de la marca (camara y "FOTO PENDIENTE") se conserva.
"""
from PIL import Image

ENTRADA = "frontend/public/placeholder_pendiente.png"
SALIDA = "frontend/public/placeholder_pendiente_oscuro.png"
FONDO_OSCURO = (35, 40, 51)  # --color-graphite-plum #232833

img = Image.open(ENTRADA).convert("RGBA")
pixeles = img.load()
ancho, alto = img.size

for y in range(alto):
    for x in range(ancho):
        r, g, b, a = pixeles[x, y]
        saturacion = max(r, g, b) - min(r, g, b)
        if saturacion < 45:
            # Familia gris/blanca/negra: fondo afuera, trazos invertidos
            if min(r, g, b) >= 232:
                pixeles[x, y] = (r, g, b, 0)
            else:
                v = (r + g + b) // 3
                v_nuevo = max(0, min(255, 255 - v))
                pixeles[x, y] = (v_nuevo, v_nuevo + 2, v_nuevo + 6, a)
        # Pixeles con color (naranja) se conservan tal cual

lienzo = Image.new("RGBA", (ancho, alto), FONDO_OSCURO + (255,))
lienzo.alpha_composite(img)
lienzo.convert("RGB").save(SALIDA)
print("Guardado:", SALIDA)
