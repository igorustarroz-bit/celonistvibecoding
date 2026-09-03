/* Scroll reaction for the hero world — replica of the original home-hero.js behavior:
   a scrubbed (linear, tied 1:1 to scroll) timeline where
     .world:            y: o  →  o - 0.75·innerHeight,  scale: 1 → 0.25
     .fragment-wrapper: scale: 1 → 0 (over the first 80% of the range)
   with o = -innerHeight + a (a depends on the breakpoint), and the scroll range
     start = max(0, 4/7·E - innerHeight),  end = E - innerHeight,
     E = heroBlock.offsetHeight · 1.75 + 88
   (values read from Celonis' own home-hero.js) */
(function () {
  'use strict';
  var world = document.querySelector('p.world');
  var wrap = document.querySelector('.fragment-wrapper');
  var hero = document.querySelector('.home-hero');
  if (!world || !hero) return;

  function aOffset() {
    var w = window.innerWidth;
    return w >= 768 ? 434 : 386;
  }

  var baseY = 0, startPx = 0, endPx = 1;

  function measure() {
    // desktop: fixed rest position chosen by hand (translate(0, -500px) scale(1));
    // tablet/mobile keep the original viewport-relative formula
    baseY = window.innerWidth >= 1200 ? -500 : -window.innerHeight + aOffset();
    var E = hero.offsetHeight * 1.75 + 88;
    startPx = Math.max(0, (4 / 7) * E - window.innerHeight);
    endPx = E - window.innerHeight;
    if (endPx <= startPx) endPx = startPx + 1;
  }

  function apply() {
    var p = (window.scrollY - startPx) / (endPx - startPx);
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    var y = baseY - window.innerHeight * 0.75 * p;
    var s = 1 - 0.75 * p;
    world.style.transform = 'translate(0px, ' + y.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    if (wrap) {
      var ws = 1 - p / 0.8; if (ws < 0) ws = 0;
      wrap.style.transform = 'translate(0px, 0px) scale(' + ws.toFixed(4) + ')';
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; apply(); });
  }

  measure();
  apply();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); apply(); }, { passive: true });

  // tuning hook
  window.__heroScroll = { measure: measure, apply: apply, get range() { return { start: startPx, end: endPx, baseY: baseY }; } };
})();
