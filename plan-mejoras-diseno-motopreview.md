# Plan de mejoras de diseño y experiencia — MotoPreview

> **Alcance:** guía basada en el ZIP del proyecto compartido. Se asume que la superposición de la imagen ya fue corregida y no se replantea aquí. El alcance actual es escritorio: la implementación y optimización para móvil y tablet quedan diferidas. Este documento propone mejoras visuales y de uso; no afirma que el ZIP represente el despliegue actual.

## Resumen ejecutivo

MotoPreview ya tiene una base reconocible: fondo azul grisáceo oscuro, naranja como color de marca, tipografía Space Grotesk + Inter y DM Mono para códigos. La mejora más importante no es empezar de cero, sino hacer que esa base sea coherente en todas las pantallas de escritorio.

Orden recomendado para escritorio:

1. Consolidar la guía visual y los tokens de color, bordes y radios.
2. Mejorar catálogo, fotos y señales de compatibilidad.
3. Ordenar el recorrido catálogo → configurador → solicitud de cotización.
4. Dar al panel administrativo una navegación y patrones de trabajo consistentes.
5. Validar accesibilidad, temas y estados de contenido.

### Fuera del alcance actual

- Crear menús móviles o cajones para teléfonos y tablets.
- Rediseñar tablas, tarjetas o barras de navegación para pantallas táctiles pequeñas.
- Hacer pruebas de aceptación en resoluciones de móvil y tablet.

Se conserva el comportamiento existente para esos tamaños; estas mejoras pueden retomarse en una fase posterior.

---

## 1. Consolidar la navegación de escritorio — Prioridad media

### Problema observado

La tienda usa una navegación superior y el panel administrativo presenta varias secciones en una sola fila. Para el alcance actual, el objetivo es que ambas cabeceras sean claras y ordenadas en escritorio; no se implementarán alternativas para móvil o tablet.

### Cómo implementarlo

**Tienda** — revisar:
- `frontend/src/components/buttons/SiteHeader.jsx`
- `frontend/src/components/buttons/SiteHeader.css`

1. Alinear marca, enlaces, cuenta y carrito en un contenedor de ancho máximo consistente.
2. Mantener el estado activo del enlace actual claramente visible.
3. Revisar que nombres de cuenta largos o acciones adicionales no compriman el acceso al carrito en anchos de escritorio.

**Panel administrativo** — revisar:
- `frontend/src/layouts/AdminLayout.jsx`
- `frontend/src/layouts/AdminLayout.css`

1. Ordenar los módulos según la frecuencia de uso y mantener el estado activo de la ruta.
2. Comprobar que la fila de navegación y las acciones de cabecera caben sin comprimir el área de contenido a 1280 px o más.
3. Si la fila resulta demasiado densa en escritorio, agrupar enlaces secundarios o evaluar una barra lateral; mantener los filtros de permisos actuales.

### Criterio de aceptación

En resoluciones de escritorio la navegación, las acciones de cuenta y el carrito se leen con claridad, no se enciman y mantienen un indicador de sección activa. La navegación móvil/tablet queda expresamente fuera de esta entrega.

---

## 2. Definir una única fuente de verdad visual — Prioridad alta

### Problema observado

`DESIGN.md` describe «Cron Calendar», Helvetica Neue, una paleta casi monocromática y tarjetas cuadradas. El frontend implementa otra dirección: MotoPreview, fondos slate, naranja, Space Grotesk/Inter/DM Mono y tarjetas con radios amplios. Mantener dos referencias distintas facilita que futuras pantallas se diseñen con reglas contradictorias.

### Cómo implementarlo

**Editar** `DESIGN.md` y documentar el sistema que realmente se quiere usar en MotoPreview:

- Paleta para tema oscuro y claro, con ejemplos de fondo, superficie, texto, borde, marca y estados.
- Tipografía por función: Space Grotesk para títulos, Inter para lectura e interacción, DM Mono para SKU y datos técnicos.
- Escala tipográfica y espaciado, con tamaños mínimos para etiquetas y controles.
- Radios de tarjeta, botón, campo y píldora.
- Variantes de botones, estados de tarjetas, formularios, tablas, modales y navegación.
- Reglas responsive y estados de carga, vacío, error y éxito.

