/* =========================================================================
   Experimento 3 — variante B: Data Core con polígonos 3D reales
   Three.js r147 (UMD) + anime.js v4.
   v2: materiales calibrados contra el vídeo (cristal ahumado casi negro con
   biseles que capturan bandas de luz), volteos individuales de tiles que
   revelan otra forma, y crecimiento 4×4→6×6 de la capa superior al explotar.
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
  renderer.toneMappingExposure = 1.0;

  var scene = new THREE.Scene();
  var root = new THREE.Group();          // parallax: rotamos este grupo
  scene.add(root);

  // cámara ortográfica isométrica (azimut 45°, elevación ~31° → ratio 2:1 aprox)
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  var EL = 31.3 * Math.PI / 180, AZ = Math.PI / 4, R = 20;
  camera.position.set(R * Math.cos(EL) * Math.cos(AZ), R * Math.sin(EL), R * Math.cos(EL) * Math.sin(AZ));
  camera.lookAt(0, 0, 0);

  /* ---------- entorno: softboxes en banda → reflejos alargados en biseles ---------- */
  function makeEnvTexture() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#191b1f'); grad.addColorStop(0.55, '#0a0b0d'); grad.addColorStop(1, '#020203');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    function stripe(y, h, a, x0, x1) { // banda horizontal difusa (softbox)
      var s = g.createLinearGradient(0, y - h, 0, y + h);
      s.addColorStop(0, 'rgba(255,255,255,0)');
      s.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
      s.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = s; g.fillRect(x0 || 0, y - h, (x1 || 1024) - (x0 || 0), h * 2);
    }
    stripe(78, 34, 0.95);              // softbox principal alto (rim de biseles)
    stripe(78, 34, 0.9, 96, 480);      // refuerzo del lado clave
    stripe(168, 30, 0.55, 520, 1010);  // banda que reflejan las TAPAS (el≈31°, az opuesto a camara)
    function blob(x, y, r, a) {
      var rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,' + a + ')');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    blob(240, 66, 110, 1.0);           // punto caliente en el softbox
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(makeEnvTexture()).texture;

  var key = new THREE.DirectionalLight(0xffffff, 0.35);
  key.position.set(-3, 6, 2);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));

  /* ---------- materiales: cristal ahumado casi negro, bisel brillante ---------- */
  var glassMats = [];   // para modular transmission con el spread
  function glassMat(seed, g) {
    var gg = g === undefined ? 0.5 : g;
    var tint = 0.04 + 0.055 * seed + 0.045 * gg;
    var m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(tint * 0.95, tint * 0.98, tint * 1.05),
      metalness: 0.0,
      roughness: 0.09,            // pulido: el vídeo es cristal ahumado, no esmerilado
      transmission: 0.25,         // se anima con el spread en el render loop
      thickness: 0.22,
      ior: 1.5,
      attenuationColor: new THREE.Color(0x0a0d14),
      attenuationDistance: 0.55,
      clearcoat: 1.0,             // capa pulida encima del frost
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.75,
      specularIntensity: 1.0,
      transparent: true,
      opacity: 1
    });
    glassMats.push(m);
    return m;
  }
  var plateMat = new THREE.MeshPhysicalMaterial({
    color: 0x060708, metalness: 0.1, roughness: 0.38, clearcoat: 0.6,
    clearcoatRoughness: 0.3, envMapIntensity: 0.4
  });

  /* ---------- shapes 2D ---------- */
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
  var TILE_H = 0.04, HEX_H = 0.05, PLATE_H = 0.11, BEV = 0.018;
  // filos de luz: aristas blancas por geometría (el rasgo clave del vídeo)
  var edgeCache = new Map();
  function edgesFor(geo) {
    if (!edgeCache.has(geo)) edgeCache.set(geo, new THREE.EdgesGeometry(geo, 20));
    return edgeCache.get(geo);
  }
  function addRim(mesh, opacity) {
    var line = new THREE.LineSegments(edgesFor(mesh.geometry),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: opacity }));
    mesh.add(line);
    mesh.userData.rim = line;
    return line;
  }
  function swapGeo(mesh, geo) {
    mesh.geometry = geo;
    if (mesh.userData.rim) mesh.userData.rim.geometry = edgesFor(geo);
  }
  function extrude(shape, depth, bevel, center) {
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 3, curveSegments: 10
    });
    geo.rotateX(-Math.PI / 2); // plano XZ, altura en Y
    if (center) {              // centra en Y para poder voltear sobre su eje
      geo.computeBoundingBox();
      var cy = (geo.boundingBox.max.y + geo.boundingBox.min.y) / 2;
      geo.translate(0, -cy, 0);
      geo.userData = { cy: cy };
    }
    return geo;
  }

  /* ---------- etiquetas (sprites con textura canvas) ---------- */
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

  function makeOutline(extent) {
    var pts = [];
    var rr = roundedRectShape(extent, extent, [0.10, 0.10, 0.10, 0.10]).getPoints(48);
    for (var i = 0; i < rr.length; i++) pts.push(new THREE.Vector3(rr[i].x, 0, rr[i].y));
    pts.push(pts[0].clone());
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.45
    }));
  }

  /* ---------- capa superior: 6×6, formas mixtas + pool para volteos ---------- */
  var TOP_N = 6, TOP_EXT = 0.8, TOP_GAP = 0.10;
  var topCell = TOP_EXT * 2 / TOP_N, topHalf = topCell / 2 * (1 - TOP_GAP);
  var SHAPES = {
    sq:    [0.18, 0.18, 0.18, 0.18],
    leafA: [1, 0.10, 1, 0.10],
    leafB: [0.10, 1, 0.10, 1],
    circ:  [1, 1, 1, 1]
  };
  var SHAPE_KEYS = ['sq', 'leafA', 'leafB', 'circ'];
  var topGeos = {};
  SHAPE_KEYS.forEach(function (k) {
    var abs = SHAPES[k].map(function (x) { return x * topHalf; });
    topGeos[k] = extrude(roundedRectShape(topHalf, topHalf, abs), TILE_H, BEV, true);
  });

  function buildTopLayer() {
    var group = new THREE.Group();
    var tiles = [];
    for (var iy = 0; iy < TOP_N; iy++) {
      for (var ix = 0; ix < TOP_N; ix++) {
        var u = -TOP_EXT + topCell * (ix + 0.5), v = -TOP_EXT + topCell * (iy + 0.5);
        var r = rnd(), keyName;
        if (r < 0.42) keyName = 'sq';
        else if (r < 0.60) keyName = 'leafA';
        else if (r < 0.78) keyName = 'leafB';
        else keyName = 'circ';
        var seed = rnd();
        var mesh = new THREE.Mesh(topGeos[keyName], glassMat(seed, 0.5 + (u - v) * 0.31));
        var cy = topGeos[keyName].userData.cy;
        mesh.position.set(u, cy, v);
        addRim(mesh, 0.20 + 0.28 * seed);
        group.add(mesh);
        tiles.push({
          mesh: mesh, u: u, v: v, seed: seed, key: keyName, cy: cy,
          d: (Math.abs(u) + Math.abs(v)) / (2 * TOP_EXT),   // 0..1 anillo
          jit: rnd() * 0.08, flip: null, ap: 1
        });
      }
    }
    var sprite = makeLabelSprite('PROCESS QUERY ENGINE');
    group.add(sprite);
    return { group: group, tiles: tiles, sprite: sprite };
  }
  var topLayer = buildTopLayer();

  /* ---------- capa media: 10×10 con morph cuadrado→círculo ---------- */
  var MORPH_STEPS = 13, morphGeos = [];
  var MID_N = 10, MID_EXT = 0.8, midCell = MID_EXT * 2 / MID_N, midHalf = midCell / 2 * (1 - 0.18);
  (function () {
    for (var s = 0; s < MORPH_STEPS; s++) {
      var rr = (0.14 + 0.86 * (s / (MORPH_STEPS - 1))) * midHalf;
      morphGeos.push(extrude(roundedRectShape(midHalf, midHalf, [rr, rr, rr, rr]), TILE_H, BEV, true));
    }
  })();
  function buildMidLayer() {
    var group = new THREE.Group();
    var tiles = [];
    for (var iy = 0; iy < MID_N; iy++) {
      for (var ix = 0; ix < MID_N; ix++) {
        var u = -MID_EXT + midCell * (ix + 0.5), v = -MID_EXT + midCell * (iy + 0.5);
        var seed = rnd();
        var mesh = new THREE.Mesh(morphGeos[0], glassMat(seed, 0.5 + (u - v) * 0.31));
        mesh.position.set(u, morphGeos[0].userData.cy, v);
        addRim(mesh, 0.16 + 0.26 * seed);
        group.add(mesh);
        tiles.push({ mesh: mesh, u: u, v: v, seed: seed, morph: ix / (MID_N - 1), cy: morphGeos[0].userData.cy });
      }
    }
    var sprite = makeLabelSprite('DATA TRANSFORMATION');
    group.add(sprite);
    return { group: group, tiles: tiles, sprite: sprite };
  }
  var midLayer = buildMidLayer();

  /* ---------- capa inferior: 4 hexágonos + placa central ---------- */
  function buildHexLayer() {
    var group = new THREE.Group();
    var SQ = Math.SQRT1_2;
    var hexes = [
      { a: 0, b: -0.60, R: 0.40, sx: 1.05 }, { a: 0, b: 0.62, R: 0.40, sx: 1.05 },
      { a: -0.63, b: 0.01, R: 0.46, sx: 1.15 }, { a: 0.63, b: 0.01, R: 0.46, sx: 1.15 }
    ];
    hexes.forEach(function (hx) {
      var geo = extrude(hexShape(hx.R, hx.sx, 1), HEX_H, BEV);
      var mesh = new THREE.Mesh(geo, glassMat(0.30, 0.5 + hx.a * 0.55));
      mesh.position.set((hx.a + hx.b) * SQ, 0, (hx.b - hx.a) * SQ);
      addRim(mesh, 0.32);
      group.add(mesh);
    });
    var plate = new THREE.Mesh(
      extrude(roundedRectShape(0.34, 0.26, [0.05, 0.05, 0.05, 0.05]), PLATE_H, BEV), plateMat);
    addRim(plate, 0.4);
    group.add(plate);
    var sprite = makeLabelSprite('DATA INTEGRATION');
    group.add(sprite);
    return { group: group, sprite: sprite };
  }
  var hexLayer = buildHexLayer();

  var layers = [
    { def: hexLayer, labelAlways: true },
    { def: midLayer, isMorph: true },
    { def: topLayer, isTop: true }
  ];
  layers.forEach(function (L) {
    root.add(L.def.group);
    L.outline = makeOutline(1.04);
    L.def.group.add(L.outline);
  });

  /* ---------- estado + timeline (mismos tiempos que la variante A) ---------- */
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

  /* ---------- volteos de tiles (capa superior), como en el vídeo ---------- */
  function spawnFlip() {
    if (reduced || state.spread < 0.75) return;
    var active = 0, pool = [];
    for (var i = 0; i < topLayer.tiles.length; i++) {
      var t = topLayer.tiles[i];
      if (t.flip) active++;
      else if (t.mesh.visible && t.ap > 0.99) pool.push(t);
    }
    if (active >= 2 || !pool.length) return;
    var tile = pool[(Math.random() * pool.length) | 0];
    tile.flip = { p: 0, axis: Math.random() < 0.5 ? 'x' : 'z', dir: Math.random() < 0.5 ? 1 : -1, swapped: false };
    var an = window.anime;
    if (an && an.animate) {
      an.animate(tile.flip, {
        p: 1, duration: 1050, ease: 'inOutSine',
        onComplete: function () {
          tile.mesh.rotation.set(0, 0, 0);
          tile.flip = null;
        }
      });
    } else { tile.flip = null; }
  }
  if (!reduced) setInterval(spawnFlip, 520);

  /* ---------- sizing ---------- */
  var W = 0, H = 0, A = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = Math.round(r.width); H = Math.round(r.height || r.width * 9 / 16);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, true);
    A = Math.min(W * 0.17, H / 5.4);
    var PPW = A * Math.SQRT2;              // px por unidad de mundo
    camera.left = -W / PPW / 2; camera.right = W / PPW / 2;
    camera.top = H / PPW / 2; camera.bottom = -H / PPW / 2;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(dpr);
      composer.setSize(W, H);
    }
  }
  window.addEventListener('resize', resize);

  /* ---------- postprocesado: bloom sutil para el glare de los filos ---------- */
  var composer = null, bloomPass = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
    renderer.setClearColor(0x000000, 1);   // la sección es negra: fondo opaco para el composer
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.55, 0.32);
    composer.addPass(bloomPass);
    // el composer trabaja en lineal: conversión sRGB al final
    if (THREE.ShaderPass && THREE.GammaCorrectionShader) {
      composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    }
  }

  /* ---------- render loop ---------- */
  var t0 = performance.now();
  var SEPK = 1 / (Math.cos(31.3 * Math.PI / 180) * Math.SQRT2);
  function render(now) {
    var t = (now - t0) / 1000;
    mouse.cx += (mouse.x - mouse.cx) * 0.055;
    mouse.cy += (mouse.y - mouse.cy) * 0.055;
    root.rotation.y = -mouse.cx * 0.22;
    root.rotation.x = mouse.cy * 0.05;

    var sep = (0.34 + (1.28 - 0.34) * state.spread) * SEPK;
    // la capa superior crece 4×4→6×6 con el spread (como el vídeo)
    var reach = 0.62 + 0.52 * state.spread;

    for (var li = 0; li < 3; li++) {
      var L = layers[li], def = L.def;
      var bob = reduced ? 0 : Math.sin(t * 0.6 + li * 1.9) * 0.014 * state.spread;
      def.group.position.y = (li - 1) * sep + bob;

      var alpha = L.labelAlways ? 1 : state.label;
      def.sprite.material.opacity = alpha;
      def.sprite.visible = alpha > 0.01;
      var sw = def.sprite.userData.aspect, sh = 0.085;
      def.sprite.scale.set(sh * sw, sh, 1);
      def.sprite.position.set(0, (L.labelAlways ? PLATE_H : TILE_H) + 0.06, 0);

      if (L.isTop) {
        for (var i = 0; i < def.tiles.length; i++) {
          var tile = def.tiles[i];
          // pop de escala al cruzar el radio visible (crecimiento del grid)
          var ap = Math.max(0, Math.min(1, (reach - tile.d - tile.jit) / 0.10));
          tile.ap = ap;
          tile.mesh.visible = ap > 0.01;
          if (!tile.mesh.visible) continue;
          var sc = 0.55 + 0.45 * ap;
          var lift = 0;
          if (tile.flip) {
            var f = tile.flip;
            lift = Math.sin(f.p * Math.PI) * 0.16;
            if (!f.swapped && f.p >= 0.5) {
              // a medio giro, revela otra forma (como el vídeo)
              var others = SHAPE_KEYS.filter(function (k) { return k !== tile.key; });
              tile.key = others[(Math.random() * others.length) | 0];
              swapGeo(tile.mesh, topGeos[tile.key]);
              f.swapped = true;
            }
            tile.mesh.rotation[f.axis === 'x' ? 'x' : 'z'] = f.p * Math.PI * f.dir;
          }
          tile.mesh.scale.set(sc, sc, sc);
          tile.mesh.position.y = tile.cy + lift;
        }
      } else if (L.isMorph) {
        for (var j = 0; j < def.tiles.length; j++) {
          var mt = def.tiles[j];
          var sweep = reduced ? 0 : 0.18 * Math.sin(state.wave * Math.PI * 2 - mt.morph * 2.2);
          var p = Math.max(0, Math.min(1, (mt.morph - 0.5) * 1.9 + 0.5 + sweep));
          var idx = Math.round(p * (MORPH_STEPS - 1));
          if (mt.mesh.geometry !== morphGeos[idx]) swapGeo(mt.mesh, morphGeos[idx]);
        }
      }
      L.outline.material.opacity = 0.30 + 0.25 * state.spread;
    }
    // cristal: compacto = ahumado casi opaco; explosionado = transmisivo (evita el colapsado lechoso)
    var trans = 0.10 + 0.22 * state.spread;
    for (var mi = 0; mi < glassMats.length; mi++) glassMats[mi].transmission = trans;

    if (composer) composer.render(); else renderer.render(scene, camera);
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
