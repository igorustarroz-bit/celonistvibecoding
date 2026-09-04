/* =========================================================================
   Experiment 4 — 3D book for the eBook detail hero
   Three.js r147 (UMD) + the post stack shared with experiment 3
   (../lib/three-post.js: EffectComposer, UnrealBloomPass, GammaCorrection).

   Replaces the flat product shot (a rendered PNG of the eBook) with a real
   3D book built with the Data Core technology: isometric orthographic camera
   (azimuth 45°, elevation 31.3°), near-black material lit by the same banded
   softbox environment, translucent white light edges, a floor frame line,
   MSAA 4 through the composer, subtle bloom, mouse parallax and the
   crosshair cursor. The cover opens and closes on a loop, the first leaves
   follow it with a lag, and a pill label appears while it is open.

   Live knobs: window.BOOK (edit in the DevTools console, applied every frame).
   ========================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  var THREE = window.THREE;

  var canvas = document.getElementById('book-canvas');
  if (!canvas) return;
  var stage = document.getElementById('book-stage') || canvas.parentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- LIVE KNOBS: window.BOOK ---------- */
  var TUNE = window.BOOK = {
    openAngle: 48,          // degrees the cover lifts when open
    hoverLift: 9,           // extra degrees while the pointer is over the book
    leaves: 6,              // loose leaves that follow the cover
    leafFollow: 0.74,       // top leaf angle as a fraction of the cover angle
    leafStep: 0.105,        // each leaf below opens this much less
    leafLag: 95,            // ms of lag per leaf
    loop: 11500,            // ms, whole cycle (same timing as the Data Core)
    bob: 0.012,             // floating amplitude while open (world units)
    edgeOpacity: 0.34,      // white light edges
    floorOpacity: 0.30,     // floor frame line
    floorMargin: 0.16,      // distance from the book to the frame line
    coverColor: '#0d0d0f',
    pageColor: '#d9d9d9',
    accent: '#0f5bff',      // the blue disc on the cover
    clearcoat: 0.45,
    roughness: 0.52,
    envIntensity: 0.65,
    keyLight: 0.55,
    ambient: 0.10,
    bloom: { strength: 0.16, radius: 0.26, threshold: 0.72 },
    fit: 0.96,              // 1 = the book fills the stage
    label: true,            // pill label while open
    labelText: 'EBOOK  ·  ENGLISH',
    quality: { msaa: 4, dprMax: 2 }
  };

  /* ---------- renderer / scene / camera (same setup as datacore-3d.js) ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x000000, 1);          // the media box is black, like the product shot
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  var scene = new THREE.Scene();
  var root = new THREE.Group();                 // parallax rotates this group
  scene.add(root);

  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  var EL = 31.3 * Math.PI / 180, AZ = Math.PI / 4, R = 20;
  camera.position.set(R * Math.cos(EL) * Math.cos(AZ), R * Math.sin(EL), R * Math.cos(EL) * Math.sin(AZ));
  camera.lookAt(0, 0, 0);

  /* ---------- environment: banded softboxes (same as the Data Core) ---------- */
  function makeEnvTexture() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#191b1f'); grad.addColorStop(0.55, '#0a0b0d'); grad.addColorStop(1, '#020203');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    function stripe(y, h, a, x0, x1) {
      var s = g.createLinearGradient(0, y - h, 0, y + h);
      s.addColorStop(0, 'rgba(255,255,255,0)');
      s.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
      s.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = s; g.fillRect(x0 || 0, y - h, (x1 || 1024) - (x0 || 0), h * 2);
    }
    stripe(78, 34, 0.95);
    stripe(78, 34, 0.9, 96, 480);
    stripe(168, 30, 0.55, 520, 1010);           // the band the flat cover reflects
    function blob(x, y, r, a) {
      var rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,' + a + ')');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    blob(240, 66, 110, 1.0);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(makeEnvTexture()).texture;

  var key = new THREE.DirectionalLight(0xffffff, TUNE.keyLight);
  key.position.set(-3, 6, 2);
  scene.add(key);
  var ambient = new THREE.AmbientLight(0xffffff, TUNE.ambient);
  scene.add(ambient);

  /* ---------- the cover artwork (canvas texture, redrawn once fonts are ready) ---------- */
  // Portrait 1 : 1.38 like the printed guide. Near-black paper, a chain of
  // overlapping rings (the "supply chain"), one blue disc, title and subtitle.
  var COVER_W = 1024, COVER_H = 1414;
  var coverCanvas = document.createElement('canvas');
  coverCanvas.width = COVER_W; coverCanvas.height = COVER_H;
  var coverTex = new THREE.CanvasTexture(coverCanvas);
  coverTex.encoding = THREE.sRGBEncoding;
  coverTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  function drawCover() {
    var g = coverCanvas.getContext('2d');
    g.clearRect(0, 0, COVER_W, COVER_H);
    g.fillStyle = TUNE.coverColor; g.fillRect(0, 0, COVER_W, COVER_H);
    // faint paper grain
    var grain = g.createLinearGradient(0, 0, COVER_W, COVER_H);
    grain.addColorStop(0, 'rgba(255,255,255,0.045)'); grain.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grain; g.fillRect(0, 0, COVER_W, COVER_H);

    // rings: overlapping outlines, like the chain of links on the printed cover
    var r = 118, stroke = 3.2;
    var rings = [
      [240, 200], [430, 228], [612, 200], [800, 232],
      [332, 392], [520, 392], [706, 396], [890, 372],
      [430, 570], [612, 572], [800, 560]
    ];
    var ox = 30, oy = 60;
    g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = stroke;
    rings.forEach(function (p) { g.beginPath(); g.arc(p[0] + ox, p[1] + oy, r, 0, Math.PI * 2); g.stroke(); });
    // the blue disc (left ring of the middle row)
    g.beginPath(); g.arc(rings[4][0] + ox, rings[4][1] + oy, r * 0.42, 0, Math.PI * 2);
    g.fillStyle = TUNE.accent; g.fill();

    // title
    g.fillStyle = '#ffffff';
    g.textBaseline = 'alphabetic';
    g.font = '600 66px Poppins, ui-sans-serif, system-ui, sans-serif';
    var y = 920;
    ['The Realist’s Guide', 'to Sustainable', 'Supply Chains'].forEach(function (l) { g.fillText(l, 96, y); y += 78; });
    g.font = '400 31px Poppins, ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.86)';
    y += 30;
    ['How to turn vision', 'into action, and drive', 'meaningful change'].forEach(function (l) { g.fillText(l, 96, y); y += 42; });

    // small mark bottom-right (neutral stand-in, not the brand logo)
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
    g.beginPath(); g.arc(COVER_W - 96, COVER_H - 106, 26, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(COVER_W - 96, COVER_H - 106, 8, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
    coverTex.needsUpdate = true;
  }
  drawCover();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCover);

  /* ---------- page-edge texture (the stacked sheets seen on the fore-edge) ---------- */
  function makeEdgeTexture() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, 64, 256);
    for (var i = 0; i < 256; i += 3) {
      g.fillStyle = (i % 2) ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.16)';
      g.fillRect(0, i, 64, 1);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  var edgeTex = makeEdgeTexture();

  /* ---------- geometry ----------
     Built in the book's natural frame: width along X (spine at x = −W/2,
     fore-edge at +W/2), height along −Z (top of the cover at z = −H/2), lying
     on y = 0. The cover hinges about Z at the spine (+rotation.z lifts the
     fore-edge). The whole book is then turned 90° about Y so that, seen from
     the isometric camera, the spine sits lower-left and the title reads rising
     to the right, like the product shot it replaces. */
  var BW = 1.0, BH = 1.38, PT = 0.062, CT = 0.009, INSET = 0.012;

  var book = new THREE.Group();
  book.rotation.y = Math.PI / 2;
  root.add(book);

  var coverMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(TUNE.coverColor), roughness: TUNE.roughness, metalness: 0.0,
    clearcoat: TUNE.clearcoat, clearcoatRoughness: 0.42, envMapIntensity: TUNE.envIntensity
  });
  var coverTopMat = coverMat.clone();
  coverTopMat.map = coverTex;
  coverTopMat.color.set('#ffffff');            // the artwork carries the colour
  var pageMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(TUNE.pageColor), roughness: 0.95, metalness: 0, envMapIntensity: 0.25 });
  var pageEdgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95, metalness: 0, envMapIntensity: 0.2 });
  var leafMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.25 });
  var edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: TUNE.edgeOpacity, blending: THREE.AdditiveBlending, depthWrite: false });

  function edges(geo) { return new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat); }

  // back cover
  var backGeo = new THREE.BoxGeometry(BW, CT, BH);
  var back = new THREE.Mesh(backGeo, coverMat);
  back.position.set(0, CT / 2, 0);
  book.add(back);
  var backEdges = edges(backGeo); backEdges.position.copy(back.position); book.add(backEdges);

  // page block (BoxGeometry material order: +x −x +y −y +z −z)
  var pagesGeo = new THREE.BoxGeometry(BW - INSET, PT, BH - INSET * 2);
  var pages = new THREE.Mesh(pagesGeo, [pageEdgeMat, pageMat, pageMat, pageMat, pageEdgeMat, pageEdgeMat]);
  pages.position.set(-INSET / 2, CT + PT / 2, 0);
  book.add(pages);
  var pagesEdges = edges(pagesGeo); pagesEdges.position.copy(pages.position);
  pagesEdges.material = edgeMat.clone(); pagesEdges.material.opacity = TUNE.edgeOpacity * 0.5;
  book.add(pagesEdges);

  // spine
  var spineGeo = new THREE.BoxGeometry(CT, PT + CT * 2, BH);
  var spine = new THREE.Mesh(spineGeo, coverMat);
  spine.position.set(-BW / 2 - CT / 2, (PT + CT * 2) / 2, 0);
  book.add(spine);

  // front cover: pivot on the spine edge, at the top of the page block
  var coverPivot = new THREE.Group();
  coverPivot.position.set(-BW / 2, CT + PT, 0);
  book.add(coverPivot);
  var coverGeo = new THREE.BoxGeometry(BW, CT, BH);
  var cover = new THREE.Mesh(coverGeo, [coverMat, coverMat, coverTopMat, coverMat, coverMat, coverMat]);
  cover.position.set(BW / 2, CT / 2, 0);
  coverPivot.add(cover);
  var coverEdges = edges(coverGeo); coverEdges.position.copy(cover.position); coverPivot.add(coverEdges);

  // loose leaves under the cover (their own pivots on the spine)
  var leaves = [];
  var leafGeo = new THREE.PlaneGeometry(BW - INSET, BH - INSET * 2);
  for (var li = 0; li < 8; li++) {
    var pv = new THREE.Group();
    pv.position.set(-BW / 2, CT + PT - 0.0012 * (li + 1), 0);
    var leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.set((BW - INSET) / 2, 0, 0);
    pv.add(leaf);
    pv.visible = li < TUNE.leaves;
    book.add(pv);
    leaves.push(pv);
  }

  // floor frame line: rounded rectangle ribbon around the book (the Data Core "floor")
  var floorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: TUNE.floorOpacity, depthWrite: false, side: THREE.DoubleSide });
  var floor = null, floorMargin = -1;
  function rrect(w2, h2, rad) {
    var s = new THREE.Shape();
    s.moveTo(-w2 + rad, -h2);
    s.lineTo(w2 - rad, -h2); s.absarc(w2 - rad, -h2 + rad, rad, -Math.PI / 2, 0, false);
    s.lineTo(w2, h2 - rad); s.absarc(w2 - rad, h2 - rad, rad, 0, Math.PI / 2, false);
    s.lineTo(-w2 + rad, h2); s.absarc(-w2 + rad, h2 - rad, rad, Math.PI / 2, Math.PI, false);
    s.lineTo(-w2, -h2 + rad); s.absarc(-w2 + rad, -h2 + rad, rad, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  function buildFloor() {
    if (floor) { book.remove(floor); floor.geometry.dispose(); }
    var m = TUNE.floorMargin, w = BW + CT + 2 * m, h = BH + 2 * m, rr = 0.12, t = 0.0085;
    var outer = rrect(w / 2, h / 2, rr);
    var inner = rrect(w / 2 - t, h / 2 - t, rr - t);
    outer.holes.push(new THREE.Path(inner.getPoints(24)));
    floor = new THREE.Mesh(new THREE.ShapeGeometry(outer, 24), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-CT / 2, 0.0006, 0);
    book.add(floor);
    floorMargin = m;
  }
  buildFloor();

  /* ---------- pill label (overlay sprite, same style as the Data Core labels) ---------- */
  var labelSprite = null, labelKey = '';
  function makeLabel(text) {
    var fs = 34, c = document.createElement('canvas'), g = c.getContext('2d');
    var font = '500 ' + fs + 'px Poppins, ui-sans-serif, system-ui, sans-serif';
    g.font = font;
    var ls = fs * 0.14;                          // letter-spacing 14%
    var tw = 0; for (var i = 0; i < text.length; i++) tw += g.measureText(text[i]).width + ls;
    var pad = Math.ceil(1.5 * g.measureText('o').width), hgt = 64;   // padding ≥ one "o" per side
    c.width = Math.ceil(tw + pad * 2 + 6); c.height = hgt + 6;
    g = c.getContext('2d'); g.font = font;
    var rx = 3, ry = 3, rw = c.width - 6, rh = hgt, rad = hgt / 2;
    g.beginPath();
    g.moveTo(rx + rad, ry); g.lineTo(rx + rw - rad, ry); g.arc(rx + rw - rad, ry + rad, rad, -Math.PI / 2, Math.PI / 2);
    g.lineTo(rx + rad, ry + rh); g.arc(rx + rad, ry + rad, rad, Math.PI / 2, Math.PI * 1.5); g.closePath();
    g.fillStyle = 'rgba(2,2,2,0.92)'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
    var x = rx + pad + ls / 2;
    for (var k = 0; k < text.length; k++) { g.fillText(text[k], x, ry + rh / 2 + 1); x += g.measureText(text[k]).width + ls; }
    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.minFilter = THREE.LinearFilter;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    var H = 0.1275; sp.scale.set(H * c.width / c.height, H, 1);
    sp.layers.set(1);
    sp.userData.aspect = c.width / c.height;
    return sp;
  }
  function ensureLabel() {
    var k = TUNE.labelText;
    if (labelSprite && labelKey === k) return;
    if (labelSprite) { scene.remove(labelSprite); labelSprite.material.map.dispose(); labelSprite.material.dispose(); }
    labelSprite = makeLabel(k); labelKey = k;
    scene.add(labelSprite);
  }
  ensureLabel();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { labelKey = ''; ensureLabel(); });

  /* ---------- sizing ---------- */
  var W = 0, H = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = Math.round(r.width); H = Math.round(r.height || r.width * 2 / 3);
    var dpr = Math.min(window.devicePixelRatio || 1, TUNE.quality.dprMax || 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, true);
    // the book (with the cover open and its label) spans ~2.05 world units
    // on screen horizontally and ~1.85 vertically in this isometric view;
    // the view is shifted up so the open cover and the label have headroom
    var PPW = Math.min(W / 2.05, H / 1.85) * TUNE.fit;
    camera.left = -W / PPW / 2; camera.right = W / PPW / 2;
    camera.top = H / PPW / 2 + 0.14; camera.bottom = -H / PPW / 2 + 0.14;
    camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(W, H); }
  }
  window.addEventListener('resize', resize);

  /* ---------- post-processing: RenderPass + bloom + gamma, MSAA on the composer RTs ---------- */
  var composer = null, bloomPass = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), TUNE.bloom.strength, TUNE.bloom.radius, TUNE.bloom.threshold);
    composer.addPass(bloomPass);
    if (THREE.ShaderPass && THREE.GammaCorrectionShader) composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    if (renderer.capabilities.isWebGL2) setMsaa(TUNE.quality.msaa);
  }
  var msaaNow = -1;
  function setMsaa(n) {
    if (!composer || !renderer.capabilities.isWebGL2) return;
    n = Math.max(0, Math.min(8, Math.round(n)));
    if (n === msaaNow) return;
    msaaNow = n;
    composer.renderTarget1.samples = n; composer.renderTarget2.samples = n;
    composer.renderTarget1.dispose(); composer.renderTarget2.dispose();   // next render reallocates the FBOs
  }

  /* ---------- timeline (same cycle as the Data Core: 11.5 s, inOutQuart) ---------- */
  function inOutQuart(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  function seg(t, a, b, from, to) {
    if (t <= a) return from; if (t >= b) return to;
    return from + (to - from) * inOutQuart((t - a) / (b - a));
  }
  // open 0→1 between 600 and 3000 ms, hold, close between 7900 and 10100 ms
  function openAt(ms) {
    var L = TUNE.loop, t = ((ms % L) + L) % L;
    if (t < 7900) return seg(t, 600, 3000, 0, 1);
    return seg(t, 7900, 10100, 1, 0);
  }
  // the label appears once the cover is well up and leaves BEFORE it closes
  function labelAt(ms) {
    var L = TUNE.loop, t = ((ms % L) + L) % L;
    if (t < 7600) return seg(t, 1900, 2600, 0, 1);
    return seg(t, 7600, 8100, 1, 0);
  }

  /* ---------- interaction: hovering the book lifts the cover a little ---------- */
  var mouse = { x: 0, y: 0 }, hover = 0, hoverTarget = 0;
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var lastRay = 0;
  canvas.addEventListener('pointermove', function (e) {
    var now = performance.now();
    if (now - lastRay < 60) return;               // 60 ms throttle, like the Data Core
    lastRay = now;
    var r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    hoverTarget = raycaster.intersectObjects([cover, pages, back], false).length ? 1 : 0;
  }, { passive: true });
  canvas.addEventListener('pointerleave', function () { hoverTarget = 0; });

  /* ---------- parallax (same as the Data Core) ---------- */
  window.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    mouse.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))) * 0.6;
    mouse.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))) * 0.6;
  }, { passive: true });
  var par = { x: 0, y: 0 };

  /* ---------- custom cursor (same crosshair as the globe and the Data Core) ---------- */
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

  /* ---------- apply the live knobs every frame ---------- */
  var lastCoverKey = TUNE.coverColor + '|' + TUNE.accent;
  function applyTune() {
    coverMat.roughness = coverTopMat.roughness = TUNE.roughness;
    coverMat.clearcoat = coverTopMat.clearcoat = TUNE.clearcoat;
    coverMat.envMapIntensity = coverTopMat.envMapIntensity = TUNE.envIntensity;
    coverMat.color.set(TUNE.coverColor);
    pageMat.color.set(TUNE.pageColor);
    key.intensity = TUNE.keyLight; ambient.intensity = TUNE.ambient;
    edgeMat.opacity = TUNE.edgeOpacity; pagesEdges.material.opacity = TUNE.edgeOpacity * 0.5;
    floorMat.opacity = TUNE.floorOpacity;
    if (bloomPass) { bloomPass.strength = TUNE.bloom.strength; bloomPass.radius = TUNE.bloom.radius; bloomPass.threshold = TUNE.bloom.threshold; }
    setMsaa(TUNE.quality.msaa);
    for (var i = 0; i < leaves.length; i++) leaves[i].visible = i < TUNE.leaves;
    var ck = TUNE.coverColor + '|' + TUNE.accent;
    if (ck !== lastCoverKey) { lastCoverKey = ck; drawCover(); }
    if (Math.abs(floorMargin - TUNE.floorMargin) > 1e-6) buildFloor();
    ensureLabel();
  }

  /* ---------- render loop ---------- */
  var t0 = performance.now();
  var popDone = false;
  var _wp = new THREE.Vector3();
  function render(now) {
    var ms = now - t0;
    applyTune();
    if (!W) resize();

    // pop-in once: scale 0.75→1 over 600 ms
    if (!popDone) {
      var pop = reduced ? 1 : Math.min(1, ms / 600);
      root.scale.setScalar(0.75 + 0.25 * inOutQuart(pop));
      if (pop >= 1) { popDone = true; root.scale.setScalar(1); }
    }

    hover += (hoverTarget - hover) * 0.08;
    var open = reduced ? 0.55 : openAt(ms);
    var openAngle = TUNE.openAngle * Math.PI / 180;
    var extra = TUNE.hoverLift * Math.PI / 180 * hover;
    // a slow wobble while it stays open, so the cover never freezes
    var wobble = reduced ? 0 : Math.sin(ms / 1400) * 0.025 * open;
    coverPivot.rotation.z = open * openAngle + extra + wobble;     // +z lifts the fore-edge (+x)
    for (var i = 0; i < leaves.length; i++) {
      var o = reduced ? open : openAt(ms - TUNE.leafLag * (i + 1));
      var f = Math.max(0, TUNE.leafFollow - TUNE.leafStep * i);
      leaves[i].rotation.z = o * openAngle * f + extra * f * 0.8;
    }
    // floating while open (common phase with the wobble)
    book.position.y = reduced ? 0 : TUNE.bob * Math.sin(ms / 1400) * open;

    // parallax: rotate the root, smoothed
    par.x += ((reduced ? 0 : mouse.y) * 0.05 - par.x) * 0.055;
    par.y += ((reduced ? 0 : mouse.x) * 0.22 - par.y) * 0.055;
    root.rotation.x = par.x; root.rotation.y = par.y;

    // label: above the lifted fore-edge of the cover
    var lab = reduced ? 1 : labelAt(ms);
    if (labelSprite) {
      labelSprite.visible = TUNE.label && lab > 0.001;
      if (labelSprite.visible) {
        var a = coverPivot.rotation.z;
        _wp.set(-BW / 2 + Math.cos(a) * BW, CT + PT + Math.sin(a) * BW + 0.24, 0);
        book.localToWorld(_wp);
        labelSprite.position.copy(_wp);
        var Hh = 0.1275 * (0.85 + 0.15 * lab);
        labelSprite.scale.set(Hh * labelSprite.userData.aspect, Hh, 1);
        labelSprite.material.opacity = lab;
      }
    }

    if (composer) {
      camera.layers.set(0);
      composer.render();
      // the label as a crisp overlay, outside the bloom pipeline
      renderer.autoClear = false; renderer.clearDepth();
      camera.layers.set(1); renderer.render(scene, camera);
      camera.layers.set(0); renderer.autoClear = true;
    } else {
      camera.layers.enableAll(); renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
  }
  resize();
  requestAnimationFrame(render);
})();
