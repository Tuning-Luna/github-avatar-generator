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
      → core/config.js  (GRID=5, CELL=200, SIZE=1000, border 0..200, default 80)
      → utils/color.js  (hslToRgb)
      → utils/hash.js   (sha256 via crypto.subtle)

CSS modules (linked in index.html)
  core/tokens.css    — app-owned reference-derived color/type/spacing tokens
  core/reset.css     — reset, accessible focus, reduced-motion base
  ui/layout.css      — workspace panels, header and glass surface
  ui/canvas.css      — preview frame, canvas and generated seed label
  ui/controls.css    — form fields, buttons, checkbox and status
  ui/responsive.css  — desktop sticky preview and mobile layout
```

## Key conventions
- The source canvas is always 1000 x 1000px (5 x 5 grid x 200px cells); CSS scales it for display.
- Grid uses horizontal mirroring: right half mirrors left half. `MIRROR_MAP` in `core/config.js` handles the column mapping.
- Deterministic seed: renderer trims, lowercases, then SHA-256 hashes input. Hash bytes drive hue/sat/lig and grid cell fill (even = filled).
- Background color is an HSL string returned by `drawIdenticon()`; use this return value for export borders. Do not re-read canvas pixels.
- `ui/handlers.js` distinguishes the editable draft from the last successfully rendered seed. Copy and download use the committed result.
- Export without a border is 1000 x 1000px; the border widens it by 2x the chosen width per edge, so the default 80px produces 1160 x 1160px and the 200px maximum produces 1400 x 1400px.
- `core/config.js` owns the border bounds (`BORDER_MIN`/`BORDER_MAX`/`BORDER_STEP`/`DEFAULT_BORDER_SIZE`); `main.js` applies them to the range control. `borderGeometry()` in `ui/export.js` is the single source of the border math — `getExportCanvas()` and the preview padding both derive from it, so the two cannot drift.
- The width slider is revealed only while 添加边框 is checked, and drives the preview through `--avatar-border-padding` rather than a re-render. Percentage padding resolves against the containing block, not the element, so `.preview-cap` holds the 320px cap and `.preview-frame` stays at `width: 100%`; without that wrapper the preview border is proportionally too thick on wide viewports. Padding is deliberately excluded from the frame's transition so the preview never lags the handle.

## Verification
- Node tests are dependency-free and cover hash/color/rendering/export invariants.
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
