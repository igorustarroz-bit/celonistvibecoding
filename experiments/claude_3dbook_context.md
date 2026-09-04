# eBook hero with a 3D book — experiment 4 specification

> **New experiment?** The complete process (save the page from the browser →
> anti-phishing cleanup → nav-fx → index → publish) is in
> `claude_newexperiment_context.md`. Since 2026-09-04 the cleanup is a script:
> `clean-saved-page.py` (see §7).

> This document lives in `experiments/` alongside the other `claude_*_context.md`
> files. **Paths in this doc are relative to `experiments/`.**

Status: v2, 2026-09-04. v1 (`ec88f1a`) was reviewed by Igor the same day and changed in
three ways (§0). Awaiting his visual tuning of v2.

Igor's rule for the whole project: everything is delivered in English — the
experiments' UI, the context files and the comments inside the code. Orders may
come in Spanish; the output does not.

## 0. v1 → v2 — Igor's review (2026-09-04), CLOSED decisions

- **No pill label.** The "EBOOK · ENGLISH" sprite is gone (code removed, not hidden).
- **Not the isometric Data Core angle.** The book must respect the point of view of the
  original product shot: a perspective camera placed where the photographer was —
  on the book's lower-left, high up (`TUNE.camera = {az: -50, el: 50, fov: 24}`;
  az measured from +z toward +x, so negative = the spine side). The spine sits
  lower-left, the bottom edge runs up-right, the title reads rising to the right, the
  near corner is the biggest. The Data Core look stays in the MATERIALS and effects
  (softbox environment, light edges, floor line, bloom), not in the camera.
- **The book only opens on CLICK** (and closes on the next click; Enter/Space on the
  focused canvas do the same). No loop. Hover only lifts the cover 5° as an
  affordance (`hoverLift`, set to 0 to remove it).
- **The forms come back as inert replicas** (page-level decision, see the anti-phishing
  doc rule 9 and `lib/inert-form.*`): the gated download form in the `.pnf` block and
  the footer newsletter, typable but with no `<form>`, no action, no names, no
  email/password types; the button shows a "disabled in this prototype" note.

## 1. What it is

The eBook detail page `https://www.celonis.com/insights/ebooks/supply-chain-sustainability`
("The Realist's Guide to Sustainable Supply Chains") with the hero's product shot — a
rendered PNG of the printed guide lying at an angle on black, 750×499 — replaced by a
**real 3D book** built with the Data Core technology (experiment 3): Three.js r147 UMD +
the post stack in `lib/three-post.js`. The idea: the same 3D language the site uses for
the Data Core, applied to a content asset.

- Folder: `3d-book/` — `original.html` (saved copy, cleaned), `index.html` (the
  experiment), `original/` (the browser's assets, 17 files published, 75 tracking files
  gitignored), `book-fx/book-3d.js` (our code).
- URLs: https://igorustarroz-bit.github.io/celonisvibecoding/experiments/3d-book/index.html
  and `.../3d-book/original.html`. Listed in the root index as **Experiment 4**.
- In the page: the `<picture>` inside `.detail-page-hero-media-container` becomes
  `<div class="auto-player-wrapper" id="book-stage"><canvas id="book-canvas">`; the
  `<style id="book-exp">` gives the stage `aspect-ratio: 3/2` (the ratio the hero CSS
  gives the image), `border-radius: var(--fnd-radius-m)` and a black background.

## 2. The scene (technology-agnostic)

Black background. A closed paperback lying flat, seen from a **perspective camera
placed like the product shot's photographer** (see §0; v1 used the Data Core isometric
camera and Igor rejected it). Orientation copied from the product shot: the spine sits
lower-left, the title reads rising to the right, the near corner is the biggest.

- Book: width 1.0 × height 1.38 (portrait, like the printed guide), page block 0.062
  thick with a 0.012 inset, covers 0.009 thick, spine wraps the left side.
- Cover artwork (canvas texture 1024×1414): near-black paper `#0d0d0f` with a faint
  diagonal grain, a chain of 11 overlapping white ring outlines (r 118, 3.2 px) in the
  upper half, one blue disc `#0f5bff` in the left ring of the middle row, the title in
  Poppins 600 66 px on three lines, the subtitle in Poppins 400 31 px, a neutral ring
  mark bottom-right (NOT the brand logo — deliberate, see the anti-phishing doc).
