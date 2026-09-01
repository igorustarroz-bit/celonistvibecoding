# Data Core hero de Celonis — especificación del experimento 3

Documento de referencia para mantener este hero o RECONSTRUIRLO EN OTRA
TECNOLOGÍA (Three.js, WebGL puro, SVG, Rive, Lottie…). Describe QUÉ se ve y
con qué datos exactos, separando el diseño (agnóstico de tecnología) de las
notas de implementación actuales. Estado: v19 (2026-09-01).

Regla de Igor para todo el proyecto: NADA en español en la interfaz — todos
los textos de UI en inglés (etiquetas, botones, paneles). Los documentos y
comentarios de código sí van en español.

## 1. Qué es

Réplica animada del "Data Core" del hero de
https://www.celonis.com/platform/datacore — originalmente el vídeo
`Data Core _ Celonis_files/media_1d4cef74d99f6c45beccfa206d959b14c6b09d142.mp4`
(1280×720 @50fps, 17 s) con still de referencia
`Celonis_DataCore_Still.png` (3840×2160). Sustituye al `<video>` por un
`<canvas id="datacore-canvas">` dentro de
`<div class="auto-player-wrapper" id="datacore-stage">` (aspect-ratio 16/9).

Dos variantes:
- A (Canvas 2D + anime.js): `../index.html` + `datacore.js` — falso 3D.
- B (3D real, la principal): `../index3d.html` + `datacore-3d.js` — la que
  describe este documento.

## 2. La escena (agnóstico de tecnología)

Vista isométrica 2:1 de una pila de TRES PISOS de cristal ahumado casi negro
sobre fondo negro, cada piso con su etiqueta pill. De abajo arriba:
DATA INTEGRATION, DATA TRANSFORMATION, PROCESS QUERY ENGINE.

- Cámara ortográfica isométrica: azimut 45°, elevación 31.3°.
- Escala: A = min(anchoPx·0.17, altoPx/5.4) · 1.10. En la variante 3D,
  píxeles-por-unidad-de-mundo = √2·A. La separación vertical entre pisos se
  multiplica por SEPK = 1/(cos 31.3°·√2) para igualar el alzado de la
  variante 2D.
- Parallax con el ratón: rota la raíz hasta ±0.22 rad en Y y ±0.05 en X,
  suavizado lerp 0.055/frame.
- Cursor: crosshair personalizado (4 brazos con hueco central, trazo negro
  3px con borde blanco 1.5px, 28px, SVG data-URI); solo con puntero fino.

### Los suelos (líneas)

Cada piso tiene una LÍNEA-marco con forma de diamante redondeado (extent
1.04, esquinas r 0.10) que funciona como su SUELO transparente. La línea es
SOLIDARIA a su piso: piezas y línea se mueven siempre juntas, nada se
adelanta ni atrasa (la línea es hija del grupo del piso, sin offsets
propios). En la implementación es una cinta de malla de ~2px (una Line de
1px no puede engordar en WebGL).

### El ciclo (timeline, loop de 11.5 s, ease inOutQuart)

Estado `spread` 0=compacto / 1=explosionado y `label` 0/1:
- 600→3000 ms: spread 0→1 (explosión).
- 1900→2600 ms: label 0→1 (aparecen las TRES etiquetas).
- hold explosionado hasta 7600 ms.
- 7600→8100 ms: label→0 (TODOS los textos desaparecen ANTES de juntarse).
- 7900→10100 ms: spread→0 (colapso); hold compacto hasta 11500.
- Aparte: `wave` 0→1 en 9 s, loop lineal (motor del morph de la capa media).
- Separación entre pisos: sep = (0.004 + (1.28 − 0.004)·spread)·SEPK.
  En compacto 0.004 ≈ <1px: los tres pisos coinciden y las tres líneas SE VEN
  COMO UNA SOLA (el epsilon evita el z-fighting del coplanar exacto).
- Bob: flotación senoidal con FASE COMÚN entre pisos, amplitud
  (0.009+0.003·li)·spread, solo explosionado.
- Pop-in inicial (una vez, no en el loop): aparición por tile según distancia
  Manhattan al centro, ventana 0.5 s, escala 0.75→1 + alpha.
- `prefers-reduced-motion`: estado explosionado estático, sin animaciones.

### Fusión concéntrica (estado compacto)

Al colapsar, los tres pisos se reparten EN PLANTA sin pisarse:
- Piso superior: se encoge al CENTRO (topScale = 1 − 0.52·inv, con
  inv = 1 − spread).
