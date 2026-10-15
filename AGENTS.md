# GitHub Avatar Generator — Agent Guide

## No build system
- Pure vanilla JS with ES modules (`type="module"` in `index.html`)
- No runtime dependencies, bundler, or framework
- Serve locally with any static file server (e.g. `npx serve .` or VS Code Live Server)
- Run regression checks with Node's built-in test runner: `node --test tests/*.test.mjs`

## Architecture
```
main.js (entry — semantic form and button bindings + init render)
  → ui/elements.js   (DOM refs)
  → ui/handlers.js   (generation state, feedback, actions)
    → ui/export.js     (shared border composition and PNG blobs)
    → core/drawer.js  (drawIdenticon, roundRect)
      → core/config.js  (GRID=5, CELL=200, SIZE=1000, border 0..500, default 80)
      → core/pattern.js (template table and per-cell fill probabilities)
      → utils/color.js  (hslToRgb)
      → utils/hash.js   (sha256 via crypto.subtle)

Stylesheets (all in styles/, linked in index.html in cascade order)
  styles/tokens.css      — app-owned reference-derived color/type/spacing tokens
  styles/reset.css       — reset, accessible focus, reduced-motion base
  styles/layout.css      — workspace panels, header and glass surface
  styles/canvas.css      — preview frame, canvas and generated seed label
  styles/controls.css    — form fields, buttons, checkbox and status
  styles/responsive.css  — desktop sticky preview and mobile layout
```

## Key conventions
- `core/` and `ui/` hold JavaScript only; every stylesheet lives in `styles/`. The sheets are flat and independent (no `@import`, no `url()`), so their order in `index.html` is the cascade order.
- The source canvas is always 1000 x 1000px (5 x 5 grid x 200px cells); CSS scales it for display.
- Grid uses horizontal mirroring: right half mirrors left half. `MIRROR_MAP` in `core/config.js` handles the column mapping.
- Deterministic seed: renderer trims, lowercases, then SHA-256 hashes input. Bytes 0-3 drive hue/sat/lig, bytes 4-20 drive the pattern, bytes 21-31 are unused.
- `core/pattern.js` owns the shape and is a pure function of the digest — no canvas — so `tests/pattern.test.mjs` can assert it directly. A template table names a family per row (noise, frame, cross, diagonal, center, checker) and gives every cell a fill probability: skeleton, background, or unstructured. The table and its constants are the entire tuning surface for how output looks; `core/drawer.js` only paints the grid it returns.
- A 5 x 5 mirrored grid has 15 free bits, so the app can never exceed 32768 distinct patterns, and within that ceiling legibility trades directly against variety: a family reads clearly only when its skeleton is dense *and* its background quiet, and a quiet background leaves few distinct patterns in that family. Changing the constants moves you along that trade — the measured numbers for each setting are recorded above them. Keeping every probability strictly inside (0, 1) is what preserves the 32768 ceiling.
- Background color is an HSL string returned by `drawIdenticon()`; use this return value for export borders. Do not re-read canvas pixels.
- `ui/handlers.js` distinguishes the editable draft from the last successfully rendered seed. Copy and download use the committed result.
- Export without a border is 1000 x 1000px; the border widens it by 2x the chosen width per edge, so the default 80px produces 1160 x 1160px and the 500px maximum produces 2000 x 2000px. `BORDER_MAX` is bounded by canvas area limits rather than aesthetics — the rationale is recorded in `core/config.js`.
- `core/config.js` owns the border bounds (`BORDER_MIN`/`BORDER_MAX`/`BORDER_STEP`/`DEFAULT_BORDER_SIZE`); `main.js` applies them to the range control. `borderGeometry()` in `ui/export.js` is the single source of the border math — `getExportCanvas()` and the preview padding both derive from it, so the two cannot drift.
- 添加边框 is drawn as a switch but stays `type="checkbox"` with `role="switch"`: the input itself is the track and its `::before` is the thumb, so keyboard handling, the `.checked` reads in `ui/handlers.js` and the focus ring from `reset.css` all keep working. Its two thumb colors are chosen for contrast against their tracks — white on `--primary` measures 1.71:1, which is why the checked thumb is `--on-primary` instead.
- The width slider stays in place while 添加边框 is unchecked and is disabled instead of hidden: `syncBorderControls()` sets `disabled` plus `.is-disabled` on the row, and the readout then reports the 1000 x 1000px a border-less export produces. It drives the preview through `--avatar-border-padding` rather than a re-render. Percentage padding resolves against the containing block, not the element, so `.preview-cap` holds the 320px cap and `.preview-frame` stays at `width: 100%`; without that wrapper the preview border is proportionally too thick on wide viewports. Padding is deliberately excluded from the frame's transition so the preview never lags the handle.

## Verification
- Node tests are dependency-free and cover hash/color/pattern/rendering/export invariants; the pattern space is asserted exhaustively over all 32768 states rather than sampled.
- Browser-only checks require a localhost server: clipboard permissions, downloads, keyboard submission, and responsive layout at 320px through desktop widths.
- Do not import, install, or modify the supplied `design-system/` directory; only selected reference styles are adapted into app-owned CSS.

## Deployment
- Deployed via GitHub Pages at `tuning-luna.github.io/github-avatar-generator`.
- Keep asset, stylesheet, and module URLs relative so the app works below the GitHub Pages subpath.
- External Inter and Manrope stylesheets are optional visual enhancements; system/CJK fallbacks must remain usable when the network is unavailable.

## Codebase quirks
- All app files use `// @ts-nocheck`; TypeScript is not configured.
- `roundRect` is defined in `core/drawer.js` but is not currently used by the renderer.
- PNG is the only export format; there are no history, persistence, theme, resolution, or live-generation controls.
- The reference design system has no runtime role in this app and must not become an application dependency.
