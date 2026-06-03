# GitHub Avatar Generator — Agent Guide

## No build system
- Pure vanilla JS with ES modules (`type="module"` in `index.html` line 92)
- No `package.json`, npm, bundler, test framework, or linter config
- Serve locally with any static file server (e.g. `npx serve .` or VS Code Live Server)
- No dev/test/lint commands exist

## Architecture
```
main.js (entry — button bindings + init render)
  → ui/elements.js   (DOM refs)
  → ui/handlers.js   (generate, random, download)
    → core/drawer.js  (drawIdenticon, roundRect)
      → core/config.js  (GRID=5, CELL=200, SIZE=1000, BORDER_SIZE=80)
      → utils/color.js  (hslToRgb)
      → utils/hash.js   (sha256 via crypto.subtle)

CSS modules (linked in index.html)
  core/tokens.css    — design tokens (CSS custom properties)
  core/reset.css     — reset + base styles
  ui/layout.css      — grid background, card, header
  ui/canvas.css      — canvas section, canvas, name label
  ui/controls.css    — inputs, buttons, checkboxes
  ui/responsive.css  — media queries
```

## Key conventions
- **Canvas is always 1000×1000px** (5×5 grid × 200px cells). CSS scales it to 200×200px for display; downloads are full 1000×1000px.
- **Grid uses horizontal mirroring**: right half mirrors left half. `MIRROR_MAP` in `config.js` handles the column mapping.
- **Deterministic seed**: input is trimmed, lowercased, then SHA-256 hashed. Hash bytes drive hue/sat/lig and grid cell fill (even = filled).
- **Background color is an HSL string** (not RGB). `drawIdenticon()` returns it — **use this return value** for border color. Do NOT re-read from canvas pixels (prone to inconsistency).

## Border gotcha
When downloading with border enabled, use the `currentBgColor` from `handlers.js` (stored from `drawIdenticon`'s return value). Re-extracting from `getImageData()` can yield wrong colors due to browser color space handling.

## Codebase quirks
- `roundRect` is defined in `drawer.js` but **not currently used** anywhere
- All files have `// @ts-nocheck`; TypeScript is not actually configured
- No dependencies (zero npm packages)
- No tests; verification is manual (serve + visual check)
- Deployed via GitHub Pages at `tuning-luna.github.io/github-avatar-generator`
- Host font preconnect links in `index.html` (`DM Mono`, `Syne`)