- Material: near-black with a clearcoat (roughness 0.52, clearcoat 0.45), lit by the
  **same banded softbox environment** as the Data Core (`makeEnvTexture`, copied
  verbatim) so the flat cover picks up the same soft light band. Pages `#d9d9d9`,
  fore-edge with a horizontal line texture (the stacked sheets).
- Data Core traits carried over: translucent **white light edges** on the covers and the
  page block (EdgesGeometry, additive, opacity 0.34 / 0.17), a **floor frame line**
  (rounded-rectangle ribbon 0.0085 wide, margin 0.16 around the book, opacity 0.30),
  subtle bloom (0.16 / 0.26 / threshold 0.72), MSAA 4 through the composer's render
  targets (WebGL2), dpr capped at 2, mouse parallax (root ±0.22 rad Y, ±0.05 X, lerp
  0.055), the crosshair cursor, pop-in scale 0.75→1 over 600 ms.
- Sizing (`fitCamera`): the camera sits on the az/el direction and its distance is
  solved iteratively (4 passes) so the CLOSED book + floor line fill `fit` (0.86) of the
  stage; if the open cover would not fit, the union rules; the target is recentred on
  the union of both states so nothing clips when it opens. Refit on resize and whenever
  a camera/fit/openAngle/floorMargin knob changes.

### Motion

- Click on the book (raycast on cover/pages/back/spine) toggles open ↔ closed:
  the cover goes 0→62° over 1100 ms (inOutQuart), the first 6 loose leaves follow it,
  each with 95 ms more lag than the previous one and a smaller share of the angle
  (0.74 − 0.105·i), so they fan. Closing reverses it from wherever it is.
- While open: a slow wobble of the cover (±0.025 rad, 1.4 s) and a float of the whole
  book (amplitude 0.010), common phase.
- Hover (raycast, 60 ms throttle) lifts the cover an extra 5° — the only motion
  before the click. Mouse parallax and the pop-in are kept.
- `prefers-reduced-motion`: no parallax, no wobble/float, no pop-in; the click still
  works.

## 3. Live knobs — `window.BOOK` (edit in the DevTools console)

Applied every frame, Igor's workflow (tune live, then paste the values as the new
defaults in `book-fx/book-3d.js`):

`openAngle 62 · openMs 1100 · hoverLift 5 · leaves 6 · leafFollow 0.74 · leafStep 0.105 ·
leafLag 95 · bob 0.010 · camera {az −50, el 50, fov 24} · target {x 0, y 0.06, z 0} ·
edgeOpacity 0.34 · floorOpacity 0.30 · floorMargin 0.16 · coverColor #0d0d0f ·
pageColor #d9d9d9 · accent #0f5bff · clearcoat 0.45 · roughness 0.52 · envIntensity
0.65 · keyLight 0.55 · ambient 0.10 · bloom {strength 0.16, radius 0.26, threshold 0.72}
· fit 0.86 · quality {msaa 4, dprMax 2}`

Changing `coverColor`/`accent` redraws the cover texture; `floorMargin` rebuilds the
floor line; `camera.*`, `target.*`, `fit`, `openAngle` refit the camera. The camera is
the knob to match the photo more closely: `BOOK.camera.az = -45` turns toward the
bottom edge, `el` raises/lowers the photographer, `fov` changes the perspective
exaggeration. There is no tuner panel (unlike the Data Core) — add one only if Igor
asks.

## 4. Implementation notes (three.js r147)

- Book built in its natural frame (width along X, spine at x = −0.5, top of the cover at
  z = −0.69, lying on y = 0); the camera, not the book, is turned to get the photo's
  orientation (v1 rotated the book 90° for the isometric camera). The **cover hinges
  about Z** (`coverPivot.rotation.z`, positive lifts the fore-edge); the very first
  build hinged about X and the cover opened along the wrong edge — do not repeat.
- The cover is a `BoxGeometry` with a material array; only the +y face (index 2)
  carries the artwork (`coverTopMat`, colour white so the texture carries the colour).
