# Efectos del site de Celonis replicados — especificación completa

Contexto para Claude (o cualquier dev) que necesite mantener o REHACER los
efectos de interfaz de celonis.com sobre las copias estáticas guardadas.
Complementa a `claude_globe_context.md` (globo del hero) y al contexto del
experimento 3 (`../../datacore/anime-datacore/claude_datacore_context.md`).

Regla de Igor para todo el proyecto: NADA en español en la interfaz (textos
de UI en inglés); documentos y comentarios de código en español.

## Ficheros y páginas

- `site-fx.js` — todos los efectos de bloque de la home: titular char-by-char,
  cubos verdes del hero, acordeón de Solutions, carrusel de stories, reveal de
  grids, sprite de iconos/logo. Cargado por `../index.html` y `../original.html`
  con cache-busting `?v=YYYYMMDD[x]` — SUBIR LA VERSIÓN en cada cambio o el
  navegador servirá el JS viejo (ya pasó y confundió una ronda entera de QA).
- `nav-fx.js` — menú que se oculta/reaparece con el scroll. Duplicado a
  propósito en `../../datacore/anime-datacore/nav-fx.js` para que cada
  experimento sea autocontenido. Cargado por 6 páginas: index y original de
  celonis-home; index, index3d, original y "Data Core _ Celonis" de datacore.
  ⚠️ Si una sesión regenera `datacore/index3d.html` entero, debe conservar el
  `<script src="anime-datacore/nav-fx.js"></script>` antes de `</body>` (se
  perdió una vez, commit 28f33a9 lo repuso).
- `scroll-fx.js` — reacción al scroll del mundo y los cubos (documentado en
  `claude_globe_context.md`). Lo cargan index.html Y original.html.

## Cómo se obtuvo el comportamiento original (método)

El site vivo es AEM Edge Delivery: cada bloque tiene su JS en
`https://www.celonis.com/dist/blocks/<bloque>/<bloque>.js` (home-hero,
square-value, solutions, header) y chunks compartidos en `/dist/chunks/`
(tokens.js, animated-words.js, animated-accordion.js). Se analizaron esos
ficheros para extraer parámetros y se REIMPLEMENTÓ el comportamiento en
vanilla JS (transiciones CSS en vez de GSAP). Verificación: muestrear en el
site vivo `getComputedStyle(...).transform` de los chars cada 50 ms y
comparar con la réplica en Playwright (viewport 1440×900, ≥1200 = desktop).

Tokens de movimiento del site (chunks/tokens.js):
- durations: quick .2s / base .3s / slow .45–.6s
- eases: informative = linear, focused = power2.inOut, expressive = power2.out
- stagger estándar: 0.02 s por elemento

## 1. Titular del hero (frases rotatorias char-by-char)

- Cada frase `h1 .highlights` contiene `.char` (uno por letra, ya en el HTML).
- Animación por char: transform translateY, duración 0.3 s, ease power2.out
  (≈ `cubic-bezier(.215,.61,.355,1)`), delay k×0.02 s (k = índice del char).
  El CSS base pone `transition:none` en los .char → forzar inline con
  `!important`.
- Posiciones: entra desde `lineHeight×2.25` px (abajo), sale hacia
  `−2×lineHeight` px (arriba). lineHeight computado de la propia frase
  (48px móvil / 80px desktop aprox — NUNCA hardcodear).
- La frase saliente y la entrante se animan EN PARALELO (mismo instante).
- Bucle: el siguiente swap arranca 2 s después de TERMINAR el anterior
  (duración de un swap = 0.3 + 0.02×(nChars−1) ≈ 0.75 s → periodo ≈ 2.75 s).
- Reset de la frase oculta: transition none → translateY(inY) → reflow →
  restaurar transición (si no, se ve viajar de vuelta).
- Pausa cuando el hero está fuera del viewport o document.hidden (reintento
  cada 500 ms).
- Entrada: la frase 0 hace el mismo in en cuanto arranca la página.

## 2. Cubos verdes del hero (square-value)

- DOS cubos (.square-wrapper > .square-block), 4 caras-slot cada uno a
  rotateY 0/90/180/−90 + translateZ(--square-translate-z); el bloque gira
  con `--rotate` (transition transform 1s del CSS).
- SINCRONÍA: los cubos rotan −90° en el MISMO instante en que arranca cada
  swap del titular (en el original ambos cuelgan de la misma timeline GSAP).
