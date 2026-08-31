# Globo del hero de Celonis — especificación completa

Contexto para Claude (o cualquier dev) que necesite mantener este globo o
**rehacerlo en otra tecnología** (Three.js, WebGL, shaders, SVG…). Todo lo
visual está descrito con fórmulas exactas y valores finales aprobados por
Igor; la implementación actual (Canvas 2D + anime.js v4) es solo una de las
posibles.

## Qué es

Réplica interactiva del mundo 3D en blanco y negro del hero de celonis.com
(originalmente el vídeo `https://www.celonis.com/src/assets/videos/commercial-earth-hero.mp4`,
1702×1702 @60fps, 13.9s — hay una copia en `../Enterprise-AI-powered-by-Celonis_files/`).
Sustituye al `<video>` por un `<canvas id="earth-canvas">` dentro de `<p class="world">`.

## Ficheros de esta carpeta

- `globe.js` — renderizador + interacciones. Sin dependencias salvo anime.js y landmask.
- `landmask.js` — máscara de continentes ACTIVA (bitfield base64, ver abajo).
- `anime.umd.min.js` — anime.js v4.5.0 UMD; expone `window.anime` ({animate, ...}).
- `scroll-fx.js` — reacción al scroll (réplica del home-hero.js original del site).
- `site-fx.js` — interacciones del site restauradas: sprite/logo, titular char-by-char cíclico, cuadrado verde rotatorio, tabs+acordeón de Solutions, carrusel de stories, reveal de grids. (Sustituye al antiguo static-fixes.js.)
- `tools/mask-tools.py` — export/filter/tojs para editar la máscara como PNG.
- `tools/landmask-actual.png` — mapamundi completo corregido (blanco = tierra).
- `tools/landmask-propuesta.png` — la máscara aplicada (sin islas árticas).

## 1. Malla de puntos (DECISIÓN CERRADA — no cambiar sin consultar a Igor)

Filas de latitud constante, como el vídeo original:

```
paso = latStepDeg = 0.8°
para lat = -90+paso/2 … 90, en incrementos de paso:
  n = max(1, round(360/paso · cos(lat)))      // espaciado de arco uniforme
  para k = 0 … n-1:  lon = -180 + (k+0.5)·360/n
```

SIN offset aleatorio por fila: las columnas quedan casi alineadas entre filas
vecinas y eso produce el moiré característico del original. La convergencia en
los polos se ASUME (así es el vídeo original).

Alternativas PROBADAS Y RECHAZADAS por Igor (no reintentar):
- Espiral de Fibonacci (uniforme): deja un remolino de brazos espirales en los polos.
- Fibonacci + jitter aleatorio: sin artefactos pero pierde el moiré ("menos placentero").
- Columnas fijas por fila (mismo n en todas): diana de anillos sólidos en el polo.

## 2. Máscara de continentes

Equirectangular (plate carrée) 1440×720 (0,25°/celda), 1 bit por celda,
fila 0 = lat +90, columna 0 = lon −180. En `landmask.js` como
`LANDMASK = {W, H, data}` con `data` = bitfield en base64 (bit i = celda
`y·W + x`, LSB primero dentro de cada byte).