**Ordenar los nombres de tokens** en `frontend/src/styles/index.css`:

1. Migrar gradualmente nombres ambiguos como `--color-signal-mint`, `--color-electric-violet` y `--color-lilac` a nombres que describan su función real —por ejemplo, `--color-brand-orange`, `--color-brand-orange-soft` y `--color-text-accent`—.
2. Buscar todos los usos antes de retirar los nombres anteriores; cambiar la definición y los consumidores en un mismo cambio revisable.
3. Crear tokens por rol: `--text-primary`, `--text-secondary`, `--border-subtle`, `--border-strong`, `--action-primary` y colores semánticos para éxito, advertencia y error.
4. Mantener las asignaciones equivalentes en `:root[data-tema='claro']` y comprobar cada componente en ambos temas.

### Criterio de aceptación

Un desarrollador puede construir una tarjeta, un formulario y un estado de disponibilidad consultando la guía y los tokens, sin inventar un color o un radio nuevo para cada pantalla.

---

## 3. Refinar superficies, bordes y jerarquía — Prioridad alta

### Objetivo

Conservar el carácter oscuro y naranja, pero evitar que cada tarjeta tenga el mismo peso visual que una acción importante.

### Cómo implementarlo

**Editar** `frontend/src/styles/index.css` y revisar los estilos de tarjetas en:
- `frontend/src/components/buttons/AccesorioCard.css`
- `frontend/src/pages/Dashboard.css`
- `frontend/src/components/tables/DataTable.css`
- Los estilos de páginas que dibujen tarjetas o paneles.

1. Usar un borde tenue para separar superficies y reservar el borde más claro o naranja para selección, foco y estados importantes. En el tema oscuro, evaluar `--color-ink-border` para tarjetas y divisores en lugar de aplicar el borde claro más fuerte de manera uniforme.
2. No reemplazar todos los usos globalmente sin revisar: campos, tablas, tarjetas y controles pueden necesitar niveles distintos de contraste.
3. Definir una jerarquía de superficies estable: fondo de página, tarjeta, superficie elevada y elemento interactivo.
4. Decidir el lenguaje de radios. La dirección actual, con tarjetas de 24 px, resulta amable; para una identidad más técnica se puede probar 16 px en tarjetas y 8–12 px en campos y botones, manteniendo las píldoras solo para filtros o etiquetas. Elegir una escala y aplicarla de forma consistente.
5. Usar el naranja principalmente para acción primaria, selección y foco. Los estados de inventario deben distinguirse por significado y no depender solo del color.

### Criterio de aceptación

La acción principal de cada pantalla se reconoce primero; tarjetas y divisores organizan el contenido sin formar una cuadrícula de bordes igualmente llamativos. La lectura funciona tanto en oscuro como en claro.

---

## 4. Mejorar el catálogo y las tarjetas de producto — Prioridad alta

### Archivos

- `frontend/src/pages/public/Catalogo.jsx`
- `frontend/src/pages/public/Catalogo.css`
- `frontend/src/components/buttons/AccesorioCard.jsx`
- `frontend/src/components/buttons/AccesorioCard.css`
- `frontend/src/components/ImagenProducto.jsx`
- Imágenes de producto y placeholders en `frontend/public/`

### Cómo implementarlo