- El 2º cubo va 0.3 s por detrás: clase `rotation-ready` en su wrapper →
  `transition-delay` del CSS. Solo el segundo la lleva.
- Contenidos ciclados: el contenido entrante se coloca en el slot que va a
  entrar (posición 1..4 → clases rotate-none/once/twice/thrice; el par
  saliente/entrante lleva .hide/.show, que animan los .char-square 50px).
  Cubo 1: las 4 fotos guardadas. Cubo 2: los 7 stats del site en este orden —
  66% invoices AI / 44% order processing / 20% excess inventory / 15% loan
  applications / 1,100+ automation opportunities / 70% on-time delivery /
  $6.5bn total value — así el stat n coincide con la frase n del titular.
- Entrada: la primera cara hace pop scale(0)→1 + opacity, 0.3 s linear, a la
  vez que entran las letras; después limpiar los estilos inline (el inline
  scale pisa el transform 3D de la cara; sin perspective no se nota).
- ⚠️ TRAMPA: el snapshot guarda `--rotate` ACUMULADO (p.ej. −9090deg).
  Resetear a 0 SIN transición (transition none + reflow) o el cubo da ~25
  vueltas al cargar.

## 3. Acordeón de Solutions (animated-accordion)

- Desktop (≥1200 px): SOLO un `<details>` abierto; los paneles
  `[data-accordion][data-index]` (lateral con h3+enlace, y área de contenido
  con chip+tagline) se sincronizan con la clase `.show`.
- Barra de progreso: UNA sola `.accordion-progress`, vive DENTRO del item
  abierto — se crea al abrir y se ELIMINA al cerrar (no una por item).
  `.active` se añade ~100 ms después → transition transform 12s linear
  (scaleX 0→1, CSS de solutions.css). Quitar .active = la barra salta a 0.
- Auto-avance cada 12 s con requestAnimationFrame midiendo el tiempo (no
  setTimeout puro). Pausa: hover sobre el panel lateral, y bloque fuera del
  viewport (IntersectionObserver; al inicio la barra NO está activa hasta
  que el bloque entra en pantalla).
- Click en un item cerrado: selección + reinicio del timer. Click en el item
  abierto: PARA el timer (así lo hace el site).
- Móvil (<1200): todos los items abiertos, sin toggle; las pestañas de
  arriba hacen scroll horizontal del carrusel de items y se sincronizan con
  el scroll.
- ⚠️ TRAMPA del snapshot: el chip de label venía como `<p><div class=
  "labels-container">` (HTML inválido) → el parser saca el div del p y el
  chip se ve en la lista. En el site real el chip solo se ve en el área de
  contenido. Fix: CSS `@media (min-width:1200px){.solutions .accordion-item
  .labels-container{display:none}}` (inyectado por site-fx).

## 4. Menú superior (nav-fx.js)

- Solo desktop (≥1200 px) y si no hay `.secondary-menu-container`.
- Scroll hacia ABAJO → `.nav-wrapper` pierde `nav-shown` y gana `nav-hidden`
  (CSS ya en header.css: opacity 0 + pointer-events none — en el site real
  NO hay slide animado, es un snap de opacidad; verificado en vivo) y se
  añade un CLON del CTA ("Try for free") como `.cloned-cta` fijo arriba a la
  derecha, con `--cta-right-offset` = distancia del CTA real al borde.
- Scroll hacia ARRIBA → quita nav-hidden, pone nav-shown, y retira el clon
  ~500 ms después. Guarda de 500 ms entre transiciones (como el original).
- Al parar el scroll en Y=0 se fuerza visible (debounce 500 ms).
- Las reglas `.nav-hidden` y `.cloned-cta` ya existen en el header.css
  guardado de AMBOS experimentos (son idénticos): no hace falta CSS extra.

## 5. Verificación estándar

Con Playwright (chromium local) sirviendo la carpeta por http.server:
1. Titular: muestrear translateY del primer char de cada frase cada 50 ms →
   debe verse out e in simultáneos (~300 ms) y periodo ~2.7 s.
2. Cubos: `--rotate` debe ir 0 → −90 → −180 … solo en los swaps, sin saltos
   al cargar; `rotation-ready` solo en el 2º wrapper.
3. Acordeón: 1 sola .accordion-progress, en el item abierto; .active al
   entrar en viewport; click en otro item la mueve.
4. Nav: wheel abajo → nav-hidden + .cloned-cta fixed; wheel arriba →
   nav-shown y el clon desaparece.