Fuente: `world-atlas` (npm) `land-50m.json` + rasterización scanline propia.
⚠️ TRAMPA CONOCIDA: los anillos que cruzan el antimeridiano (±180°) rompen el
relleno par-impar ingenuo y rellenan FILAS ENTERAS en el Ártico ("tierra
fantasma"). Solución: desenrollar las longitudes de cada anillo a un dominio
continuo y rellenar con XOR por anillo (los agujeros se auto-anulan).

Edición de la tierra visible (petición de Igor): las islas pequeñas del norte
se tratan como agua; solo Groenlandia sobrevive en el Ártico. Filtro aplicado:
componentes conexas (con wrap de longitud) cuyo centroide está por encima de
58°N y cuya área REAL (celdas ponderadas por cos φ) es < 600.000 km² → agua.

Flujo de edición manual: `tools/landmask-*.png` (blanco = tierra) se edita en
cualquier editor y se convierte con
`python3 tools/mask-tools.py tojs editado.png landmask.js`.

## 3. Marcas ("dashes")

- Forma: trazo recto con extremos redondeados; grosor = 0.0015 × lado del canvas.
- Orientación: tangente norte de la esfera rotada 40° hacia el este sobre la
  superficie (`dashAngleDeg`) → leen como slashes "/". Dirección 3D:
  `d = cos(40°)·t_norte + sin(40°)·t_este`, con
  `t_norte = (−sinφ·sinλ, cosφ, −sinφ·cosλ)`, `t_este = (cosλ, 0, −sinλ)`.
- Longitud: máx 0.85° de arco (`dashLenDeg`), escalada por brillo:
  `lf = 0.22 + 0.78·min(1, brillo·1.6)` (`dotFloor` 0.22) → el agua tenue es
  casi un punto, las costas el slash completo. Los extremos del trazo se
  calculan en 3D (p ± d·long/2) y se proyectan, así el escorzo es correcto.

## 4. Proyección y rotación

Ortográfica. Radio = 0.4775 × lado del canvas (`radiusRatio`). Canvas cuadrado
interno de hasta 1702px (cap por rendimiento), dpr máx 2.
Matriz por frame: `M = Rz(roll) · Rx(tilt) · Ry(spin)` con
- tilt = 21° (+ pitch del usuario por arrastre vertical, límites −25°…+40°)
- roll = sin(wobble·2π) · 7°, wobble cicla en 26 s
- spin = progreso·2π (vuelta completa en 21.6 s, lineal, loop) + dragLon del usuario
Culling: se descartan puntos con z_vista < 0.015. Pantalla:
`sx = cx + x·R`, `sy = cy − y·R` (+ offset de entrada).

## 5. Iluminación (blanco sobre negro; TIERRA CLARA / MAR OSCURO — decisión de Igor,
   inversa al vídeo original)

Brillo base por marca (semilla fija mulberry32(1337) para reproducibilidad):
- Tierra: `0.30 · (0.45 + 1.2·v²)` con v = rand() → varianza fuerte.
  - Franja costera (celdas de tierra a ≤5 celdas del agua, distancia Chebyshev
    en la máscara): `+ 0.85 · (1 − (d−1)/5)² · (0.6 + 0.5·rand())`.
  - Moteado: `× (0.9 + 0.2·blotch(lon,lat))` con blotch = ruido senoidal barato.
- Agua: `0.09 · (0.6 + 0.8·rand())` → puntitos casi invisibles.

Por frame, el alfa de cada marca:
`alpha = base · (0.52 + 0.48·max(0,dot(n,L))^1.25) + (1−z)² · 0.42 · (0.5+base)`
con luz `L = normalize(−0.30, 0.62, 0.72)` (difusa + realce de limbo tipo fresnel).
Render por buckets: 14 niveles de alfa, un Path2D por nivel y frame.

## 6. Blur / bloom

- CSS `filter: blur(0.6px)` sobre el canvas (soft focus general).
- Bloom VECTORIAL: los buckets con brillo > 0.5 se re-trazan con grosor ×3.4 y
  alfa `0.55·0.16·nivel` en modo `lighter` → halo alrededor de lo brillante.
⚠️ NO usar blur gaussiano por canvas (drawImage + filter): >100 ms/frame sin
GPU. El vectorial cuesta ~1 ms y se ve casi igual.

## 7. Interacción de arrastre (ratón + táctil)

Pointer Events sobre el canvas, `touch-action: pan-y` (el swipe vertical táctil
sigue haciendo scroll de página).
- Horizontal: `dragLon += dx / R_css` (1:1 con la superficie en el ecuador).
- Vertical: `pitch += (dy/R_css)·(180/π)·0.85`, límites −25°…+40° (se queda donde lo dejas).
- Al agarrar se pausa el auto-spin; al soltar, INERCIA: velocidad estimada
  sobre una ventana de posiciones de ~160 ms (robusto a frames lentos; si te
  paras antes de soltar → velocidad 0, sin inercia). Si |v| > 0.00008 rad/ms:
  animación de v→0 con ease out(2), duración = clamp(|v|·900000, 350, 3200) ms,
  integrando `dragLon += v·dt` por frame. Al terminar, el auto-spin se reanuda.

## 8. Foco del cursor 3D "aguja" (solo desktop: hover+pointer:fine y pointerType mouse)

El cursor se proyecta sobre la esfera en espacio de vista
(`u=(x,y) → z=√(1−|u|²)`; si |u|>0.9995 se fija al limbo; si |u|>1.2 se apaga).
Cada marca se afecta por su distancia geodésica al punto del cursor:
`c = dot(p_vista, cursor)`; dentro del casquete (`c > cos(23°)`):
- `f = (c − cosA)/(1 − cosA)` ∈ [0,1] (1 en el centro).
- LUZ: `alpha += 0.3 · smoothstep(f) · (tierra ? 1 : 0.1)` — gradiente 100%→0.
- ELEVACIÓN "aguja": `mag = 0.045 · f^400` (pico finísimo solo en el centro);
  el punto se eleva por la normal `p → p·(1+mag)` y la marca crece ×(1+mag·1.5).
