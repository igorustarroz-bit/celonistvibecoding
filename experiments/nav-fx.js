/* nav-fx.js — celonis.com nav behaviour on DESKTOP (>=1200px): on scroll
   down the nav disappears (class nav-hidden: opacity 0 + pointer-events
   none, already defined in header.css), leaving only a clone of the CTA
   pinned top right (.cloned-cta, also in header.css); on scroll up it
   comes back (nav-shown). Same class mechanism as the real site's
   header.js, with direction detection and a 500ms guard.

   COMMON FILE for all experiments: it lives in experiments/ and the 6
   pages load it as ../nav-fx.js?v=N. It used to be duplicated in
   3d-globe/anime-globe/ and datacore/anime-datacore/ (unified 2026-09-03).
   BUMP THE ?v= VERSION on every change.

   Full spec, values and mistakes already made:
   experiments/claude_navfx_context.md — read BEFORE touching this file.

   v2: the breakpoint check is LIVE, not only at load time. It used to be
   evaluated once in init(), so a window that started wide and was then
   narrowed (or the browser's responsive mode) kept hiding the nav on
   mobile and left the cloned CTA floating over the text, with the logo
   and the menu gone. Now: on mobile/tablet it NEVER hides and, if the
   breakpoint is crossed downwards, the nav is restored and the clone is
   removed immediately. */
(function () {
  'use strict';
  var DESKTOP = '(min-width: 1200px)';
  function isDesktop() { return window.matchMedia(DESKTOP).matches; }

  function init() {
    var wrap = document.querySelector('.header .nav-wrapper');
    if (!wrap) return;
    if (document.querySelector('.secondary-menu-container')) return;
    var cta = document.querySelector('.header .nav-tools .button-container:last-of-type a');
    var lastY = window.scrollY;
    var animating = false;
    var clone = null;

    function dropClone(now) {
      if (!clone) return;
      var c = clone;
      clone = null;
      if (now) { c.remove(); return; }
      animating = true;
      setTimeout(function () { c.remove(); animating = false; }, 500);
    }
    function hide() {
      if (!isDesktop()) return;                      // on mobile, never
      if (animating || wrap.classList.contains('nav-hidden')) return;
      animating = true;
      wrap.classList.remove('nav-shown');
      wrap.classList.add('nav-hidden');
      if (cta && !clone) {
        clone = cta.cloneNode(true);
        clone.classList.add('cloned-cta');
        wrap.parentElement.appendChild(clone);
        var r = cta.getBoundingClientRect();
        clone.style.setProperty('--cta-right-offset', (window.innerWidth - r.right) + 'px');
      }
      setTimeout(function () { animating = false; }, 500);
    }
    function show() {
      if (!wrap.classList.contains('nav-hidden')) { dropClone(true); return; }
      wrap.classList.remove('nav-hidden');
      wrap.classList.add('nav-shown');
      if (!animating) dropClone(false);
    }
    function restoreNow() {   // back to mobile: nav visible, clone dropped, now
      animating = false;
      wrap.classList.remove('nav-hidden');
      wrap.classList.add('nav-shown');
      dropClone(true);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (!isDesktop()) { restoreNow(); lastY = window.scrollY; return; }
        var y = window.scrollY;
        if (y > lastY) hide();
        else if (y < lastY) show();
        lastY = y;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    /* like the original: when the scroll ends at the very top, ensure visible */
    var t;
    window.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (window.scrollY === 0) show(); }, 500);
    }, { passive: true });

    /* breakpoint crossing: below 1200px the full menu is restored */
    var mq = window.matchMedia(DESKTOP);
    var onMq = function () { if (!isDesktop()) restoreNow(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
    window.addEventListener('resize', function () { if (!isDesktop()) restoreNow(); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