1. **Normalizar las fotos:** fijar una proporción de imagen (por ejemplo, 4:3), un tamaño de exportación, un fondo y un criterio de encuadre. Priorizar fotos de los productos más visitados o vendidos antes de producir imágenes para todo el catálogo.
2. **Definir el orden de lectura de la tarjeta:** imagen, nombre, categoría, compatibilidad concreta, disponibilidad, precio y acción. Mantener el mismo orden y espaciado en todas las tarjetas.
3. **Hacer útil la compatibilidad:** cuando se conoce la moto seleccionada, mostrar marca/modelo/año compatibles. Si no se conoce, ofrecer «Ver compatibilidad» o una invitación a elegir la moto, en vez de dar por hecho que la compatibilidad ya está comprobada.
4. **Controlar textos largos:** limitar título y descripción a un número razonable de líneas, mantener el precio y la acción alineados entre tarjetas y permitir consultar el texto completo en la vista de detalle.
5. **Adaptar la grilla a escritorio:** comprobar el número de columnas y el ancho mínimo de cada tarjeta en 1280, 1440 y 1920 px. Mantener una proporción legible y evitar que las tarjetas queden demasiado estrechas o demasiado anchas.
6. **Ordenar los filtros en escritorio:** mantener categorías, búsqueda y ordenamiento en una jerarquía visible, sin que la lista de categorías empuje o comprima el buscador. Si la lista crece, añadir ordenamiento con opciones útiles, por ejemplo relevancia y precio, solo cuando los datos permitan hacerlo correctamente.
7. **Revisar los textos de demo:** si categorías `[DEMO]`, productos semilla o SKU de prueba aparecen a clientes, excluirlos del catálogo publicado o señalarlos únicamente en un entorno de demostración.
8. **Validar el atajo de búsqueda:** la interfaz muestra una sugerencia `⌘ K`; implementar el atajo para Mac y Ctrl+K para otros sistemas, o retirar la sugerencia hasta que funcione.
9. **Revisar cifras del catálogo:** «+240», «98%», «24h» y «4.9/5» aparecen como valores estáticos en la página. Conectarlos a métricas verificables y actualizadas, o reemplazarlos por beneficios demostrables si no hay una fuente confiable.

### Criterio de aceptación

El catálogo se entiende sin abrir cada producto; la compatibilidad no es ambigua; no hay productos de prueba mezclados con los reales; y las tarjetas conservan altura y legibilidad en las resoluciones de escritorio acordadas.

---

## 5. Guiar el recorrido de compra/cotización — Prioridad media-alta

### Objetivo

Hacer evidente el siguiente paso para quien aún no sabe si su moto es compatible y mantener claro que el flujo termina en una solicitud de cotización.

### Cómo implementarlo

**Revisar** `frontend/src/pages/public/Catalogo.jsx`, `Configurador.jsx` y `Carrito.jsx`, junto con sus CSS.

1. Presentar el flujo en el mismo orden en cada pantalla: elegir moto → ver accesorios compatibles → agregarlos a la selección → enviar la solicitud a la tienda.
2. En el configurador, mantener visible el resumen de la moto elegida y el número de piezas compatibles. Explicar el estado vacío —por ejemplo, cuando aún no se ha elegido moto o no hay accesorios compatibles— y ofrecer una acción concreta para continuar.
3. En el resumen de selección, conservar cantidad, precio por línea y total en una jerarquía clara. En escritorio, comprobar que cualquier resumen fijo no tape la lista y reservar espacio para que el contenido siga accesible.
4. En el carrito, destacar el botón de envío de cotización y aclarar antes de enviarla qué recibirá el cliente y si se realizará o no un pago en línea.
5. Reutilizar los mismos nombres de acciones y estados. No alternar entre «pedido», «cotización» y «compra» si cada término implica un proceso distinto.

### Criterio de aceptación

Una persona que llega por primera vez puede responder qué debe hacer, qué moto está seleccionada y si ya envió una cotización, sin depender de iconos o texto ambiguo.

---

## 6. Hacer el panel administrativo más fácil de recorrer — Prioridad media

### Archivos

- `frontend/src/layouts/AdminLayout.jsx` y `AdminLayout.css`
- `frontend/src/pages/Dashboard.jsx` y `Dashboard.css`
- `frontend/src/components/tables/DataTable.jsx` y `DataTable.css`
- `frontend/src/pages/Accesorios.css`, `Inventario.css`, `Cotizaciones.css` y páginas relacionadas

