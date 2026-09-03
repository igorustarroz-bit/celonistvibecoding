# nav-fx.js — efecto del menú superior en las páginas guardadas

Doc de contexto ÚNICO de este efecto (convención `claude_<tema>_context.md`).
Todos los `claude_*_context.md` del repo viven en `experiments/`, al nivel de
las carpetas de experimentos; **sus rutas son relativas a `experiments/`**.
El script tambien es COMÚN: `experiments/nav-fx.js`. Antes estaba duplicado en
`celonis-home/anime-globe/` y `datacore/anime-datacore/`; desde la
reorganización del 2026-09-03 hay UNA sola copia y las 6 páginas la cargan
como `../nav-fx.js?v=N`.

## Qué hace

Replica el comportamiento del menú de celonis.com en DESKTOP: al hacer scroll
hacia abajo el nav desaparece y queda solo un clon fijo del CTA arriba a la
derecha; al hacer scroll hacia arriba el nav reaparece. Mismo mecanismo de
clases que el `header.js` del site real (no es una reimplementación libre: son
las clases que ya trae el `header.css` guardado).

## Valores exactos (v2 + v27, 95 líneas, vanilla JS, IIFE)

- Breakpoint desktop: `(min-width: 1200px)` vía `matchMedia`, consultado EN
  VIVO (`isDesktop()`) en cada scroll — no una sola vez en `init()`.
- Enganche: `document.querySelector('.header .nav-wrapper')`. Si no existe,
  el script no hace nada. Si existe `.secondary-menu-container`, TAMPOCO se
  activa (páginas con menú secundario).
- CTA de origen: `.header .nav-tools .button-container:last-of-type a`
  ("Try for free").
- Scroll ABAJO (`y > lastY`) → `hide()`: quita `nav-shown`, pone `nav-hidden`
  y añade `cta.cloneNode(true)` con clase `.cloned-cta` como hijo de
  `wrap.parentElement`, fijando `--cta-right-offset` =
  `window.innerWidth - cta.getBoundingClientRect().right`.
- Scroll ARRIBA (`y < lastY`) → `show()`: quita `nav-hidden`, pone
  `nav-shown`, y retira el clon 500 ms después (`dropClone(false)`).
- Guarda `animating` de **500 ms** entre transiciones (como el original): un
  `hide()` durante la guarda se ignora.
- Al PARAR el scroll, si `scrollY === 0` se fuerza visible. Debounce 500 ms,
  en un segundo listener independiente.
- Throttle con `requestAnimationFrame` (flag `ticking`), listeners
  `{passive:true}`.
- Cruce del breakpoint hacia abajo (`matchMedia change` + `resize`) →
  `restoreNow()`: nav visible y clon fuera al instante, sin guarda.
- Arranque: `DOMContentLoaded` si el documento aún carga, si no `init()` ya.

## CSS: no hace falta añadir nada

Las reglas viven ya en el `header.css` guardado de los experimentos (los dos
ficheros son idénticos: `celonis-home/original/header.css` y
`datacore/Data Core _ Celonis_files/header.css`):

- `.header .nav-wrapper{opacity:1;position:fixed;...}` y
  `.header .nav-wrapper.nav-hidden{opacity:0;pointer-events:none}` — en el
  site real NO hay slide animado, es un SNAP de opacidad (verificado en vivo);
  la única `transition` del wrapper es de `background-color`.
- `.header .cloned-cta{position:fixed;top:var(--fnd-spacing-06);z-index:3}`
  con el `right` por breakpoint: `--cta-right-offset` entre 1200 y 1599 px,
  `--fnd-spacing-10` desde 1600, `calc(50% - 736px)` desde 1920.
- ⚠️ `nav-shown` NO tiene regla CSS: es solo una clase marcador (el estado
  visible es el default). No la busques en el CSS.

## Páginas que lo cargan (6)

`experiments/celonis-home/`: `index.html`, `original.html`.
`experiments/datacore/`: `index.html`, `index3d.html`, `original.html`,
`Data Core _ Celonis.html`.

Todas con cache-busting `?v=27` — **SUBIR LA VERSIÓN en cada cambio** del JS
o GitHub Pages servirá el fichero viejo (cachea los JS ~10 min).

## Fallos ya cometidos — no repetir

1. **Breakpoint evaluado una sola vez en `init()`** (v1). Una ventana que
   empezaba ancha y luego se estrechaba, o el modo responsive de DevTools,
   seguía ocultando el nav en móvil: desaparecían logo y menú y quedaba el CTA
   clonado flotando sobre el texto. Arreglado en v2 con `isDesktop()` por
   scroll + `restoreNow()` al cruzar el breakpoint.
2. **El `<script>` se perdió al regenerar `index3d.html`** desde un clon
   DESACTUALIZADO del repo (repuesto en el commit 28f33a9). Si una sesión
   regenera un index completo, debe conservar
   `<script src="../nav-fx.js?v=N"></script>` antes de `</body>`. Antes de
   tocar un index: `git pull`, o editar sobre la copia del portátil de Igor.
3. El menú con el logo **no se toca**: estaba bien, solo necesita este efecto.

## Historial

- v1: primera versión, breakpoint solo en `init()`.
- v2: breakpoint en vivo + `restoreNow()` al bajar de 1200 px.
- 2026-09-03: script unificado en `experiments/nav-fx.js` (una sola copia),
  las 6 páginas a `../nav-fx.js?v=27`, y este documento como fuente única.
