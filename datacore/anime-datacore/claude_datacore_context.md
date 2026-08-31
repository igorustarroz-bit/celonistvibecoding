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
- `datacore-tuner.js` — panel visual de ajuste del cristal (solo variante B).
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

## Variante B — polígonos 3D reales (Three.js)

`../index3d.html` + `datacore-3d.js` + `three.min.js` (r147 UMD, de npm: los
CDN están bloqueados desde el sandbox). Misma escena, semilla RNG, timeline y
cursor que la variante A, pero:
- Cámara ortográfica isométrica: azimut 45°, elevación 31.3°. Escala:
  px-por-unidad-de-mundo = √2·A (A = misma regla que la variante A) para que
  el diamante coincida en pantalla; la separación entre capas se multiplica
  por 1/(cos 31.3°·√2) para igualar el alzado.
- Geometría: `ExtrudeGeometry` con bisel (bevelSize 0.012) desde `THREE.Shape`
  (rounded-rect con radios por esquina / hexágonos). El morph cuadrado→círculo
  de la capa media usa 13 geometrías precalculadas compartidas y swap de
  `mesh.geometry` por índice (rebuild por frame sería carísimo).
- Material (v2, calibrado contra frames del vídeo): `MeshPhysicalMaterial`
  cristal ahumado casi negro — tint 0.045–0.155, roughness 0.10, transmission
  0.22, thickness 0.18, clearcoat 1.0/0.10, envMapIntensity 1.6, exposure 1.0.
  OJO: con transmission ≥0.4 el estado colapsado se vuelve lechoso (capas
  apiladas) — mantener bajo.
- FILOS DE LUZ (el rasgo clave del vídeo): cada mesh lleva un hijo
  `LineSegments(EdgesGeometry(geo, 20°))` blanco translúcido (opacity
  0.16–0.48 por seed). Cachear EdgesGeometry por geometría (`edgesFor`) y usar
  `swapGeo()` para que el rim siga los cambios de geometría (morph y volteos).
- Entorno: equirect procedural 1024×512 con BANDAS horizontales tipo softbox
  (stripe y≈78 fuerte + refuerzo + relleno tenue y blob caliente) →
  reflejos alargados en los biseles; bevel 0.018, bevelSegments 3.
- VOLTEOS (como el vídeo): cada ~520 ms, si spread>0.75, un tile aleatorio de
  la capa superior (máx 2 a la vez) gira 180° sobre eje X o Z aleatorio con
  lift senoidal 0.16, duración 1050 ms inOutSine (anime.animate); a medio giro
  (p≥0.5) cambia su geometría a OTRA forma del pool (sq/leafA/leafB/circ).
  Para ello las geometrías de tiles van centradas en Y (extrude(...,center)) y
  el mesh se posiciona en y=cy.
- CRECIMIENTO 4×4→6×6 (como el vídeo): radio visible reach = 0.62+0.52·spread
  contra d=(|u|+|v|)/1.6 + jitter por tile; los tiles hacen pop de escala
  (0.55→1) al cruzar el umbral. En compacto solo queda el 4×4 interior.
- GLASS v3 (tras estudiar los tutoriales de Codrops "GlassEffect" y "Xylophone"):
  postprocesado con EffectComposer — RenderPass + UnrealBloomPass(0.42, 0.55,
  threshold 0.32) + ShaderPass(GammaCorrectionShader). OJO: el composer trabaja
  en LINEAL; sin la pasada gamma todo sale plano y oscuro. Los pases van en
  `three-post.js` (concatenado de examples/js de three r147: CopyShader,
  LuminosityHighPassShader, Pass, MaskPass, ShaderPass, RenderPass,
  EffectComposer, UnrealBloomPass, GammaCorrectionShader). Fondo del canvas
  ahora OPACO negro (la sección es negra) para el composer.
- Transmisión ANIMADA con el spread: transmission = 0.10 + 0.22·spread
  (compacto = ahumado casi opaco, explosionado = cristalino). Probado y
  descartado: roughness 0.30 para "frost" (agrisa y mata los reflejos — el
  vídeo es cristal PULIDO, roughness 0.09) y transmission ≥0.5 explosionado
  (los tiles se tragan el fondo negro y quedan planos).
- Banda de entorno clave para las TAPAS: stripe(y=168, alpha 0.55, x 520–1010)
  — es la que reflejan las caras superiores (el≈31°, azimut opuesto a cámara).
- TAPAS TRANSPARENTES (v8, petición directa de Igor): el shader separa la
  pieza en zonas por normal-mundo: topness = smoothstep(0.55,0.95,up). La TAPA
  es transparencia real — `seeThru = trans·uTopDarken + uBody·0.12` — y el
  blanco lechoso queda SOLO en el anillo del bisel/laterales: `bevel =
  smoothstep(0.02,0.45,up)·(1−topness); col += sky·bevel·uEdgeWhite`, con el
  fresnel atenuado ×(1−0.7·topness·uTopClear) para que la tapa quede limpia.
  Mandos nuevos en DATACORE y en el panel: topClear (0.85), topDarken (0.90),
  edgeWhite (0.35). Refracción base subida a 0.13+0.06·seed.