- Piso medio: se encoge un poco (midScale = 1 − 0.22·inv) y VACÍA su núcleo
  (midHole = 0.68·inv): queda en anillo alrededor del top.
- Piso inferior: sus placas hacen MORPH a un anillo-diamante exterior (§3).

## 3. Piso inferior — DATA INTEGRATION (placas con morph)

FUENTE DE VERDAD: el SVG dibujado por Igor
`../Data Core _ Celonis_files/piso_inferior_forma_poligonos.svg` (en el
repo). Contiene DOS diagramas: izquierda = estado EXPLOSIONADO (4 escudos),
derecha = estado COMPACTO (anillo-diamante con muescas en V). NO hay caja
central: el hueco rectangular entre los escudos queda vacío, enmarcado por
sus filos.

Normalización del SVG a coords de pantalla (a,b) ∈ [−1,1] sobre el diamante:
a = (x − cx)/298.34, b = (y − 153)/149.17, con cx = 305.74 (diagrama izq) y
cx = 1012.74 (dcha). Después, el conjunto de cada estado se CENTRA restando
el centro de su bounding box (el dibujo va ~0.034 al norte). Conversión al
plano del mundo: u = 1.04·(a+b), v = 1.04·(b−a)  [equivale a (a,b)·1.471 y
rotar 45° con 1/√2].

Coordenadas (a,b) YA normalizadas, ANTES del centrado, orden S, N, O, E:

EXPLOSIONADO:
- S: [0.222,0.201] [−0.22,0.201] [−0.385,0.355] [−0.385,0.459] [−0.059,0.778] [0.056,0.778] [0.375,0.459] [0.375,0.355]
- N: [0.222,−0.268] [−0.22,−0.268] [−0.385,−0.422] [−0.385,−0.526] [−0.059,−0.845] [0.056,−0.845] [0.375,−0.526] [0.375,−0.422]
- O: [−0.22,−0.245] [−0.22,0.184] [−0.385,0.339] [−0.5,0.339] [−0.824,0.017] [−0.824,−0.08] [−0.5,−0.409] [−0.395,−0.409]
- E: [0.225,−0.245] [0.225,0.184] [0.39,0.339] [0.505,0.339] [0.829,0.017] [0.829,−0.08] [0.505,−0.409] [0.4,−0.409]

COMPACTO:
- S: [0.394,0.371] [0.395,0.484] [0.065,0.814] [−0.056,0.815] [−0.393,0.484] [−0.393,0.372] [−0.325,0.308] [0.002,0.637] [0.331,0.307]
- N: [0.058,−0.882] [0.395,−0.551] [0.395,−0.439] [0.329,−0.377] [0.002,−0.704] [−0.328,−0.373] [−0.393,−0.439] [−0.393,−0.551] [−0.063,−0.882]
- O: [−0.412,−0.432] [−0.338,−0.363] [−0.666,−0.034] [−0.336,0.297] [−0.401,0.359] [−0.523,0.359] [−0.862,0.02] [−0.862,−0.086] [−0.524,−0.432]
- E: [0.518,−0.432] [0.857,−0.086] [0.857,0.02] [0.518,0.358] [0.397,0.359] [0.336,0.302] [0.671,−0.034] [0.338,−0.367] [0.407,−0.432]

MORPH ligado a spread (spread 1 = explosionado, 0 = compacto). Receta
reproducible en cualquier tecnología:
1. Redondear cada polígono con radio 0.035 (en unidades u,v).
2. Remuestrear ambos contornos a 96 puntos EQUIESPACIADOS por longitud de arco.
3. Unificar el winding (área con signo positiva en ambos).
4. Alinear el bucle compacto contra el explosionado probando los 96 desfases
   cíclicos y quedándose con el de mínima suma de distancias².
5. Interpolar linealmente vértice a vértice. La implementación actual
   precalcula 13 pasos y elige por índice round(inv·12); un morph continuo
   también vale.
Alto de las placas: 0.05 unidades (HEX_H), con bisel 0.018.

## 4. Piso medio — DATA TRANSFORMATION (morph cuadrado↔círculo)

