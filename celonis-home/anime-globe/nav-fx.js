/* nav-fx.js — comportamiento del menu de celonis.com en desktop (>=1200px):
   al hacer scroll hacia abajo el nav desaparece (clase nav-hidden: opacity 0
   + pointer-events none, ya definida en header.css) dejando solo un clon del
   CTA fijo arriba a la derecha (.cloned-cta, tambien en header.css); al hacer
   scroll hacia arriba reaparece (nav-shown). Mismo mecanismo de clases que el
   header.js del site real, con deteccion de direccion y guarda de 500ms. */
(function () {
  'use strict';
  function init() {
    var wrap = document.querySelector('.header .nav-wrapper');
    if (!wrap) return;
    if (!window.matchMedia('(min-width: 1200px)').matches) return;
    if (document.querySelector('.secondary-menu-container')) return;
    var cta = document.querySelector('.header .nav-tools .button-container:last-of-type a');
    var lastY = window.scrollY;
    var animating = false;
    var clone = null;

    function hide() {
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
      if (!wrap.classList.contains('nav-hidden')) return;
      wrap.classList.remove('nav-hidden');
      wrap.classList.add('nav-shown');
      if (clone && !animating) {
        animating = true;
        var c = clone;
        clone = null;
        setTimeout(function () { c.remove(); animating = false; }, 500);
      }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY;
        if (y > lastY) hide();
        else if (y < lastY) show();
        lastY = y;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    /* como el original: al terminar el scroll arriba del todo, asegurar visible */
    var t;
    window.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (window.scrollY === 0) show(); }, 500);
    }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
