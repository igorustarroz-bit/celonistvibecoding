/* site-fx.js — restaura las interacciones del site original sobre la copia
   estática guardada (funciona en index.html y en el HTML original guardado).
   Sin dependencias: usa transiciones CSS y los estilos ya presentes.
   Piezas: sprite de iconos (logo incluido), titular char-by-char, cuadrado
   verde rotatorio del hero, tabs+acordeón de Solutions, carrusel de Success
   stories y reveal de las tarjetas grid (posts del Gartner MQ). */
(function () {
  'use strict';

  /* ---------- 0. sprite de iconos + logo (inyectado; <use> a fragmento) ---------- */
  var SPRITE = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" style=\"display:none\">\n  <!-- Placeholder spritemap: geometric stand-ins for the original Celonis icons (original /dist/assets/spritemap.svg is not saved offline) -->\n  <symbol id=\"brand-imagotype\" viewBox=\"0 0 88 22\">\n    <text x=\"0\" y=\"17.5\" font-family=\"Poppins, ui-sans-serif, sans-serif\" font-size=\"20\" font-weight=\"500\" fill=\"currentColor\" letter-spacing=\"0.5\">celonis</text>\n  </symbol>\n  <symbol id=\"icon-plus\" viewBox=\"0 0 16 16\">\n    <path d=\"M8 2v12M2 8h12\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-minus\" viewBox=\"0 0 16 16\">\n    <path d=\"M2 8h12\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-arrow-right\" viewBox=\"0 0 16 16\">\n    <path d=\"M2 8h11M9 3.5 13.5 8 9 12.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-arrow-left\" viewBox=\"0 0 16 16\">\n    <path d=\"M14 8H3M7 3.5 2.5 8 7 12.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-arrow-down\" viewBox=\"0 0 16 16\">\n    <path d=\"M8 2v11M3.5 9 8 13.5 12.5 9\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-arrow-up-right\" viewBox=\"0 0 16 16\">\n    <path d=\"M3.5 12.5 12 4M5.5 3.5H12.5V10.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-check\" viewBox=\"0 0 16 16\">\n    <path d=\"M2.5 8.5 6.5 12.5 13.5 4\" stroke=\"currentColor\" stroke-width=\"1.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-close\" viewBox=\"0 0 16 16\">\n    <path d=\"M3 3l10 10M13 3 3 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/>\n  </symbol>\n  <symbol id=\"close\" viewBox=\"0 0 16 16\">\n    <path d=\"M3 3l10 10M13 3 3 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-chevron-down\" viewBox=\"0 0 16 16\">\n    <path d=\"M3 5.5 8 10.5 13 5.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-chevron-up\" viewBox=\"0 0 16 16\">\n    <path d=\"M3 10.5 8 5.5 13 10.5\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-chevron-right\" viewBox=\"0 0 16 16\">\n    <path d=\"M5.5 3 10.5 8 5.5 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-chevron-left\" viewBox=\"0 0 16 16\">\n    <path d=\"M10.5 3 5.5 8 10.5 13\" stroke=\"currentColor\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-account\" viewBox=\"0 0 16 16\">\n    <circle cx=\"8\" cy=\"5.5\" r=\"2.6\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\"/>\n    <path d=\"M2.8 13.5c1-2.4 3-3.6 5.2-3.6s4.2 1.2 5.2 3.6\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-search\" viewBox=\"0 0 16 16\">\n    <circle cx=\"7\" cy=\"7\" r=\"4.2\" stroke=\"currentColor\" stroke-width=\"1.5\" fill=\"none\"/>\n    <path d=\"M10.2 10.2 14 14\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-menu\" viewBox=\"0 0 16 16\">\n    <path d=\"M2 4.5h12M2 8h12M2 11.5h12\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-play\" viewBox=\"0 0 16 16\">\n    <path d=\"M5 3.5v9L12.5 8Z\" fill=\"currentColor\"/>\n  </symbol>\n  <symbol id=\"play\" viewBox=\"0 0 16 16\">\n    <path d=\"M5 3.5v9L12.5 8Z\" fill=\"currentColor\"/>\n  </symbol>\n  <symbol fill=\"none\" id=\"logo\" viewBox=\"0 0 107 25\">\n<path d=\"M13.9099 9.17396C15.3528 10.3413 16.2507 11.923 16.6035 13.919H12.8594C12.6538 12.8469 12.1541 12.0069 11.3604 11.399C10.5667 10.7911 9.57227 10.4872 8.37719 10.4872C7.74087 10.4719 7.10857 10.5922 6.52226 10.8399C5.93596 11.0877 5.40904 11.4573 4.97648 11.9243C4.07053 12.8833 3.61755 14.2899 3.61755 16.1441C3.61755 17.9983 4.07053 19.4099 4.97648 20.3787C5.40666 20.8498 5.93275 21.2232 6.51935 21.4739C7.10595 21.7246 7.73945 21.8467 8.37719 21.832C9.57227 21.832 10.5667 21.5227 11.3604 20.904C12.1541 20.2853 12.6538 19.4404 12.8594 18.3692H16.5995C16.2484 20.3697 15.3506 21.9568 13.9059 23.1304C12.4612 24.304 10.6371 24.8913 8.43376 24.8922C6.78346 24.8922 5.32531 24.542 4.0593 23.8416C2.79257 23.1419 1.75657 22.089 1.07745 20.8111C0.359151 19.4929 0 17.9373 0 16.1441C0 14.3716 0.359151 12.8263 1.07745 11.5081C1.75733 10.2307 2.79313 9.17804 4.0593 8.47762C5.32621 7.77724 6.78436 7.42704 8.43376 7.42704C10.6425 7.42704 12.4679 8.00935 13.9099 9.17396Z\" fill=\"currentColor\"/>\n<path d=\"M42.0678 1.80116H38.5445V24.6754H42.0678V1.80116Z\" fill=\"currentColor\"/>\n<path d=\"M61.2289 11.5082C60.5161 10.2183 59.4417 9.16495 58.138 8.47773C56.7642 7.76411 55.2346 7.4031 53.6867 7.42716C52.0382 7.42716 50.5599 7.77735 49.2517 8.47773C47.952 9.17049 46.879 10.2225 46.1607 11.5082C45.4083 12.8273 45.0321 14.3726 45.0321 16.1442C45.0321 17.9158 45.4083 19.4665 46.1607 20.7964C46.8748 22.0891 47.9485 23.1469 49.2517 23.8417C50.5599 24.5421 52.0382 24.8923 53.6867 24.8923C55.2346 24.9163 56.7642 24.5553 58.138 23.8417C59.4422 23.1553 60.5168 22.1017 61.2289 20.8112C61.9706 19.493 62.3414 17.9374 62.3414 16.1442C62.3432 14.3717 61.9723 12.8264 61.2289 11.5082ZM58.0302 19.2973C57.6149 20.0925 56.9752 20.7482 56.1905 21.1829C55.4184 21.589 54.5591 21.8012 53.6867 21.8012C52.8144 21.8012 51.9551 21.589 51.183 21.1829C50.3988 20.748 49.7596 20.0923 49.3446 19.2973C48.8813 18.4532 48.6492 17.4022 48.6483 16.1442C48.6483 14.9078 48.8804 13.8621 49.3446 13.0073C49.7557 12.2054 50.3955 11.5436 51.183 11.1055C51.9551 10.6995 52.8144 10.4873 53.6867 10.4873C54.5591 10.4873 55.4184 10.6995 56.1905 11.1055C56.9783 11.5435 57.6186 12.2053 58.0302 13.0073C58.4935 13.8621 58.7252 14.9078 58.7252 16.1442C58.727 17.4013 58.4962 18.4523 58.0329 19.2973H58.0302Z\" fill=\"currentColor\"/>\n<path d=\"M84.9867 1.21408C85.3998 0.823398 85.9461 0.62761 86.6258 0.626712C87.3055 0.625814 87.8568 0.821602 88.2797 1.21408C88.4852 1.40128 88.6481 1.63049 88.7573 1.88616C88.8665 2.14184 88.9195 2.41801 88.9127 2.69596C88.9219 2.96989 88.8698 3.24241 88.7603 3.49365C88.6508 3.74489 88.4866 3.96851 88.2797 4.14821C87.8568 4.52002 87.3055 4.70548 86.6258 4.70458C85.9461 4.70369 85.3998 4.51913 84.9867 4.1509C84.7835 3.96902 84.6227 3.74464 84.5159 3.49366C84.4091 3.24268 84.3588 2.97126 84.3685 2.69865C84.3609 2.42156 84.412 2.14598 84.5185 1.89008C84.6251 1.63418 84.7847 1.40379 84.9867 1.21408Z\" fill=\"currentColor\"/>\n<path d=\"M88.3875 7.64409H84.8642V24.6755H88.3875V7.64409Z\" fill=\"currentColor\"/>\n<path d=\"M35.529 16.1441C35.529 14.3716 35.1698 12.8263 34.4515 11.5081C33.7696 10.2304 32.732 9.17777 31.4643 8.47762C30.1965 7.77724 28.7388 7.42704 27.0912 7.42704C25.4436 7.42704 23.9854 7.77724 22.7167 8.47762C21.4505 9.17839 20.4143 10.231 19.7335 11.5081C19.0152 12.8272 18.6561 14.3725 18.6561 16.1441C18.6561 17.94 19.0152 19.4961 19.7335 20.8124C20.414 22.0895 21.4502 23.1417 22.7167 23.8416C23.9845 24.542 25.4427 24.8922 27.0912 24.8922C28.7397 24.8922 30.1974 24.542 31.4643 23.8416C32.7308 23.1417 33.767 22.0895 34.4475 20.8124C34.8006 20.1598 35.0655 19.4632 35.2354 18.7409H31.7875C31.5874 19.5059 31.1806 20.2012 30.6117 20.7505C29.7053 21.595 28.4272 22.0179 27.0885 22.0179C25.7497 22.0179 24.4703 21.595 23.5639 20.7505C22.6575 19.906 22.1713 18.6076 22.1147 16.8553H35.5047C35.5209 16.6227 35.529 16.3856 35.529 16.1441ZM22.1955 14.408C22.3867 13.1706 22.8631 12.204 23.6245 11.5081C24.5529 10.6623 25.7071 10.2398 27.0871 10.2407C28.4672 10.2416 29.6209 10.6641 30.5484 11.5081C31.3107 12.2022 31.7871 13.1688 31.9774 14.408H22.1955Z\" fill=\"currentColor\"/>\n<path d=\"M79.3826 9.23881C80.5813 10.521 81.1806 12.3501 81.1806 14.726V24.6755H77.6466V15.0978C77.6466 13.5713 77.2542 12.3883 76.4695 11.5487C75.6847 10.7092 74.61 10.2907 73.2452 10.2934C71.84 10.2934 70.7141 10.7424 69.8674 11.6403C69.0207 12.5382 68.5969 13.8541 68.596 15.588V24.6701H65.0633V7.68585H68.596V10.7594C69.4903 9.06371 71.5118 7.3168 74.6095 7.3168C76.5938 7.3168 78.1849 7.95747 79.3826 9.23881Z\" fill=\"currentColor\"/>\n<path d=\"M105.608 12.6129H102.172C102.172 10.8081 100.355 9.94202 98.5155 9.94202C97.1094 9.94202 95.5 10.672 95.5 12.0391C95.5 13.4561 97.0232 13.9248 99.7936 14.7194C103.414 15.7538 106.027 16.6684 106.027 20.0854C106.027 23.2601 102.375 24.8494 98.898 24.8494C94.6811 24.8494 91.1174 22.7132 91.1174 19.1547H94.7228C94.805 21.0525 97.0124 22.0425 98.8023 22.0425C100.645 22.0425 102.653 21.5037 102.653 19.9629C102.653 18.1782 101.163 17.8725 98.2084 16.9782C94.4952 15.8576 91.9605 15.1841 91.9605 12.0863C91.9605 8.98843 95.2683 7.31559 98.6434 7.31559C102.862 7.31155 105.608 9.58779 105.608 12.6129Z\" fill=\"currentColor\"/>\n</symbol>\n  <symbol id=\"icon-flag\" viewBox=\"0 0 16 16\">\n    <path d=\"M3.5 14V2.5m0 .5h8.5l-2 3 2 3H3.5\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </symbol>\n  <symbol id=\"icon-globe\" viewBox=\"0 0 16 16\">\n    <circle cx=\"8\" cy=\"8\" r=\"5.5\" stroke=\"currentColor\" stroke-width=\"1.3\" fill=\"none\"/>\n    <path d=\"M2.5 8h11M8 2.5c-4 3.7-4 7.3 0 11 4-3.7 4-7.3 0-11Z\" stroke=\"currentColor\" stroke-width=\"1.1\" fill=\"none\"/>\n  </symbol>\n  <symbol id=\"icon-pause\" viewBox=\"0 0 16 16\">\n    <path d=\"M5.5 3.5v9M10.5 3.5v9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n  </symbol>\n</svg>\n";
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
    // el logo pierde su tamaño en la copia estática: fijarlo explícitamente,
    // respetando el viewBox real del símbolo (el logo original es 0 0 107 25)
    var sym = document.getElementById('logo');
    var vb = (sym && sym.getAttribute('viewBox')) || '0 0 107 25';
    var p = vb.split(/\s+/);
    var lw = 88, lh = Math.round((lw * parseFloat(p[3]) / parseFloat(p[2])) * 10) / 10;
    document.querySelectorAll('.icon-logo svg').forEach(function (s) {
      s.setAttribute('viewBox', vb);
      s.setAttribute('width', lw);
      s.setAttribute('height', lh);
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
      '.home-hero h1 .highlights{transition:opacity .25s ease}',
      'details.accordion-item{position:relative}',
      'details.accordion-item summary{cursor:pointer;list-style:none}',
      'details.accordion-item summary::-webkit-details-marker{display:none}',
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
      chars(p).forEach(function (c, k) {
        // el CSS base pone transition:none en los .char: forzar la transición
        // por letra con !important, conservando el delay escalonado original
        var delay = c.style.transitionDelay || (k * 0.02 + 's');
        c.style.setProperty('transition', 'transform .55s cubic-bezier(.3,.86,.38,1) ' + delay, 'important');
        c.style.setProperty('display', 'inline-block');
        c.style.transform = 'translate(0,180px)';
      });
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

  /* ---------- 2. cuadrado verde del hero: cubo 3D girando (como el original) ----------
     square-value.js real: el .square-block es un cubo (preserve-3d, caras a
     rotateX(0/90/180/-90)+translateZ); girar = decrementar --rotate 90° en el
     wrapper (transición CSS de 1s) + clase de estado rotate-none/once/twice/thrice
     en el bloque (controla visibility de la pareja de caras saliente/entrante)
     + .show en la cara que entra y .hide en la que sale (animan los chars). */
  function squareValue() {
    var wrapper = document.querySelector('.square-wrapper');
    if (!wrapper) return;
    var block = wrapper.querySelector('.square-block');
    if (!block) return;
    var faces = Array.prototype.slice.call(block.children);
    if (faces.length < 2) return;
    var angle = parseFloat((wrapper.style.getPropertyValue('--rotate') || '0').replace('deg', '')) || 0;
    var ROT = ['rotate-none', 'rotate-once', 'rotate-twice', 'rotate-thrice'];
    var pos = ((Math.round(-angle / 90) % faces.length) + faces.length) % faces.length; // cara frontal según el ángulo guardado
    function applyClasses(prevFront, front) {
      ROT.forEach(function (c) { block.classList.remove(c); });
      block.classList.add(ROT[front % 4]);
      faces.forEach(function (f, i) {
        f.classList.remove('show', 'hide');
        if (i === front) f.classList.add('show');
        else if (i === prevFront) f.classList.add('hide');
      });
    }
    wrapper.classList.add('rotation-ready');
    applyClasses((pos + faces.length - 1) % faces.length, pos);
    setInterval(function () {
      var prev = pos;
      pos = (pos + 1) % faces.length;
      angle -= 90;
      wrapper.style.setProperty('--rotate', angle + 'deg');
      applyClasses(prev, pos);
    }, 4000);
  }

  /* ---------- 3. Solutions: acordeón <details> con barra de progreso y auto-avance ----------
     Estructura real (solutions.css / solutions.js del site vivo):
       details.accordion-item[data-index] (temas, solo uno abierto) con
       .accordion-progress (barra 1px, scaleX 0→1 en 12s linear al añadir .active)
       + paneles [data-accordion][data-index] (laterales y .accordion-content-area)
       que se muestran con .show, + ul de tabs (móvil) con li.selected.        */
  function solutions() {
    var wrap = document.querySelector('.solutions-wrapper');
    if (!wrap) return;
    var details = Array.prototype.slice.call(wrap.querySelectorAll('details.accordion-item'));
    if (!details.length) return;
    var panels = Array.prototype.slice.call(wrap.querySelectorAll('[data-accordion][data-index]'));
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll(':scope > div:first-child ul li'));
    var WAIT = 12000;

    // cada tema necesita su barra de progreso (la copia estática solo conserva una)
    details.forEach(function (d) {
      if (!d.querySelector('.accordion-progress')) {
        var b = document.createElement('div');
        b.className = 'accordion-progress';
        d.appendChild(b);
      }
    });

    var hovered = false;
    wrap.addEventListener('mouseenter', function () { hovered = true; });
    wrap.addEventListener('mouseleave', function () { hovered = false; });

    function bar(d) { return d.querySelector('.accordion-progress'); }
    function resetBar(d) {
      var b = bar(d);
      if (!b) return;
      b.style.transition = 'none';
      b.classList.remove('active');
      void b.offsetWidth; // reflow: vuelve a scaleX(0) sin animar
      b.style.transition = '';
    }

    var timer = null, current = -1;
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(function tick() {
        if (hovered) { timer = setTimeout(tick, 500); return; } // pausa en hover
        select((current + 1) % details.length);
      }, WAIT);
    }
    function select(i) {
      current = i;
      details.forEach(function (d, j) {
        if (j === i) d.setAttribute('open', '');
        else { d.removeAttribute('open'); resetBar(d); }
      });
      panels.forEach(function (pn) {
        pn.classList.toggle('show', +pn.getAttribute('data-index') === i);
      });
      tabs.forEach(function (t, j) { t.classList.toggle('selected', j === i); });
      var d = details[i];
      resetBar(d);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { var b = bar(d); if (b) b.classList.add('active'); });
      });
      schedule();
    }

    details.forEach(function (d, j) {
      var s = d.querySelector('summary');
      if (!s) return;
      s.addEventListener('click', function (e) {
        e.preventDefault(); // gestionamos la exclusividad nosotros
        select(j);
      });
    });
    tabs.forEach(function (t, j) {
      t.style.cursor = 'pointer';
      t.addEventListener('click', function () { select(j); });
    });

    var initial = details.findIndex(function (d) { return d.hasAttribute('open'); });
    select(initial < 0 ? 0 : initial);
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
      // sin transición CSS: en la copia estática las CSSTransition de estos
      // elementos quedan "running" sin progresar (incluso las propias), así
      // que el fade/slide se hace a mano con rAF, escalonado por tarjeta
      block.querySelectorAll('.card-grid-item').forEach(function (item, k) {
        item.style.setProperty('transition', 'none', 'important');
        function showNow() {
          item.style.setProperty('opacity', '1', 'important');
          item.style.setProperty('transform', 'translateY(0)', 'important');
        }
        if (document.hidden) { showNow(); return; } // pestaña oculta: sin animación (rAF suspendido)
        setTimeout(function () {
          var t0 = performance.now(), DUR = 450;
          (function step(now) {
            if (document.hidden) { showNow(); return; }
            var t = Math.min(1, (now - t0) / DUR);
            var e = 1 - Math.pow(1 - t, 3); // easeOutCubic
            item.style.setProperty('opacity', String(e), 'important');
            item.style.setProperty('transform', 'translateY(' + (200 * (1 - e)).toFixed(1) + 'px)', 'important');
            if (t < 1) requestAnimationFrame(step);
          })(t0);
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
