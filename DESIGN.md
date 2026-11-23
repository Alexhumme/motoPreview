# MotoPreview — Style Reference

> **Alcance:** escritorio (1280, 1440 y 1920 px). Guía visual y de tokens para el sistema MotoPreview. No cubre móvil ni tablet.

## Resumen del sistema

MotoPreview usa un fondo azul grisáceo oscuro con naranja como color de marca principal, Space Grotesk para títulos, Inter para lectura e interacción, y DM Mono para códigos y datos técnicos. Las tarjetas tienen radios amplios (24 px) y el contraste está optimizado para ambos temas. La paleta está pensada para ser coherente en todas las pantallas de escritorio, con una jerarquía clara de superficies, bordes y estados.

## Tema oscuro

### Paleta de colores

| Nombre token | Valor | Rol |
|--------------|-------|-----|
| `--color-obsidian-plum` | `#171b22` | Canvas y fondo profundo de página |
| `--color-graphite-plum` | `#232833` | Superficie de tarjetas y listas |
| `--color-smoke-plum` | `#2e3441` | Superficie de tarjeta interna, segunda elevación |
| `--color-ink-border` | `#313947` | Bordes sutiles, discretos |
| `--color-carbon` | `#25292e` | Rellenos de navegación, bloques de primer plano |
| `--color-brand-orange` | `#f26a21` | **Marca naranja CTA, enfoque, estados de selección** |
| `--color-brand-orange-soft` | `#ffb077` | **Acentos suaves, iconos de píldora, degradados** |
| `--color-text-accent` | `#ffc49b` | **Texto de acento, títulos en modo claro** |
| `--color-text-primary` | `#e5e7eb` | Texto principal en modo oscuro |
| `--color-text-secondary` | `#8b94a3` | Texto secundario, enlaces, iconos |
| `--color-border-subtle` | `#313947` | Bordes sutiles entre superficies |
| `--color-border-strong` | `#2e3441` | Bordes más fuertes, separación de tarjetas |
| `--color-action-primary` | `#f26a21` | Acciones primarias (botones CTA) |
| `--color-jam-pink` | `#e5484d` | Error, estados de peligro |
| `--color-mist-gray` | `#8b94a3` | Cuerpo de texto, enlaces secundarios, iconos |
| `--color-soft-mist` | `#d0cfd1` | Variante más clara del texto del cuerpo |
| `--color-paper` | `#ffffff` | Texto claro sobre fondo oscuro, etiquetas invertidas |

### Tipografía

**Font Families:**
- `--font-display: 'Space Grotesk', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;` — Títulos y encabezados
- `--font-ui: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;` — Lectura e interacción general
- `--font-mono: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;` — Códigos y datos técnicos

**Type Scale:**
| Rol | Tamaño | Línea base | Peso | Token |
|-----|--------|------------|------|-------|
| caption | 11px | 1.43 | regular | `--text-caption` |
| body | 14px | 1.5 | regular | `--text-body` |
| body-lg | 15px | 1.5 | regular | `--text-body-lg` |
| heading-sm | 24px | 1.33 | bold | `--text-heading-sm` |
| heading | 48px | 1.1 | black | `--text-heading` |
| heading-lg | 66px | 1.1 | black | `--text-heading-lg` |
| display | 116px | 1.0 | black | `--text-display` |

**Pesos disponibles:** `--weight-regular: 400`, `--weight-medium: 500`, `--weight-semibold: 600`, `--weight-bold: 700`, `--weight-black: 900`

### Radio de bordes (radiuses)

| Elemento | Radio |
|----------|-------|
| Nav / píldoras / tags | 9999 px (plano) |
| Botones | 12 px |
| Inputs | 12 px |
| Tarjetas | 24 px |
| Divisores / elementos interactivos | 8 px (opcional) |

**Lenguaje de radios consistente:** 16 px en campos y botones, 24 px en tarjetas, 8–12 px en píldoras y etiquetas. Las tarjetas usan 24 px como dirección actual; evaluar 16 px para una identidad más técnica.

### Superficies