### Cómo implementarlo

1. Estandarizar el encabezado de cada módulo: nombre de sección, contexto breve y una acción principal en una ubicación constante.
2. Colocar búsqueda y filtros inmediatamente encima de las tablas. Mantener estados vacíos, cargando y error con el mismo patrón visual.
3. Usar una sola convención para acciones de fila: acción principal visible, acciones secundarias en menú cuando haya varias y confirmación clara para operaciones destructivas.
4. En escritorio, dar prioridad a las columnas y acciones más usadas. Evitar que controles de filtro o botones de fila creen ruido visual; decidir si las columnas menos frecuentes deben permanecer visibles o pasar a un detalle del registro.
5. Reducir la competencia visual de tarjetas KPI: destacar únicamente los indicadores que requieren atención y mantener los demás en un nivel secundario.
6. Compartir componentes para tablas, botones, etiquetas de estado, campos y confirmaciones, en lugar de crear una variante distinta por módulo.

### Criterio de aceptación

Inventario, cotizaciones, accesorios y usuarios se sienten parte del mismo panel; las acciones frecuentes se encuentran en lugares previsibles y las tablas priorizan la información importante en escritorio.

---

## 7. Reforzar legibilidad y accesibilidad — Prioridad media

### Cómo implementarlo

1. **Texto:** evaluar subir las etiquetas pequeñas de 11 px a 12 px. Mantener el texto de lectura en torno a 15–16 px donde el espacio lo permita; reservar DM Mono para códigos y valores técnicos.
2. **Teclado:** probar navegación por Tab, foco visible, Escape para cerrar menús y modales, y orden lógico entre controles. No eliminar el indicador de foco si un componente ya tiene uno propio.
3. **Movimiento:** añadir estilos para `prefers-reduced-motion` que reduzcan o desactiven órbitas, pulsos, desplazamientos y animaciones no esenciales.
4. **Contraste:** verificar texto, bordes, controles deshabilitados y estados en tema claro y oscuro; el color no debe ser la única señal para distinguir disponibilidad, error o selección.
5. **Tamaño de interacción:** asegurar que botones, iconos y controles de cantidad sean fáciles de identificar y operar con ratón y teclado.
6. **Contenido accesible:** proporcionar nombres accesibles a iconos y controles; mantener etiquetas explícitas para inputs y mensajes de error asociados al campo correcto.

### Criterio de aceptación

El catálogo, configurador, carrito y panel se pueden completar con teclado en escritorio; foco y estados siguen siendo perceptibles en ambos temas; y el movimiento respeta la preferencia del sistema.

---

## Secuencia de implementación sugerida

### Fase 1 — Fundamentos visuales

- Actualizar `DESIGN.md` para que describa MotoPreview.
- Definir tokens semánticos y decidir bordes/radios.
- Refinar las cabeceras y la navegación de escritorio.

### Fase 2 — Catálogo y confianza

- Normalizar fotos y ocultar datos de demostración en producción.
- Mejorar la jerarquía de las tarjetas y la señal de compatibilidad.
- Revisar filtros, grilla, cifras comerciales y atajo de búsqueda.

### Fase 3 — Flujo y operación interna

- Unificar patrones de configurador y carrito.
- Estandarizar encabezados, filtros, tablas y estados administrativos.
- Completar ajustes de accesibilidad y movimiento reducido.

## Matriz de validación antes de cerrar

Probar las pantallas **catálogo, configurador, carrito, dashboard, inventario y cotizaciones** en:

- Resoluciones de escritorio: 1280 × 800, 1440 × 900 y 1920 × 1080.
- Temas: claro y oscuro.
- Estados: cargando, vacío, error, datos reales, texto largo, precio largo y producto sin foto.
- Interacción: ratón y teclado; foco visible; selección de filtros; envío y confirmación de cotización.

La corrección anterior de superposición se mantiene como prueba de regresión: confirmar que sigue resuelta, sin convertirla en el foco de este rediseño.
