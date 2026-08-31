/* Celonis hero earth — dashed particle globe, Canvas 2D + anime.js
   Replaces /src/assets/videos/commercial-earth-hero.mp4
   Requires: landmask.js (LANDMASK), anime.umd.min.js (AnimeJS) */
(function () {
  'use strict';

  // ---------- Config ----------
  var CFG = {
    latStepDeg: 1.0,         // latitude row spacing (degrees)
    radiusRatio: 0.4775,     // sphere radius / canvas size
    dashLenDeg: 0.85,        // max dash length on the sphere surface (degrees of arc)
    dashAngleDeg: 40,        // dash tilt on the surface: 0 = along meridians, 40 ≈ "/" slashes
    dotFloor: 0.22,          // min dash length fraction (dim water renders as near-dots)
    dashWidthRatio: 0.0015,  // dash stroke width / canvas size
    tiltDeg: 21,             // axis tilt toward viewer
    rollDeg: 7,              // slow lateral wobble amplitude
    spinPeriodMs: 21600,     // full revolution (~100°/6s like the video)
    wobblePeriodMs: 26000,
    // drag interaction
    dragPitchMin: -25,       // min extra tilt from vertical drag (deg)
    dragPitchMax: 40,        // max extra tilt from vertical drag (deg)
    inertiaMaxMs: 3200,      // longest glide after a flick
    inertiaMinMs: 350,       // shortest glide
    flickMinVel: 0.00008,    // rad/ms below which a release just resumes auto-spin
    landBase: 0.30,          // land dash brightness (continents are the lit side)
    oceanBase: 0.09,         // ocean dash brightness (dark, near-invisible dots)
    coastBoost: 0.85,        // extra brightness for land cells hugging the coastline
    lightDir: [-0.30, 0.62, 0.72],
    entranceMs: 1800,
    // blur / bloom (to match the soft focus of the original video)
    softBlurPx: 0.6,         // subtle CSS blur over the whole canvas (CSS px; 0 disables)
    bloomStrength: 0.55,     // halo intensity around bright dashes (0 disables)
    bloomWidth: 3.4,         // halo width as a multiple of the dash width
    bloomFrom: 0.5,          // only dashes above this brightness fraction get a halo
    // cursor spot (desktop / fine pointer only) — a cap ON the sphere surface:
    // the cursor is projected onto the globe and dashes are affected by their
    // geodesic distance to that point, so the spot foreshortens near the limb
    spotAngleDeg: 23,        // angular radius of the cap on the sphere (0 disables)
    spotStrength: 0.3,       // extra brightness at the center (gradient: 100% center → 0 edge)
    spotLandFactor: 0.1,     // how much the dark land dashes light up (vs ocean)
    spotBulge: 0.045,        // lift along the sphere normal at the cap center (fraction of R)
    spotNeedlePow: 400,      // lift profile exponent: high = needle (sharp peak, curved base); 1 = cone; ~0.5 = bubble
    spotFadeMs: 250          // fade in/out when the cursor enters/leaves (also settles the lift back)
  };

  // ---------- Land mask ----------
  var MW = LANDMASK.W, MH = LANDMASK.H;
  var maskBytes = (function () {
    var bin = atob(LANDMASK.data), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  })();
  function isLand(ix, iy) {
    if (iy < 0) iy = 0; if (iy >= MH) iy = MH - 1;
    ix = ((ix % MW) + MW) % MW;
    var i = iy * MW + ix;
    return (maskBytes[i >> 3] >> (i & 7)) & 1;
  }
  function landAt(lonDeg, latDeg) {
    var ix = Math.floor((lonDeg + 180) / 360 * MW);
    var iy = Math.floor((90 - latDeg) / 180 * MH);
    return isLand(ix, iy);
  }
  // distance (in mask cells, chebyshev, max 3) to opposite terrain — for coast glow
  var COAST_MAX = 3;
  function coastDist(lonDeg, latDeg) {
    var ix = Math.floor((lonDeg + 180) / 360 * MW);
    var iy = Math.floor((90 - latDeg) / 180 * MH);
    var me = isLand(ix, iy);
    for (var r = 1; r <= COAST_MAX; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (isLand(ix + dx, iy + dy) !== me) return r;
        }
      }
    }
    return COAST_MAX + 1;
  }
  // cheap smooth value-noise on the sphere for blotchy ocean sheen
  function blotch(lonDeg, latDeg) {
    var x = lonDeg * 0.09, y = latDeg * 0.11;
    var v = Math.sin(x * 1.7 + Math.sin(y * 2.3)) * Math.cos(y * 1.9 - Math.sin(x * 1.3));
    return v * 0.5 + 0.5; // 0..1
  }

  // ---------- Build particles ----------
  // Regular lat/lon grid with ALIGNED columns, like the original Celonis video:
  // the same longitudes on every row produce the clean columns, moiré and the
  // concentric compression toward the poles that give the original its look.
  // Each particle: unit position p, dash direction d, baseAlpha, land flag.
  var P = [];   // flat: px,py,pz, dx,dy,dz, base, land
  (function build() {
    var step = CFG.latStepDeg;
    var rand = mulberry32(1337);
    for (var lat = -90 + step / 2; lat < 90; lat += step) {
      var phi = lat * Math.PI / 180;
      var cphi = Math.cos(phi);
      // uniform arc spacing per row (fewer dashes toward the poles), no random
      // offset: neighbouring rows stay near-aligned → the original's moiré look
      var n = Math.max(1, Math.round(360 / step * cphi));
      for (var k = 0; k < n; k++) {
        var lon = -180 + (k + 0.5) * 360 / n;
        var lam = lon * Math.PI / 180;
        var px = cphi * Math.sin(lam), py = Math.sin(phi), pz = cphi * Math.cos(lam);
        // north tangent (d/dphi)
        var tx = -Math.sin(phi) * Math.sin(lam), ty = Math.cos(phi), tz = -Math.sin(phi) * Math.cos(lam);
        var land = landAt(lon, lat);
        var base;
        if (land) {
          // continents: lit, with brighter fringe along the coastline
          var v = rand();
          base = CFG.landBase * (0.45 + 1.2 * v * v);
          var d = coastDist(lon, lat);
          if (d <= COAST_MAX) base += CFG.coastBoost * Math.pow(1 - (d - 1) / COAST_MAX, 2) * (0.6 + 0.5 * rand());
          base *= 0.9 + 0.2 * blotch(lon, lat);
        } else {
          // open water: dark, sparse near-dots
          base = CFG.oceanBase * (0.6 + 0.8 * rand());
        }
        // dash direction: north tangent rotated dashAngleDeg toward east ("/" slashes)
        var aRot = CFG.dashAngleDeg * Math.PI / 180;
        var ca = Math.cos(aRot), sa = Math.sin(aRot);
        var ex3 = Math.cos(lam), ez3 = -Math.sin(lam); // east tangent (ey3 = 0)
        var dx3 = ca * tx + sa * ex3, dy3 = ca * ty, dz3 = ca * tz + sa * ez3;
        P.push(px, py, pz, dx3, dy3, dz3, base, land);
      }
    }
  })();
  var COUNT = P.length / 8;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Canvas ----------
  var canvas = document.getElementById('earth-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var size = 0, dpr = 1;
  if (CFG.softBlurPx > 0) canvas.style.filter = 'blur(' + CFG.softBlurPx + 'px)';

  // cursor flashlight state (desktop / fine pointer only)
  var FINE_POINTER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  var spot = { nx: 0.5, ny: 0.5, on: 0 };

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(2, rect.width), h = Math.max(2, rect.height || rect.width);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // keep internal buffer square like the original 1702x1702 video, capped for perf
    size = Math.min(Math.round(Math.max(w, h) * dpr), 1702);
    if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Animation state (driven by anime.js) ----------
  var state = { spin: 0, wobble: 0, rise: 1, alpha: 0, scale: 0.94, dragLon: 0, pitch: 0 };
  var LEVELS = 14;
  var buckets = new Array(LEVELS);

  var lightLen = Math.hypot(CFG.lightDir[0], CFG.lightDir[1], CFG.lightDir[2]);
  var LX = CFG.lightDir[0] / lightLen, LY = CFG.lightDir[1] / lightLen, LZ = CFG.lightDir[2] / lightLen;

  function draw() {
    var R = size * CFG.radiusRatio * state.scale;
    var cx = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);
    if (state.alpha <= 0.005) return;

    var tilt = (CFG.tiltDeg + state.pitch) * Math.PI / 180;
    var roll = Math.sin(state.wobble * 2 * Math.PI) * CFG.rollDeg * Math.PI / 180;
    var spin = state.spin * 2 * Math.PI + state.dragLon;

    // M = Rz(roll) * Rx(tilt) * Ry(spin)
    var cs = Math.cos(spin), ss = Math.sin(spin);
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    var cr = Math.cos(roll), sr = Math.sin(roll);
    // Ry
    var a00 = cs, a02 = ss, a20 = -ss, a22 = cs;
    // Rx * Ry
    var b00 = a00, b01 = 0, b02 = a02;
    var b10 = st * a20, b11 = ct, b12 = st * a22;
    var b20 = -(-st) * 0 + ct * a20, b21 = -st, b22 = ct * a22; // Rx: [1,0,0; 0,ct,-st; 0,st,ct] — careful below
    // recompute properly:
    // Rx = [[1,0,0],[0,ct,-st],[0,st,ct]]
    b10 = ct * 0 + (-st) * a20; b11 = ct * 1 + (-st) * 0; b12 = ct * 0 + (-st) * a22;
    b10 = -st * a20; b11 = ct; b12 = -st * a22;
    b20 = st * 0 + ct * a20; b21 = st * 1 + ct * 0; b22 = st * 0 + ct * a22;
    b20 = ct * a20; b21 = st; b22 = ct * a22;
    // Rz * (Rx*Ry) ; Rz = [[cr,-sr,0],[sr,cr,0],[0,0,1]]
    var m00 = cr * b00 - sr * b10, m01 = cr * b01 - sr * b11, m02 = cr * b02 - sr * b12;
    var m10 = sr * b00 + cr * b10, m11 = sr * b01 + cr * b11, m12 = sr * b02 + cr * b12;
    var m20 = b20, m21 = b21, m22 = b22;

    var dashHalf = CFG.dashLenDeg * Math.PI / 180 / 2; // radians on unit sphere
    var lw = Math.max(0.8, size * CFG.dashWidthRatio);
    var yOffset = state.rise * size * 0.10;

    // project the cursor onto the sphere (view space) for the surface spot
    var spotActive = FINE_POINTER && CFG.spotAngleDeg > 0 && spot.on > 0.01;
    var scx = 0, scy = 0, scz = 0, cosA0 = 0, invA = 0;
    if (spotActive) {
      var ux = (spot.nx * size - cx) / R;
      var uy = (cy + yOffset - spot.ny * size) / R;
      var uq = Math.sqrt(ux * ux + uy * uy);
      if (uq > 1.2) {
        spotActive = false; // cursor too far off the globe
      } else {
        if (uq > 0.9995) { ux *= 0.9995 / uq; uy *= 0.9995 / uq; } // clamp to the limb
        scx = ux; scy = uy;
        scz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
        cosA0 = Math.cos(CFG.spotAngleDeg * Math.PI / 180);
        invA = 1 / (1 - cosA0);
      }
    }

    for (var L = 0; L < LEVELS; L++) buckets[L] = null;

    for (var i = 0; i < COUNT; i++) {
      var o = i * 8;
      var px = P[o], py = P[o + 1], pz = P[o + 2];
      var x = m00 * px + m01 * py + m02 * pz;
      var y = m10 * px + m11 * py + m12 * pz;
      var z = m20 * px + m21 * py + m22 * pz;
      if (z < 0.015) continue;

      var txv = P[o + 3], tyv = P[o + 4], tzv = P[o + 5];
      var tX = m00 * txv + m01 * tyv + m02 * tzv;
      var tY = m10 * txv + m11 * tyv + m12 * tzv;

      // brightness: base * diffuse + limb fresnel
      var ndl = x * LX + y * LY + z * LZ;
      if (ndl < 0) ndl = 0;
      var diffuse = 0.52 + 0.48 * Math.pow(ndl, 1.25);
      var fres = 1 - z;
      var alpha = P[o + 6] * diffuse + fres * fres * 0.42 * (0.5 + P[o + 6]);

      var sx = cx + x * R, sy = cy - y * R + yOffset;

      // surface spot: geodesic falloff on the sphere (cap), so it foreshortens
      // near the limb; gradient runs 100% at the center → 0 at the cap edge.
      // The cap lifts along the sphere normal (p → p·(1+mag)); everything is
      // scaled by spot.on, so the pointerleave fade settles the grid back.
      var lens = 1;
      if (spotActive) {
        var cang = x * scx + y * scy + z * scz; // cos(angular distance) to the cursor point
        if (cang > cosA0) {
          var f = (cang - cosA0) * invA;        // 0 at edge → 1 at center
          var fs = f * f * (3 - 2 * f) * spot.on; // light: smoothstep gradient (100% → 0)
          alpha += CFG.spotStrength * fs * (P[o + 7] ? 1 : CFG.spotLandFactor); // dark water barely reveals
          // lift: needle profile — sharp spike at the center easing into the base
          var mag = CFG.spotBulge * Math.pow(f, CFG.spotNeedlePow) * spot.on;
          var lift = 1 + mag;
          sx = cx + x * R * lift;
          sy = cy - y * R * lift + yOffset;
          lens = 1 + mag * 1.5; // dashes grow as they rise toward the viewer
        }
      }

      alpha *= state.alpha;
      if (alpha < 0.02) continue;
      if (alpha > 1) alpha = 1;

      // dash length follows brightness: dim open water = near-dot, bright coasts = full slash
      var lf = CFG.dotFloor + (1 - CFG.dotFloor) * Math.min(1, P[o + 6] * 1.6);
      var ex = tX * dashHalf * R * lens * lf, ey = -tY * dashHalf * R * lens * lf;

      var Lv = (alpha * (LEVELS - 1) + 0.5) | 0;
      var b = buckets[Lv] || (buckets[Lv] = new Path2D());
      b.moveTo(sx - ex, sy - ey);
      b.lineTo(sx + ex, sy + ey);
    }

    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    for (var Lv2 = 1; Lv2 < LEVELS; Lv2++) {
      if (!buckets[Lv2]) continue;
      ctx.strokeStyle = 'rgba(255,255,255,' + (Lv2 / (LEVELS - 1)).toFixed(3) + ')';
      ctx.stroke(buckets[Lv2]);
    }

    // bloom: re-stroke the brighter dashes wider and faint, additively — a cheap halo
    // (a real gaussian blur pass costs >100ms without GPU; this is ~1ms and looks close)
    if (CFG.bloomStrength > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineWidth = lw * CFG.bloomWidth;
      var from = Math.max(1, Math.round((LEVELS - 1) * CFG.bloomFrom));
      for (var Lv3 = from; Lv3 < LEVELS; Lv3++) {
        if (!buckets[Lv3]) continue;
        var haloA = CFG.bloomStrength * 0.16 * (Lv3 / (LEVELS - 1)) * state.alpha;
        ctx.strokeStyle = 'rgba(255,255,255,' + haloA.toFixed(3) + ')';
        ctx.stroke(buckets[Lv3]);
      }
      ctx.restore();
    }
  }

  // ---------- anime.js drives everything ----------
  var A = (window.anime && window.anime.animate) ? window.anime : window.AnimeJS;
  var animate = A.animate;

  // render loop: always drawing, independent of spin being paused by a drag
  animate({ t: 0 }, { t: 1, duration: 1000, ease: 'linear', loop: true, onUpdate: draw });

  // continuous auto-spin (linear, loops forever; paused while the user drags)
  var spinAnim = animate(state, {
    spin: 1,
    duration: CFG.spinPeriodMs,
    ease: 'linear',
    loop: true
  });
  // slow wobble
  animate(state, {
    wobble: 1,
    duration: CFG.wobblePeriodMs,
    ease: 'linear',
    loop: true
  });
  // entrance: fade in + rise + settle scale
  animate(state, {
    rise: 0,
    alpha: 1,
    scale: 1,
    duration: CFG.entranceMs,
    ease: 'outCubic'
  });

  // ---------- drag interaction (mouse + touch) with inertia ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function cssRadius() {
    var rect = canvas.getBoundingClientRect();
    return Math.max(60, rect.width * CFG.radiusRatio * state.scale);
  }

  var dragging = false, dragId = null;
  var lastX = 0, lastY = 0;
  var hist = []; // recent {t, lon} samples for release-velocity
  var inertiaAnim = null;

  function pushSample(t) {
    hist.push({ t: t, lon: state.dragLon });
    while (hist.length > 40 || (hist.length > 2 && t - hist[0].t > 160)) hist.shift();
  }
  function releaseVelocity(t) {
    if (hist.length < 2) return 0;
    var ref = hist[0];
    for (var i = hist.length - 1; i >= 0; i--) {
      if (t - hist[i].t >= 40) { ref = hist[i]; break; }
    }
    var dt = t - ref.t;
    return dt > 0 ? (state.dragLon - ref.lon) / dt : 0;
  }

  canvas.style.touchAction = 'pan-y'; // horizontal drag spins the globe, vertical swipe still scrolls the page
  canvas.style.cursor = 'grab';

  canvas.addEventListener('pointerdown', function (e) {
    if (dragging) return;
    dragging = true; dragId = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    lastX = e.clientX; lastY = e.clientY;
    hist.length = 0; pushSample(performance.now());
    if (inertiaAnim) { inertiaAnim.pause(); inertiaAnim = null; }
    spinAnim.pause();
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== dragId) return;
    var now = performance.now();
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    var R = cssRadius();
    var dLon = dx / R; // radians, ~1:1 finger-to-surface at the equator
    state.dragLon += dLon;
    state.pitch = clamp(state.pitch + (dy / R) * (180 / Math.PI) * 0.85, CFG.dragPitchMin, CFG.dragPitchMax);
    pushSample(now);
    if (e.pointerType === 'mouse') e.preventDefault();
  });

  function startInertia(v0) {
    if (inertiaAnim) { inertiaAnim.pause(); inertiaAnim = null; }
    if (Math.abs(v0) <= CFG.flickMinVel) { spinAnim.play(); return; }
    var dur = clamp(Math.abs(v0) * 900000, CFG.inertiaMinMs, CFG.inertiaMaxMs);
    var obj = { v: v0 }, prev = performance.now();
    inertiaAnim = animate(obj, {
      v: 0,
      duration: dur,
      ease: 'out(2)',
      onUpdate: function () {
        var now = performance.now();
        state.dragLon += obj.v * (now - prev);
        prev = now;
      },
      onComplete: function () { inertiaAnim = null; spinAnim.play(); }
    });
  }

  function endDrag(e, withInertia) {
    if (!dragging || (e && e.pointerId !== dragId)) return;
    dragging = false; dragId = null;
    canvas.style.cursor = 'grab';
    var v0 = withInertia ? releaseVelocity(performance.now()) : 0;
    if (window.__earth) window.__earth.lastFlick = v0;
    startInertia(v0);
  }
  canvas.addEventListener('pointerup', function (e) { endDrag(e, true); });
  canvas.addEventListener('pointercancel', function (e) { endDrag(e, false); });
  window.addEventListener('pointerup', function (e) { endDrag(e, true); });

  // ---------- cursor flashlight (desktop only) ----------
  if (FINE_POINTER) {
    var spotFade = null, spotTarget = 0;
    var fadeSpot = function (to) {
      if (spotTarget === to) return;
      spotTarget = to;
      if (spotFade) spotFade.pause();
      spotFade = animate(spot, { on: to, duration: CFG.spotFadeMs, ease: 'out(2)' });
    };
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        spot.nx = (e.clientX - rect.left) / rect.width;
        spot.ny = (e.clientY - rect.top) / rect.height;
      }
      fadeSpot(1);
    });
    canvas.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') fadeSpot(0);
    });
  }

  // expose for tuning in devtools (flick(v) spins the globe programmatically, v in rad/ms, e.g. 0.004)
  window.__earth = { cfg: CFG, state: state, redraw: draw, spinAnim: spinAnim, flick: function (v) { spinAnim.pause(); startInertia(v); } };
})();
