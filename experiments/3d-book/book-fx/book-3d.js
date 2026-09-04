/* =========================================================================
   Experiment 4 — 3D book for the eBook detail hero
   Three.js r147 (UMD) + the post stack shared with experiment 3
   (../lib/three-post.js: EffectComposer, UnrealBloomPass, GammaCorrection).

   Replaces the flat product shot (a rendered PNG of the eBook) with a real
   3D book built with the Data Core technology: near-black material lit by the
   same banded softbox environment, translucent white light edges, MSAA 4
   through the composer, subtle bloom, mouse parallax and the crosshair cursor.

   v3 (Igor's second review): a CLICK opens the book AT THE MIDDLE and shows a
   two-page editorial spread (canvas textures: text + two photos from the site);
   another click closes it. Near-orthographic perspective camera placed like the
   photographer of the original product shot (from the book's lower-left, high
   up), no floor line, no label. The front cover + the upper half of the page
   block flip about the spine as one piece; a few loose leaves turn with a lag,
   always staying between the two halves so nothing pokes through the cover.
   v4 (third review): the open book is a slight V, not flat (both halves rise
   from the spine by TUNE.vAngle); the cover is the ORIGINAL artwork, unwarped
   from the product shot (spread/cover.jpg), with the drawn cover as fallback;
   the camera re-fits itself every frame to whatever the book occupies (zooming
   out while a half stands up mid-flip), so the model is never cut.

   Live knobs: window.BOOK (edit in the DevTools console, applied every frame).
   Spread copy: window.BOOK_SPREAD (edit, then BOOK_REDRAW()).
   ========================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  var THREE = window.THREE;

  var canvas = document.getElementById('book-canvas');
  if (!canvas) return;
  var stage = document.getElementById('book-stage') || canvas.parentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BASE = (function () {                    // folder of this script, for the photos
    var s = document.currentScript && document.currentScript.src;
    return s ? s.slice(0, s.lastIndexOf('/') + 1) : 'book-fx/';
  })();

  /* ---------- LIVE KNOBS: window.BOOK ---------- */
  var TUNE = window.BOOK = {
    openMs: 1400,           // duration of the open / close transition
    vAngle: 7,              // degrees each half rises from the spine when open (0 = flat)
    coverSource: 'photo',   // 'photo' = original artwork unwarped from the product shot; 'drawn' = canvas replica
    hoverLift: 4,           // degrees the front cover lifts while the pointer is over the closed book (0 = none)
    leaves: 5,              // loose leaves that turn with the flipping half
    leafLag: 110,           // ms of lag per leaf
    bob: 0.006,             // floating amplitude while open (world units)
    edgeOpacity: 0.30,      // white light edges
    coverColor: '#0d0d0f',
    pageColor: '#e6e4df',   // paper
    accent: '#0f5bff',      // the blue disc on the cover
    green: '#5cfe50',       // the site's accent green, used in the spread
    clearcoat: 0.45,
    roughness: 0.52,
    envIntensity: 0.65,
    keyLight: 0.55,
    ambient: 0.12,
    bloom: { strength: 0.14, radius: 0.26, threshold: 0.78 },
    camera: { az: -50, el: 50, fov: 11 },  // photographer's position: az from +z toward +x (deg), elevation (deg); small fov = little perspective
    fit: 0.90,              // 1 = the book fills the stage (re-fitted live to whatever it occupies)
    camSmooth: 0.12,        // per-frame lerp of the camera toward its fitted place
    quality: { msaa: 4, dprMax: 2 }
  };

  /* ---------- renderer / scene ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x000000, 1);          // the media box is black, like the product shot
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  var scene = new THREE.Scene();
  var root = new THREE.Group();                 // parallax rotates this group
  scene.add(root);
  var camera = new THREE.PerspectiveCamera(TUNE.camera.fov, 1.5, 0.1, 200);

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
    stripe(168, 30, 0.55, 520, 1010);
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

  /* ---------- canvas helpers ---------- */
  var FONT = 'Poppins, ui-sans-serif, system-ui, sans-serif';
  function makeTex(c) {
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  // word-wrap: draws `text` from (x, y) inside `width`, returns the y after the last line
  function para(g, text, x, y, width, lh) {
    var words = text.split(' '), line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > width && line) { g.fillText(line, x, y); y += lh; line = words[i]; }
      else line = test;
    }
    if (line) { g.fillText(line, x, y); y += lh; }
    return y;
  }
  // cover-fit an image into a rect (dark placeholder until it loads)
  function coverImg(g, img, x, y, w, h) {
    if (!img || !img.width) { g.fillStyle = '#1a1c20'; g.fillRect(x, y, w, h); return; }
    var s = Math.max(w / img.width, h / img.height), sw = img.width * s, sh = img.height * s;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh); g.restore();
  }
  function loadImg(name, cb) {
    var im = new Image();
    im.onload = function () { cb(im); }; im.onerror = function () { cb(null); };
    im.src = BASE + 'spread/' + name;
  }

  /* ---------- the cover artwork ---------- */
  var COVER_W = 1024, COVER_H = 1414;
  var coverCanvas = document.createElement('canvas');
  coverCanvas.width = COVER_W; coverCanvas.height = COVER_H;
  var coverTex = makeTex(coverCanvas);

  function drawCover() {
    if (TUNE.coverSource === 'photo' && photos.cover) {   // the original artwork, unwarped from the product shot
      var gc = coverCanvas.getContext('2d');
      gc.drawImage(photos.cover, 0, 0, COVER_W, COVER_H);
      coverTex.needsUpdate = true;
      return;
    }
    var g = coverCanvas.getContext('2d');
    g.clearRect(0, 0, COVER_W, COVER_H);
    g.fillStyle = TUNE.coverColor; g.fillRect(0, 0, COVER_W, COVER_H);
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
    g.beginPath(); g.arc(rings[4][0] + ox, rings[4][1] + oy, r * 0.42, 0, Math.PI * 2);
    g.fillStyle = TUNE.accent; g.fill();
    g.fillStyle = '#ffffff'; g.textBaseline = 'alphabetic';
    g.font = '600 66px ' + FONT;
    var y = 920;
    ['The Realist’s Guide', 'to Sustainable', 'Supply Chains'].forEach(function (l) { g.fillText(l, 96, y); y += 78; });
    g.font = '400 31px ' + FONT; g.fillStyle = 'rgba(255,255,255,0.86)';
    y += 30;
    ['How to turn vision', 'into action, and drive', 'meaningful change'].forEach(function (l) { g.fillText(l, 96, y); y += 42; });
    // small mark bottom-right (neutral stand-in, not the brand logo)
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
    g.beginPath(); g.arc(COVER_W - 96, COVER_H - 106, 26, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(COVER_W - 96, COVER_H - 106, 8, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
    coverTex.needsUpdate = true;
  }

  /* ---------- the spread: two editorial pages (invented content, English) ---------- */
  // Portrait pages 1024 × 1414, like the cover. Left = a full-bleed photo with a
  // chapter opener; right = body copy in two columns, a pull quote, a KPI strip
  // and a second photo. Copy is fictional, about process-driven sustainable
  // supply chains, in the register of the real guide. Photos: two images saved
  // with the celonis.com home page (experiment 1), copied to book-fx/spread/.
  var PAGE_W = 1024, PAGE_H = 1414, M = 84;    // margin
  var leftCanvas = document.createElement('canvas'), rightCanvas = document.createElement('canvas');
  leftCanvas.width = rightCanvas.width = PAGE_W; leftCanvas.height = rightCanvas.height = PAGE_H;
  var leftTex = makeTex(leftCanvas), rightTex = makeTex(rightCanvas);
  // the LEFT page is the −y face of the flipped half: after the 180° turn that
  // face's u runs along −x and its v along +z, so the texture is turned 180°
  leftTex.center.set(0.5, 0.5); leftTex.rotation = Math.PI;
  var photos = { containers: null, solar: null, cover: null };

  var SPREAD = window.BOOK_SPREAD = {
    runningHead: 'THE REALIST’S GUIDE TO SUSTAINABLE SUPPLY CHAINS',
    chapterNo: '03',
    chapterTitle: 'Where the emissions actually hide',
    standfirst: 'Most sustainability targets are set at the top of the organisation and missed at the bottom of a purchase order. The gap is not ambition. It is visibility into the processes that move goods every day.',
    caption: 'Rotterdam, 06:40. A single delayed customs document adds a truck, a reroute and 1.8 t of CO₂e to a shipment that was “on plan” an hour earlier.',
    pageLeft: '24',
    pageRight: '25',
    body: [
      'Ask a supply chain leader where the carbon in their network comes from and the answer is usually a category: freight, packaging, suppliers. Ask where it comes from this week and the room goes quiet. Emission factors describe averages; operations happen in exceptions — the expedited air shipment, the half-empty truck, the order split in three because a plant ran out of stock.',
      'Process mining changes the question. Instead of estimating emissions per category, you read them off the event log: every order, every touch, every hand-over, with its timestamp and its cause. The green line stops being a reporting exercise and becomes a property of the process, measured the same way as cost or lead time.',
      'The organisations in this guide did not start with a new strategy. They started with one process — order-to-cash, procure-to-pay, inbound logistics — and one uncomfortable number.'
    ],
    quote: '“We knew our Scope 3 number to two decimals and had no idea which process produced it.”',
    quoteBy: 'Head of Logistics, European consumer goods manufacturer',
    kpis: [['−12%', 'transport emissions in the first two quarters'], ['3.4 days', 'shorter inbound lead time, same fleet'], ['1 process', 'to start with — not a programme']],
    caption2: 'Sustainability and yield are the same conversation on a plant floor: fewer rushes, fuller loads, fewer touches.'
  };

  function drawLeftPage() {
    var g = leftCanvas.getContext('2d');
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = TUNE.pageColor; g.fillRect(0, 0, PAGE_W, PAGE_H);
    var ph = Math.round(PAGE_H * 0.58);                    // full-bleed photo, top 58 %
    coverImg(g, photos.containers, 0, 0, PAGE_W, ph);
    var gr = g.createLinearGradient(0, ph - 360, 0, ph);   // so the chapter opener reads on it
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.72)');
    g.fillStyle = gr; g.fillRect(0, ph - 360, PAGE_W, 360);
    g.fillStyle = TUNE.green; g.font = '600 26px ' + FONT;
    g.fillText('CHAPTER ' + SPREAD.chapterNo, M, ph - 232);
    g.fillStyle = '#ffffff'; g.font = '600 62px ' + FONT;
    para(g, SPREAD.chapterTitle, M, ph - 160, PAGE_W - 2 * M, 70);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.font = '500 17px ' + FONT;   // running head
    g.fillText(SPREAD.runningHead, M, ph + 52);
    g.fillRect(M, ph + 66, PAGE_W - 2 * M, 1.5);
    g.fillStyle = '#111'; g.font = '500 33px ' + FONT;                // standfirst
    var y = para(g, SPREAD.standfirst, M, ph + 128, PAGE_W - 2 * M, 44);
    g.fillStyle = '#5c5a55'; g.font = '400 20px ' + FONT;             // caption
    para(g, SPREAD.caption, M, y + 34, PAGE_W - 2 * M - 220, 27);
    g.fillStyle = TUNE.green; g.fillRect(M, PAGE_H - 96, 46, 4);      // folio
    g.fillStyle = '#111'; g.font = '500 20px ' + FONT;
    g.fillText(SPREAD.pageLeft, M, PAGE_H - 56);
    leftTex.needsUpdate = true;
  }

  function drawRightPage() {
    var g = rightCanvas.getContext('2d');
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = TUNE.pageColor; g.fillRect(0, 0, PAGE_W, PAGE_H);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.font = '500 17px ' + FONT;   // running head
    g.textAlign = 'right'; g.fillText(SPREAD.runningHead, PAGE_W - M, 96); g.textAlign = 'left';
    g.fillRect(M, 110, PAGE_W - 2 * M, 1.5);
    var colW = (PAGE_W - 2 * M - 40) / 2, x1 = M, x2 = M + colW + 40, lh = 30;
    g.fillStyle = '#1a1a1a'; g.font = '400 21px ' + FONT;             // column 1
    var y1 = para(g, SPREAD.body[0], x1, 160, colW, lh) + 14;
    y1 = para(g, SPREAD.body[1], x1, y1, colW, lh);
    g.fillStyle = TUNE.green; g.fillRect(x2, 156, 4, 190);            // pull quote, column 2
    g.fillStyle = '#111'; g.font = '500 30px ' + FONT;
    var y2 = para(g, SPREAD.quote, x2 + 28, 186, colW - 28, 38);
    g.fillStyle = '#5c5a55'; g.font = '400 17px ' + FONT;
    y2 = para(g, SPREAD.quoteBy, x2 + 28, y2 + 6, colW - 28, 22);
    g.fillStyle = '#1a1a1a'; g.font = '400 21px ' + FONT;
    y2 = para(g, SPREAD.body[2], x2, y2 + 34, colW, lh);
    var ky = Math.max(y1, y2) + 44;                                    // KPI strip
    g.fillStyle = '#111'; g.fillRect(M, ky, PAGE_W - 2 * M, 1.5);
    var kw = (PAGE_W - 2 * M) / 3;
    for (var i = 0; i < SPREAD.kpis.length; i++) {
      var kx = M + kw * i;
      g.fillStyle = '#111'; g.font = '600 44px ' + FONT; g.fillText(SPREAD.kpis[i][0], kx, ky + 66);
      g.fillStyle = '#5c5a55'; g.font = '400 17px ' + FONT; para(g, SPREAD.kpis[i][1], kx, ky + 98, kw - 30, 22);
    }
    var py = ky + 170, ph = PAGE_H - 130 - py;                         // second photo + caption
    var pw = Math.round((PAGE_W - 2 * M) * 0.58);
    coverImg(g, photos.solar, PAGE_W - M - pw, py, pw, ph);
    g.fillStyle = '#5c5a55'; g.font = '400 18px ' + FONT;
    para(g, SPREAD.caption2, M, py + 8, PAGE_W - 2 * M - pw - 36, 25);
    g.fillStyle = TUNE.green; g.fillRect(PAGE_W - M - 46, PAGE_H - 96, 46, 4);   // folio
    g.fillStyle = '#111'; g.font = '500 20px ' + FONT; g.textAlign = 'right';
    g.fillText(SPREAD.pageRight, PAGE_W - M, PAGE_H - 56); g.textAlign = 'left';
    rightTex.needsUpdate = true;
  }

  // a loose leaf: faint text lines (both sides share the texture)
  function makeLeafTexture() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 707;
    var g = c.getContext('2d');
    g.fillStyle = TUNE.pageColor; g.fillRect(0, 0, 512, 707);
    g.fillStyle = 'rgba(0,0,0,0.10)';
    for (var y = 90; y < 640; y += 14) g.fillRect(44, y, (y % 3 === 0 ? 300 : 420) + (y % 7) * 6, 3);
    return makeTex(c);
  }
  function drawAll() { drawCover(); drawLeftPage(); drawRightPage(); }
  window.BOOK_REDRAW = drawAll;
  drawAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
  loadImg('containers.jpg', function (im) { photos.containers = im; drawLeftPage(); });
  loadImg('cover.jpg', function (im) { photos.cover = im; drawCover(); });
  loadImg('solar.jpg', function (im) { photos.solar = im; drawRightPage(); });

  /* ---------- page-edge texture (the stacked sheets seen on the fore-edge) ---------- */
  function makeEdgeTexture() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, 64, 256);
    for (var i = 0; i < 256; i += 3) {
      g.fillStyle = (i % 2) ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.16)';
      g.fillRect(0, i, 64, 1);
    }
    var tex = makeTex(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  var edgeTex = makeEdgeTexture();

  /* ---------- geometry ----------
     Natural frame: width along X (spine at x = −BW/2, fore-edge at +BW/2),
     height along −Z (top of the cover at z = −BH/2), lying on y = 0.
       back cover        y ∈ [0, CT]                         fixed
       lower half pages  y ∈ [CT, CT + PT/2]                 fixed  — its TOP face is the RIGHT page
       flip group        pivot (−BW/2, CT + PT/2, 0), rotation.z 0 → π
         upper half      local y ∈ [0, PT/2]                        — its BOTTOM face is the LEFT page
         front cover     local y ∈ [PT/2, PT/2 + CT], own pivot for the hover lift
       leaves            own pivots at the same height, rotation.z 0 → π with lag
     Rotating the flip group by π about the spine puts the front cover on the
     floor at x ∈ [−1.5, −0.5] and the upper half on top of it, so both pages
     end up at the same height, y = CT + PT/2. */
  var BW = 1.0, BH = 1.38, PT = 0.062, CT = 0.009, INSET = 0.012;
  var HALF = PT / 2, PW = BW - INSET, PH = BH - INSET * 2;

  var book = new THREE.Group();
  root.add(book);
  // everything hangs from the RIGHT HALF, hinged at the spine's bottom edge: when
  // the book opens, the right half rises by vAngle and the flip group (left half)
  // rotates π − 2·vAngle relative to it, so both halves make a V about the spine
  var rightHalf = new THREE.Group();
  rightHalf.position.set(-BW / 2, 0, 0);
  book.add(rightHalf);
  var part = new THREE.Group();                 // the old "book" frame, shifted so the spine is at part-x = 0
  part.position.set(BW / 2, 0, 0);
  rightHalf.add(part);

  var coverMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(TUNE.coverColor), roughness: TUNE.roughness, metalness: 0.0,
    clearcoat: TUNE.clearcoat, clearcoatRoughness: 0.42, envMapIntensity: TUNE.envIntensity
  });
  var coverTopMat = coverMat.clone(); coverTopMat.map = coverTex; coverTopMat.color.set('#ffffff');
  var paperMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(TUNE.pageColor), roughness: 0.95, metalness: 0, envMapIntensity: 0.25 });
  var edgeMatP = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95, metalness: 0, envMapIntensity: 0.2 });
  var leftMat = new THREE.MeshStandardMaterial({ map: leftTex, roughness: 0.9, metalness: 0, envMapIntensity: 0.25 });
  var rightMat = new THREE.MeshStandardMaterial({ map: rightTex, roughness: 0.9, metalness: 0, envMapIntensity: 0.25 });
  var leafMat = new THREE.MeshStandardMaterial({ map: makeLeafTexture(), roughness: 0.92, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.25 });
  var edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: TUNE.edgeOpacity, blending: THREE.AdditiveBlending, depthWrite: false });
  function edges(geo, opacityMul) {
    var l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat.clone());
    l.userData.mul = opacityMul || 1;
    return l;
  }
  var edgeLines = [];

  // back cover
  var coverGeo = new THREE.BoxGeometry(BW, CT, BH);
  var back = new THREE.Mesh(coverGeo, coverMat);
  back.position.set(0, CT / 2, 0);
  part.add(back);
  var e1 = edges(coverGeo, 1); e1.position.copy(back.position); part.add(e1); edgeLines.push(e1);

  // lower half of the page block (right page on top). Box material order: +x −x +y −y +z −z
  var halfGeo = new THREE.BoxGeometry(PW, HALF, PH);
  var lower = new THREE.Mesh(halfGeo, [edgeMatP, paperMat, rightMat, paperMat, edgeMatP, edgeMatP]);
  lower.position.set(-BW / 2 + PW / 2, CT + HALF / 2, 0);
  part.add(lower);

  // spine: pivots at its bottom edge by half the opening angle, so it flattens with the book
  var SP_H = PT + CT * 2 + 0.002;
  var spineGeo = new THREE.BoxGeometry(CT, SP_H, BH);
  var spinePivot = new THREE.Group(); spinePivot.position.set(-BW / 2, 0.001, 0);
  var spine = new THREE.Mesh(spineGeo, coverMat);
  spine.position.set(-CT / 2, SP_H / 2, 0);
  spinePivot.add(spine); part.add(spinePivot);

  // flip group: upper half + front cover
  var flip = new THREE.Group();
  flip.position.set(-BW / 2, CT + HALF, 0);
  part.add(flip);
  var upper = new THREE.Mesh(halfGeo, [edgeMatP, paperMat, paperMat, leftMat, edgeMatP, edgeMatP]);
  upper.position.set(PW / 2, HALF / 2, 0);
  flip.add(upper);
  var coverPivot = new THREE.Group();                 // hover-lift hinge, at the spine
  coverPivot.position.set(0, HALF, 0);
  flip.add(coverPivot);
  var cover = new THREE.Mesh(coverGeo, [coverMat, coverMat, coverTopMat, coverMat, coverMat, coverMat]);
  cover.position.set(BW / 2, CT / 2, 0);
  coverPivot.add(cover);
  var e2 = edges(coverGeo, 1); e2.position.copy(cover.position); coverPivot.add(e2); edgeLines.push(e2);
  var e3 = edges(halfGeo, 0.5); e3.position.copy(upper.position); flip.add(e3); edgeLines.push(e3);
  var e4 = edges(halfGeo, 0.5); e4.position.copy(lower.position); part.add(e4); edgeLines.push(e4);

  // loose leaves, hinged at the spine at the split height
  var leaves = [];
  var leafGeo = new THREE.PlaneGeometry(PW, PH);
  for (var li = 0; li < 8; li++) {
    var pv = new THREE.Group();
    pv.position.set(-BW / 2, CT + HALF, 0);          // hinge exactly at the split
    var leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.rotation.x = -Math.PI / 2;
    // the offset lives on the LEAF, not the pivot: +ε above the split when
    // closed (inside the upper half) becomes −ε after the 180° turn (inside the
    // flipped half). An offset on the pivot would not mirror and the leaves
    // would end up lying on top of the left page.
    leaf.position.set(PW / 2, 0.0009 * (li + 1), 0);
    pv.add(leaf);
    pv.visible = li < TUNE.leaves;
    part.add(pv);
    leaves.push(pv);
  }

  /* ---------- sizing / camera placement ----------
     The camera sits on the direction given by TUNE.camera (az/el). Every frame
     the corners of every part of the book (in their CURRENT pose) are projected,
     and distance + target are re-solved so the book fills TUNE.fit of the stage
     and is centred; the camera then eases toward that (camSmooth). So it zooms
     out while a half stands up mid-flip and back in when the book is flat, and
     the model is never cut whatever the state. */
  var W = 0, H = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = Math.round(r.width); H = Math.round(r.height || r.width * 2 / 3);
    var dpr = Math.min(window.devicePixelRatio || 1, TUNE.quality.dprMax || 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, true);
    camera.aspect = W / H;
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(W, H); }
    fitCamera(true);
  }
  window.addEventListener('resize', resize);

  var _v = new THREE.Vector3();
  var cam = { D: 10, dir: new THREE.Vector3(0, 1, 0), target: new THREE.Vector3(), fitD: 10, fitTarget: new THREE.Vector3() };
  var fitParts = [back, lower, upper, cover, spine];
  function fitPoints() {                        // world-space corners of every part, current pose
    var pts = [];
    var parts = fitParts.concat(leaves.filter(function (l) { return l.visible; }).map(function (l) { return l.children[0]; }));
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i], g = m.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      var bb = g.boundingBox;
      m.updateWorldMatrix(true, false);
      for (var k = 0; k < 8; k++) {
        _v.set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z);
        pts.push(_v.applyMatrix4(m.matrixWorld).clone());
      }
    }
    return pts;
  }
  function bounds(pts) {
    var b = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 };
    for (var i = 0; i < pts.length; i++) {
      _v.copy(pts[i]).project(camera);
      if (_v.x < b.minX) b.minX = _v.x; if (_v.x > b.maxX) b.maxX = _v.x;
      if (_v.y < b.minY) b.minY = _v.y; if (_v.y > b.maxY) b.maxY = _v.y;
    }
    return b;
  }
  function placeCamera(target, D) {
    camera.position.copy(target).addScaledVector(cam.dir, D);
    // TIGHT near/far: the composer's multisampled render targets get a 16-bit
    // depth renderbuffer, and with a long-lens camera (small fov → distance
    // ~9) a 0.1…200 range cannot separate the 9 mm cover from the page block
    // under it — the cover z-fights into stripes. ±3 units around the book.
    camera.near = Math.max(0.05, D - 3); camera.far = D + 3;
    camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  // solve distance + target for the current pose (3 passes), starting from the current camera
  function fitCamera(snap) {
    if (!W) return;
    var c = TUNE.camera, az = c.az * Math.PI / 180, el = c.el * Math.PI / 180;
    cam.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    camera.fov = c.fov; camera.aspect = W / H;
    var pts = fitPoints(), D = cam.fitD, target = cam.fitTarget;
    var right = new THREE.Vector3(), up = new THREE.Vector3();
    for (var it = 0; it < 3; it++) {
      placeCamera(target, D);
      var b = bounds(pts);
      var ext = Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2;
      D *= ext / TUNE.fit;
      var halfH = Math.tan(camera.fov * Math.PI / 360) * D, halfW = halfH * camera.aspect;
      camera.matrixWorld.extractBasis(right, up, _v);
      target.addScaledVector(right, (b.minX + b.maxX) / 2 * halfW).addScaledVector(up, (b.minY + b.maxY) / 2 * halfH);
    }
    cam.fitD = D;
    if (snap) { cam.D = D; cam.target.copy(target); }
    else { var k = TUNE.camSmooth; cam.D += (D - cam.D) * k; cam.target.lerp(target, k); }
    placeCamera(cam.target, cam.D);
  }

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
    composer.renderTarget1.dispose(); composer.renderTarget2.dispose();
  }

  /* ---------- open / close state (click) ---------- */
  function inOutQuart(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  function seg(t, a, b, from, to) {
    if (t <= a) return from; if (t >= b) return to;
    return from + (to - from) * inOutQuart((t - a) / (b - a));
  }
  var isOpen = false, clickAt = -1e9, fromOpen = 0;
  function openAt(ms) {
    if (frozen) {                                // test hook: leaves get their lag as a fraction of openMs
      var dt = ms - _frozenNow;
      return Math.max(0, Math.min(1, frozen.t + (frozen.closing ? -dt : dt) / TUNE.openMs));
    }
    return seg(ms, clickAt, clickAt + (reduced ? 1 : TUNE.openMs), fromOpen, isOpen ? 1 : 0);
  }
  var _frozenNow = 0;
  function toggleOpen(now) { fromOpen = openAt(now); isOpen = !isOpen; clickAt = now; }
  // test hook (frame-by-frame checks from a headless browser): freeze the open
  // fraction at t, in the "opening" (closing=false) or "closing" leaf regime
  var frozen = null;
  window.BOOK_SET_OPEN = function (t, closing) {
    frozen = (t === null || t === undefined) ? null : { t: t, closing: !!closing };
    if (frozen) { isOpen = !closing; }
  };

  /* ---------- interaction ---------- */
  var mouse = { x: 0, y: 0 }, hover = 0, hoverTarget = 0;
  var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), lastRay = 0;
  var hitList = [cover, upper, lower, back, spine];
  function hitAt(e) {
    var r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(hitList, false).length > 0;
  }
  canvas.addEventListener('pointermove', function (e) {
    var now = performance.now();
    if (now - lastRay < 60) return;                 // 60 ms throttle, like the Data Core
    lastRay = now;
    hoverTarget = hitAt(e) ? 1 : 0;
  }, { passive: true });
  canvas.addEventListener('pointerleave', function () { hoverTarget = 0; });
  canvas.addEventListener('click', function (e) { if (hitAt(e)) toggleOpen(performance.now() - t0); });
  canvas.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(performance.now() - t0); } });
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('aria-label', 'eBook — click to open it at the middle');

  window.addEventListener('pointermove', function (e) {   // parallax (same as the Data Core)
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
  var lastArtKey = '';
  function applyTune() {
    coverMat.roughness = coverTopMat.roughness = TUNE.roughness;
    coverMat.clearcoat = coverTopMat.clearcoat = TUNE.clearcoat;
    coverMat.envMapIntensity = coverTopMat.envMapIntensity = TUNE.envIntensity;
    coverMat.color.set(TUNE.coverColor);
    paperMat.color.set(TUNE.pageColor);
    key.intensity = TUNE.keyLight; ambient.intensity = TUNE.ambient;
    for (var i = 0; i < edgeLines.length; i++) edgeLines[i].material.opacity = TUNE.edgeOpacity * edgeLines[i].userData.mul;
    if (bloomPass) { bloomPass.strength = TUNE.bloom.strength; bloomPass.radius = TUNE.bloom.radius; bloomPass.threshold = TUNE.bloom.threshold; }
    setMsaa(TUNE.quality.msaa);
    for (i = 0; i < leaves.length; i++) leaves[i].visible = i < TUNE.leaves;
    var ak = [TUNE.coverColor, TUNE.accent, TUNE.pageColor, TUNE.green, TUNE.coverSource].join('|');
    if (lastArtKey && ak !== lastArtKey) drawAll();
    lastArtKey = ak;
  }

  /* ---------- render loop ---------- */
  var t0 = performance.now();
  var popDone = false;
  function render(now) {
    var ms = now - t0;
    applyTune();
    if (!W) resize();

    if (!popDone) {                             // pop-in once: scale 0.75→1 over 600 ms
      var pop = reduced ? 1 : Math.min(1, ms / 600);
      root.scale.setScalar(0.75 + 0.25 * inOutQuart(pop));
      if (pop >= 1) { popDone = true; root.scale.setScalar(1); }
    }

    hover += (hoverTarget - hover) * 0.08;
    _frozenNow = ms;
    var open = openAt(ms), vA = TUNE.vAngle * Math.PI / 180;
    rightHalf.rotation.z = open * vA;                        // right half rises by vAngle…
    flip.rotation.z = open * (Math.PI - 2 * vA);             // …and the left half ends at π − vAngle: a V about the spine
    spinePivot.rotation.z = open * (Math.PI / 2 - vA);       // the spine bisects the V
    // hover: the front cover alone lifts a little while the book is closed
    coverPivot.rotation.z = TUNE.hoverLift * Math.PI / 180 * hover * (1 - open);
    // leaves turn with a lag, but NEVER beyond the flipping half: opening they
    // trail it, closing they run ahead of it — so they always sit between the
    // two halves and never poke through a closed cover
    for (var i = 0; i < leaves.length; i++) {
      var lag = TUNE.leafLag * (i + 1);
      var o = reduced ? open : Math.min(open, openAt(isOpen ? ms - lag : ms + lag));
      leaves[i].rotation.z = o * (Math.PI - 2 * vA);          // same frame as the flip group (child of the right half)
    }
    book.position.y = reduced ? 0 : TUNE.bob * Math.sin(ms / 1400) * open;

    par.x += ((reduced ? 0 : mouse.y) * 0.05 - par.x) * 0.055;
    par.y += ((reduced ? 0 : mouse.x) * 0.22 - par.y) * 0.055;
    root.rotation.x = par.x; root.rotation.y = par.y;

    fitCamera(false);                            // live framing: never cut, zooms out mid-flip

    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  resize();
  requestAnimationFrame(render);
})();
