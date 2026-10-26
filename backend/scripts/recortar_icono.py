"""Recorta el icono (casco) del logo y prepara las variantes.

Entrada:  frontend/src/assets/motopreview_logo.png  (632x424)
Salidas:
  - frontend/src/assets/motopreview_icono.png  icono con fondo transparente
  - frontend/public/favicon.png                icono 64x64 sobre fondo blanco
"""
from PIL import Image

RUTA = "frontend/src/assets/motopreview_logo.png"

imagen = Image.open(RUTA).convert("RGBA")
ancho, alto = imagen.size
print("Logo:", imagen.size)

# El casco + lineas ocupa aproximadamente el 60% superior del lienzo
recorte = imagen.crop((
    int(ancho * 0.18),
    int(alto * 0.08),
    int(ancho * 0.70),
    int(alto * 0.62),
))
print("Icono recortado:", recorte.size)

# Quitar el fondo blanco (el casco es oscuro: sin transparencia se
# perderia sobre el canvas oscuro del sitio)
pixeles = recorte.load()
for y in range(recorte.size[1]):
    for x in range(recorte.size[0]):
        r, g, b, a = pixeles[x, y]
        if r > 238 and g > 238 and b > 238:
            pixeles[x, y] = (r, g, b, 0)
recorte.save("frontend/src/assets/motopreview_icono.png")

# Favicon: icono centrado sobre cuadrado blanco redondeado
lado = max(recorte.size)
cuadrado = Image.new("RGBA", (lado, lado), (255, 255, 255, 255))
cuadrado.paste(recorte, ((lado - recorte.size[0]) // 2, (lado - recorte.size[1]) // 2), recorte)
cuadrado = cuadrado.resize((64, 64), Image.LANCZOS)
cuadrado.save("frontend/public/favicon.png")
print("Guardados: motopreview_icono.png (transparente) + public/favicon.png (blanco)")