Retícula 10×10, extent 0.8 (en u,v), gap 18%, alto de tile 0.04 (TILE_H).
Cada tile morphea entre cuadrado redondeado y círculo (13 geometrías
precalculadas compartidas). Una FRONTERA DIAGONAL barre el grid: círculos a
un lado, cuadrados al otro, oscilando sola:
p = clamp01(0.5 + (front − aScr + (seed−0.5)·0.18)·2.6 + hoverP), con
aScr = (u−v)/1.6 (eje horizontal de pantalla) y
front = sin(wave·2π)·0.85. En compacto los tiles con
ring < midHole desaparecen (el núcleo se vacía en anillo).

## 5. Piso superior — PROCESS QUERY ENGINE (formas y volteos)

Retícula 6×6, extent 0.8, gap 16%. Forma por tile con RNG determinista
(mulberry32, semilla 20260831): 42% cuadrado redondeado (r 0.22), 18% "hoja /"
(radios de esquina [1,0.12,1,0.12]), 18% "hoja \\", 22% círculo.

- CRECIMIENTO 4×4→6×6: radio visible reach = 0.62 + 0.52·spread contra
  d = (|u|+|v|)/1.6 + jitter por tile; pop de escala 0.55→1 al cruzar el
  umbral. En compacto solo queda el 4×4 interior.
- VOLTEOS: cada ~520 ms (ambiente cada 900 ms), si spread>0.75, un tile
  aleatorio (máx 2 a la vez) gira 180° sobre eje X o Z con lift senoidal
  0.16, 1050 ms inOutSine; a media vuelta cambia a OTRA forma del pool.
  SIN SALTOS: girar 180° espeja la forma (leafA↔leafB), así que en el cruce
  de canto respecto a la cámara (cruce por cero de dot(normal girada, vista))
  se monta el ESPEJO del destino y al aterrizar rotación→0 + forma destino
  (silueta píxel-idéntica). La pieza se encoge ×(1−0.22·sin(pπ)) durante el
  giro. Las geometrías van centradas en Y para poder voltear sobre su eje.

## 6. Etiquetas

Pills con el texto en INGLÉS: fondo casi negro rgba(2,2,2,.92), borde blanco
2.5px, Poppins 500, letter-spacing 14%, texto blanco. Una por piso, centrada
(x=z=0), a altura piso + 0.06. Altura de la pill: 0.1275 unidades de mundo
(+50% sobre la original 0.085); el ancho sigue el aspect del texto.
- Las TRES siguen `state.label`: aparecen explosionado, DESAPARECEN antes de
  que los pisos se junten. Ninguna es permanente.
- Se dibujan en OVERLAY: nítidas encima de todo, fuera del pipeline de
  efectos (en three: sprites en layer 1, render extra tras el composer con
  autoClear=false + clearDepth).

## 7. Interacción (hover, raycast con throttle 60 ms y cooldowns)

- Piso superior: hover = volteo del tile (mismo mecanismo de §5).
- Piso medio: hover = pulso cuadrado→círculo (hoverP 0→1→0, 320/900 ms).
- Piso inferior: hover = elevación suave de la placa (+0.11 en Y, 360/750 ms).

## 8. El material (cristal) — qué debe verse

Cristal PULIDO ahumado casi negro con FILOS DE LUZ blancos (el rasgo clave
del vídeo): cada pieza lleva sus aristas (>20°) dibujadas en blanco
translúcido (opacidad 0.16–0.48 por seed, multiplicador rim). Tapas
superiores limpias y transparentes; biseles y laterales lechosos (fresnel).
Se ve A TRAVÉS de las piezas: las piezas de detrás, refractadas y con blur
(frost). Gradiente de luminosidad izquierda→derecha (la mitad derecha más
clara, como el still): g = 0.5 + centroide_a·0.31 por pieza/tile. Bloom
sutil solo para el glare de los filos. Fondo negro opaco.

Defaults calibrados por Igor (window.DATACORE, editable en vivo):
tint {1.8,1.8,1.8}; transmission 0.43 (+0.14 al explotar); refract 0.13;
frost 0.61; frostRadius 0.98; pieceMag 0.71; pieceShift 0.11; fresnel 0.44;
topClear 0.92; topDarken 0.43; edgeWhite 0.44; skyTop #eef4ff;
skyHorizon #8e9aad; iri 0.08; body 0.87; rim 1.16; pre 0.79;
backdrop #e6ecf5; bloom {strength 0.16, radius 0.26, threshold 0.35};
quality {fxaa 0, msaa 4, dprMax 2, preRes 1}; blur 0. CERRADO por Igor
(2026-09-01, v24): el pixelado quedó arreglado con MSAA 4 + pre-pase a
resolución completa, SIN FXAA y SIN blur. El mando blur (difumina la escena
final sin tocar las etiquetas — dos iteraciones H/V de gaussiano 9-tap al
final del composer, el overlay de etiquetas va después) queda a 0 como
herramienta de pruebas.

