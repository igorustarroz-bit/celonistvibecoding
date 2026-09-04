# Concept Video Scroll (experiment 1) — context for Claude

> Lives in `experiments/` with the other `claude_*_context.md` files; paths below are relative
> to `experiments/`. The general process for an experiment is in
> `claude_newexperiment_context.md`; the cleanup rules in `claude_antiphishing_context.md`.

Scroll-driven video scrubbing on a saved copy of the Banking Solutions page. It is the oldest
experiment in the repo (April 2026) and was built before the shared `lib/`, `nav-fx.js` and
the cleanup process existed, so it is the one most likely to still carry old habits.

## 1. What is in the folder

```
Concept-Video-Scroll/
  test1/   one 67 s video (hd.mp4) scrubbed by GSAP ScrollTrigger over a 500vh spacer
           index.html · style.css · script.js · Celonis-Banking-Solutions-_-Celonis.html (saved copy)
  test2/   five clips (clip-01…05.mp4), vanilla JS: sticky 100vh stages, one wrapper per clip
           (data-height="380vh" etc.), crossfades driven by each clip's own scroll progress,
           text panels per clip, clip counter, scroll hint and a global progress bar.
           Everything (CSS + JS) is inline in index.html.
```

Videos are encoded with `-g 1` (every frame a keyframe) so `currentTime` seeks are instant —
see the ffmpeg lines at the top of `test1/script.js`. Keep that when re-encoding.

## 2. The progress bar (2026-09-04)

Both pages show a thin bar on the **bottom edge of the site header** that fills with the
video progress: `#global-progress` in test2, `#scrub-progress` in test1 (added that day).

What it measures — Igor's decision: **the video sequence, not the page**. 0 when the first
clip reaches the top of the viewport, 1 when the last clip has finished scrubbing (test2) /
when `#gaita` has scrolled through (test1). The site content below the videos is not part
of it. Once the sequence has scrolled out of view the bar (and, in test2, the clip counter)
fades out (`.idle`).

How it is built, and why:

- `position: fixed; top: var(--nav-h, 88px); left: 0; right: 0`. The header is **88 px on
  desktop and 64 px on phones**, so the offset cannot be a constant: the script measures
  `.nav-wrapper` on load and resize and writes `--nav-h`.
- The fill is `transform: scaleX(p)` with `transform-origin: 0 50%`, not `width: p%`: no
  layout work per frame, and immune to margins.
- 1 px at 40 % white on desktop, **2 px at 60 % on ≤ 767 px** (`@media`): 1 px at 40 % is
  invisible on a phone screen.
- `margin: 0` explicitly — see the gotcha below.

### The gotcha that caused the bug: `main > div { margin: 40px 16px }`

The saved page's `styles.css` has that rule. The fixed overlays in test2 (`#global-progress`,
`#clip-counter`, `#scrollHint`) are direct children of `<main>`, so they inherited a 40 px
top margin and 16 px side margins. A fixed element with `top: 48px` and `margin-top: 40px`
renders at 88 px — which **happened to be exactly the header height on desktop**, so it
looked right there by coincidence and floated 24 px under the 64 px header on phones. The
`* { margin: 0 }` reset at the top of the inline stylesheet does not help: `main > div`
(0,0,2) beats `*` (0,0,0). Any fixed overlay dropped into `<main>` on a saved Celonis page
needs its own `margin: 0`.

The same rule still applies to the `.clip-wrapper` elements in test2 (16 px side margins
→ the video stages are 32 px narrower than the viewport, with 40 px gaps between clips
hidden by the top/bottom gradients). Left as is on purpose — it is part of the look Igor has
been evaluating; change it only if asked.

## 3. test1 fixes made the same day

- **ScrollTrigger trigger was `#container`, an element that does not exist.** GSAP falls back
  to the page, so the 67 s video was being scrubbed over the whole document: it left the
  viewport at ~48 % and the remaining half was never seen. Trigger is now `#gaita` (the block
  that holds the sticky video and the 500vh spacer): the whole video plays while the block is
  on screen, and the bar matches it.
- **GSAP moved from cdnjs to `lib/`**: `lib/gsap.min.js` + `lib/ScrollTrigger.min.js`
  (3.5.1, taken from the npm package `gsap@3.5.1`, `dist/`). Same-origin requests only, and
  the page now works from `file://`. Loaded as `../../lib/...` from `test1/`.
- The scrub tween keeps GSAP's **default ease (`power1.out`)** — inherited from the original
  code, so scroll position and video time are not linear (at 50 % of the block the video is
  at 75 %). Left as is: it is the feel Igor has been looking at. The bar therefore reports
  `video.currentTime / video.duration`, not the scroll fraction, so it always matches what is
  on screen. If a linear scrub is ever wanted, add `ease: "none"` to the `tl.fromTo`.
- Cache-busting: `style.css?v=2`, `script.js?v=3`.

## 4. Anti-phishing leftovers found in these pages (and fixed)

The 2026-09-03 cleanup had handled identity tags, links and iframes, but the pages were still
making third-party requests and shipping trackers. Details and the corrected rule in
`claude_antiphishing_context.md` §2.3 (11, 11b) and §4. Short version:

- `main.MWYyNDJlNWM5MA.js` = **TikTok Pixel SDK**, `10.*.chunk.js` / `11.*.chunk.js` =
  **Qualtrics**. The old rule 11 wrongly listed them as layout code. Removed from the four
  HTML files, gitignored (`git rm --cached`).
- `<picture><source srcset="https://delivery-…adobeaemcloud.com/…">` (21 per page) — the
  only actual third-party requests. Removed; the local `<img>` fallbacks stay.
- Pixel `<img>`s (`out`, `out-1…12`, Bing `batBeacon` `0`/`0-1`), the OneTrust remnants
  (`<style id="onetrust-style">` + empty `#onetrust-consent-sdk`), a Vidyard thumbnail whose
  file was never saved. Files gitignored, plus the unreferenced but published GTM container
  (`_files/js`, 340 KB) and AdRoll `sendrolling.js`.

Verified with headless Chromium at 390×844 and 1440×900: bar at 64 / 88 px, `scaleX` equal to
the formula at every sampled scroll position, `.idle` past the sequence, **zero third-party
hosts**, no console errors.

## 5. Testing notes

- The saved page has `scroll-behavior: smooth`. In Playwright, `window.scrollTo(0, y)` then
  animates and a reading 400 ms later is short of `y`; either add
  `html, body { scroll-behavior: auto !important }` before scrolling or compare the bar with
  the formula computed from the *live* `scrollY`, not from the requested one.
- Programmatic `scrollTo` in the built-in browser pane does not always dispatch `scroll`;
  `window.dispatchEvent(new Event('scroll'))` after it if a value looks stale.
- test1 on a phone: the video is 16:9 at viewport width (~211 px tall at 375 px), sticky at
  the top, with the 500vh spacer black below it. That is the original design, untouched.
