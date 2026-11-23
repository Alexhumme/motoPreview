"""Genera el icono (casco) y el favicon a partir del logo original.

Estrategia: elimina el fondo blanco, toma la zona derecha del logo
(donde esta el casco), calcula el bounding box del contenido y lo
centra en un lienzo cuadrado con un margen minimo. Asi el casco llena
el chip del header en vez de verse pequeno entre espacios vacios.

Entrada:  motopreview_logo.png (raiz del proyecto)
Salidas:
  - frontend/public/motopreview_icono.png  icono transparente cuadrado
  - frontend/public/favicon.png            icono 64x64 sobre blanco
"""
from PIL import Image

RUTA = "motopreview_logo.png"

logo = Image.open(RUTA).convert("RGBA")
ancho, alto = logo.size

def quitar_blanco(img, umbral=238):
    img = img.copy()
    pixeles = img.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b, a = pixeles[x, y]
            if r > umbral and g > umbral and b > umbral:
                pixeles[x, y] = (r, g, b, 0)
    return img

# Zona del logo donde esta el casco: derecha y por ENCIMA del texto
# "MotoPreview" (el wordmark empieza ~y=0.68H y ensuciaria el recorte)
zona = logo.crop((int(ancho * 0.34), 0, ancho, int(alto * 0.65)))
zona = quitar_blanco(zona)

caja = zona.getbbox()
print("Bounding box del casco dentro de la zona:", caja)
casco = zona.crop(caja)
print("Casco:", casco.size)

# Cuadrado con margen del 2% por lado (ceñido: el casco llena el chip)
lado = max(casco.size)
margen = int(lado * 0.02)
lienzo_lado = lado + margen * 2
icono = Image.new("RGBA", (lienzo_lado, lienzo_lado), (0, 0, 0, 0))
icono.paste(casco, ((lienzo_lado - casco.size[0]) // 2, (lienzo_lado - casco.size[1]) // 2), casco)
icono.save("frontend/public/motopreview_icono.png")

# Favicon sobre blanco
favicon = Image.new("RGBA", (lienzo_lado, lienzo_lado), (255, 255, 255, 255))
favicon.paste(icono, (0, 0), icono)
favicon.resize((64, 64), Image.LANCZOS).save("frontend/public/favicon.png")
print("Guardados: motopreview_icono.png + favicon.png")
