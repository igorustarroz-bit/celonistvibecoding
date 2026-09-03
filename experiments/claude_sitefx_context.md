# Efectos del site de Celonis replicados — especificación completa

> Este documento vive en `experiments/` junto a los demas `claude_*_context.md`
> (todos subidos ahi el 2026-09-03). **Las rutas de este doc son relativas a
> `experiments/`.**

Contexto para Claude (o cualquier dev) que necesite mantener o REHACER los
efectos de interfaz de celonis.com sobre las copias estáticas guardadas.
Complementa a `claude_globe_context.md` (globo del hero) y al contexto del
experimento 3 (`claude_datacore_context.md`).

Regla de Igor para todo el proyecto: NADA en español en la interfaz (textos
de UI en inglés); documentos y comentarios de código en español.

## Ficheros y páginas

Los JS de este experimento viven en `3d-globe/anime-globe/`.

- `site-fx.js` — todos los efectos de bloque de la home: titular char-by-char,
  cubos verdes del hero, acordeón de Solutions, carrusel de stories, reveal de
  grids, sprite de iconos/logo. Cargado por `3d-globe/index.html` y `3d-globe/original.html`
  con cache-busting `?v=YYYYMMDD[x]` — SUBIR LA VERSIÓN en cada cambio o el
  navegador servirá el JS viejo (ya pasó y confundió una ronda entera de QA).
- `nav-fx.js` — efecto del menu superior (ocultar al bajar + clon del CTA).
  Fichero COMUN unificado en `experiments/nav-fx.js`, cargado por las 6 paginas
  como `../nav-fx.js?v=N`. Especificacion completa, valores exactos y fallos ya
  cometidos: **`experiments/claude_navfx_context.md`** — leer ese doc, no duplicar
  aqui la informacion.
- `scroll-fx.js` — reacción al scroll del mundo y los cubos (documentado en
  `claude_globe_context.md`). Lo cargan `3d-globe/index.html` Y
  `3d-globe/original.html`.

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

Documentado aparte, en **`experiments/claude_navfx_context.md`** (fichero comun
`experiments/nav-fx.js`). No se duplica aqui.

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
