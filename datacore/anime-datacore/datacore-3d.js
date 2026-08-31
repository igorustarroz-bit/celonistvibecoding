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
      map: tex, transparent: true, depthTest: false, toneMapped: false
    }));
    sp.renderOrder = 10;
    sp.layers.set(1);   // capa de overlay: se renderiza aparte, sin efectos
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
        var mesh = registerGlass(new THREE.Mesh(morphGeos[0], glassMat(seed, 0.5 + (u - v) * 0.31)));
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
      var mesh = registerGlass(new THREE.Mesh(geo, glassMat(0.30, 0.5 + hx.a * 0.55)));
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
    var others = SHAPE_KEYS.filter(function (k) { return k !== tile.key; });
    tile.flip = {
      p: 0, axis: Math.random() < 0.5 ? 'x' : 'z', dir: Math.random() < 0.5 ? 1 : -1,
      swapped: false, lastDot: null,
      target: others[(Math.random() * others.length) | 0]   // forma final del volteo
    };
    var an = window.anime;
    if (an && an.animate) {
      an.animate(tile.flip, {
        p: 1, duration: 1050, ease: 'inOutSine',
        onComplete: function () {
          // aterrizada a 180° se ve MIRROR[target]; en rotación 0 con la geometría
          // target es exactamente la misma silueta => sin salto
          tile.mesh.rotation.set(0, 0, 0);
          swapGeo(tile.mesh, topGeos[tile.flip.target]);
          tile.key = tile.flip.target;
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
    backRT.setSize(Math.round(W * dpr * 0.6), Math.round(H * dpr * 0.6));
    var bw = Math.max(2, Math.round(W * dpr * 0.25)), bh = Math.max(2, Math.round(H * dpr * 0.25));
    blurRT1.setSize(bw, bh); blurRT2.setSize(bw, bh);
    blurMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
  }
  window.addEventListener('resize', resize);

  /* ---------- postprocesado: bloom sutil para el glare de los filos ---------- */
  var composer = null, bloomPass = null;
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
    edgeWhite:   0.53,    // blanco extra SOLO en el anillo del bisel
    skyTop:      '#eef4ff', // color fresnel arriba
    skyHorizon:  '#8e9aad', // color fresnel horizonte
    iri:         0.08,    // iridiscencia (arcoíris)
    body:        0.87,    // brillo del cuerpo (tapas)
    rim:         1.16,    // multiplicador de los filos de luz
    pre:         0.79,    // brillo de lo que se ve A TRAVÉS (escena del pre-pase)
    backdrop:    '#e6ecf5', // tinte del fondo de estudio (multiplica su textura)
    bloom:       { strength: 0.16, radius: 0.26, threshold: 0.35 },
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
  }
  console.log('%cDATACORE%c listo: edita los materiales en vivo desde la consola. Escribe DATACORE.help()',
    'font-weight:bold;color:#5cfe50', '');

  window.__datacore3d = { state: state, renderer: renderer };

  /* ---------- go ---------- */
  resize();
  startTimeline();
  requestAnimationFrame(render);
})();