| Nivel | Nombre | Valor | Propósito |
|-------|--------|-------|-----------|
| 0 | Canvas | `--color-obsidian-plum` | Fondo de página y pie |
| 1 | Surface card | `--color-graphite-plum` | Tarjetas y listas |
| 2 | Elevated | `--color-smoke-plum` | Superficies elevadas |
| 3 | Producto | `--color-paper` | Fondo de elementos de producto (modo claro) |

### Sombras

- `--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--color-border-subtle)`
- `--shadow-subtle: rgb(242, 106, 33, 0.1) 0px 0px 0px 2px, rgba(242, 106, 33, 0.2) 0px 20px 25px -5px, rgba(242, 106, 33, 0.2) 0px 8px 10px -6px`

### Estados

- **Estado primary:** Usa `--color-brand-orange` para botones CTA, focos y selección
- **Estado success/Warning/Error:** Usa `--color-jam-pink` para peligro, con señal semántica aparte del color
- **Focus visible:** `box-shadow: 0 0 0 3px rgba(242, 106, 33, 0.4)` con `--radius-inputs`
- **Hover/Active:** Transiciones suaves de 0.15s ease

### Gradientes

- `.gradient-mint-violet` → Usa `--color-brand-orange` y `--color-brand-orange-soft`
- `.gradient-violet-pink` → Usa `--color-brand-orange-soft` y `--color-jam-pink`

## Tema claro (:root[data-tema='claro'])

Las mismas reglas de tipografía y radio aplican, con valores de superficie claros:

| Token | Valor modo claro | Comentario |
|-------|-----------------|------------|
| `--color-obsidian-plum` | `#f4f5f7` | Canvas claro |
| `--color-graphite-plum` | `#ffffff` | Tarjetas blancas |
| `--color-smoke-plum` | `#eceef2` | Superficie elevada |
| `--color-ink-border` | `#dfe3ea` | Bordes sutiles |
| `--color-carbon` | `#e6e9ee` | Rellenos de navegación |
| `--color-brand-orange` | `#f26a21` | Marca naranja (idéntico) |
| `--color-brand-orange-soft` | `#ff9a4d` | Degradados modo claro |
| `--color-text-accent` | `#b35c1d` | Acento de títulos (naranja oscuro) |
| `--color-text-primary` | `#1d232c` | Texto principal |
| `--color-text-secondary` | `#5c6674` | Texto secundario |
| `--color-border-subtle` | `#dfe3ea` | Bordes sutiles |
| `--color-border-strong` | `#e5e7eb` | Bordes más fuertes |
| `--color-action-primary` | `#f26a21` | Acciones primarias |
| `--color-jam-pink` | `#d13438` | Errores modo claro |
| `--color-mist-gray` | `#5c6674` | Cuerpo secundario |
| `--color-soft-mist` | `#3a424e` | Cuerpo de texto |
| `--color-paper` | `#1d232c` | Texto principal gris casco |

## Tokens semánticos (nuevos)

| Token | Valor oscuro | Valor claro | Rol |
|-------|-------------|-------------|-----|
| `--text-primary` | `--color-text-primary` | `--color-text-primary` | Texto principal de lectura |
| `--text-secondary` | `--color-text-secondary` | `--color-text-secondary` | Texto de apoyo, metadatos |
| `--border-subtle` | `--color-border-subtle` | `--color-border-subtle` | Bordes de separación suaves |
| `--border-strong` | `--color-border-strong` | `--color-border-strong` | Bordes que separan tarjetas/superficies |
| `--action-primary` | `--color-action-primary` | `--color-action-primary` | Botones CTA y acciones primarias |

## Layout

- **Max-width de página:** 1200 px (contenido centrado)
- **Gap de sección:** 80 px
- **Padding de tarjeta:** 40 px
- **Gap elemento:** 16 px

## Do's and Don'ts

### Do
- Usar `--color-brand-orange` exclusivamente para CTA primarios, señales de enfoque y estado de selección
- Usar `--color-brand-orange-soft` para iconos de píldora, degradados y acentos secundarios
- Usar `--color-text-accent` para títulos y resaltados en modo claro
- Aplicir `--border-subtle` para separar superficies dentro de una misma tarjeta
- Usar `--border-strong` para delimitar tarjetas y secciones principales
- Aplicar `--action-primary` en botones de acción principal
- Reservar `--color-jam-pink` para estados de error/danger, con señal semántica aparte del color
- Mantener consistencia en radios: 24 px tarjetas, 12 px botones/inputs, 9999 px píldoras