ANTIALIASING (v23) — dos tipos, combinables desde el tuner:
- MSAA real por MUESTRAS (quality.msaa: 0/2/4/8, default 4): en WebGL2 los
  render targets del composer aceptan .samples; setMsaa() las fija en
  renderTarget1/2 y hace dispose para que el siguiente render reasigne los
  FBO. Es el AA "de 3D": cantos nítidos sin emborronar. (El antialias:true
  del renderer solo aplica al canvas directo, el composer lo anula — por eso
  hizo falta esto.)
- FXAA (quality.fxaa 0/1, default 0): pasada de post-proceso, más blanda;
  queda como opción de comparación.

### Implementación actual del cristal (three.js r147) — resumen

- NO es MeshPhysicalMaterial (la transmisión física con fondo negro no tiene
  nada que refractar): es un ShaderMaterial propio con refracción en espacio
  de pantalla sobre un PRE-PASE de la escena.
- Pre-pase por frame a un RT (0.6×dpr): fondo de estudio procedural + piezas
  con su gemelo simple oscuro + filos → lo que se ve A TRAVÉS del cristal.
  Sin esto el cristal sale gris y sordo.
- Frost: blur gaussiano separable del pre-pase a cuarto de resolución
  (9 taps, 2 pasadas); el shader mezcla nítido/difuminado con uFrost.
- LENTE POR PIEZA: cada pieza es su propia lente — uniforms por mesh uCenter
  (centro proyectado a uv de pantalla, actualizado POR FRAME) y uOffset por
  seed; buv = uCenter + rel·uMag + N.xy·uRefract + uOffset·uShift.
- Zonas por normal-mundo: topness = smoothstep(0.55,0.95,up). Tapa =
  transparencia real; blanco lechoso SOLO en bisel/laterales; fresnel de 3
  paradas hacia skyTop/skyHorizon atenuado en la tapa; iridiscencia como
  paleta coseno con fase por normal.
- Postprocesado: RenderPass + UnrealBloomPass + GammaCorrection (el composer
  trabaja en LINEAL: sin la pasada gamma todo sale plano y oscuro); salida
  del shader en pow(col, 2.2). Al final, pasada FXAA (v20): los render
  targets del composer NO tienen MSAA — el antialias:true del renderer solo
  aplica al canvas directo — así que sin FXAA los cantos salen pixelados.
  FXAA va DESPUÉS de la gamma (espera entrada sRGB) y su uniform resolution
  se actualiza en resize con 1/(W·dpr). devicePixelRatio con tope 2.
- Entorno para los reflejos de biseles del plateMat: equirect procedural con
  bandas horizontales tipo softbox; la banda y=168 es la que reflejan las
  tapas.

## 9. Glass tuner (solo variante B)

`datacore-tuner.js`: panel de ajuste EN INGLÉS, fixed abajo-derecha
(right/bottom 18px), EMPIEZA PLEGADO como pill "● GLASS TUNER" y se
DESPLIEGA HACIA ARRIBA (flex column-reverse: cabecera abajo, cuerpo
encima, max-height 70vh). Sliders y color pickers enganchados a
window.DATACORE (aplicado cada frame), botones Copy settings (exporta el
JSON) y Reset. Flujo de trabajo de Igor: ajusta en vivo, exporta el JSON y
se pega como nuevos defaults en datacore-3d.js. Sección Sharpness (v21):
FXAA 0/1 (habilita/deshabilita la pasada), max pixel ratio (tope de dpr,
0.5–3) y pre-pass res (resolución del RT del pre-pase, 0.2–1) — cambios de
dpr/preRes disparan resize() desde applyTune; viven en DATACORE.quality
{fxaa:1, dprMax:2, preRes:0.6}.

## 10. Menú como el site real (nav-fx.js)

`nav-fx.js` (copiado aquí y en `../../celonis-home/anime-globe/`, cargado
por las 6 páginas de ambos experimentos): en desktop (≥1200px), al hacer
scroll hacia abajo el nav se oculta (clase nav-hidden de header.css) dejando
un clon fijo del CTA arriba a la derecha (.cloned-cta); al subir reaparece
(nav-shown). Detección de dirección con guarda de 500 ms — mismo mecanismo
de clases que el header.js del site real.