- Todo escala con `spot.on`, que hace fade 250 ms al entrar/salir el cursor →
  al retirar el ratón la retícula vuelve EXACTA a su sitio.

## 9. Entrada y scroll

Entrada (al cargar): fade alpha 0→1, rise (offset vertical 10%→0) y scale
0.94→1 en 1.8 s ease outCubic.

Scroll (`scroll-fx.js`; réplica del home-hero.js real del site, scrub lineal 1:1):
- Elementos: `p.world` (contiene el canvas) y `.fragment-wrapper` (tarjeta stats).
- Reposo: **desktop (≥1200px): translate(0, −500px) scale(1) — FIJO, elegido a
  mano por Igor**; tablet: y = −vh + 434; móvil: y = −vh + 386.
- Rango: `E = altura(.home-hero)·1.75 + 88`; `start = max(0, 4/7·E − vh)`;
  `end = E − vh`.
- Con progreso p ∈ [0,1]: world `y = reposo − 0.75·vh·p`, `scale = 1 − 0.75·p`
  (termina a 0.25); wrapper `scale = max(0, 1 − p/0.8)`.
- rAF-throttled, listeners passive, se recalcula en resize. Hook: `window.__heroScroll`.

## 10. CFG final (aprobado por Igor, 2026-08-31)

```
latStepDeg 0.8 · dashLenDeg 0.85 · dashAngleDeg 40 · dotFloor 0.22
dashWidthRatio 0.0015 · radiusRatio 0.4775 · tiltDeg 21 · rollDeg 7
spinPeriodMs 21600 · wobblePeriodMs 26000 · entranceMs 1800
landBase 0.30 · oceanBase 0.09 · coastBoost 0.85 (COAST_MAX 5 celdas)
softBlurPx 0.6 · bloomStrength 0.55 · bloomWidth 3.4 · bloomFrom 0.5
spotAngleDeg 23 · spotStrength 0.3 · spotLandFactor 0.1 · spotBulge 0.045
spotNeedlePow 400 · spotFadeMs 250
dragPitchMin −25 · dragPitchMax 40 · inertiaMinMs 350 · inertiaMaxMs 3200
flickMinVel 0.00008
```

Todo expuesto en `window.__earth` (cfg, state, redraw, spinAnim, flick(v)).
Los parámetros de construcción (latStepDeg, dashAngleDeg, dotFloor, landBase,
oceanBase, coastBoost) requieren recargar; el resto actúa en vivo.

## 11. Rendimiento

~58k marcas totales (~29k visibles). draw() ≈ 4–9 ms en CPU pura (sin GPU);
en un portátil moderno va sobrado a 60fps. Claves: nada de sqrt en los hot
paths donde se pudo evitar, buckets de alfa (14 strokes por frame, no 29k),
bloom vectorial en vez de filtros, y canvas interno capado a 1702px.

## 12. Historial de decisiones (para no repetir debates)

- Tierra clara / mar oscuro: decisión de Igor (el vídeo original es al revés).
- Slashes "/" y agua como puntitos: decisión de Igor.
- Malla de filas del original > Fibonacci/jitter: decisión de Igor.
- Islas árticas como agua, Groenlandia como tierra: decisión de Igor (filtro por área).
- Foco pequeño con aguja f^400: valores elegidos por Igor probando en consola.
- Reposo desktop −500px fijo: valor elegido por Igor.
- Bug histórico 1: usar variables antes de declararlas dentro de draw() → NaN
  silencioso (el hoisting de `var` no inicializa). Calcular yOffset al principio.
- Bug histórico 2: rasterizador del antimeridiano (ver §2).

## 13. Notas para portar a otra tecnología

- WebGL/Three.js: instancing de ~58k quads o gl.LINES; la máscara puede ir
  como textura (equirect 1440×720, nearest) y TODO el modelo de brillo (§5) y
  el foco (§8) caben en el vertex/fragment shader — el bloom pasaría a ser un
  postprocesado real (UnrealBloomPass o similar).
- Mantener EXACTAMENTE: la malla de filas (§1), las fórmulas de brillo (§5),
  las curvas de scroll (§9) y los valores del CFG (§10). Son el "look".
- El vídeo original guardado sirve como referencia visual de contraste y ritmo
  de rotación (~100° cada 6 s).
