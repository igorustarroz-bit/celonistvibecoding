/* Fixes for the static saved copy: settle the frozen headline animation.
   The live site cycles phrases ("Make banking work.", "Make Enterprise AI work.", ...)
   char-by-char; the snapshot froze them mid-flight. Pick one phrase and show it clean. */
(function () {
  'use strict';
  var groups = document.querySelectorAll('h1 .highlights');
  if (!groups.length) return;
  var pick = null;
  groups.forEach(function (g) {
    if (!pick && /Enterprise/i.test(g.textContent)) pick = g;
  });
  pick = pick || groups[0];
  groups.forEach(function (g) {
    if (g === pick) {
      g.style.setProperty('opacity', '1', 'important');
      g.style.setProperty('visibility', 'visible', 'important');
      g.querySelectorAll('.char, .char-space, .char-wrapper').forEach(function (c) {
        c.style.setProperty('transform', 'none', 'important');
        c.style.setProperty('transition', 'none', 'important');
      });
    } else {
      g.style.setProperty('display', 'none', 'important');
    }
  });
})();
