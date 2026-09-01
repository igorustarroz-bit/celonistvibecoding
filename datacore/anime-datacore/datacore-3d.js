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
  // punto de luz bajo la pila: ilumina biseles y caras inferiores desde abajo
  var underLight = new THREE.PointLight(0xf4f7ff, 1.1, 9, 1.6);
  underLight.position.set(0, -2.4, 0);
  scene.add(underLight);


  /* ---------- material de cristal al estilo Codrops "Xylophone" ----------
     El cristal NO refracta la escena real (fondo negro = nada que refractar):
     lee un BACKDROP claro y pre-difuminado con refracción en espacio de
     pantalla (uv + normal.xy·fuerza), Fresnel hacia un cielo de 3 paradas y
     una paleta coseno como iridiscencia de película fina. Todo en shader. */
  function makeBackdropTexture() {
    // "fondo de estudio" lechoso: gradiente + blobs suaves (nace ya difuminado)
    var c = document.createElement('canvas'); c.width = 512; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#33373d'); grad.addColorStop(0.45, '#1c1f24');
    grad.addColorStop(0.8, '#0d0f12'); grad.addColorStop(1, '#060708');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
    function blob(x, y, r, col, a) {
      var rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(' + col + ',' + a + ')');
      rg.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    blob(170, 150, 170, '245,248,252', 0.95);  // foco principal (contraste)
    blob(410, 330, 150, '225,230,236', 0.35);  // relleno
    blob(256, 470, 260, '10,11,13', 0.8);      // pie oscuro
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }
  var backdropTex = makeBackdropTexture();

  // PRE-PASE (Xylophone completo): la escena se renderiza a una textura y el
  // cristal refracta ESA textura => se ve de verdad a través de las piezas.
  var backRT = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter
  });
  // fondo de estudio, visible solo dentro del pre-pase (detrás de la pila)
  var bgQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: backdropTex, depthWrite: false })
  );
  bgQuad.visible = false;
  scene.add(bgQuad);
  var glassMeshes = [];   // meshes de cristal: en el pre-pase usan su material simple

  // BLUR del backdrop (frost, como el GaussianBlurPass del Xylophone):
  // dos pasadas separables a cuarto de resolución
  var blurRT1 = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  var blurRT2 = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  var blurScene = new THREE.Scene();
  var blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var blurMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uDir: { value: new THREE.Vector2(1, 0) },
      uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      uRadius: { value: 1.2 }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform vec2 uDir;',
      'uniform vec2 uTexel;',
      'uniform float uRadius;',
      'varying vec2 vUv;',
      'void main() {',
      '  vec2 st = uDir * uTexel * uRadius;',
      '  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;',
      '  c += (texture2D(tDiffuse, vUv + st * 1.0).rgb + texture2D(tDiffuse, vUv - st * 1.0).rgb) * 0.1945946;',
      '  c += (texture2D(tDiffuse, vUv + st * 2.0).rgb + texture2D(tDiffuse, vUv - st * 2.0).rgb) * 0.1216216;',
      '  c += (texture2D(tDiffuse, vUv + st * 3.0).rgb + texture2D(tDiffuse, vUv - st * 3.0).rgb) * 0.054054;',
      '  c += (texture2D(tDiffuse, vUv + st * 4.0).rgb + texture2D(tDiffuse, vUv - st * 4.0).rgb) * 0.016216;',
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n')
  });
  blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat));
  function blurPass(src, dst, dx, dy) {
    blurMat.uniforms.tDiffuse.value = src.texture;
    blurMat.uniforms.uDir.value.set(dx, dy);
    renderer.setRenderTarget(dst);
    renderer.render(blurScene, blurCam);
  }

  var GLASS_VERT = [
    'varying vec3 vN;',
    'varying vec3 vWN;',
    'varying vec2 vScreenUv;',
    'void main() {',
    '  vN = normalize(normalMatrix * normal);',
    '  vWN = normalize(mat3(modelMatrix) * normal);',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;', // orto: w=1
    '}'
  ].join('\n');

  var GLASS_FRAG = [
    'uniform sampler2D uBackdrop;',
    'uniform sampler2D uBackdropBlur;',
    'uniform float uFrost;',
    'uniform vec2 uCenter;',    // centro de ESTA pieza en uv de pantalla (por frame)
    'uniform vec2 uOffset;',    // desvío propio de la pieza (por seed)
    'uniform float uMag;',      // lupa: <1 magnifica lo visto a través
    'uniform float uShift;',    // escala del desvío por pieza
    'uniform vec3 uBody;',
    'uniform float uTransmission;',
    'uniform float uRefract;',
    'uniform float uSeed;',
    'uniform float uIri;',
    'uniform float uFres;',
    'uniform float uTopClear;',
    'uniform float uTopDarken;',
    'uniform float uEdgeWhite;',
    'uniform vec3 uSkyTop;',
    'uniform vec3 uSkyHz;',
    'uniform vec3 uTint;',
    'varying vec3 vN;',
    'varying vec3 vWN;',
    'varying vec2 vScreenUv;',
    'void main() {',
    '  vec3 N = normalize(vN);',
    '  float up = clamp(normalize(vWN).y, 0.0, 1.0);',
    // refracción en espacio de pantalla (Xylophone): desplaza la lectura por la normal
    // lente POR PIEZA: magnifica alrededor del centro de la pieza y desvía
    // con su offset propio => cada cristal refracta distinto, no una lámina única
    '  vec2 rel = vScreenUv - uCenter;',
    '  vec2 buv = uCenter + rel * uMag + N.xy * uRefract + uOffset * uShift;',
    '  vec3 trans = mix(texture2D(uBackdrop, buv).rgb, texture2D(uBackdropBlur, buv).rgb, uFrost);',
    // zonas de la pieza: tapa plana (topness=1) / bisel y laterales (0)
    '  float topness = smoothstep(0.55, 0.95, up);',
    // laterales/bisel: cristal lechoso (mezcla con el backdrop)
    '  vec3 milky = mix(uBody, trans, uTransmission);',
    // TAPA: transparencia real — se ve lo de detrás, apenas teñido
    '  vec3 seeThru = trans * uTopDarken + uBody * 0.12;',
    '  vec3 col = mix(milky, seeThru, topness * uTopClear);',
    // Fresnel hacia "cielo" (atenuado en la tapa para que quede limpia)
    '  float ndv = abs(N.z);',
    '  float fres = pow(1.0 - ndv, 3.0);',
    '  vec3 sky = mix(uSkyHz, uSkyTop, clamp(N.y * 0.5 + 0.5, 0.0, 1.0));',
    '  col = mix(col, sky, fres * uFres * (1.0 - 0.7 * topness * uTopClear));',
    // blanco del cristal SOLO en el anillo del bisel y arranque de laterales
    '  float bevel = smoothstep(0.02, 0.45, up) * (1.0 - topness);',
    '  col += sky * bevel * uEdgeWhite;',
    // iridiscencia: paleta coseno con fase dependiente de la normal (grosor falso)
    '  float ph = N.x * 1.7 + N.y * 2.3 + N.z * 1.1 + uSeed * 6.2831;',
    '  vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67)) + ph * 3.0);',
    '  col += iri * fres * uIri;',
    '  col *= uTint;',                              // tinte global (azulado por defecto)
    // el composer trabaja en lineal y la pasada gamma final hace linear->sRGB:
    // autoría en sRGB, conversión aquí
    '  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);',
    '}'
  ].join('\n');

  var glassMats = [];
  function glassMat(seed, g) {
    var gg = g === undefined ? 0.5 : g;
    var tint = 0.055 + 0.075 * seed + 0.055 * gg;
    var m = new THREE.ShaderMaterial({
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      uniforms: {
        uBackdrop: { value: backRT.texture },
        uBackdropBlur: { value: blurRT2.texture },
        uFrost: { value: 0.6 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uOffset: { value: new THREE.Vector2(
          Math.sin(seed * 78.233) * 0.03, Math.sin(seed * 127.1) * 0.03) },
        uMag: { value: 0.90 },
        uShift: { value: 0.5 },
        uBody: { value: new THREE.Color(tint * 0.95, tint * 0.98, tint * 1.05) },
        uTransmission: { value: 0.75 },
        uRefract: { value: 0.13 + 0.06 * seed },
        uSeed: { value: seed },
        uIri: { value: 0.10 },
        uFres: { value: 0.85 },
        uTopClear: { value: 0.85 },
        uTopDarken: { value: 0.9 },
        uEdgeWhite: { value: 0.35 },
        uSkyTop: { value: new THREE.Color('#eef4ff') },
        uSkyHz: { value: new THREE.Color('#8e9aad') },
        uTint: { value: new THREE.Color(1, 1, 1) }
      }
    });
    glassMats.push(m);
    m.userData.baseRefract = 0.13 + 0.06 * seed;
    m.userData.baseBody = new THREE.Color(tint * 0.95, tint * 0.98, tint * 1.05);
    // gemelo simple para el pre-pase (lo que se ve A TRAVÉS del cristal)
    m.userData.preMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(tint * 0.55, tint * 0.58, tint * 0.65)
    });
    m.userData.basePre = m.userData.preMat.color.clone();
    return m;
  }
  function registerGlass(mesh) { glassMeshes.push(mesh); return mesh; }
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
    var fs = 34, padY = 15, ls = fs * 0.14;
    var c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = '500 ' + fs + 'px Poppins, Arial, sans-serif';
    // v25 (Igor): padding horizontal >= la anchura de una letra "o" por lado.
    // Con 1.5·"o" el texto además libera el casquete redondeado de la pill
    // (radio = alto/2), que es lo que hacía que se viera apretado.
    var oW = g.measureText('o').width;
    var pad = Math.ceil(oW * 1.5);
    var tw = g.measureText(text).width + text.length * ls;
    c.width = Math.ceil(tw + pad * 2 + 8); c.height = fs + padY * 2 + 8;
    g = c.getContext('2d');
    g.font = '500 ' + fs + 'px Poppins, Arial, sans-serif';
    try { g.letterSpacing = ls + 'px'; } catch (e) {}
    var w = c.width - 8, h = c.height - 8, r = h / 2, x = 4, y = 4;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fillStyle = 'rgba(2,2,2,0.92)'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2 + ls / 2, c.height / 2 + fs * 0.06);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: false, toneMapped: false
    }));
    sp.renderOrder = 10;
    sp.layers.set(1);   // capa de overlay: se renderiza aparte, sin efectos
    sp.userData.aspect = c.width / c.height;
    return sp;
  }

  function makeOutline(extent) {
    // cinta plana (~2px) en vez de Line de 1px (WebGL ignora linewidth)
    var pts = roundedRectShape(extent, extent, [0.10, 0.10, 0.10, 0.10]).getPoints(64);
    var w = 0.012, n = pts.length, pos = [], idx = [];
    for (var i = 0; i <= n; i++) {
      var p = pts[i % n], pr = pts[(i - 1 + n) % n], nx2 = pts[(i + 1) % n];
      var tx = nx2.x - pr.x, ty = nx2.y - pr.y;
      var L = Math.hypot(tx, ty) || 1;
      var nx = -ty / L * w / 2, ny = tx / L * w / 2;
      pos.push(p.x + nx, 0, p.y + ny, p.x - nx, 0, p.y - ny);
    }
    for (var k = 0; k < n; k++) {
      var a = k * 2, b = k * 2 + 1, c = k * 2 + 2, d = k * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.45,
      side: THREE.DoubleSide, toneMapped: false
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
  // forma que se VE al estar girada 180° sobre X o Z (espejo del shape)
  var MIRROR = { sq: 'sq', circ: 'circ', leafA: 'leafB', leafB: 'leafA' };
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
        var mesh = registerGlass(new THREE.Mesh(topGeos[keyName], glassMat(seed, 0.5 + (u - v) * 0.31)));
        var cy = topGeos[keyName].userData.cy;
        mesh.position.set(u, cy, v);
        addRim(mesh, 0.20 + 0.28 * seed);
        group.add(mesh);
        // (hoverInfo se asigna tras crear el objeto tile, abajo)
        var tileObj = {
          mesh: mesh, u: u, v: v, seed: seed, key: keyName, cy: cy,
          d: Math.max(Math.abs(u), Math.abs(v)) / (TOP_EXT - topCell / 2), // anillo CUADRADO (Chebyshev): 0.2/0.6/1.0
          jit: rnd() * 0.08, flip: null, ap: 1, cool: 0
        };
        mesh.userData.hoverInfo = { kind: 'top', tile: tileObj };
        tiles.push(tileObj);
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
        var mesh = registerGlass(new THREE.Mesh(morphGeos[0], glassMat(seed, 0.5 + (u - v) * 0.31)));
        mesh.position.set(u, morphGeos[0].userData.cy, v);
        addRim(mesh, 0.16 + 0.26 * seed);
        group.add(mesh);
        var mTile = { mesh: mesh, u: u, v: v, seed: seed, morph: ix / (MID_N - 1), cy: morphGeos[0].userData.cy, hoverP: 0, hovering: false,
          ring: Math.max(Math.abs(u), Math.abs(v)) / (MID_EXT - midCell / 2) };
        mesh.userData.hoverInfo = { kind: 'mid', tile: mTile };
        tiles.push(mTile);
      }
    }
    var sprite = makeLabelSprite('DATA TRANSFORMATION');
    group.add(sprite);
    return { group: group, tiles: tiles, sprite: sprite };
  }
  var midLayer = buildMidLayer();

  /* ---------- capa inferior: 4 placas fieles al still ----------
     Medidas tomadas del still (coords de pantalla normalizadas a=-1..1, b=-1..1
     sobre el diamante): N y S son CHEVRONES que siguen los bordes del diamante
     (la N con muesca en V en su vértice); E y O son hexágonos alargados. */
  function roundedPolyShape(pts, r) {
    var s = new THREE.Shape(), n = pts.length;
    function lerp(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; }
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      var l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var a = lerp(p1, p0, Math.min(0.49, r / l1));
      var b = lerp(p1, p2, Math.min(0.49, r / l2));
      if (i === 0) s.moveTo(a[0], a[1]); else s.lineTo(a[0], a[1]);
      s.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
    }
    s.closePath();
    return s;
  }
  // (a,b) pantalla-normalizada -> (u,v) plano
  var AB = 1.471, SQH = Math.SQRT1_2;
  function ab2uv(pts) {
    return pts.map(function (p) {
      var A2 = p[0] * AB, B2 = p[1] * AB;
      return [(A2 + B2) * SQH, (B2 - A2) * SQH];
    });
  }
  /* v15: formas EXACTAS del SVG de Igor (piso_inferior_forma_poligonos.svg).
     Dos estados por placa — EXPLOSIONADO (izq: 4 escudos alrededor de la caja)
     y COMPACTO (dcha: anillo-diamante con muescas en V) — con MORPH geométrico
     ligado a spread: remuestreo de ambos contornos a puntos equiespaciados,
     alineado por mínima distancia e interpolación lineal por vértice. */
  var PLATES_EXPLODED = [
    /* S */ [[0.222, 0.201], [-0.22, 0.201], [-0.385, 0.355], [-0.385, 0.459], [-0.059, 0.778], [0.056, 0.778], [0.375, 0.459], [0.375, 0.355]],
    /* N */ [[0.222, -0.268], [-0.22, -0.268], [-0.385, -0.422], [-0.385, -0.526], [-0.059, -0.845], [0.056, -0.845], [0.375, -0.526], [0.375, -0.422]],
    /* O */ [[-0.22, -0.245], [-0.22, 0.184], [-0.385, 0.339], [-0.5, 0.339], [-0.824, 0.017], [-0.824, -0.08], [-0.5, -0.409], [-0.395, -0.409]],
    /* E */ [[0.225, -0.245], [0.225, 0.184], [0.39, 0.339], [0.505, 0.339], [0.829, 0.017], [0.829, -0.08], [0.505, -0.409], [0.4, -0.409]]
  ];
  var PLATES_COMPACT = [
    /* S */ [[0.394, 0.371], [0.395, 0.484], [0.065, 0.814], [-0.056, 0.815], [-0.393, 0.484], [-0.393, 0.372], [-0.325, 0.308], [0.002, 0.637], [0.331, 0.307]],
    /* N */ [[0.058, -0.882], [0.395, -0.551], [0.395, -0.439], [0.329, -0.377], [0.002, -0.704], [-0.328, -0.373], [-0.393, -0.439], [-0.393, -0.551], [-0.063, -0.882]],
    /* O */ [[-0.412, -0.432], [-0.338, -0.363], [-0.666, -0.034], [-0.336, 0.297], [-0.401, 0.359], [-0.523, 0.359], [-0.862, 0.02], [-0.862, -0.086], [-0.524, -0.432]],
    /* E */ [[0.518, -0.432], [0.857, -0.086], [0.857, 0.02], [0.518, 0.358], [0.397, 0.359], [0.336, 0.302], [0.671, -0.034], [0.338, -0.367], [0.407, -0.432]]
  ];
  // v16: el conjunto de placas se CENTRA con la línea de su piso (el dibujo
  // iba un pelín al norte por el hueco de la caja, que ya no existe)
  function centerPlates(sets) {
    var minA = 1e9, maxA = -1e9, minB = 1e9, maxB = -1e9;
    sets.forEach(function (ab) { ab.forEach(function (p) {
      minA = Math.min(minA, p[0]); maxA = Math.max(maxA, p[0]);
      minB = Math.min(minB, p[1]); maxB = Math.max(maxB, p[1]);
    }); });
    var ca = (minA + maxA) / 2, cb = (minB + maxB) / 2;
    return sets.map(function (ab) { return ab.map(function (p) { return [p[0] - ca, p[1] - cb]; }); });
  }
  PLATES_EXPLODED = centerPlates(PLATES_EXPLODED);
  PLATES_COMPACT = centerPlates(PLATES_COMPACT);
  var PLATE_STEPS = 13, PLATE_PTS = 96;
  function plateLoop(ab) {
    var pts = roundedPolyShape(ab2uv(ab), 0.035).getSpacedPoints(PLATE_PTS);
    if (pts.length > PLATE_PTS) pts.pop();      // el último repite el primero
    var area = 0;                               // winding uniforme
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      area += p.x * q.y - q.x * p.y;
    }
    if (area < 0) pts.reverse();
    return pts;
  }
  function alignLoop(ref, pts) {   // desfase cíclico de mínima distancia al ref
    var n = ref.length, best = 0, bestD = Infinity;
    for (var k = 0; k < n; k++) {
      var d = 0;
      for (var i = 0; i < n; i++) {
        var q = pts[(i + k) % n];
        var dx = ref[i].x - q.x, dy = ref[i].y - q.y;
        d += dx * dx + dy * dy;
      }
      if (d < bestD) { bestD = d; best = k; }
    }
    var out = [];
    for (var j = 0; j < n; j++) out.push(pts[(j + best) % n]);
    return out;
  }
  var plateGeoPools = PLATES_EXPLODED.map(function (abE, i) {
    var e = plateLoop(abE), c = alignLoop(e, plateLoop(PLATES_COMPACT[i]));
    var pool = [];
    for (var s = 0; s < PLATE_STEPS; s++) {
      var t = s / (PLATE_STEPS - 1);            // 0 = explosionado … 1 = compacto
      var sh = new THREE.Shape();
      for (var j = 0; j < e.length; j++) {
        var x = e[j].x + (c[j].x - e[j].x) * t, y = e[j].y + (c[j].y - e[j].y) * t;
        if (j === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
      }
      sh.closePath();
      pool.push(extrude(sh, HEX_H, BEV));
    }
    return pool;
  });
  function buildHexLayer() {
    var group = new THREE.Group();
    var plates = [];
    PLATES_EXPLODED.forEach(function (ab, i) {
      var ca = 0;
      for (var k = 0; k < ab.length; k++) ca += ab[k][0];
      ca /= ab.length;                          // gradiente izq→dcha como los tiles
      var mesh = registerGlass(new THREE.Mesh(plateGeoPools[i][0], glassMat(0.30 + i * 0.08, 0.5 + ca * 0.31)));
      addRim(mesh, 0.32);
      mesh.userData.hoverInfo = { kind: 'hex' };
      mesh.userData.baseY = 0;
      group.add(mesh);
      plates.push(mesh);
    });
    // v16: SIN caja central (Igor: sobraba — no está en su SVG)
    var sprite = makeLabelSprite('DATA INTEGRATION');
    group.add(sprite);
    return { group: group, sprite: sprite, plates: plates };
  }
  var hexLayer = buildHexLayer();

  var layers = [
    { def: hexLayer, isHex: true },
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
  function startFlip(tile) {
    if (reduced || tile.flip || !tile.mesh.visible || tile.ap < 0.99) return false;
    var an = window.anime;
    if (!an || !an.animate) return false;
    var others = SHAPE_KEYS.filter(function (k) { return k !== tile.key; });
    tile.flip = {
      p: 0, axis: Math.random() < 0.5 ? 'x' : 'z', dir: Math.random() < 0.5 ? 1 : -1,
      swapped: false, lastDot: null,
      target: others[(Math.random() * others.length) | 0]
    };
    an.animate(tile.flip, {
      p: 1, duration: 1050, ease: 'inOutSine',
      onComplete: function () {
        tile.mesh.rotation.set(0, 0, 0);
        swapGeo(tile.mesh, topGeos[tile.flip.target]);
        tile.key = tile.flip.target;
        tile.flip = null;
      }
    });
    return true;
  }
  function spawnFlip() {   // ambiente: volteos esporádicos
    if (reduced || state.spread < 0.75) return;
    var active = 0, pool = [];
    for (var i = 0; i < topLayer.tiles.length; i++) {
      var t = topLayer.tiles[i];
      if (t.flip) active++;
      else if (t.mesh.visible && t.ap > 0.99) pool.push(t);
    }
    if (active >= 2 || !pool.length) return;
    startFlip(pool[(Math.random() * pool.length) | 0]);
  }
  if (!reduced) setInterval(spawnFlip, 900);

  /* ---------- interacción hover: volteo / morph / elevación ---------- */
  var raycaster = new THREE.Raycaster();
  var _ndc = new THREE.Vector2();
  var _lastRay = 0;
  function hoverMorph(tile) {
    if (reduced || tile.hovering) return;
    var an = window.anime;
    if (!an) return;
    tile.hovering = true;
    an.animate(tile, {
      hoverP: 1, duration: 320, ease: 'outQuad',
      onComplete: function () {
        an.animate(tile, { hoverP: 0, duration: 900, ease: 'inOutQuad',
          onComplete: function () { tile.hovering = false; } });
      }
    });
  }
  function hoverLift(mesh) {
    if (reduced || mesh.userData.lifting) return;
    var an = window.anime;
    if (!an) return;
    mesh.userData.lifting = true;
    an.animate(mesh.position, {
      y: mesh.userData.baseY + 0.11, duration: 360, ease: 'outQuad',
      onComplete: function () {
        an.animate(mesh.position, { y: mesh.userData.baseY, duration: 750, ease: 'inOutQuad',
          onComplete: function () { mesh.userData.lifting = false; } });
      }
    });
  }
  window.addEventListener('pointermove', function (e) {
    if (reduced) return;
    var now = performance.now();
    if (now - _lastRay < 60) return;
    _lastRay = now;
    var r = canvas.getBoundingClientRect();
    if (!r.width || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(_ndc, camera);
    var hits = raycaster.intersectObjects(glassMeshes, false);
    if (!hits.length) return;
    var info = hits[0].object.userData.hoverInfo;
    if (!info) return;
    if (info.kind === 'top') {
      if (now > (info.tile.cool || 0) && startFlip(info.tile)) info.tile.cool = now + 1400;
    } else if (info.kind === 'mid') {
      hoverMorph(info.tile);
    } else if (info.kind === 'hex') {
      hoverLift(hits[0].object);
    }
  }, { passive: true });

  /* ---------- sizing ---------- */
  var W = 0, H = 0, A = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = Math.round(r.width); H = Math.round(r.height || r.width * 9 / 16);
    var dpr = Math.min(window.devicePixelRatio || 1, (window.DATACORE && DATACORE.quality.dprMax) || 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, true);
    A = Math.min(W * 0.17, H / 5.4) * 1.10;   // +10% (petición de Igor)
    var PPW = A * Math.SQRT2;              // px por unidad de mundo
    camera.left = -W / PPW / 2; camera.right = W / PPW / 2;
    camera.top = H / PPW / 2; camera.bottom = -H / PPW / 2;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(dpr);
      composer.setSize(W, H);
    }
    if (fxaaPass) fxaaPass.material.uniforms.resolution.value.set(1 / (W * dpr), 1 / (H * dpr));
    if (blurPasses) for (var bpi = 0; bpi < blurPasses.length; bpi++) {
      blurPasses[bpi].material.uniforms.uTexel.value.set(1 / (W * dpr), 1 / (H * dpr));
    }
    var pr = (window.DATACORE && DATACORE.quality.preRes) || 0.6;
    backRT.setSize(Math.max(2, Math.round(W * dpr * pr)), Math.max(2, Math.round(H * dpr * pr)));
    var bw = Math.max(2, Math.round(W * dpr * 0.25)), bh = Math.max(2, Math.round(H * dpr * 0.25));
    blurRT1.setSize(bw, bh); blurRT2.setSize(bw, bh);
    blurMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
  }
  window.addEventListener('resize', resize);

  /* ---------- postprocesado: bloom sutil para el glare de los filos ---------- */
  var composer = null, bloomPass = null, fxaaPass = null, blurPasses = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
    renderer.setClearColor(0x000000, 1);   // la sección es negra: fondo opaco para el composer
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.5, 0.55);
    composer.addPass(bloomPass);
    // el composer trabaja en lineal: conversión sRGB al final
    if (THREE.ShaderPass && THREE.GammaCorrectionShader) {
      composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    }
    // v22: BLUR FINAL opcional (mando DATACORE.blur). Va al final del
    // composer, así que difumina TODA la escena pero NO las etiquetas
    // (el overlay se dibuja después, fuera del composer). Gaussiano
    // separable de 9 taps en dos pasadas H/V; desactivado con blur=0.
    var DirBlurShader = {
      uniforms: {
        tDiffuse: { value: null },
        uDir: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
        uRadius: { value: 0 }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse;',
        'uniform vec2 uDir;',
        'uniform vec2 uTexel;',
        'uniform float uRadius;',
        'varying vec2 vUv;',
        'void main() {',
        '  vec2 st = uDir * uTexel * uRadius;',
        '  vec4 c = texture2D(tDiffuse, vUv) * 0.227027;',
        '  c += (texture2D(tDiffuse, vUv + st * 1.0) + texture2D(tDiffuse, vUv - st * 1.0)) * 0.1945946;',
        '  c += (texture2D(tDiffuse, vUv + st * 2.0) + texture2D(tDiffuse, vUv - st * 2.0)) * 0.1216216;',
        '  c += (texture2D(tDiffuse, vUv + st * 3.0) + texture2D(tDiffuse, vUv - st * 3.0)) * 0.054054;',
        '  gl_FragColor = c;',
        '}'
      ].join('\n')
    };
    // v20: ANTIALIASING — los render targets del composer no tienen MSAA
    // (el antialias:true del renderer solo aplica al canvas directo), así
    // que sin esto los cantos salen pixelados. FXAA tras la pasada gamma
    // (espera entrada sRGB); resolution se actualiza en resize().
    if (THREE.ShaderPass && THREE.FXAAShader) {
      fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      composer.addPass(fxaaPass);
    }
    // v23: MSAA real a través del composer (WebGL2): sus render targets
    // aceptan 'samples'; al cambiarlas hay que dispose para reasignar los FBO
    if (renderer.capabilities.isWebGL2) setMsaa(4);
    if (THREE.ShaderPass) {
      // dos iteraciones H/V: blurs pequeños repetidos ≈ gaussiano sin bandas
      blurPasses = [];
      for (var bi = 0; bi < 4; bi++) {
        var bp = new THREE.ShaderPass(DirBlurShader);
        bp.material.uniforms.uDir.value.set(bi % 2 === 0 ? 1 : 0, bi % 2 === 0 ? 0 : 1);
        bp.enabled = false;
        composer.addPass(bp);
        blurPasses.push(bp);
      }
    }
  }

  function setMsaa(n) {
    if (!composer || !renderer.capabilities.isWebGL2) return;
    n = Math.max(0, Math.min(8, Math.round(n)));
    composer.renderTarget1.samples = n;
    composer.renderTarget2.samples = n;
    composer.renderTarget1.dispose();   // el próximo render reasigna los FBO
    composer.renderTarget2.dispose();   // leyendo el nuevo .samples
  }

  /* ---------- render loop ---------- */
  var t0 = performance.now();
  var SEPK = 1 / (Math.cos(31.3 * Math.PI / 180) * Math.SQRT2);
  var VIEW = camera.position.clone().normalize();
  var _wp = new THREE.Vector3();
  function render(now) {
    var t = (now - t0) / 1000;
    mouse.cx += (mouse.x - mouse.cx) * 0.055;
    mouse.cy += (mouse.y - mouse.cy) * 0.055;
    root.rotation.y = -mouse.cx * 0.22;
    root.rotation.x = mouse.cy * 0.05;

    // v17: compacto = UN SOLO PLANO de verdad — las líneas (solidarias a su
    // piso) quedan a <1px y se ven como UNA; el reparto concéntrico evita que
    // las piezas se pisen (epsilon 0.004 solo para no coplanar exacto)
    var sep = (0.004 + (1.28 - 0.004) * state.spread) * SEPK;
    // FUSIÓN como el vídeo: al colapsar, la capa superior se abre en anillo
    // (los tiles interiores desaparecen), la media se encoge y anida dentro
    var inv = 1 - state.spread;
    // fusión concéntrica (Igor): arriba al CENTRO, media en ANILLO, abajo ALREDEDOR
    var topScale = 1 - 0.52 * inv;      // la capa superior se encoge al centro
    var midScale = 1 - 0.22 * inv;      // la media se encoge un poco…
    var midHole = 0.68 * inv;           // …y vacía su núcleo (queda en anillo)
    var plateIdx = Math.round(inv * (PLATE_STEPS - 1)); // morph escudos↔anillo (SVG de Igor)

    for (var li = 0; li < 3; li++) {
      var L = layers[li], def = L.def;
      var bob = reduced ? 0 : Math.sin(t * 0.6) * (0.009 + 0.003 * li) * state.spread; // fase común: flotación coordinada
      def.group.position.y = (li - 1) * sep + bob;

      // v16: la línea es el SUELO transparente de su piso — va SOLIDARIA a la
      // capa (hija del grupo, sin contra-offset): las piezas nunca se le
      // adelantan ni atrasan; en compacto casi coinciden (sepMin 0.035)
      L.outline.position.y = 0;

      if (L.isHex) {
        for (var pi = 0; pi < def.plates.length; pi++) {
          var pm = def.plates[pi];
          if (pm.geometry !== plateGeoPools[pi][plateIdx]) swapGeo(pm, plateGeoPools[pi][plateIdx]);
        }
      }

      // v16: TODAS las etiquetas desaparecen al juntarse los pisos
      var alpha = state.label;
      def.sprite.material.opacity = alpha;
      def.sprite.visible = alpha > 0.01;
      var sw = def.sprite.userData.aspect, sh = 0.1275;  // v18: etiquetas +50%
      def.sprite.scale.set(sh * sw, sh, 1);
      def.sprite.position.set(0, (L.isHex ? HEX_H : TILE_H) + 0.06, 0);

      if (L.isTop) {
        for (var i = 0; i < def.tiles.length; i++) {
          var tile = def.tiles[i];
          tile.ap = 1;
          tile.mesh.visible = true;
          tile.mesh.position.x = tile.u * topScale;
          tile.mesh.position.z = tile.v * topScale;
          var sc = topScale;
          var lift = 0;
          if (tile.flip) {
            var f = tile.flip;
            lift = Math.sin(f.p * Math.PI) * 0.16;
            var ang = f.p * Math.PI * f.dir;
            // el cambio de forma ocurre EXACTAMENTE cuando la cara queda de canto
            // respecto a la cámara: cruce por cero de dot(normal girada, vista)
            var nDotV;
            if (f.axis === 'x') nDotV = Math.cos(ang) * VIEW.y + Math.sin(ang) * VIEW.z;
            else nDotV = Math.cos(ang) * VIEW.y - Math.sin(ang) * VIEW.x;
            if (!f.swapped && f.lastDot !== null && f.lastDot > 0 !== nDotV > 0) {
              // de canto respecto a la cámara: montamos el ESPEJO del destino,
              // que girado 180° se verá como el destino real
              swapGeo(tile.mesh, topGeos[MIRROR[f.target]]);
              f.swapped = true;
            }
            f.lastDot = nDotV;
            tile.mesh.rotation[f.axis === 'x' ? 'x' : 'z'] = ang;
            // encoge en mitad del giro: el swap pasa con la pieza pequeña y de canto
            sc *= 1 - 0.22 * Math.sin(f.p * Math.PI);
          }
          tile.mesh.scale.set(sc, sc, sc);
          tile.mesh.position.y = tile.cy + lift;
        }
      } else if (L.isMorph) {
        // frontera diagonal que barre el grid (como el vídeo): a un lado círculos,
        // al otro cuadrados; la línea oscila con state.wave
        var front = reduced ? 0.3 : Math.sin(state.wave * Math.PI * 2) * 0.85;
        for (var j = 0; j < def.tiles.length; j++) {
          var mt = def.tiles[j];
          var aScr = (mt.u - mt.v) / 1.6;          // −1..1 eje horizontal de pantalla
          var p = Math.max(0, Math.min(1, 0.5 + (front - aScr + (mt.seed - 0.5) * 0.18) * 2.6 + mt.hoverP));
          var idx = Math.round(p * (MORPH_STEPS - 1));
          if (mt.mesh.geometry !== morphGeos[idx]) swapGeo(mt.mesh, morphGeos[idx]);
          var mAp = Math.max(0, Math.min(1, (mt.ring - midHole) / 0.12));
          mt.mesh.visible = mAp > 0.01;
          if (!mt.mesh.visible) continue;
          mt.mesh.position.x = mt.u * midScale;
          mt.mesh.position.z = mt.v * midScale;
          mt.mesh.scale.setScalar(midScale * (0.55 + 0.45 * mAp));
        }
      }
      L.outline.material.opacity = 0.30 + 0.25 * state.spread;
    }
    underLight.intensity = 0.5 + 0.8 * state.spread;

    // aplica los mandos en vivo (window.DATACORE)
    applyTune(state.spread);

    // centro de cada pieza en uv de pantalla (para la lente por pieza)
    for (var ci = 0; ci < glassMeshes.length; ci++) {
      var cm = glassMeshes[ci];
      if (!cm.visible) continue;
      cm.getWorldPosition(_wp);
      _wp.project(camera);
      cm.material.uniforms.uCenter.value.set(_wp.x * 0.5 + 0.5, _wp.y * 0.5 + 0.5);
    }

    // PRE-PASE: escena con materiales simples + fondo de estudio → backRT
    bgQuad.visible = true;
    bgQuad.quaternion.copy(camera.quaternion);
    bgQuad.position.copy(VIEW).multiplyScalar(-8);
    bgQuad.scale.set((camera.right - camera.left) * 1.1, (camera.top - camera.bottom) * 1.1, 1);
    var gi;
    for (gi = 0; gi < glassMeshes.length; gi++) {
      var gm = glassMeshes[gi];
      gm.userData.mainMat = gm.material;
      gm.material = gm.material.userData.preMat;
    }
    renderer.setRenderTarget(backRT);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);
    // frost: difumina el backdrop en dos pasadas separables
    blurPass(backRT, blurRT1, 1, 0);
    blurPass(blurRT1, blurRT2, 0, 1);
    renderer.setRenderTarget(null);
    for (gi = 0; gi < glassMeshes.length; gi++) {
      glassMeshes[gi].material = glassMeshes[gi].userData.mainMat;
    }
    bgQuad.visible = false;

    if (composer) composer.render(); else renderer.render(scene, camera);

    // OVERLAY de etiquetas: capa 1, sin bloom ni cristal por delante
    renderer.autoClear = false;
    renderer.clearDepth();
    camera.layers.set(1);
    renderer.render(scene, camera);
    camera.layers.set(0);
    renderer.autoClear = true;

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

  /* ---------- MANDOS EN VIVO (edítalos en la consola): window.DATACORE ---------- */
  var TUNE = window.DATACORE = {
    // defaults calibrados por Igor (2026-08-31, 3ª pasada)
    tint:        { r: 1.8, g: 1.8, b: 1.8 },  // tinte global del cristal
    transmission: 0.43,   // cuánto backdrop se ve a través (base)
    transmissionSpread: 0.14, // extra al explotar
    refract:     0.13,    // multiplicador de la refracción
    frost:       0.61,    // blur de la refracción (0 nítido → 1 esmerilado)
    frostRadius: 0.98,    // radio del blur
    pieceMag:    0.71,    // lupa por pieza (<1 magnifica lo de detrás)
    pieceShift:  0.11,    // desvío propio de cada pieza (0 = lámina única)
    fresnel:     0.44,    // blanco lechoso de los cantos
    topClear:    0.92,    // 1 = tapa totalmente transparente
    topDarken:   0.43,    // brillo de lo que se ve a través de la tapa
    edgeWhite:   0.44,    // blanco extra SOLO en el anillo del bisel
    skyTop:      '#eef4ff', // color fresnel arriba
    skyHorizon:  '#8e9aad', // color fresnel horizonte
    iri:         0.08,    // iridiscencia (arcoíris)
    body:        0.87,    // brillo del cuerpo (tapas)
    rim:         1.16,    // multiplicador de los filos de luz
    pre:         0.79,    // brillo de lo que se ve A TRAVÉS (escena del pre-pase)
    backdrop:    '#e6ecf5', // tinte del fondo de estudio (multiplica su textura)
    bloom:       { strength: 0.16, radius: 0.26, threshold: 0.35 },
    // v21: mandos de nitidez — defaults de Igor (2026-09-01): FXAA off,
    // pre-pase a resolución completa (lo ve más limpio así)
    // msaa = MUESTRAS de multisampling reales (0/2/4/8, WebGL2) sobre el
    // render target del composer — AA nítido, sin el suavizado del FXAA
    quality:     { fxaa: 0, msaa: 4, dprMax: 2, preRes: 1 },
    // v22: blur final de la escena (px) — NO afecta a las etiquetas,
    // que se dibujan en el overlay después del composer.
    // v24: Igor lo devuelve a 0 (el pixelado quedó arreglado con MSAA 4)
    blur:        0,
    help: function () {
      console.log('%cDATACORE — mandos en vivo','font-weight:bold', DATACORE);
      console.log('Ej.: DATACORE.tint={r:0.85,g:0.95,b:1.3}; DATACORE.fresnel=1.1; DATACORE.refract=1.6; DATACORE.skyTop="#dbe9ff"; DATACORE.bloom.strength=0.6; DATACORE.rim=1.4; DATACORE.copy() para exportar');
    },
    copy: function () {
      var out = JSON.stringify(DATACORE, function (k, v) { return typeof v === 'function' ? undefined : v; }, 2);
      console.log(out);
      return out;
    }
  };
  var _skyTopC = new THREE.Color(), _skyHzC = new THREE.Color(), _lastRim = -1, _lastPre = -1;
  function applyTune(sprd) {
    _skyTopC.set(TUNE.skyTop); _skyHzC.set(TUNE.skyHorizon);
    var trans = TUNE.transmission + TUNE.transmissionSpread * sprd;
    for (var i = 0; i < glassMats.length; i++) {
      var u = glassMats[i].uniforms, ud = glassMats[i].userData;
      u.uTransmission.value = trans;
      u.uRefract.value = ud.baseRefract * TUNE.refract;
      u.uFres.value = TUNE.fresnel;
      u.uFrost.value = TUNE.frost;
      u.uMag.value = TUNE.pieceMag;
      u.uShift.value = TUNE.pieceShift;
      u.uTopClear.value = TUNE.topClear;
      u.uTopDarken.value = TUNE.topDarken;
      u.uEdgeWhite.value = TUNE.edgeWhite;
      u.uIri.value = TUNE.iri;
      u.uSkyTop.value.copy(_skyTopC);
      u.uSkyHz.value.copy(_skyHzC);
      u.uTint.value.setRGB(TUNE.tint.r, TUNE.tint.g, TUNE.tint.b);
      u.uBody.value.copy(ud.baseBody).multiplyScalar(TUNE.body);
      if (TUNE.pre !== _lastPre) ud.preMat.color.copy(ud.basePre).multiplyScalar(TUNE.pre);
    }
    if (TUNE.pre !== _lastPre) _lastPre = TUNE.pre;
    if (TUNE.rim !== _lastRim) {
      _lastRim = TUNE.rim;
      for (var m = 0; m < glassMeshes.length; m++) {
        var rimLine = glassMeshes[m].userData.rim;
        if (rimLine) {
          if (rimLine.userData.baseOp === undefined) rimLine.userData.baseOp = rimLine.material.opacity;
          rimLine.material.opacity = Math.min(1, rimLine.userData.baseOp * TUNE.rim);
        }
      }
    }
    bgQuad.material.color.set(TUNE.backdrop);
    blurMat.uniforms.uRadius.value = TUNE.frostRadius;
    if (bloomPass) {
      bloomPass.strength = TUNE.bloom.strength;
      bloomPass.radius = TUNE.bloom.radius;
      bloomPass.threshold = TUNE.bloom.threshold;
    }
    // v21: nitidez en vivo — fxaa on/off y, si cambian dpr/preRes, resize
    if (fxaaPass) fxaaPass.enabled = !!(+TUNE.quality.fxaa);
    if (TUNE.quality.msaa !== _lastQ.msaa) { _lastQ.msaa = TUNE.quality.msaa; setMsaa(+TUNE.quality.msaa); }
    if (blurPasses) {
      var bl = +TUNE.blur || 0;
      var r1 = Math.min(bl, 1.4), r2 = bl * 0.55;   // iteración 2 solo en radios grandes
      for (var bj = 0; bj < 4; bj++) {
        var on = bj < 2 ? bl > 0.01 : bl > 1.4;
        blurPasses[bj].enabled = on;
        blurPasses[bj].material.uniforms.uRadius.value = bj < 2 ? r1 : r2;
      }
    }
    if (TUNE.quality.dprMax !== _lastQ.dprMax || TUNE.quality.preRes !== _lastQ.preRes) {
      _lastQ.dprMax = TUNE.quality.dprMax; _lastQ.preRes = TUNE.quality.preRes;
      resize();
    }
  }
  var _lastQ = { dprMax: 2, preRes: 1, msaa: 4 };
  console.log('%cDATACORE%c listo: edita los materiales en vivo desde la consola. Escribe DATACORE.help()',
    'font-weight:bold;color:#5cfe50', '');

  window.__datacore3d = { state: state, renderer: renderer };

  /* ---------- go ---------- */
  resize();
  startTimeline();
  requestAnimationFrame(render);
})();
