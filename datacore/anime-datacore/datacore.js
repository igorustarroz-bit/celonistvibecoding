/* =========================================================================
   Experimento 3 — Celonis Data Core hero sin vídeo
   Canvas 2D + anime.js v4. Recrea el "Data Core": tres capas de cristal
   isométricas (Data Integration / Data Transformation / Process Query
   Engine) que se separan y colapsan en bucle, con parallax de ratón.
   ========================================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('datacore-canvas');
  if (!canvas) return;
  var stage = document.getElementById('datacore-stage') || canvas.parentElement;
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- deterministic pseudo-random (layout estable) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- geometry helpers (plane coords u,v in [-1,1]) ---------- */
  // rounded rect sampled as polygon; radii = [tl,tr,br,bl] in absolute units
  function roundedRectPts(cx, cy, hw, hh, radii, seg) {
    seg = seg || 5;
    var pts = [];
    var corners = [
      { x: cx + hw, y: cy - hh, a0: -Math.PI / 2, r: radii[1] },   // tr
      { x: cx + hw, y: cy + hh, a0: 0,            r: radii[2] },   // br
      { x: cx - hw, y: cy + hh, a0: Math.PI / 2,  r: radii[3] },   // bl
      { x: cx - hw, y: cy - hh, a0: Math.PI,      r: radii[0] }    // tl
    ];
    for (var c = 0; c < 4; c++) {
      var k = corners[c], r = Math.min(k.r, hw, hh);
      var ox = k.x - Math.sign(k.x - cx) * r, oy = k.y - Math.sign(k.y - cy) * r;
      for (var i = 0; i <= seg; i++) {
        var a = k.a0 + (Math.PI / 2) * (i / seg);
        pts.push([ox + r * Math.cos(a), oy + r * Math.sin(a)]);
      }
    }
    return pts;
  }
  function hexPts(cx, cy, R, rot, rr, seg) {
    // hexágono con esquinas suavizadas
    seg = seg || 3; rr = rr || 0;
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a1 = rot + i * Math.PI / 3, a2 = rot + (i + 1) * Math.PI / 3;
      var p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
      var p2 = [cx + R * Math.cos(a2), cy + R * Math.sin(a2)];
      for (var s = 0; s < seg; s++) {
        var t = s / seg;
        // acorta cerca de vértices para simular radio
        var tt = rr > 0 ? (t * (1 - rr * 2) + rr) : t;
        pts.push([p1[0] + (p2[0] - p1[0]) * tt, p1[1] + (p2[1] - p1[1]) * tt]);
      }
    }
    return pts;
  }

  /* ---------- scene definition ---------- */
  var rnd = mulberry32(20260831);

  function makeGridLayer(n, extent, opts) {
    var tiles = [];
    var cell = (extent * 2) / n;
    var half = cell / 2 * (1 - (opts.gap || 0.14));
    for (var iy = 0; iy < n; iy++) {
      for (var ix = 0; ix < n; ix++) {
        var u = -extent + cell * (ix + 0.5);
        var v = -extent + cell * (iy + 0.5);
        var shape = opts.shape(ix, iy, n, rnd);
        tiles.push({
          u: u, v: v, half: half, ix: ix, iy: iy,
          radii: shape.radii, morph: shape.morph || 0,
          seed: rnd(), ap: reduced ? 1 : 0
        });
      }
    }
    return tiles;
  }

  // Capa superior: mezcla de cuadrados redondeados, "hojas" y círculos
  var topTiles = makeGridLayer(6, 0.8, {
    gap: 0.16,
    shape: function (ix, iy, n, rnd) {
      var r = rnd(), h;
      if (r < 0.42) h = [0.22, 0.22, 0.22, 0.22];                 // cuadrado
      else if (r < 0.60) h = [1, 0.12, 1, 0.12];                  // hoja /
      else if (r < 0.78) h = [0.12, 1, 0.12, 1];                  // hoja \
      else h = [1, 1, 1, 1];                                      // círculo
      return { radii: h };
    }
  });

  // Capa media: morph cuadrado→círculo según posición (Data Transformation)
  var midTiles = makeGridLayer(10, 0.8, {
    gap: 0.18,
    shape: function (ix, iy, n) { return { radii: [0, 0, 0, 0], morph: ix / (n - 1) }; }
  });

  // Capa inferior: 4 placas hexagonales + placa central (Data Integration)
  // definidas en base (a,b): a = eje horizontal de pantalla, b = vertical
  var hexes = [
    { a: 0,     b: -0.60, R: 0.40, sx: 1.05, sy: 1.0 },  // norte
    { a: 0,     b: 0.62,  R: 0.40, sx: 1.05, sy: 1.0 },  // sur
    { a: -0.63, b: 0.01,  R: 0.46, sx: 1.15, sy: 1.0 },  // oeste
    { a: 0.63,  b: 0.01,  R: 0.46, sx: 1.15, sy: 1.0 }   // este
  ];
  function hexPlanePts(hx) {
    // hexágono flat-top en (a,b), esquinas ligeramente cortadas
    var pts = [], SQ = Math.SQRT1_2;
    for (var i = 0; i < 6; i++) {
      var a1 = Math.PI / 6 + i * Math.PI / 3, a2 = Math.PI / 6 + (i + 1) * Math.PI / 3;
      for (var s = 0; s < 3; s++) {
        var t = (s / 3) * 0.9 + 0.05;
        var ax = Math.cos(a1) + (Math.cos(a2) - Math.cos(a1)) * t;
        var by = Math.sin(a1) + (Math.sin(a2) - Math.sin(a1)) * t;
        var A2 = hx.a + ax * hx.R * hx.sx, B2 = hx.b + by * hx.R * hx.sy;
        pts.push([(A2 + B2) * SQ, (B2 - A2) * SQ]); // (a,b) -> (u,v)
      }
    }
    return pts;
  }

  var LAYERS = [
    { kind: 'hex',  label: 'DATA INTEGRATION',    zSlot: 0 },
    { kind: 'grid', label: 'DATA TRANSFORMATION', zSlot: 1, tiles: midTiles },
    { kind: 'grid', label: 'PROCESS QUERY ENGINE', zSlot: 2, tiles: topTiles }
  ];

  /* ---------- animated state ---------- */
  var state = {
    spread: reduced ? 1 : 0,   // 0 = colapsado, 1 = explosionado
    label: reduced ? 1 : 0,    // alpha de etiquetas
    wave: 0                    // fase del barrido square→circle
  };
  var mouse = { x: 0, y: 0, cx: 0, cy: 0 }; // target / current

  /* ---------- sizing ---------- */
  var W = 0, H = 0, A = 0, B = 0, CX = 0, CY = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = Math.round(r.width); H = Math.round(r.height || r.width * 9 / 16);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    // v26: en móvil el stage pasa a 5/6 y la figura se dobla (como en 3D)
    A = Math.min(W * (W < 900 ? 0.205 : 0.17), H / 5.4);   // escala isométrica eje X
    CX = W / 2;
  }
  window.addEventListener('resize', resize);

  /* ---------- projection ---------- */
  function project(u, v, z, out) {
    // parallax: rotación del plano + inclinación
    var rot = mouse.cx * 0.22;              // rad
    var cu = u * Math.cos(rot) - v * Math.sin(rot);
    var cv = u * Math.sin(rot) + v * Math.cos(rot);
    out[0] = CX + (cu - cv) * A;
    out[1] = CY + (cu + cv) * B - z;
  }
  var P = [0, 0];

  /* ---------- glass tile renderer ---------- */
  function drawPrism(planePts, z, hPx, style) {
    var n = planePts.length;
    var top = new Array(n), i;
    var minX = 1e9, maxX = -1e9, iL = 0, iR = 0;
    for (i = 0; i < n; i++) {
      project(planePts[i][0], planePts[i][1], z + hPx, P);
      top[i] = [P[0], P[1]];
      if (P[0] < minX) { minX = P[0]; iL = i; }
      if (P[0] > maxX) { maxX = P[0]; iR = i; }
    }
    // pared frontal: quads por arista orientada hacia abajo (sin bowties)
    if (hPx > 0.5) {
      // winding del polígono proyectado
      var area = 0;
      for (i = 0; i < n; i++) {
        var a0 = top[i], b0 = top[(i + 1) % n];
        area += a0[0] * b0[1] - b0[0] * a0[1];
      }
      var sgn = area > 0 ? 1 : -1;
      ctx.beginPath();
      for (i = 0; i < n; i++) {
        var pA = top[i], pB = top[(i + 1) % n];
        var nx = (pB[1] - pA[1]) * sgn, ny = -(pB[0] - pA[0]) * sgn;
        if (ny > 0) { // arista frontal
          ctx.moveTo(pA[0], pA[1]);
          ctx.lineTo(pB[0], pB[1]);
          ctx.lineTo(pB[0], pB[1] + hPx);
          ctx.lineTo(pA[0], pA[1] + hPx);
          ctx.closePath();
        }
      }
      ctx.fillStyle = style.side;
      ctx.fill();
    }
    // cara superior
    ctx.beginPath();
    for (i = 0; i < n; i++) { if (i === 0) ctx.moveTo(top[i][0], top[i][1]); else ctx.lineTo(top[i][0], top[i][1]); }
    ctx.closePath();
    ctx.fillStyle = style.top;
    ctx.fill();
    if (style.rim) { ctx.strokeStyle = style.rim; ctx.lineWidth = style.rimW || 1; ctx.stroke(); }
  }

  /* ---------- layer pieces ---------- */
  function outlineFrame(z, alpha) {
    var pts = roundedRectPts(0, 0, 1.04, 1.04, [0.10, 0.10, 0.10, 0.10], 6);
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      project(pts[i][0], pts[i][1], z, P);
      if (i === 0) ctx.moveTo(P[0], P[1]); else ctx.lineTo(P[0], P[1]);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * alpha) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawLabel(text, z, alpha) {
    if (alpha <= 0.01) return;
    project(0, 0, z, P);
    var fs = Math.max(9, A * 0.052);
    ctx.font = '500 ' + fs + 'px Poppins, Arial, sans-serif';
    try { ctx.letterSpacing = (fs * 0.14) + 'px'; } catch (e) {}
    var tw = ctx.measureText(text).width;
    var padX = fs * 1.1, padY = fs * 0.62;
    var w = tw + padX * 2, h = fs + padY * 2, r = h / 2;
    var x = P[0] - w / 2, y = P[1] - h / 2;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = 'rgba(2,2,2,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, P[0], P[1] + fs * 0.06);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
    ctx.globalAlpha = 1;
  }

  function tileStyle(seed, bright, posGrad) {
    // tops opacos oscuros (como el vídeo) + laterales de cristal claro
    var g = posGrad === undefined ? 0.5 : posGrad;   // 0..1 (izq→dcha pantalla)
    var lt = 14 + 26 * seed + 22 * g + bright * 255; // luminancia top
    var ls = 46 + 34 * seed + 30 * g;                // luminancia lateral
    return {
      top: 'rgb(' + Math.round(lt) + ',' + Math.round(lt + 2) + ',' + Math.round(lt + 5) + ')',
      side: 'rgb(' + Math.round(ls) + ',' + Math.round(ls + 3) + ',' + Math.round(ls + 7) + ')',
      rim: 'rgba(255,255,255,' + (0.28 + 0.30 * seed + 0.15 * g + bright * 2).toFixed(3) + ')',
      rimW: 1
    };
  }

  /* ---------- render ---------- */
  var t0 = performance.now();
  function render(now) {
    var t = (now - t0) / 1000;
    // suaviza parallax
    mouse.cx += (mouse.x - mouse.cx) * 0.055;
    mouse.cy += (mouse.y - mouse.cy) * 0.055;
    B = A * (0.52 + mouse.cy * 0.045);

    var sepMax = A * 1.28, sepMin = A * 0.30;
    var sep = sepMin + (sepMax - sepMin) * state.spread;
    var stackH = 2 * sep;
    CY = H / 2 + stackH * 0 + A * 0.02; // centro; las capas se reparten ±sep

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var i, j;
    for (var li = 0; li < 3; li++) {
      var layer = LAYERS[li];
      var bob = reduced ? 0 : Math.sin(t * 0.6 + li * 1.9) * A * 0.014 * state.spread;
      var z = (li - 1) * sep + bob;

      outlineFrame(z, 0.65 + 0.35 * state.spread);

      if (layer.kind === 'hex') {
        // placas hexagonales gruesas
        var hh = A * 0.06;
        var order = hexes.slice().sort(function (a, b) { return a.b - b.b; });
        for (i = 0; i < order.length; i++) {
          drawPrism(hexPlanePts(order[i]), z, hh, tileStyle(0.30, 0, 0.5 + order[i].a * 0.55));
        }
        // placa central (caja del label)
        var cp = roundedRectPts(0, 0, 0.34, 0.26, [0.05, 0.05, 0.05, 0.05], 4);
        drawPrism(cp, z, A * 0.16, {
          top: 'rgb(9,10,12)', side: 'rgb(60,64,70)',
          rim: 'rgba(255,255,255,0.55)', rimW: 1
        });
        drawLabel(layer.label, z + A * 0.16, 1); // siempre visible como en el vídeo
      } else {
        var tiles = layer.tiles;
        var hBase = A * 0.045;
        // pop-in inicial
        for (i = 0; i < tiles.length; i++) {
          var tl = tiles[i];
          if (!reduced && tl.ap < 1) {
            var d = (Math.abs(tl.u) + Math.abs(tl.v)) / 1.6;
            tl.ap = Math.max(0, Math.min(1, (t - 0.15 - d * 0.9) / 0.5));
          }
        }
        var sorted = tiles.slice().sort(function (a, b) { return (a.u + a.v) - (b.u + b.v); });
        for (i = 0; i < sorted.length; i++) {
          var tile = sorted[i];
          if (tile.ap <= 0) continue;
          var shimmer = reduced ? 0 : Math.max(0, Math.sin(t * 1.1 + tile.seed * 40)) * 0.035;
          var half = tile.half * (0.75 + 0.25 * tile.ap);
          var radii, seg = 4;
          if (layer.zSlot === 1) {
            // morph cuadrado→círculo con barrido animado
            var sweep = reduced ? 0 : 0.18 * Math.sin(state.wave * Math.PI * 2 - tile.morph * 2.2);
            var p = Math.max(0, Math.min(1, (tile.morph - 0.5) * 1.9 + 0.5 + sweep));
            var rr = (0.14 + 0.86 * p) * half;
            radii = [rr, rr, rr, rr];
          } else {
            radii = [tile.radii[0] * half, tile.radii[1] * half, tile.radii[2] * half, tile.radii[3] * half];
            seg = 5;
          }
          var pts2 = roundedRectPts(tile.u, tile.v, half, half, radii, seg);
          var hPx = hBase * (0.8 + 0.4 * tile.seed) * tile.ap;
          ctx.globalAlpha = tile.ap;
          drawPrism(pts2, z, hPx, tileStyle(tile.seed, shimmer, 0.5 + (tile.u - tile.v) * 0.31));
          ctx.globalAlpha = 1;
        }
        drawLabel(layer.label, z + hBase + A * 0.02, state.label);
      }
    }
    requestAnimationFrame(render);
  }

  /* ---------- timeline (anime.js v4) ---------- */
  function startTimeline() {
    if (reduced) return;
    var an = window.anime;
    if (!an || !an.createTimeline) {
      // fallback simple sin anime.js
      state.spread = 1; state.label = 1;
      setInterval(function () { state.wave = (state.wave + 0.004) % 1; }, 16);
      return;
    }
    var tl = an.createTimeline({ loop: true, defaults: { ease: 'inOutQuart' } });
    tl.add(state, { spread: 1, duration: 2400 }, 600)          // explosión
      .add(state, { label: 1, duration: 700, ease: 'outQuad' }, 1900)
      .add(state, { spread: 1, duration: 4600 }, 3000)          // hold (no-op)
      .add(state, { label: 0, duration: 500, ease: 'inQuad' }, 7600)
      .add(state, { spread: 0, duration: 2200 }, 7900)          // colapso
      .add(state, { spread: 0, duration: 1400 }, 10100);        // hold compacto
    an.animate(state, { wave: 1, duration: 9000, loop: true, ease: 'linear' });
  }

  /* ---------- parallax ---------- */
  window.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    var inX = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
    var inY = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
    mouse.x = Math.max(-1, Math.min(1, inX)) * 0.6;
    mouse.y = Math.max(-1, Math.min(1, inY)) * 0.6;
  }, { passive: true });

  /* ---------- cursor personalizado (mismo crosshair que el globo) ---------- */
  var CURSOR = {
    color: '#000000',    // trazo (negro, como quedó aprobado en el experimento 1)
    outline: '#ffffff',  // borde alrededor del trazo ('' = sin borde)
    outlinePx: 1.5,      // grosor del borde a cada lado (CSS px)
    sizePx: 28,          // tamaño del crosshair (CSS px)
    strokePx: 3          // grosor del trazo (CSS px)
  };
  var FINE_POINTER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function crossCursorCss() {
    // crosshair de mira: 4 brazos con hueco central (sin punto) — portado de globe.js
    var sz = CURSOR.sizePx, half = sz / 2, sw = CURSOR.strokePx, col = CURSOR.color;
    var o = CURSOR.outline ? CURSOR.outlinePx : 0;
    var a0 = sz * 0.04 + o;
    var a1 = half - sw / 2 - 3 * o;
    function arms(g) {
      return 'M' + half + ' ' + (a0 - g) + 'V' + (a1 + g) +
        ' M' + half + ' ' + (sz - a0 + g) + 'V' + (sz - a1 - g) +
        ' M' + (a0 - g) + ' ' + half + 'H' + (a1 + g) +
        ' M' + (sz - a0 + g) + ' ' + half + 'H' + (sz - a1 - g);
    }
    var outline = CURSOR.outline
      ? '<path d="' + arms(o) + '" stroke="' + CURSOR.outline + '" stroke-width="' + (sw + 2 * o) + '"/>'
      : '';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + sz + '" height="' + sz + '">' +
      outline + '<path d="' + arms(0) + '" stroke="' + col + '" stroke-width="' + sw + '"/></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + Math.floor(half) + ' ' + Math.floor(half) + ', crosshair';
  }
  if (FINE_POINTER) canvas.style.cursor = crossCursorCss();

  /* ---------- go ---------- */
  resize();
  startTimeline();
  requestAnimationFrame(render);
})();
