# Replicated Celonis site effects — full specification

> **New experiment?** The complete process (save the page from the browser →
> anti-phishing cleanup → nav-fx → index → publish) is in
> `claude_newexperiment_context.md`.

> This document lives in `experiments/` next to the other `claude_*_context.md`
> files (all uploaded there on 2026-09-03). **The paths in this doc are relative
> to `experiments/`.**

Context for Claude (or any dev) who needs to maintain or REBUILD the
celonis.com interface effects on top of the saved static copies.
It complements `claude_globe_context.md` (hero globe) and the context of
experiment 3 (`claude_datacore_context.md`).

Igor's rule for the whole project: everything is delivered in English — the
experiments' UI, the context files (`claude_*_context.md`) and the comments
inside the code. Orders may come in Spanish; the output does not.

## Files and pages

The JS files for this experiment live in `3d-globe/anime-globe/`.

- `site-fx.js` — all the home-page block effects: char-by-char headline,
  green hero cubes, Solutions accordion, stories carousel, grid reveal,
  icon/logo sprite. Loaded by `3d-globe/index.html` and `3d-globe/original.html`
  with cache-busting `?v=YYYYMMDD[x]` — BUMP THE VERSION on every change or the
  browser will serve the stale JS (this already happened and it confused a whole
  QA round).
- `nav-fx.js` — top menu effect (hide on scroll down + CTA clone).
  SHARED file unified at `experiments/nav-fx.js`, loaded by all 6 pages
  as `../nav-fx.js?v=N`. Full specification, exact values and mistakes already
  made: **`experiments/claude_navfx_context.md`** — read that doc, do not
  duplicate the information here.
- `scroll-fx.js` — scroll reaction of the globe and the cubes (documented in
  `claude_globe_context.md`). Loaded by both `3d-globe/index.html` AND
  `3d-globe/original.html`.

## How the original behaviour was obtained (method)

The live site is AEM Edge Delivery: each block has its own JS at
`https://www.celonis.com/dist/blocks/<block>/<block>.js` (home-hero,
square-value, solutions, header) and shared chunks in `/dist/chunks/`
(tokens.js, animated-words.js, animated-accordion.js). Those files were
analysed to extract the parameters, and the behaviour was REIMPLEMENTED in
vanilla JS (CSS transitions instead of GSAP). Verification: sample
`getComputedStyle(...).transform` of the chars on the live site every 50 ms and
compare against the replica in Playwright (viewport 1440×900, ≥1200 = desktop).

Site motion tokens (chunks/tokens.js):
- durations: quick .2s / base .3s / slow .45–.6s
- eases: informative = linear, focused = power2.inOut, expressive = power2.out
- standard stagger: 0.02 s per element

## 1. Hero headline (rotating char-by-char phrases)

- Each `h1 .highlights` phrase contains `.char` elements (one per letter,
  already in the HTML).
- Per-char animation: transform translateY, duration 0.3 s, ease power2.out
  (≈ `cubic-bezier(.215,.61,.355,1)`), delay k×0.02 s (k = char index).
  The base CSS sets `transition:none` on the .char elements → force it inline
  with `!important`.
- Positions: enters from `lineHeight×2.25` px (below), exits towards
  `−2×lineHeight` px (above). lineHeight is computed from the phrase itself
  (roughly 48px mobile / 80px desktop — NEVER hardcode it).
- The outgoing and incoming phrases animate IN PARALLEL (same instant).
- Loop: the next swap starts 2 s after the previous one FINISHES
  (swap duration = 0.3 + 0.02×(nChars−1) ≈ 0.75 s → period ≈ 2.75 s).
- Resetting the hidden phrase: transition none → translateY(inY) → reflow →
  restore the transition (otherwise you see it travel back).
- Pauses when the hero is outside the viewport or document.hidden (retry
  every 500 ms).
- Entrance: phrase 0 performs the same "in" as soon as the page starts.

## 2. Green hero cubes (square-value)

- TWO cubes (.square-wrapper > .square-block), 4 face-slots each at
  rotateY 0/90/180/−90 + translateZ(--square-translate-z); the block rotates
  via `--rotate` (transition transform 1s from the CSS).
- SYNC: the cubes rotate −90° at the SAME instant each headline swap starts
  (in the original both hang off the same GSAP timeline).
- The 2nd cube runs 0.3 s behind: class `rotation-ready` on its wrapper →
  `transition-delay` from the CSS. Only the second one carries it.
- Cycled contents: the incoming content is placed in the slot that is about to
  come in (position 1..4 → classes rotate-none/once/twice/thrice; the
  outgoing/incoming pair carries .hide/.show, which animate the .char-square
  elements 50px).
  Cube 1: the 4 saved photos. Cube 2: the 7 stats from the site in this order —
  66% invoices AI / 44% order processing / 20% excess inventory / 15% loan
  applications / 1,100+ automation opportunities / 70% on-time delivery /
  $6.5bn total value — so that stat n matches phrase n of the headline.
- Entrance: the first face does a pop scale(0)→1 + opacity, 0.3 s linear, at the
  same time as the letters come in; afterwards clear the inline styles (the
  inline scale overrides the face's 3D transform; without perspective it is not
  noticeable).
- ⚠️ PITFALL: the snapshot saves the ACCUMULATED `--rotate` (e.g. −9090deg).
  Reset it to 0 WITHOUT a transition (transition none + reflow) or the cube
  spins about 25 times on load.

## 3. Solutions accordion (animated-accordion)

- Desktop (≥1200 px): ONLY one `<details>` open; the
  `[data-accordion][data-index]` panels (the sidebar with h3+link, and the
  content area with chip+tagline) are kept in sync with the `.show` class.
- Progress bar: a SINGLE `.accordion-progress`, which lives INSIDE the open
  item — it is created on open and REMOVED on close (not one per item).
  `.active` is added ~100 ms later → transition transform 12s linear
  (scaleX 0→1, CSS from solutions.css). Removing .active makes the bar snap
  back to 0.
- Auto-advance every 12 s using requestAnimationFrame to measure the time (not
  plain setTimeout). Pauses on: hover over the side panel, and the block being
  outside the viewport (IntersectionObserver; at the start the bar is NOT
  active until the block enters the screen).
- Click on a closed item: selection + timer restart. Click on the open item:
  STOPS the timer (that is what the site does).
- Mobile (<1200): all items open, no toggle; the tabs at the top scroll the
  item carousel horizontally and stay in sync with the scroll.
- ⚠️ SNAPSHOT PITFALL: the label chip came through as `<p><div class=
  "labels-container">` (invalid HTML) → the parser lifts the div out of the p
  and the chip shows up in the list. On the real site the chip is only visible
  in the content area. Fix: CSS `@media (min-width:1200px){.solutions .accordion-item
  .labels-container{display:none}}` (injected by site-fx).

## 4. Top menu (nav-fx.js)

Documented separately, in **`experiments/claude_navfx_context.md`** (shared file
`experiments/nav-fx.js`). Not duplicated here.

## 5. Standard verification

With Playwright (local chromium) serving the folder over http.server:
1. Headline: sample the translateY of the first char of each phrase every 50 ms →
   out and in must be seen simultaneously (~300 ms) with a period of ~2.7 s.
2. Cubes: `--rotate` must go 0 → −90 → −180 … only on the swaps, with no jumps
   on load; `rotation-ready` only on the 2nd wrapper.
3. Accordion: a single .accordion-progress, inside the open item; .active when
   it enters the viewport; clicking another item moves it.
4. Nav: wheel down → nav-hidden + .cloned-cta fixed; wheel up →
   nav-shown and the clone disappears.