## 11. Ficheros

En esta carpeta: `datacore.js` (variante A), `datacore-3d.js` (variante B),
`datacore-tuner.js`, `nav-fx.js`, `sprite.js` (spritemap placeholder del
experimento 1: logo real + iconos de sustitución; reescribe los <use> a
símbolos locales), `anime.umd.min.js` (v4.5.0), `three.min.js` (r147 UMD, de
npm — los CDN están bloqueados desde el sandbox de Cowork), `three-post.js`
(concatenado de examples/js de r147: CopyShader, LuminosityHighPassShader,
Pass/MaskPass/ShaderPass, RenderPass, EffectComposer, UnrealBloomPass,
GammaCorrectionShader), y este documento.

Fuera: `../index.html` (A) y `../index3d.html` (B) — páginas guardadas y
limpiadas (sin trackers ni scripts externos, URLs raíz reescritas a
https://www.celonis.com/...); `../original.html` (copia intacta con vídeo);
`../Data Core _ Celonis_files/` (assets, vídeo, still y el SVG de las
placas). SIN switch A↔B (retirado en v19; la navegación es el índice raíz).

## 12. Decisiones CERRADAS — no reabrir

- Tops opacos en la variante A; en la B, transmission SIEMPRE baja
  (base 0.43): con ≥0.5 explosionado los tiles se tragan el fondo y quedan
  planos; con ≥0.4 el compacto se vuelve lechoso.
- roughness ~0.10: el vídeo es cristal PULIDO; 0.30 "frost" agrisa y mata
  los reflejos. El esmerilado se hace con el blur del backdrop (frost), no
  con roughness.
- El backdrop del pre-pase debe ser de TONOS MEDIOS: zonas blancas grandes
  queman la pila.
- Nada de haces de luz volumétricos visibles (probado y retirado por Igor:
  "no afecta a los materiales, queda fatal").
- Pared frontal de prismas 2D por ARISTA con winding (la "cadena entre
  extremos" produce bowties).
- Sin caja central en el piso inferior (retirada en v16).
- Ninguna etiqueta permanente (desde v16).
- La refracción vive del frost, no del desplazamiento (refract bajo, 0.13).

## 13. Rendimiento y publicación

~60 fps en Chromium 1440×900. Sin dependencias de red en runtime salvo
fuentes/imágenes del propio site.

GitHub Pages del repo `igorustarroz-bit/celonisvibecoding` (rama main, raíz):
- A: https://igorustarroz-bit.github.io/celonisvibecoding/datacore/index.html
- B: https://igorustarroz-bit.github.io/celonisvibecoding/datacore/index3d.html
- Original: .../datacore/original.html
El índice raíz lista este experimento como "Experiment 3". Los scripts de
index3d.html van versionados (?v=N — subir en cada publish, Pages cachea los
JS 10 min). El token está en `github-token.txt` (gitignored — NUNCA subirlo).
Nota Cowork: git no puede borrar sus .lock en la carpeta montada — mover los
.lock obsoletos a `_to_delete/` (gitignored) antes de commit/push.

## 14. Historial resumido

v12 figura +10%, contornos-cinta, primeras placas del still, hover ·
v13 octógonos y frontera diagonal automática · v14 placas en flecha y fusión
concéntrica · v15 formas EXACTAS del SVG de Igor + morph escudos↔anillo ·
v16 sin caja central, placas centradas, línea=suelo solidario, etiquetas no
permanentes · v17 pisos coincidentes en compacto (las 3 líneas = una,
sepMin 0.004) · v18 etiquetas +50% · v19 sin switch A↔B, glass tuner
abajo-dcha plegado hacia arriba y en inglés · nav-fx.js menú como el site ·
v20 antialiasing: FXAA al final del composer + dpr hasta 2 (FXAAShader r147
añadido a three-post.js) · v21 sección Sharpness en el tuner
(DATACORE.quality: fxaa/dprMax/preRes en vivo) · v22 defaults de Igor
(fxaa 0, preRes 1) + mando blur de escena que respeta las etiquetas ·
v23 MSAA real por muestras (0/2/4/8, default 4) vía samples en los RT del
composer · v24 settings FINALES de Igor: msaa 4, fxaa 0, preRes 1, blur 0 —
pixelado resuelto.