- Leaves are `PlaneGeometry` in their own pivots on the spine, 0.0012 apart.
- Floor line: `ShapeGeometry` of a rounded rectangle with a rounded-rectangle hole.
- The canvas is focusable (`tabindex=0`, `role=button`) so the click can also be a
  keyboard action.
- `document.fonts.ready` redraws the cover texture once Poppins is in.

## 5. Shared libraries — `lib/` (new on 2026-09-04)

Igor's rule: anything used by more than one experiment lives at the `experiments/`
level. Moved out of `datacore/anime-datacore/` with `git mv` and re-linked in
`datacore/index.html` and `datacore/index3d.html`:

- `lib/three.min.js` (r147 UMD), `lib/three-post.js` (composer + passes),
  `lib/sprite.js` (placeholder spritemap; rewrites the `<use>` refs).
- `lib/inert-form.css` + `lib/inert-form.js` — the inert form replicas (anti-phishing doc
  rule 9): styles copied from the site's `external-forms-style.css`, scoped under
  `.inert-form`; the JS strips `name`s, sets `autocomplete=off`, blocks Enter and makes
  every button show the "disabled" note. Any experiment whose page had a form uses them.
- `lib/poppins.css` + `lib/fonts/poppins-latin-{400,500,600}-normal.woff2` (OFL, from
  `@fontsource/poppins` 5.x — Google Fonts is blocked from the sandbox, npm is not).
  The site's `fonts.css` points at `/src/assets/fonts/…`, which is never saved offline,
  so every saved page had been falling back to the system font. `3d-book` loads it as
  `<link rel="stylesheet" href="../lib/poppins.css">` after the page's own CSS.
  **The datacore and 3d-globe pages do not load it yet** — one line each if Igor wants
  the real typeface there too.

## 6. Anti-phishing status of this copy

Cleaned with `clean-saved-page.py` (§7) + the sweep from `claude_antiphishing_context.md`
§4: 0 canonical/og/twitter/JSON-LD, 0 scripts other than ours, 0 iframes, 0 forms,
`noindex,nofollow`, 71 outbound `<a>` → `#`, CDN `<source>` srcsets removed, tracking
pixels saved as extension-less files (`out`, `out(3)`, `0`…) removed from the HTML, the
Qualified and OneTrust widget styles/DOM removed. The two Pardot iframes are replaced by
inert replicas (`lib/inert-form.*`, §5): 0 `<form>`, 0 email/password inputs, so the
sweep stays clean. Verified in the browser on the published page: every request is
same-origin (the only 404 is the intentional `/dist/assets/spritemap.svg`, which
`sprite.js` replaces).

## 7. `clean-saved-page.py` — the cleanup as a script

```
python3 clean-saved-page.py <page.html> "<Page>_files" original "<title>" [out.html] --report
```

Implements section 2 of the anti-phishing doc in one go (identity tags, all scripts,
iframes, noscript, pixel `<img>`s, external `<link>` preloads, widget `<style>` blocks
with external urls, the OneTrust div, CDN `<source>`s, links → `#`, robots + our title
and description, assets folder rename). Two things learnt on this page and now handled
by the script:

- **Saved scroll state.** The page was saved while scrolled, so the copy carried
  `class="… nav-hidden"` on the nav wrapper plus an already-cloned CTA: the header
  rendered as just a "Try for free" button. The script drops both so `nav-fx.js`
  starts from the resting state.
- **`--report`** prints which files in `original/` the cleaned page (and its CSS)
  still references and which do not — the second list is what goes into `.gitignore`
  with the `/experiments/<name>/original/` prefix (75 files here).

It is applied to `original.html` in place; `index.html` is then derived from it.

## 8. Open points / ideas for the next pass

- Igor has not tuned v2 yet: camera az/el/fov against the photo, open angle, leaf
  count, edge/floor opacity, whether the hover lift stays.
- The saved page keeps the "■" square before the description (`.white-square`
  relies on a gif under `/src/assets/images/` that was not saved) — cosmetic, same in
  `original.html`.
- Possible variants: the book standing up; the cover fully opening to reveal a
  two-page spread with real content; a stack of the three eBooks from the cards below.
