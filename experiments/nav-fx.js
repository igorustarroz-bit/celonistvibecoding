/* nav-fx.js — comportamiento del menu de celonis.com en DESKTOP (>=1200px):
   al hacer scroll hacia abajo el nav desaparece (clase nav-hidden: opacity 0
   + pointer-events none, ya definida en header.css) dejando solo un clon del
   CTA fijo arriba a la derecha (.cloned-cta, tambien en header.css); al hacer
   scroll hacia arriba reaparece (nav-shown). Mismo mecanismo de clases que el
   header.js del site real, con deteccion de direccion y guarda de 500ms.

   FICHERO COMUN a todos los experimentos: vive en experiments/ y lo cargan
   las 6 paginas como ../nav-fx.js?v=N. Antes estaba duplicado en
   celonis-home/anime-globe/ y datacore/anime-datacore/ (unificado 2026-09-03).
   SUBIR LA VERSION del ?v= en cada cambio.

   Especificacion completa, valores y fallos ya cometidos:
   experiments/claude_navfx_context.md — leer ANTES de tocar este fichero.

   v2: la comprobacion del breakpoint es EN VIVO, no solo al cargar. Antes se
   evaluaba una unica vez en init(), asi que una ventana que empezaba ancha y
   luego se estrechaba (o el modo responsive del navegador) seguia ocultando
   el nav en movil y dejaba el CTA clonado flotando sobre el texto, con el
   logo y el menu desaparecidos. Ahora: en movil/tablet no se oculta NUNCA y,
   si se cruza el breakpoint hacia abajo, se restaura el nav y se quita el
   clon inmediatamente. */
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
      if (!isDesktop()) return;                      // en movil, nunca
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
    function restoreNow() {   // vuelta a movil: nav visible y sin clon, ya
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
    /* como el original: al terminar el scroll arriba del todo, asegurar visible */
    var t;
    window.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (window.scrollY === 0) show(); }, 500);
    }, { passive: true });

    /* cruce del breakpoint: al bajar de 1200px se restaura el menu completo */
    var mq = window.matchMedia(DESKTOP);
    var onMq = function () { if (!isDesktop()) restoreNow(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
    window.addEventListener('resize', function () { if (!isDesktop()) restoreNow(); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
