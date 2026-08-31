/* =========================================================================
   Experimento 3 — variante B: Data Core con polígonos 3D reales
   Three.js r147 (UMD) + anime.js v4. Misma escena y timeline que la
   variante A (datacore.js, Canvas 2D), pero con geometría extruida real y
   material de cristal físico (transmission/refracción, biseles, env map).
   ========================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  var THREE = window.THREE;

  var canvas = document.getElementById('datacore-canvas');
  if (!canvas) return;
  var stage = document.getElementById('datacore-stage') || canvas.parentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- RNG determinista (mismo layout que la variante A) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(20260831);

  /* ---------- renderer / escena / cámara ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  var scene = new THREE.Scene();
  var root = new THREE.Group();          // parallax: rotamos este grupo
  scene.add(root);

  // cámara ortográfica isométrica (azimut 45°, elevación ~31° → ratio 2:1 aprox)
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  var EL = 31.3 * Math.PI / 180, AZ = Math.PI / 4, R = 20;
  camera.position.set(R * Math.cos(EL) * Math.cos(AZ), R * Math.sin(EL), R * Math.cos(EL) * Math.sin(AZ));
  camera.lookAt(0, 0, 0);

  /* ---------- entorno: "estudio" procedural para reflejos de cristal ---------- */
  function makeEnvTexture() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#24262b'); grad.addColorStop(0.5, '#17181c'); grad.addColorStop(1, '#050506');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    function blob(x, y, r, a) {
      var rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,' + a + ')');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    blob(140, 46, 110, 1.0);   // luz clave arriba-izquierda
    blob(400, 70, 60, 0.4);   // relleno arriba-derecha
    blob(256, 210, 120, 0.10); // rebote suave inferior
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(makeEnvTexture()).texture;

  var key = new THREE.DirectionalLight(0xffffff, 0.5);
  key.position.set(-3, 6, 2);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));

  /* ---------- materiales ---------- */
  function glassMat(seed, g) {
    // cristal oscuro: top opaco-oscuro en el vídeo ≈ cristal ahumado con bisel brillante
    var tint = 0.07 + 0.08 * seed + 0.07 * (g === undefined ? 0.5 : g);
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(tint * 0.9, tint * 0.95, tint * 1.1),
      metalness: 0.0,
      roughness: 0.16,
      transmission: 0.18,
      thickness: 0.15,
      ior: 1.5,
      attenuationColor: new THREE.Color(0x0a0c10),
      attenuationDistance: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.18,
      envMapIntensity: 0.8,
      transparent: true,
      opacity: 1
    });
  }
  var plateMat = new THREE.MeshPhysicalMaterial({
    color: 0x07080a, metalness: 0.1, roughness: 0.4, clearcoat: 0.5,
    clearcoatRoughness: 0.35, envMapIntensity: 0.35
  });

  /* ---------- shapes 2D (mismas fórmulas que la variante A) ---------- */
  function roundedRectShape(hw, hh, radii) {
    var s = new THREE.Shape();
    var tl = Math.min(radii[0], hw, hh), tr = Math.min(radii[1], hw, hh);
    var br = Math.min(radii[2], hw, hh), bl = Math.min(radii[3], hw, hh);
    s.moveTo(-hw + tl, -hh);
    s.lineTo(hw - tr, -hh);  s.absarc(hw - tr, -hh + tr, tr, -Math.PI / 2, 0, false);
    s.lineTo(hw, hh - br);   s.absarc(hw - br, hh - br, br, 0, Math.PI / 2, false);
    s.lineTo(-hw + bl, hh);  s.absarc(-hw + bl, hh - bl, bl, Math.PI / 2, Math.PI, false);
    s.lineTo(-hw, -hh + tl); s.absarc(-hw + tl, -hh + tl, tl, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  function hexShape(Rr, sx, sy) {
    var s = new THREE.Shape();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      var x = Math.cos(a) * Rr * sx, y = Math.sin(a) * Rr * sy;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }
  function extrude(shape, depth, bevel) {
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 2, curveSegments: 10
    });
    geo.rotateX(-Math.PI / 2); // plano XZ, altura en Y
    return geo;
  }

  /* ---------- capas ---------- */
  var layers = [];   // {group, labelSprite, kind, tiles:[{mesh,u,v,seed,delay,morph}]}
  var TILE_H = 0.035, HEX_H = 0.05, PLATE_H = 0.11, BEV = 0.012;

  function makeOutline(extent, y) {
    var pts = [];
    var rr = roundedRectShape(extent, extent, [0.10, 0.10, 0.10, 0.10]).getPoints(48);
    for (var i = 0; i < rr.length; i++) pts.push(new THREE.Vector3(rr[i].x, 0, rr[i].y));
    pts.push(pts[0].clone());
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.45
    }));
    return line;
  }

  function makeLabelSprite(text) {
    var fs = 34, pad = 22, padY = 15;
    var c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = '500 ' + fs + 'px Poppins, Arial, sans-serif';
    var tw = g.measureText(text).width + text.length * fs * 0.14;
    c.width = Math.ceil(tw + pad * 2 + 8); c.height = fs + padY * 2 + 8;
    g = c.getContext('2d');
    g.font = '500 ' + fs + 'px Poppins, Arial, sans-serif';
    try { g.letterSpacing = (fs * 0.14) + 'px'; } catch (e) {}
    var w = c.width - 8, h = c.height - 8, r = h / 2, x = 4, y = 4;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fillStyle = 'rgba(2,2,2,0.92)'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + fs * 0.06);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: false
    }));
    sp.renderOrder = 10;
    sp.userData.aspect = c.width / c.height;
    return sp;
  }

  // --- capa superior (6×6, formas mixtas) ---
  function buildGridLayer(n, extent, gap, label, pick) {
    var group = new THREE.Group();
    var cell = extent * 2 / n, half = cell / 2 * (1 - gap);
    var tiles = [];
    var geoCache = {};
    for (var iy = 0; iy < n; iy++) {
      for (var ix = 0; ix < n; ix++) {
        var u = -extent + cell * (ix + 0.5), v = -extent + cell * (iy + 0.5);
        var info = pick(ix, iy, n, half);
        var kkey = info.key;
        if (!geoCache[kkey]) geoCache[kkey] = extrude(info.shape, TILE_H, BEV);
        var seed = rnd();
        var mesh = new THREE.Mesh(geoCache[kkey], glassMat(seed, 0.5 + (u - v) * 0.31));
        mesh.position.set(u, 0, v);
        group.add(mesh);
        tiles.push({ mesh: mesh, u: u, v: v, seed: seed, morph: info.morph,
                     delay: (Math.abs(u) + Math.abs(v)) / 1.6 });
      }
    }
    var sprite = makeLabelSprite(label);
    group.add(sprite);
    return { group: group, tiles: tiles, sprite: sprite, extent: extent };
  }

  // formas de la capa superior — misma distribución/semilla que la variante A
  var topLayer = buildGridLayer(6, 0.8, 0.16, 'PROCESS QUERY ENGINE', function (ix, iy, n, half) {
    var r = rnd(), radii, key;
    if (r < 0.42) { radii = [0.22, 0.22, 0.22, 0.22]; key = 'sq'; }
    else if (r < 0.60) { radii = [1, 0.12, 1, 0.12]; key = 'leafA'; }
    else if (r < 0.78) { radii = [0.12, 1, 0.12, 1]; key = 'leafB'; }
    else { radii = [1, 1, 1, 1]; key = 'circ'; }
    var abs = radii.map(function (x) { return x * half; });
    return { key: key, shape: roundedRectShape(half, half, abs) };
  });

  // capa media (10×10) con morph cuadrado→círculo: 13 geometrías precalculadas
  var MORPH_STEPS = 13, morphGeos = [];
  (function () {
    var n = 10, extent = 0.8, cell = extent * 2 / n, half = cell / 2 * (1 - 0.18);
    for (var s = 0; s < MORPH_STEPS; s++) {
      var rr = (0.14 + 0.86 * (s / (MORPH_STEPS - 1))) * half;
      morphGeos.push(extrude(roundedRectShape(half, half, [rr, rr, rr, rr]), TILE_H, BEV));
    }
  })();
  var midLayer = buildGridLayer(10, 0.8, 0.18, 'DATA TRANSFORMATION', function (ix, iy, n, half) {
    return { key: 'm0', shape: roundedRectShape(half, half, [half * 0.14, half * 0.14, half * 0.14, half * 0.14]),
             morph: ix / (n - 1) };
  });

  // capa inferior: 4 hexágonos + placa central
  function buildHexLayer() {
    var group = new THREE.Group();
    var SQ = Math.SQRT1_2;
    var hexes = [
      { a: 0, b: -0.60, R: 0.40, sx: 1.05 }, { a: 0, b: 0.62, R: 0.40, sx: 1.05 },
      { a: -0.63, b: 0.01, R: 0.46, sx: 1.15 }, { a: 0.63, b: 0.01, R: 0.46, sx: 1.15 }
    ];
    var tiles = [];
    hexes.forEach(function (hx) {
      var geo = extrude(hexShape(hx.R, hx.sx, 1), HEX_H, BEV);
      var mesh = new THREE.Mesh(geo, glassMat(0.30, 0.5 + hx.a * 0.55));
      // (a,b) pantalla → (u,v) plano (rotación 45°)
      mesh.position.set((hx.a + hx.b) * SQ, 0, (hx.b - hx.a) * SQ);
      group.add(mesh);
      tiles.push({ mesh: mesh, u: mesh.position.x, v: mesh.position.z, seed: 0.3, delay: 0 });
    });
    var plate = new THREE.Mesh(
      extrude(roundedRectShape(0.34, 0.26, [0.05, 0.05, 0.05, 0.05]), PLATE_H, BEV), plateMat);
    group.add(plate);
    var sprite = makeLabelSprite('DATA INTEGRATION');
    group.add(sprite);
    return { group: group, tiles: tiles, sprite: sprite, plateH: PLATE_H };
  }
  var hexLayer = buildHexLayer();

  layers = [
    { def: hexLayer, zSlot: 0, labelAlways: true },
    { def: midLayer, zSlot: 1, isMorph: true },
    { def: topLayer, zSlot: 2 }
  ];
  layers.forEach(function (L) {
    root.add(L.def.group);
    L.outline = makeOutline(1.04, 0);
    L.def.group.add(L.outline);
  });

  /* ---------- estado animado + timeline (idéntico a la variante A) ---------- */
  var state = { spread: reduced ? 1 : 0, label: reduced ? 1 : 0, wave: 0 };
  var mouse = { x: 0, y: 0, cx: 0, cy: 0 };

  function startTimeline() {
    if (reduced) return;
    var an = window.anime;
    if (!an || !an.createTimeline) { state.spread = 1; state.label = 1; return; }
    var tl = an.createTimeline({ loop: true, defaults: { ease: 'inOutQuart' } });
    tl.add(state, { spread: 1, duration: 2400 }, 600)
      .add(state, { label: 1, duration: 700, ease: 'outQuad' }, 1900)
      .add(state, { spread: 1, duration: 4600 }, 3000)
      .add(state, { label: 0, duration: 500, ease: 'inQuad' }, 7600)
      .add(state, { spread: 0, duration: 2200 }, 7900)
      .add(state, { spread: 0, duration: 1400 }, 10100);
    an.animate(state, { wave: 1, duration: 9000, loop: true, ease: 'linear' });
  }

  /* ---------- sizing ---------- */
  var W = 0, H = 0, A = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = Math.round(r.width); H = Math.round(r.height || r.width * 9 / 16);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, true);
    A = Math.min(W * 0.17, H / 5.4);       // misma regla que la variante A
    var PPW = A * Math.SQRT2;              // px por unidad de mundo
    camera.left = -W / PPW / 2; camera.right = W / PPW / 2;
    camera.top = H / PPW / 2; camera.bottom = -H / PPW / 2;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  /* ---------- render loop ---------- */
  var t0 = performance.now();
  function render(now) {
    var t = (now - t0) / 1000;
    mouse.cx += (mouse.x - mouse.cx) * 0.055;
    mouse.cy += (mouse.y - mouse.cy) * 0.055;
    root.rotation.y = -mouse.cx * 0.22;
    root.rotation.x = mouse.cy * 0.05;

    var SEPK = 1 / (Math.cos(31.3 * Math.PI / 180) * Math.SQRT2);
    var sep = (0.30 + (1.28 - 0.30) * state.spread) * SEPK;
    for (var li = 0; li < 3; li++) {
      var L = layers[li], def = L.def;
      var bob = reduced ? 0 : Math.sin(t * 0.6 + li * 1.9) * 0.014 * state.spread;
      def.group.position.y = (li - 1) * sep + bob;

      // etiquetas
      var alpha = L.labelAlways ? 1 : state.label;
      def.sprite.material.opacity = alpha;
      def.sprite.visible = alpha > 0.01;
      var sw = def.sprite.userData.aspect;
      var sh = 0.085;
      def.sprite.scale.set(sh * sw, sh, 1);
      def.sprite.position.set(0, (L.labelAlways ? PLATE_H : TILE_H) + 0.06, 0);

      // tiles
      for (var i = 0; i < def.tiles.length; i++) {
        var tile = def.tiles[i];
        var ap = 1;
        if (!reduced && !L.labelAlways) {
          ap = Math.max(0, Math.min(1, (t - 0.15 - tile.delay * 0.9) / 0.5));
        }
        var sc = 0.75 + 0.25 * ap;
        tile.mesh.scale.set(sc, ap > 0 ? sc : 0.0001, sc);
        tile.mesh.visible = ap > 0;
        if (L.isMorph && tile.morph !== undefined) {
          var sweep = reduced ? 0 : 0.18 * Math.sin(state.wave * Math.PI * 2 - tile.morph * 2.2);
          var p = Math.max(0, Math.min(1, (tile.morph - 0.5) * 1.9 + 0.5 + sweep));
          var idx = Math.round(p * (MORPH_STEPS - 1));
          if (tile.mesh.geometry !== morphGeos[idx]) tile.mesh.geometry = morphGeos[idx];
        }
      }
      L.outline.material.opacity = 0.30 + 0.25 * state.spread;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  /* ---------- parallax ---------- */
  window.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    mouse.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))) * 0.6;
    mouse.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))) * 0.6;
  }, { passive: true });

  /* ---------- cursor personalizado (mismo crosshair que el globo) ---------- */
  var CURSOR = { color: '#000000', outline: '#ffffff', outlinePx: 1.5, sizePx: 28, strokePx: 3 };
  var FINE_POINTER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function crossCursorCss() {
    var sz = CURSOR.sizePx, half = sz / 2, sw = CURSOR.strokePx, col = CURSOR.color;
    var o = CURSOR.outline ? CURSOR.outlinePx : 0;
    var a0 = sz * 0.04 + o, a1 = half - sw / 2 - 3 * o;
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

  window.__datacore3d = { state: state, renderer: renderer };

  /* ---------- go ---------- */
  resize();
  startTimeline();
  requestAnimationFrame(render);
})();
