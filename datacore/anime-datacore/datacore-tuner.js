/* =========================================================================
   Panel de ajuste del cristal (experimento 3, variante B).
   Sliders y selectores de color enganchados a window.DATACORE — el render
   loop de datacore-3d.js lee esos valores cada frame, así que todo es en
   vivo. "Copiar" exporta el JSON de ajustes para pasármelo tal cual.
   ========================================================================= */
(function () {
  'use strict';
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var T = window.DATACORE;
    if (!T) { setTimeout(arguments.callee, 300); return; }

    var css = document.createElement('style');
    css.textContent = [
      '#dc-tuner{position:fixed;top:14px;right:14px;z-index:99999;width:252px;',
      'font-family:Poppins,Arial,sans-serif;font-size:11px;color:#eee;',
      'background:rgba(6,6,8,.92);border:1px solid rgba(255,255,255,.25);',
      'border-radius:12px;backdrop-filter:blur(6px);user-select:none}',
      '#dc-tuner header{display:flex;justify-content:space-between;align-items:center;',
      'padding:9px 12px;cursor:pointer;font-weight:600;letter-spacing:.6px}',
      '#dc-tuner header span.dot{color:#5cfe50}',
      '#dc-tuner .body{padding:2px 12px 10px;max-height:70vh;overflow:auto}',
      '#dc-tuner .row{display:grid;grid-template-columns:86px 1fr 34px;gap:6px;',
      'align-items:center;margin:5px 0}',
      '#dc-tuner .row label{color:#aaa;white-space:nowrap;overflow:hidden}',
      '#dc-tuner input[type=range]{width:100%;accent-color:#5cfe50;height:14px}',
      '#dc-tuner input[type=color]{width:100%;height:20px;border:none;background:none;padding:0}',
      '#dc-tuner .val{text-align:right;color:#5cfe50;font-variant-numeric:tabular-nums}',
      '#dc-tuner h4{margin:10px 0 2px;font-size:10px;color:#777;text-transform:uppercase;letter-spacing:1.2px}',
      '#dc-tuner .btns{display:flex;gap:6px;margin-top:10px}',
      '#dc-tuner button{flex:1;padding:6px 0;border-radius:7px;border:1px solid rgba(255,255,255,.3);',
      'background:transparent;color:#eee;font:inherit;cursor:pointer}',
      '#dc-tuner button:hover{border-color:#5cfe50;color:#5cfe50}',
      '#dc-tuner.min .body{display:none}'
    ].join('');
    document.head.appendChild(css);

    var DEFAULTS = JSON.parse(JSON.stringify(T, function (k, v) {
      return typeof v === 'function' ? undefined : v;
    }));

    var panel = document.createElement('div');
    panel.id = 'dc-tuner';
    panel.innerHTML = '<header><span><span class="dot">●</span> GLASS TUNER</span><span id="dc-tgl">—</span></header><div class="body"></div>';
    document.body.appendChild(panel);
    var body = panel.querySelector('.body');
    panel.querySelector('header').addEventListener('click', function () {
      panel.classList.toggle('min');
      panel.querySelector('#dc-tgl').textContent = panel.classList.contains('min') ? '+' : '—';
    });

    function get(path) {
      return path.split('.').reduce(function (o, k) { return o[k]; }, T);
    }
    function set(path, val) {
      var ks = path.split('.'), o = T;
      for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
      o[ks[ks.length - 1]] = val;
    }

    var updaters = [];
    function slider(label, path, min, max, step) {
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<label title="' + path + '">' + label + '</label><input type="range"><span class="val"></span>';
      var inp = row.querySelector('input'), val = row.querySelector('.val');
      inp.min = min; inp.max = max; inp.step = step || 0.01;
      function refresh() { inp.value = get(path); val.textContent = (+get(path)).toFixed(2); }
      refresh();
      inp.addEventListener('input', function () { set(path, +inp.value); val.textContent = (+inp.value).toFixed(2); });
      updaters.push(refresh);
      body.appendChild(row);
    }
    function color(label, path) {
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<label title="' + path + '">' + label + '</label><input type="color"><span class="val"></span>';
      var inp = row.querySelector('input');
      function refresh() { inp.value = get(path); }
      refresh();
      inp.addEventListener('input', function () { set(path, inp.value); });
      updaters.push(refresh);
      body.appendChild(row);
    }
    function section(t) {
      var h = document.createElement('h4'); h.textContent = t; body.appendChild(h);
    }

    section('Tinte del cristal');
    slider('tinte R', 'tint.r', 0.4, 1.8);
    slider('tinte G', 'tint.g', 0.4, 1.8);
    slider('tinte B', 'tint.b', 0.4, 1.8);

    section('Transparencia');
    slider('transmisión', 'transmission', 0, 1);
    slider('+ al explotar', 'transmissionSpread', 0, 0.5);
    slider('refracción', 'refract', 0, 3);
    slider('cuerpo (tapas)', 'body', 0, 3);
    slider('a través (pre)', 'pre', 0, 3);

    section('Tapas transparentes');
    slider('tapa transp.', 'topClear', 0, 1);
    slider('brillo a través', 'topDarken', 0, 1.5);
    slider('blanco del borde', 'edgeWhite', 0, 1.2);

    section('Cantos y brillo');
    slider('fresnel', 'fresnel', 0, 1.5);
    color('cielo arriba', 'skyTop');
    color('cielo horizonte', 'skyHorizon');
    slider('filos de luz', 'rim', 0, 3);
    slider('iridiscencia', 'iri', 0, 0.6);

    section('Fondo y glow');
    color('fondo estudio', 'backdrop');
    slider('bloom fuerza', 'bloom.strength', 0, 1.5);
    slider('bloom radio', 'bloom.radius', 0, 1);
    slider('bloom umbral', 'bloom.threshold', 0, 1);

    var btns = document.createElement('div');
    btns.className = 'btns';
    btns.innerHTML = '<button id="dc-copy">Copiar ajustes</button><button id="dc-reset">Reset</button>';
    body.appendChild(btns);
    btns.querySelector('#dc-copy').addEventListener('click', function () {
      var out = JSON.stringify(T, function (k, v) { return typeof v === 'function' ? undefined : v; }, 2);
      (navigator.clipboard ? navigator.clipboard.writeText(out) : Promise.reject()).then(function () {
        btns.querySelector('#dc-copy').textContent = '¡Copiado!';
      }, function () { console.log(out); btns.querySelector('#dc-copy').textContent = 'En consola'; });
      setTimeout(function () { btns.querySelector('#dc-copy').textContent = 'Copiar ajustes'; }, 1500);
    });
    btns.querySelector('#dc-reset').addEventListener('click', function () {
      (function apply(dst, src) {
        for (var k in src) {
          if (typeof src[k] === 'object') apply(dst[k], src[k]);
          else dst[k] = src[k];
        }
      })(T, DEFAULTS);
      updaters.forEach(function (f) { f(); });
    });
  });
})();
