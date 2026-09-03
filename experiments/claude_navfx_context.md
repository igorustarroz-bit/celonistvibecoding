# nav-fx.js — top menu effect on the saved pages

> **New experiment?** The full process (save the page from the browser →
> anti-phishing cleanup → nav-fx → index → publish) is in
> `claude_newexperiment_context.md`.

SINGLE context doc for this effect (`claude_<topic>_context.md` convention).
All the repo's `claude_*_context.md` files live in `experiments/`, at the same
level as the experiment folders; **their paths are relative to `experiments/`**.
The script is SHARED too: `experiments/nav-fx.js`. It used to be duplicated in
`3d-globe/anime-globe/` and `datacore/anime-datacore/`; since the
2026-09-03 reorganization there is ONE single copy and the 6 pages load it
as `../nav-fx.js?v=N`.

## What it does

Replicates the behavior of the celonis.com menu on DESKTOP: on scroll down the
nav disappears and only a fixed clone of the CTA remains in the top right
corner; on scroll up the nav reappears. Same class mechanism as the real site's
`header.js` (not a free reimplementation: these are the classes the saved
`header.css` already ships with).

## Exact values (v2 + v27, 95 lines, vanilla JS, IIFE)

- Desktop breakpoint: `(min-width: 1200px)` via `matchMedia`, queried LIVE
  (`isDesktop()`) on every scroll — not once in `init()`.
- Hook: `document.querySelector('.header .nav-wrapper')`. If it does not exist,
  the script does nothing. If `.secondary-menu-container` exists, it does NOT
  activate either (pages with a secondary menu).
- Source CTA: `.header .nav-tools .button-container:last-of-type a`
  ("Try for free").
- Scroll DOWN (`y > lastY`) → `hide()`: removes `nav-shown`, adds `nav-hidden`
  and appends `cta.cloneNode(true)` with class `.cloned-cta` as a child of
  `wrap.parentElement`, setting `--cta-right-offset` =
  `window.innerWidth - cta.getBoundingClientRect().right`.
- Scroll UP (`y < lastY`) → `show()`: removes `nav-hidden`, adds
  `nav-shown`, and removes the clone 500 ms later (`dropClone(false)`).
- **500 ms** `animating` guard between transitions (as in the original): a
  `hide()` during the guard is ignored.
- When scrolling STOPS, if `scrollY === 0` visibility is forced. Debounce 500 ms,
  in a separate independent listener.
- Throttled with `requestAnimationFrame` (`ticking` flag), listeners
  `{passive:true}`.
- Crossing the breakpoint downwards (`matchMedia change` + `resize`) →
  `restoreNow()`: nav visible and clone removed instantly, no guard.
- Startup: `DOMContentLoaded` if the document is still loading, otherwise
  `init()` right away.

## CSS: nothing needs to be added

The rules already live in the experiments' saved `header.css` (both files are
identical: `3d-globe/original/header.css` and
`datacore/Data Core _ Celonis_files/header.css`):

- `.header .nav-wrapper{opacity:1;position:fixed;...}` and
  `.header .nav-wrapper.nav-hidden{opacity:0;pointer-events:none}` — on the
  real site there is NO animated slide, it is an opacity SNAP (verified live);
  the wrapper's only `transition` is on `background-color`.
- `.header .cloned-cta{position:fixed;top:var(--fnd-spacing-06);z-index:3}`
  with `right` per breakpoint: `--cta-right-offset` between 1200 and 1599 px,
  `--fnd-spacing-10` from 1600, `calc(50% - 736px)` from 1920.
- ⚠️ `nav-shown` has NO CSS rule: it is only a marker class (the visible state
  is the default). Do not look for it in the CSS.

## Pages that load it (6)

`experiments/3d-globe/`: `index.html`, `original.html`.
`experiments/datacore/`: `index.html`, `index3d.html`, `original.html`,
`Data Core _ Celonis.html`.

All with cache-busting `?v=27` — **BUMP THE VERSION on every change** to the JS
or GitHub Pages will serve the stale file (it caches JS for ~10 min).

## Mistakes already made — do not repeat

1. **Breakpoint evaluated only once in `init()`** (v1). A window that started
   wide and was then narrowed, or DevTools responsive mode, kept hiding the nav
   on mobile: the logo and menu disappeared and the cloned CTA was left
   floating over the text. Fixed in v2 with `isDesktop()` per scroll +
   `restoreNow()` when crossing the breakpoint.
2. **The `<script>` was lost when regenerating `index3d.html`** from an
   OUTDATED clone of the repo (restored in commit 28f33a9). If a session
   regenerates a full index, it must keep
   `<script src="../nav-fx.js?v=N"></script>` before `</body>`. Before
   touching an index: `git pull`, or edit on the copy on Igor's laptop.
3. The menu with the logo **must not be touched**: it was fine, it only needs
   this effect.

## History

- v1: first version, breakpoint only in `init()`.
- v2: live breakpoint + `restoreNow()` when dropping below 1200 px.
- 2026-09-03: script unified into `experiments/nav-fx.js` (a single copy),
  the 6 pages pointed at `../nav-fx.js?v=27`, and this document as the single
  source of truth.