- TINTE AZULADO + PANEL DE AJUSTE (v7): el shader lleva uniforms editables
  (uTint vec3, uFres, uSkyTop, uSkyHz) y un objeto global `window.DATACORE`
  con todos los mandos (tint rgb, transmission/+spread, refract, fresnel,
  skyTop/skyHorizon, iri, body, pre, rim, backdrop, bloom.*) que `applyTune()`
  aplica CADA FRAME — editable en consola y desde el panel visual
  `datacore-tuner.js` (solo cargado en index3d.html): sliders + color pickers,
  colapsable, con "Copiar ajustes" (exporta el JSON de DATACORE) y "Reset".
  Cuando Igor encuentre los valores buenos, pegar su JSON exportado como
  nuevos defaults de DATACORE en datacore-3d.js.
- GLASS v6 — el pre-pase que faltaba (SIN ESTO EL CRISTAL SE VE GRIS Y SORDO):
  cada frame, ANTES del composer, la escena se renderiza a `backRT` (0.6×dpr)
  con: (a) un quad de fondo (`bgQuad`, textura de estudio oscura con hotspot,
  visible SOLO en el pre-pase, colocado en −VIEW·8 mirando a cámara y escalado
  al frustum ×1.1), (b) los meshes de cristal cambiados a su gemelo simple
  `userData.preMat` (MeshBasic oscuro, tint×0.55) — los filos LineSegments se
  renderizan también, así que A TRAVÉS del cristal se ven las piezas de detrás
  con sus filos brillantes, refractados, (c) las etiquetas ocultas (se
  duplicaban feo). Después se restauran materiales y visibilidades y corre el
  composer. El cristal muestrea `backRT.texture` — transparencia REAL.
- GLASS v5 — receta base del Xylophone: el cristal es un
  `ShaderMaterial` propio, NO MeshPhysicalMaterial. La transmisión física no
  funcionaba: con fondo negro no hay nada que refractar (por eso se veía opaco
  y gomoso). En su lugar, como el tutorial: (1) BACKDROP procedural claro y
  pre-difuminado (canvas 512²: gradiente medio-oscuro + blobs suaves) leído con
  REFRACCIÓN EN ESPACIO DE PANTALLA: `buv = vScreenUv + N.xy·uRefract`
  (uRefract 0.10–0.15 por seed); (2) mezcla `col = mix(uBody, trans,
  uTransmission·mix(1.0, 0.22, up²))` donde up = normal-mundo Y — CLAVE: las
  tapas planas quedan oscuras (cuerpo) y biseles/laterales lechosos, como el
  vídeo; (3) FRESNEL hacia cielo de 3 paradas (sin HDR): `pow(1−|N.z|,3)·0.85`;
  (4) IRIDISCENCIA como paleta coseno con fase por normal (uIri 0.10);
  (5) salida `pow(col, 2.2)` porque el composer trabaja en lineal y la pasada
  gamma final convierte a sRGB. uTransmission = 0.62+0.18·spread.
  El backdrop debe ser de TONOS MEDIOS: con zonas blancas grandes la pila sale
  quemada (el screen-uv mapea el backdrop directamente a la pantalla).
- Luz puntual inferior (PointLight 0xf4f7ff en (0,−2.4,0), 0.5+0.8·spread) —
  solo afecta ya a plateMat (el cristal es ShaderMaterial). PROBADO Y RETIRADO
  a petición de Igor: un haz volumétrico visible (billboard aditivo) — "no
  afecta a los materiales, queda fatal". No reintentar haces visibles.
- Bloom recalibrado para el cristal claro: UnrealBloomPass(0.38, 0.5, 0.55).
- VOLTEOS v3 (sin salto ni al girar NI AL CATERRIZAR): girar 180° sobre X o Z
  ESPEJA la forma (leafA↔leafB; sq y circ invariantes → mapa MIRROR). El flip
  elige `target`; en el cruce de canto respecto a la cámara (cruce por cero de
  dot(normal girada, VIEW)) monta MIRROR[target]; al completar, rotación→0 y
  geometría→target (silueta píxel-idéntica en ese instante). Además la pieza
  se encoge ×(1−0.22·sin(pπ)) durante el giro. El fallo anterior: aterrizaba a
  180° mostrando el espejo y el reset a 0 daba el salto.
- Etiquetas: sprites con textura canvas (pill), altura 0.085 unidades de mundo
  (≈ mismas px que la variante A), depthTest off.
- Los dos index llevan un enlace fijo abajo-derecha para alternar A↔B.

Lección del primer intento: la pared frontal por "cadena entre extremos"
(variante A) y aquí la escala sin el factor √2 y las etiquetas en 0.22 world
salían mal; ya corregido como arriba.

## Rendimiento

~60 fps en Chromium headless 1440×900 (136 tiles + 5 placas por frame,
2 fills + 1 stroke por prisma). Sin dependencias de red en runtime salvo
fuentes/imágenes del propio site.

## Publicación

GitHub Pages del repo `igorustarroz-bit/celonisvibecoding` (rama main, raíz).
- Variante A (Canvas 2D): https://igorustarroz-bit.github.io/celonisvibecoding/datacore/index.html
- Variante B (WebGL): https://igorustarroz-bit.github.io/celonisvibecoding/datacore/index3d.html
- Original guardado: .../datacore/original.html
- El índice raíz (`/index.html`) lista este experimento como "Experiment 3".
El token está en `github-token.txt` (gitignored — NUNCA subirlo).
