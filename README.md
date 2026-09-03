# celonisvibecoding — unofficial design prototypes

Front-end design experiments by [Hanzo](https://hanzo.es/), a design studio, exploring
improvements to a client website: replacing background videos with generative Canvas 2D /
WebGL animations, scroll-driven video scrubbing, and similar ideas.

**These pages are not official pages of the brand shown, and they are neither published
nor endorsed by them.**

The HTML pages under `experiments/` (`celonis-home/`, `datacore/`, `Concept-Video-Scroll/`) are
locally saved copies of public web pages, kept only as a static visual backdrop so the
animation prototypes can be judged in context. They are **not** functional websites:

- all outbound links are disabled (`href="#"`);
- all analytics, advertising and tracking scripts, pixels and iframes have been removed;
- all newsletter / lead-capture forms and chat widgets have been removed;
- no login, sign-up or payment flow exists or is linked;
- no data of any kind is collected;
- every page is served with `<meta name="robots" content="noindex,nofollow">` and carries
  a visible "unofficial prototype" notice.

All trademarks, logos and brand assets belong to their respective owners and are used
here only as reference material for design experimentation.

Index of experiments: [`index.html`](./index.html)

## Repo layout

- root: `index.html` (experiment index), `README.md`, `hanzo_logo.svg`, the Search Console
  verification file, `.nojekyll`.
- `experiments/<name>/` — one folder per experiment.
- `experiments/` also holds what is shared by all of them: `nav-fx.js` and the
  `claude_*_context.md` notes that are not specific to a single experiment.