### Don't
- No usar `--color-brand-orange` en textos corporales ni en fondos de tarjetas
- No reemplazar todos los bordes con el mismo radio; usar `--border-subtle` y `--border-strong` según el contexto
- No depender solo del color para distinguir estados (uso de texto, íconos o etiquetas)
- No introducir nuevas paletas de color fuera del sistema definido
- No reducir el contraste por debajo de los niveles aceptables en modo oscuro y claro

## Superficies y elevación

| Nivel | Nombre CSS | Uso |
|-------|-----------|-----|
| `--surface-canvas` | Fondo principal (oscuro: `#171b22`, claro: `#f4f5f7`) |
| `--surface-card` | Tarjetas y paneles (oscuro: `#232833`, claro: `#ffffff`) |
| `--surface-elevated` | Elevaciones secundarias (oscuro: `#2e3441`, claro: `#eceef2`) |
| `--surface-product` | Fotos/preview de producto modo claro |

## Imaginería

Las imágenes de producto deben tener proporción 4:3. Fondo unificado y encuadre consistente. Las fotos de los productos más visitados o vendidos deben priorizarse sobre placeholders genéricos.

## Componentes destacados

### Botón primary (.btn--primary)

- Fondo: `--color-brand-orange`
- Texto: `--color-obsidian-plum` (modo oscuro) o `--color-carbon` (modo claro)
- Sombra de enfoque de 3 capas usando `--shadow-subtle`
- Radio: `--radius-buttons` (12 px)
- Estado hover: cambia a `--color-brand-orange-soft` con ligera elevación

### Tarjeta (.card)

- Fondo: `--surface-card`
- Borde: 1 px `--border-subtle`
- Radio: `--radius-cards` (24 px)
- Sombra: `--shadow-card`

### Superficie elevada (.card-elevated)

- Fondo: `--surface-elevated`
- Borde: 1 px `--border-subtle`
- Mismo radio que `.card`

### Form inputs

- Borde: 1 px `--color-border-subtle` en estado normal
- Foco: borde `--color-brand-orange` con sombra `--shadow-subtle`
- Deshabilitado: opacidad 0.5, cursor not-allowed

## Quick Color Reference (modo oscuro)

- fondo: `#171b22`
- superficie tarjeta: `#232833`
- texto principal: `#e5e7eb`
- borde sutil: `#313947`
- marca naranja: `#f26a21`
- acento suave: `#ffb077`
- acento texto: `#ffc49b`

## Quick Color Reference (modo claro)

- fondo: `#f4f5f7`
- superficie tarjeta: `#ffffff`
- texto principal: `#1d232c`
- borde sutil: `#dfe3ea`
- marca naranja: `#f26a21`
- acento suave: `#ff9a4d`
- acento texto: `#b35c1d`

## CSS Custom Properties (fragmento esencial)

```css
:root {
  /* Colors */
  --color-obsidian-plum: #171b22;
  --color-graphite-plum: #232833;
  --color-smoke-plum: #2e3441;
  --color-ink-border: #313947;
  --color-carbon: #25292e;
  --color-brand-orange: #f26a21;
  --color-brand-orange-soft: #ffb077;
  --color-text-accent: #ffc49b;
  --color-text-primary: #e5e7eb;
  --color-text-secondary: #8b94a3;
  --color-border-subtle: #313947;
  --color-border-strong: #2e3441;
  --color-action-primary: #f26a21;
  --color-jam-pink: #e5484d;
  --color-mist-gray: #8b94a3;
  --color-soft-mist: #d0cfd1;
  --color-paper: #ffffff;

  /* Typography */
  --font-display: 'Space Grotesk', ...;
  --font-ui: 'Inter', ...;
  --font-mono: 'DM Mono', ...;

  /* Type Scale */
  --text-body: 14px;
  --text-body-lg: 15px;
  --text-heading-sm: 24px;
  --text-heading: 48px;
  --text-heading-lg: 66px;
  --text-display: 116px;

  /* Radii */
  --radius-nav: 8px;
  --radius-cards: 24px;
  --radius-pills: 9999px;
  --radius-inputs: 12px;
  --radius-buttons: 12px;
}
```