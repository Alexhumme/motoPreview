"""Extrae el casco del logo oscuro (motopreview_logo_dark_v2.png).

El logo v2 es el nuevo diseno del usuario: casco blanco con visor
naranja y camara, sobre fondo azul oscuro, con el wordmark abajo.
Para la marca del header se necesita solo el casco, con fondo
transparente, para usarlo en el tema oscuro.

Salidas:
  - frontend/public/motopreview_icono_oscuro.png  casco transparente
  - frontend/public/favicon.png                   casco 64x64 sobre el
    mismo fondo oscuro del logo
"""
from PIL import Image

ENTRADA = "motopreview_logo_dark_v2.png"

img = Image.open(ENTRADA).convert("RGBA")
ancho, alto = img.size
print("Logo:", (ancho, alto))

# Color del fondo: esquina superior izquierda
fondo = img.getpixel((5, 5))[:3]
print("Fondo:", fondo)


def cerca_de_fondo(r, g, b, referencia, tolerancia):
    return (abs(r - referencia[0]) <= tolerancia
            and abs(g - referencia[1]) <= tolerancia
            and abs(b - referencia[2]) <= tolerancia)


pixeles = img.load()
for y in range(alto):
    for x in range(ancho):
        r, g, b, a = pixeles[x, y]
        if cerca_de_fondo(r, g, b, fondo, 18):
            pixeles[x, y] = (r, g, b, 0)

# Solo la zona del casco: por encima del wordmark (~25% inferior)
zona = img.crop((0, 0, ancho, int(alto * 0.72)))
caja = zona.getbbox()
print("Caja del casco:", caja)
casco = zona.crop(caja)

# Limpiar el resto del wordmark que se cuela en la esquina
# inferior derecha (una pequeña marca naranja)
pc = casco.load()
ancho_c, alto_c = casco.size
for y in range(int(alto_c * 0.9), alto_c):
    for x in range(int(ancho_c * 0.93), ancho_c):
        pc[x, y] = (0, 0, 0, 0)
print("Casco:", casco.size)

# Cuadrado con margen del 2% (ceñido, llena el chip)
lado = max(casco.size)
margen = int(lado * 0.02)
tamanio = lado + margen * 2
lienzo = Image.new("RGBA", (tamanio, tamanio), (0, 0, 0, 0))
lienzo.paste(casco, ((tamanio - casco.size[0]) // 2, (tamanio - casco.size[1]) // 2), casco)
lienzo.save("frontend/public/motopreview_icono_oscuro.png")

# Favicon: casco sobre el mismo fondo oscuro del logo
fondo_opaco = fondo + (255,)
favicon = Image.new("RGBA", (tamanio, tamanio), fondo_opaco)
favicon.alpha_composite(lienzo)
favicon.resize((64, 64), Image.LANCZOS).save("frontend/public/favicon.png")
print("Guardados: motopreview_icono_oscuro.png + favicon.png")
