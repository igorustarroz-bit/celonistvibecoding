/* inert-form.js — behaviour of the inert form replicas (see inert-form.css).
   Fields can be typed into and toggled so the prototype feels real, but nothing
   leaves the page: there is no <form> to submit, Enter does nothing, and the
   button only reveals a notice for a few seconds. Also guards against anything
   trying to serialise the fields: they carry no name attribute and
   autocomplete is off. Shared by every experiment: ../lib/inert-form.js */
(function () {
  'use strict';
  var NOTE = 'Form disabled in this unofficial design prototype — nothing is sent or stored.';
  function init() {
    document.querySelectorAll('.inert-form').forEach(function (box) {
      box.querySelectorAll('input,select,textarea').forEach(function (el) {
        el.removeAttribute('name');
        el.setAttribute('autocomplete', 'off');
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); show(box); } });
      });
      box.querySelectorAll('button').forEach(function (b) {
        b.type = 'button';
        b.addEventListener('click', function (e) { e.preventDefault(); show(box); });
      });
    });
  }
  var timers = [];
  function show(box) {
    var note = box.querySelector('.inert-form__note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'inert-form__note';
      (box.querySelector('.submit') || box).appendChild(note);
    }
    note.textContent = NOTE;
    note.classList.add('is-visible');
    clearTimeout(note._t);
    note._t = setTimeout(function () { note.classList.remove('is-visible'); }, 3500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
