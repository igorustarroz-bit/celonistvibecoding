/* site-fx.js — restaura las interacciones del site original sobre la copia
   estática guardada (funciona en index.html y en el HTML original guardado).
   Sin dependencias: usa transiciones CSS y los estilos ya presentes.
   Piezas: sprite de iconos (logo incluido), titular char-by-char, cuadrado
   verde rotatorio del hero, tabs+acordeón de Solutions, carrusel de Success
   stories y reveal de las tarjetas grid (posts del Gartner MQ). */
(function () {
  'use strict';

  /* ---------- 0. sprite de iconos + logo (inyectado; <use> a fragmento) ---------- */
  var SPRITE = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" style=\"display:none\"> <!-- Placeholder spritemap: geometric stand-ins for the original Celonis icons (original /dist/assets/spritemap.svg is not saved offline) --> <symbol id=\"brand-imagotype\" viewBox=\"0 0 88 22\">  <text x=\"0\" y=\"17.5\" font-family=\"Poppins, ui-sans-serif, sans-serif\" font-size=\"20\" font-weight=\"500\" fill=\"currentColor\" letter-spacing=\"0.5\">celonis</text> </symbol> <symbol id=\"icon-plus\" viewBox=\"0 0 16 16\">  <path d=\"M8 2v12M2 8h12\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/> </symbol> <symbol id=\"icon-minus\" viewBox=\"0 0 16 16\">  <path d=\"M2 8h12\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/> </symbol> <symbol id=\"icon-arrow-right\" viewBox=\"0 0 16 16\">  <path d=\"M2 8h11M9 3.5 13.5 8 9 12.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-arrow-left\" viewBox=\"0 0 16 16\">  <path d=\"M14 8H3M7 3.5 2.5 8 7 12.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-arrow-down\" viewBox=\"0 0 16 16\">  <path d=\"M8 2v11M3.5 9 8 13.5 12.5 9\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-arrow-up-right\" viewBox=\"0 0 16 16\">  <path d=\"M3.5 12.5 12 4M5.5 3.5H12.5V10.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-check\" viewBox=\"0 0 16 16\">  <path d=\"M2.5 8.5 6.5 12.5 13.5 4\" stroke=\"currentColor\" stroke-width=\"1.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-close\" viewBox=\"0 0 16 16\">  <path d=\"M3 3l10 10M13 3 3 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/> </symbol> <symbol id=\"close\" viewBox=\"0 0 16 16\">  <path d=\"M3 3l10 10M13 3 3 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/> </symbol> <symbol id=\"icon-chevron-down\" viewBox=\"0 0 16 16\">  <path d=\"M3 5.5 8 10.5 13 5.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-chevron-up\" viewBox=\"0 0 16 16\">  <path d=\"M3 10.5 8 5.5 13 10.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-chevron-right\" viewBox=\"0 0 16 16\">  <path d=\"M5.5 3 10.5 8 5.5 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-chevron-left\" viewBox=\"0 0 16 16\">  <path d=\"M10.5 3 5.5 8 10.5 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-account\" viewBox=\"0 0 16 16\">  <circle cx=\"8\" cy=\"5.5\" r=\"2.6\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\"/>  <path d=\"M2.8 13.5c1-2.4 3-3.6 5.2-3.6s4.2 1.2 5.2 3.6\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/> </symbol> <symbol id=\"icon-search\" viewBox=\"0 0 16 16\">  <circle cx=\"7\" cy=\"7\" r=\"4.2\" stroke=\"currentColor\" stroke-width=\"1.5\" fill=\"none\"/>  <path d=\"M10.2 10.2 14 14\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/> </symbol> <symbol id=\"icon-menu\" viewBox=\"0 0 16 16\">  <path d=\"M2 4.5h12M2 8h12M2 11.5h12\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/> </symbol> <symbol id=\"icon-play\" viewBox=\"0 0 16 16\">  <path d=\"M5 3.5v9L12.5 8Z\" fill=\"currentColor\"/> </symbol> <symbol id=\"play\" viewBox=\"0 0 16 16\">  <path d=\"M5 3.5v9L12.5 8Z\" fill=\"currentColor\"/> </symbol> <symbol id=\"logo\" viewBox=\"0 0 88 22\">  <text x=\"0\" y=\"17.5\" font-family=\"Poppins, ui-sans-serif, sans-serif\" font-size=\"20\" font-weight=\"500\" fill=\"currentColor\" letter-spacing=\"0.5\">celonis</text> </symbol> <symbol id=\"icon-flag\" viewBox=\"0 0 16 16\">  <path d=\"M3.5 14V2.5m0 .5h8.5l-2 3 2 3H3.5\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </symbol> <symbol id=\"icon-globe\" viewBox=\"0 0 16 16\">  <circle cx=\"8\" cy=\"8\" r=\"5.5\" stroke=\"currentColor\" stroke-width=\"1.3\" fill=\"none\"/>  <path d=\"M2.5 8h11M8 2.5c-4 3.7-4 7.3 0 11 4-3.7 4-7.3 0-11Z\" stroke=\"currentColor\" stroke-width=\"1.1\" fill=\"none\"/> </symbol> <symbol id=\"icon-pause\" viewBox=\"0 0 16 16\">  <path d=\"M5.5 3.5v9M10.5 3.5v9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/> </symbol></svg>";
  function fixIcons() {
    if (!document.getElementById('logo')) {
      var holder = document.createElement('div');
      holder.innerHTML = SPRITE;
      document.body.insertBefore(holder.firstElementChild, document.body.firstChild);
    }
    document.querySelectorAll('use').forEach(function (u) {
      var href = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
      var i = href.indexOf('#');
      if (i > 0) u.setAttribute('href', href.slice(i)); // externo → fragmento local
    });
    // el logo pierde su tamaño en la copia estática: fijarlo explícitamente
    document.querySelectorAll('.icon-logo svg').forEach(function (s) {
      s.setAttribute('width', '88');
      s.setAttribute('height', '22');
      s.setAttribute('viewBox', '0 0 88 22');
    });
  }

  /* ---------- CSS de bloques que el site vivo cargaba por JS ---------- */
  function ensureBlockCSS() {
    ['Enterprise-AI-powered-by-Celonis_files/carousel.css'].forEach(function (href) {
      var already = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
        return (l.getAttribute('href') || '').indexOf(href.split('/').pop()) !== -1;
      });
      if (!already) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
      }
    });
  }

  /* ---------- estilos auxiliares ---------- */
  function injectCSS() {
    var css = [
      '.home-hero h1 .char{transition:transform .6s cubic-bezier(.16,1,.3,1);display:inline-block;transform:translate(0,180px)}',
      '.home-hero h1 .highlights{transition:opacity .25s ease}',
      '[data-accordion] h3{cursor:pointer;opacity:.5;transition:opacity .3s ease}',
      '[data-accordion] h3.open{opacity:1}',
      '[data-accordion] h3 + p{overflow:hidden;max-height:0;opacity:0;margin-top:0;margin-bottom:0;transition:max-height .45s ease,opacity .45s ease,margin .45s ease}',
      '[data-accordion] h3.open + p{max-height:220px;opacity:1;margin-top:.5em;margin-bottom:1em}',
      '.carousel-slides-wrapper > ul{transition:translate .55s cubic-bezier(.22,.61,.36,1)}',
      '.carousel-navigations-wrapper button[disabled]{opacity:.35;pointer-events:none}',
      '.carousel-line.active{opacity:1}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'site-fx-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 1. titular: ciclo de frases char-by-char ---------- */
  function headline() {
    var phrases = Array.prototype.slice.call(document.querySelectorAll('h1 .highlights'));
    if (!phrases.length) return;
    var HOLD = 3400, SWAP = 700;
    function chars(p) { return p.querySelectorAll('.char, .char-space'); }
    phrases.forEach(function (p) {
      p.style.opacity = '0';
      p.style.visibility = 'hidden';
      chars(p).forEach(function (c) { c.style.transform = 'translate(0,180px)'; });
    });
    var i = 0;
    function show(p) {
      p.style.visibility = 'visible';
      p.style.opacity = '1';
      void p.offsetWidth; // reflow para que la transición arranque
      chars(p).forEach(function (c) { c.style.transform = 'translate(0,0)'; });
    }
    function hide(p, done) {
      chars(p).forEach(function (c) { c.style.transform = 'translate(0,-170px)'; });
      setTimeout(function () {
        p.style.opacity = '0';
        p.style.visibility = 'hidden';
        chars(p).forEach(function (c) { c.style.transform = 'translate(0,180px)'; });
        done();
      }, SWAP);
    }
    show(phrases[0]);
    setInterval(function () {
      var cur = phrases[i];
      i = (i + 1) % phrases.length;
      hide(cur, function () { show(phrases[i]); });
    }, HOLD + SWAP);
  }

  /* ---------- 2. cuadrado verde del hero: rotación + swap de contenido ---------- */
  function squareValue() {
    var wrapper = document.querySelector('.square-wrapper');
    if (!wrapper) return;
    var angle = parseFloat((wrapper.style.getPropertyValue('--rotate') || '0').replace('deg', '')) || 0;
    var blocks = Array.prototype.slice.call(wrapper.querySelectorAll('.square-block'));
    setInterval(function () {
      angle -= 90;
      wrapper.style.setProperty('--rotate', angle + 'deg');
      blocks.forEach(function (b) {
        var kids = Array.prototype.slice.call(b.children);
        if (kids.length < 2) return;
        var cur = kids.findIndex(function (k) { return k.classList.contains('show') && !k.classList.contains('hide'); });
        if (cur < 0) cur = 0;
        var next = (cur + 1) % kids.length;
        kids.forEach(function (k) { k.classList.remove('hide'); });
        kids[cur].classList.add('hide');           // el activo sale (show hide)
        kids[next].classList.add('show');          // el siguiente entra
        setTimeout(function () { kids[cur].classList.remove('show', 'hide'); }, 900);
      });
    }, 3500);
  }

  /* ---------- 3. Solutions: tabs + acordeón con auto-avance ---------- */
  function solutions() {
    var wrap = document.querySelector('.solutions-wrapper');
    if (!wrap) return;
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll(':scope > div > ul > li'));
    var panels = Array.prototype.slice.call(wrap.querySelectorAll('[data-accordion]'));
    if (!panels.length) return;
    var hovered = false;
    wrap.addEventListener('mouseenter', function () { hovered = true; });
    wrap.addEventListener('mouseleave', function () { hovered = false; });

    function items(panel) { return Array.prototype.slice.call(panel.querySelectorAll('h3')); }
    function openItem(panel, idx) {
      items(panel).forEach(function (h, j) { h.classList.toggle('open', j === idx); });
      panel.dataset.openIdx = idx;
    }
    function selectPanel(idx) {
      tabs.forEach(function (t, j) { t.classList.toggle('selected', j === idx); });
      panels.forEach(function (p, j) { p.classList.toggle('show', j === idx); });
      var p = panels[idx];
      if (p && p.dataset.openIdx === undefined) openItem(p, 0);
    }
    tabs.forEach(function (t, j) {
      t.style.cursor = 'pointer';
      t.addEventListener('click', function () { selectPanel(j); });
    });
    panels.forEach(function (p) {
      items(p).forEach(function (h, j) {
        h.addEventListener('click', function () { openItem(p, j); });
      });
    });
    var active = Math.max(0, panels.findIndex(function (p) { return p.classList.contains('show'); }));
    selectPanel(active === -1 ? 0 : active);
    // auto-avance de items del panel visible (12 s, como el original; pausa en hover)
    setInterval(function () {
      if (hovered) return;
      var idx = panels.findIndex(function (p) { return p.classList.contains('show'); });
      if (idx < 0) return;
      var p = panels[idx];
      var n = items(p).length;
      if (!n) return;
      openItem(p, ((+p.dataset.openIdx || 0) + 1) % n);
    }, 12000);
  }

  /* ---------- 4. Success stories: carrusel con flechas ---------- */
  function storiesCarousel() {
    document.querySelectorAll('.cards.carousel').forEach(function (block) {
      var ul = block.querySelector('.carousel-slides-wrapper > ul');
      var slides = ul ? Array.prototype.slice.call(ul.children) : [];
      var btns = block.querySelectorAll('.carousel-navigations-wrapper button');
      var lines = Array.prototype.slice.call(block.querySelectorAll('.carousel-line'));
      if (!ul || slides.length < 2 || btns.length < 2) return;
      var prev = btns[0], next = btns[1], i = 0;
      function maxTranslate() {
        var w = block.querySelector('.carousel-slides-wrapper').clientWidth;
        return Math.max(0, ul.scrollWidth - w);
      }
      function slideX(n) { // desplazamiento del slide n respecto al primero (independiente del translate actual)
        return slides[n].getBoundingClientRect().left - slides[0].getBoundingClientRect().left;
      }
      function go(n) {
        i = Math.max(0, Math.min(n, slides.length - 1));
        var x = Math.min(slideX(i), maxTranslate());
        ul.style.translate = (-x) + 'px';
        slides.forEach(function (s, j) {
          s.classList.toggle('active', j === i);
          s.setAttribute('aria-hidden', j === i ? 'false' : 'true');
        });
        lines.forEach(function (l, j) { l.classList.toggle('active', j === i); }); // como el site: solo la línea actual
        if (i === 0) prev.setAttribute('disabled', 'disabled'); else prev.removeAttribute('disabled');
        if (i >= slides.length - 1) next.setAttribute('disabled', 'disabled'); else next.removeAttribute('disabled');
      }
      prev.addEventListener('click', function () { go(i - 1); });
      next.addEventListener('click', function () { go(i + 1); });
      // swipe táctil / arrastre básico
      var x0 = null;
      ul.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
      window.addEventListener('pointerup', function (e) {
        if (x0 === null) return;
        var dx = e.clientX - x0; x0 = null;
        if (dx < -40) go(i + 1); else if (dx > 40) go(i - 1);
      });
      window.addEventListener('resize', function () { go(i); });
      go(0);
    });
  }

  /* ---------- 5. grids de tarjetas (posts Gartner MQ, insights): reveal ---------- */
  function gridReveal() {
    function reveal(block) {
      block.classList.add('cards-in-viewport');
      Array.prototype.forEach.call(block.children, function (c) { c.classList.add('cards-in-viewport'); });
      // transición propia con !important: la del CSS original usa una variable
      // de easing indefinida en la copia y se queda "running" sin progresar
      block.querySelectorAll('.card-grid-item').forEach(function (item, k) {
        item.style.setProperty('transition', 'opacity .35s ease, transform .55s ease', 'important');
        setTimeout(function () {
          item.style.setProperty('opacity', '1', 'important');
          item.style.setProperty('transform', 'translateY(0)', 'important');
        }, 60 + k * 130);
      });
    }
    var pending = Array.prototype.slice.call(document.querySelectorAll('.cards.grid'));
    if (!pending.length) return;
    function check() {
      pending = pending.filter(function (block) {
        var r = block.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.85 && r.bottom > 0) { reveal(block); return false; }
        return true;
      });
      if (!pending.length) window.removeEventListener('scroll', onScroll);
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; check(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
  }

  function init() {
    fixIcons();
    ensureBlockCSS();
    injectCSS();
    headline();
    squareValue();
    solutions();
    storiesCarousel();
    gridReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
