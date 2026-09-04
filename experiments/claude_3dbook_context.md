# eBook hero with a 3D book — experiment 4 specification

> **New experiment?** The complete process (save the page from the browser →
> anti-phishing cleanup → nav-fx → index → publish) is in
> `claude_newexperiment_context.md`. Since 2026-09-04 the cleanup is a script:
> `clean-saved-page.py` (see §7).

> This document lives in `experiments/` alongside the other `claude_*_context.md`
> files. **Paths in this doc are relative to `experiments/`.**

Status: v1, published 2026-09-04 (commit `ec88f1a`). Awaiting Igor's visual tuning.

Igor's rule for the whole project: everything is delivered in English — the
experiments' UI, the context files and the comments inside the code. Orders may
come in Spanish; the output does not.

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

Black background. A closed paperback lying flat, seen from the **same isometric camera
as the Data Core** (orthographic, azimuth 45°, elevation 31.3°). Orientation copied from
the product shot: the spine sits lower-left, the title reads rising to the right.

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
- Sizing: pixels-per-world-unit = min(W/2.05, H/1.85) · fit (0.96); the view is shifted
  up 0.14 units so the open cover and its label have headroom.

### The cycle (11.5 s loop, inOutQuart — same timing as the Data Core)

- 600→3000 ms: cover opens 0→48°. The first 6 loose leaves follow it, each with 95 ms
  more lag than the previous one and a smaller share of the angle
  (0.74 − 0.105·i), so they fan.
- 1900→2600 ms: the pill label "EBOOK · ENGLISH" (mirrors the two labels on the page)
  fades in above the lifted fore-edge; 7600→8100 ms it fades out BEFORE the cover
  closes (same rule as the Data Core labels).
- 7900→10100 ms: cover closes. Hold closed until 11500.
- While open: a slow wobble of the cover (±0.025 rad, 1.4 s) and a float of the whole
  book (amplitude 0.012), common phase.
- Hover over the book (raycast, 60 ms throttle): the cover lifts an extra 9°, also when
  closed ("peek").
- `prefers-reduced-motion`: static, cover at 55%, label on, no parallax.

## 3. Live knobs — `window.BOOK` (edit in the DevTools console)

Applied every frame, Igor's workflow (tune live, then paste the values as the new
defaults in `book-fx/book-3d.js`):

`openAngle 48 · hoverLift 9 · leaves 6 · leafFollow 0.74 · leafStep 0.105 · leafLag 95 ·
loop 11500 · bob 0.012 · edgeOpacity 0.34 · floorOpacity 0.30 · floorMargin 0.16 ·
coverColor #0d0d0f · pageColor #d9d9d9 · accent #0f5bff · clearcoat 0.45 · roughness
0.52 · envIntensity 0.65 · keyLight 0.55 · ambient 0.10 · bloom {strength 0.16, radius
0.26, threshold 0.72} · fit 0.96 · label true · labelText 'EBOOK  ·  ENGLISH' · quality
{msaa 4, dprMax 2}`

Changing `coverColor`/`accent` redraws the cover texture; `floorMargin` rebuilds the
floor line; `labelText` rebuilds the pill. There is no tuner panel (unlike the Data
Core) — add one only if Igor asks.

## 4. Implementation notes (three.js r147)

- Book built in its natural frame (width along X, spine at x = −0.5, top of the cover at
  z = −0.69, lying on y = 0), then the whole group is turned `rotation.y = π/2`. In this
  frame the **cover hinges about Z** (`coverPivot.rotation.z`, positive lifts the
  fore-edge); the first version hinged about X and the cover opened along the wrong
  edge — do not repeat.
- The cover is a `BoxGeometry` with a material array; only the +y face (index 2)
  carries the artwork (`coverTopMat`, colour white so the texture carries the colour).
- Leaves are `PlaneGeometry` in their own pivots on the spine, 0.0012 apart.
- Floor line: `ShapeGeometry` of a rounded rectangle with a rounded-rectangle hole.
- Label: canvas sprite on layer 1, rendered after the composer with `autoClear=false`
  + `clearDepth()` so it stays crisp and outside the bloom (same as the Data Core).
  Same pill recipe: Poppins 500 34 px, letter-spacing 14 %, padding ≥ 1.5·"o", 2.5 px
  white border, background rgba(2,2,2,.92), height 0.1275 world units.
- `document.fonts.ready` redraws the cover texture and the label once Poppins is in.

## 5. Shared libraries — `lib/` (new on 2026-09-04)

Igor's rule: anything used by more than one experiment lives at the `experiments/`
level. Moved out of `datacore/anime-datacore/` with `git mv` and re-linked in
`datacore/index.html` and `datacore/index3d.html`:

- `lib/three.min.js` (r147 UMD), `lib/three-post.js` (composer + passes),
  `lib/sprite.js` (placeholder spritemap; rewrites the `<use>` refs).
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
Qualified and OneTrust widget styles/DOM removed. Verified in the browser on the
published page: every request is same-origin (the only 404 is the intentional
`/dist/assets/spritemap.svg`, which `sprite.js` replaces).

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

- Igor has not tuned the visuals yet: open angle, leaf count, edge/floor opacity,
  and whether the cover should stay closed longer or open further.
- The saved page keeps the "■" square before the description (`.white-square`
  relies on a gif under `/src/assets/images/` that was not saved) — cosmetic, same in
  `original.html`.
- Possible variants: the book standing up; the cover fully opening to reveal a
  two-page spread with real content; a stack of the three eBooks from the cards below.
