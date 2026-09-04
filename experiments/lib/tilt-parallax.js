/* tilt-parallax.js — the desktop hover parallax, on a phone, from the gyroscope.
   On desktop the 3D figures (Data Core, book) turn a little as the pointer moves
   around them; Igor: that sells the depth and mobile must get the same from the
   device orientation sensor. This file gives both experiments one implementation.

   Usage:  TiltParallax.start(function (x, y) { … }, opts)
     x, y ∈ [−1, 1]  — same range and meaning as the pointer version
                       (x: phone rolled left/right, y: tilted toward/away)
     opts.range      — degrees of tilt for full deflection (default 14)
     opts.smooth     — per-sample lerp (default 0.12)
   Returns a controller { stop(), active } and does nothing where it cannot work.

   How it works, and what it has to work around:
   - Only on touch / coarse-pointer devices (on desktop the pointer already does it).
   - Neutral position = however the phone is held when the sensor starts reporting
     (baseline from the first readings, re-centred slowly toward the current
     attitude so a change of posture does not leave the figure stuck sideways).
   - Landscape: screen.orientation.angle swaps / flips the axes so "roll" is
     always screen-left/right.
   - iOS 13+: DeviceOrientationEvent.requestPermission() exists and MUST be called
     from a user gesture; the first touch/click anywhere on the page asks (one
     time, silent), and if the user denies we simply stay still. Android and
     older iOS need no permission. The page must be served over https (GitHub
     Pages is) or opened locally — insecure http gets no sensor. */
(function () {
  'use strict';
  function start(cb, opts) {
    opts = opts || {};
    var RANGE = opts.range || 14, SMOOTH = opts.smooth || 0.12;
    var ctl = { active: false, stop: function () { window.removeEventListener('deviceorientation', onOri); ctl.active = false; } };
    var coarse = !(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    if (!coarse || !('DeviceOrientationEvent' in window)) return ctl;

    var base = null, sx = 0, sy = 0, got = 0;
    function onOri(e) {
      if (e.beta === null || e.gamma === null) return;
      var beta = e.beta, gamma = e.gamma;             // beta: front/back (−180…180), gamma: left/right (−90…90)
      // map to screen axes whatever way the phone is turned
      var a = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
      var rx, ry;
      if (a === 90) { rx = beta; ry = -gamma; }
      else if (a === -90 || a === 270) { rx = -beta; ry = gamma; }
      else if (a === 180) { rx = -gamma; ry = -beta; }
      else { rx = gamma; ry = beta; }
      if (!base) base = { x: rx, y: ry };
      // slow re-centring: the neutral attitude follows the user (~seconds), the
      // quick tilts around it drive the parallax
      base.x += (rx - base.x) * 0.01; base.y += (ry - base.y) * 0.01;
      var tx = Math.max(-1, Math.min(1, (rx - base.x) / RANGE));
      var ty = Math.max(-1, Math.min(1, (ry - base.y) / RANGE));
      sx += (tx - sx) * SMOOTH; sy += (ty - sy) * SMOOTH;
      if (++got > 2) { ctl.active = true; cb(sx, sy); }
    }
    function listen() { window.addEventListener('deviceorientation', onOri, { passive: true }); }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS: ask on the first gesture, once, silently
      var asked = false;
      function ask() {
        if (asked) return; asked = true;
        document.removeEventListener('touchend', ask); document.removeEventListener('click', ask);
        DeviceOrientationEvent.requestPermission().then(function (state) { if (state === 'granted') listen(); }, function () {});
      }
      document.addEventListener('touchend', ask, { passive: true });
      document.addEventListener('click', ask);
    } else {
      listen();
    }
    return ctl;
  }
  window.TiltParallax = { start: start };
})();
