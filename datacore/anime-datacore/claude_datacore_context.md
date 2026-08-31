# Data Core hero de Celonis — contexto del experimento 3

Contexto para Claude (o cualquier dev) que necesite mantener este hero o
rehacerlo en otra tecnología (Three.js, WebGL, SVG…). La implementación
actual es Canvas 2D + anime.js v4, siguiendo el mismo enfoque que el globo
del experimento 1 (`../../celonis-home/anime-globe/`).

## Qué es

Réplica animada del "Data Core" del hero de
https://www.celonis.com/platform/datacore — originalmente el vídeo
`Data Core _ Celonis_files/media_1d4cef74d99f6c45beccfa206d959b14c6b09d142.mp4`
(1280×720 @50fps, 17 s) con still de referencia
`Data Core _ Celonis_files/Celonis_DataCore_Still.png` (3840×2160).

Sustituye al `<video>` por `<canvas id="datacore-canvas">` dentro de
`<div class="auto-player-wrapper" id="datacore-stage">` (aspect-ratio 16/9
fijado por un `<style id="datacore-exp">` inline en `index.html`).

## Ficheros de esta carpeta

- `datacore.js` — escena, renderizador isométrico y timeline. Sin dependencias salvo anime.js.
- `sprite.js` — spritemap placeholder inyectado en el DOM (logo Celonis real
  + iconos geométricos de sustitución; el `/dist/assets/spritemap.svg` original
  no se guarda offline). Reescribe todos los `<use>` a símbolos locales `#id`.
  Es el MISMO spritemap que el experimento 1 (extraído de su `site-fx.js`).
- `anime.umd.min.js` — anime.js v4.5.0 UMD (copiado del experimento 1); expone `window.anime`.
- `claude_datacore_context.md` — este fichero.

Fuera de la carpeta:
- `../index.html` — página guardada y limpiada: sin `<script>` externos ni
  trackers (OneTrust, Qualified, CrazyEgg…), sin `modulepreload`, URLs raíz
  (`/dist/...`, `/src/...`) reescritas a `https://www.celonis.com/...`,
  @font-face Poppins con URL absoluta. Solo carga `sprite.js`, `anime.umd.min.js`
  y `datacore.js` al final del body.
- `../original.html` — copia intacta de la página guardada (con vídeo).
- `../Data Core _ Celonis_files/` — assets guardados; los usan ambas versiones.

## La escena (coordenadas de plano u,v ∈ [-1,1]; proyección isométrica 2:1)

Proyección: `sx = CX + (u−v)·A`, `sy = CY + (u+v)·B − z`, con
`A = min(W·0.17, H/5.4)` y `B = A·(0.52 ± parallax)`. El parallax del ratón
rota además el plano (u,v) hasta ±0.22 rad (suavizado lerp 0.055/frame).

Tres capas (de abajo arriba), cada una con su marco-diamante redondeado
(extent 1.04, stroke blanco fino) y su etiqueta pill (fondo casi negro,
borde blanco, Poppins ~A·0.052px, letter-spacing 14%):

1. **DATA INTEGRATION** — 4 placas hexagonales flat-top definidas en base de
   pantalla (a,b): N(0,−0.60) R0.40, S(0,0.62) R0.40, O(−0.63,0.01) R0.46×1.15,
   E(0.63,0.01) R0.46×1.15; esquinas cortadas 5%. Conversión (a,b)→(u,v) con
   1/√2. Placa central: rounded-rect 0.34×0.26, alto A·0.16, top casi negro
   `rgb(9,10,12)`; la etiqueta de esta capa es SIEMPRE visible (como el vídeo).
   Alto de los hexágonos: A·0.06.
2. **DATA TRANSFORMATION** — retícula 10×10, extent 0.8, gap 18%. Morph
   cuadrado→círculo por columna: radio = (0.14 + 0.86·p)·half con
   p = clamp((morph−0.5)·1.9 + 0.5 + barrido), morph = ix/9, y un barrido
   senoidal animado (state.wave, 9 s/ciclo) que hace ondular la frontera.
3. **PROCESS QUERY ENGINE** — retícula 6×6, extent 0.8, gap 16%. Formas por
   tile con RNG determinista (mulberry32, semilla 20260831): 42% cuadrado
   redondeado (r 0.22), 18% "hoja /" (radios [1,0.12,1,0.12]), 18% "hoja \\",
   22% círculo (radios [1,1,1,1]).

### Material (DECISIÓN: tops opacos — no volver a translúcidos)

Los tops translúcidos convertían el estado colapsado en una sopa ilegible.
Como en el vídeo, cada prisma es opaco:
- top `rgb(lt,lt+2,lt+5)` con lt = 14 + 26·seed + 22·g (g = gradiente de
  posición 0..1 izquierda→derecha de pantalla → la mitad derecha más clara,
  como el still).
- lateral `rgb(ls,ls+3,ls+7)` con ls = 46 + 34·seed + 30·g.
- rim: stroke blanco alpha 0.28 + 0.30·seed + 0.15·g (+shimmer).
- shimmer: pulso senoidal por-tile (max +0.035 de luminancia).

### Prismas sin artefactos

`drawPrism()` proyecta el polígono superior y dibuja la pared frontal como
quads POR ARISTA (solo aristas cuya normal de pantalla apunta hacia abajo,
signo decidido por el winding del polígono proyectado), todos en un único
path con un solo fill. El primer intento (cadena frontal entre extremos
min/max X) producía "bowties" brillantes en formas muy redondeadas — no volver.

### Timeline (anime.js v4, loop ~11,5 s)

`createTimeline({loop:true, ease:'inOutQuart'})` sobre `state`:
- 600→3000 ms: spread 0→1 (explosión). Separación entre capas:
  sep = A·0.30 + (A·1.28 − A·0.30)·spread.
- 1900→2600 ms: label 0→1 (etiquetas de las capas grid).
- hold hasta 7600 ms; 7600→8100 label→0; 7900→10100 spread→0; hold compacto
  hasta 11500.
- Aparte: `animate(state,{wave:1, 9 s, loop, linear})` para el morph.
- Bob por capa: sin(t·0.6 + li·1.9)·A·0.014·spread.
- Pop-in inicial (una sola vez, no en el loop): ap por tile según distancia
  Manhattan al centro, ventana 0.5 s, escala 0.75→1 + alpha.
- `prefers-reduced-motion`: estado explosionado estático, sin timeline ni bob.

### Cursor personalizado

El mismo crosshair del globo (portado de `globe.js`): 4 brazos con hueco
central, trazo negro 3px con borde blanco 1.5px, 28px, hotspot centrado,
SVG en data-URI como `canvas.style.cursor`; solo con puntero fino
(`hover:hover and pointer:fine`), fallback `crosshair`.

## Rendimiento

~60 fps en Chromium headless 1440×900 (136 tiles + 5 placas por frame,
2 fills + 1 stroke por prisma). Sin dependencias de red en runtime salvo
fuentes/imágenes del propio site.

## Publicación

GitHub Pages del repo `igorustarroz-bit/celonisvibecoding` (rama main, raíz).
- Experimento: https://igorustarroz-bit.github.io/celonisvibecoding/datacore/index.html
- Original guardado: .../datacore/original.html
- El índice raíz (`/index.html`) lista este experimento como "Experiment 3".
El token está en `github-token.txt` (gitignored — NUNCA subirlo).
