# GitHub Avatar Generator — Agent Guide

## No build system
- Pure vanilla JS with ES modules (`type="module"` in `index.html`)
- No runtime dependencies, bundler, or framework
- Serve locally with any static file server (e.g. `npx serve .` or VS Code Live Server)
- Run regression checks with Node's built-in test runner: `node --test tests/*.test.mjs`

## Architecture
```
main.js (entry — form and button bindings, mounts the settings, init render)
  → ui/elements.js   (DOM refs the app shell owns)
  → ui/handlers.js   (generation state, feedback, actions)
    → ui/export.js     (shared border composition and PNG blobs)
    → core/drawer.js  (drawIdenticon, roundRect)
      → core/config.js  (GRID=5, CELL=200, SIZE=1000, border 0..500, default 80)
      → core/pattern.js (template table and per-cell fill probabilities)
      → utils/color.js  (hslToRgb)
      → utils/hash.js   (sha256 via crypto.subtle)
    → ui/features/host.js (mounts the settings, collects their options)
      → ui/features/index.js    (the manifest: the one list of settings)
        → ui/features/border.js
        → ui/features/symmetry.js
      → ui/features/registry.js (the feature contract; no DOM, no state)

Stylesheets (all in styles/, linked in index.html in cascade order)
  styles/tokens.css      — app-owned reference-derived color/type/spacing tokens
  styles/reset.css       — reset, accessible focus, reduced-motion base
  styles/layout.css      — workspace panels, header and glass surface
  styles/canvas.css      — preview frame, canvas and generated seed label
  styles/controls.css    — form fields, buttons, checkbox and status
  styles/responsive.css  — desktop sticky preview and mobile layout
```

## Settings are plugins
- Every user-facing setting is one module in `ui/features/`. It declares the controls it owns (by selector), their defaults, what it contributes to the render and to the export, and how it reacts to its own change. `ui/features/index.js` is the only place the app enumerates them.
- Adding a setting is: a module, one entry in `ui/features/index.js`, and its own markup block in `index.html`. Nothing in `ui/handlers.js`, `ui/elements.js`, `ui/features/host.js` or another feature names a specific setting, and removing one is deleting those same three things.
- The option sets are the seam. `renderOptions()` is merged into the object handed to `drawIdenticon`, `exportOptions()` into what the exporter reads, so a setting that only affects the export cannot reach the render and vice versa. A declared hook that no feature implements contributes nothing — `border` declares no `renderOptions`, `symmetry` declares no `exportOptions`.
- A feature owns its own controls' disabled state through `sync(ctx)`, which the host re-runs on mount, on any change and whenever the loading flag moves. That is why `添加边框` stays live during a render while `左右对称` does not: one changes only the export, the other changes the pattern, and `renderFor` drops a render it is already busy with.
- `ui/features/registry.js` is deliberately free of DOM access and of module-level state — the host owns the one registry instance — so `tests/features.test.mjs` can assert the contract with plain objects. `tests/host.test.mjs` covers the DOM half against a stub that mirrors the ids in `index.html`.
- A feature's control selectors and readouts live in its descriptor rather than in `ui/elements.js`, so deleting the module deletes its DOM references too. `ui/elements.js` holds only what the app shell owns.

## Key conventions
- `core/` and `ui/` hold JavaScript only; every stylesheet lives in `styles/`. The sheets are flat and independent (no `@import`, no `url()`), so their order in `index.html` is the cascade order.
- The source canvas is always 1000 x 1000px (5 x 5 grid x 200px cells); CSS scales it for display.
- Grid uses horizontal mirroring: the right half repeats the left, which is what 左右对称 switches. `MIRROR_MAP` in `core/config.js` handles the column mapping, and `buildPattern()` reads a mirrored cell's byte from the column it mirrors, so a mirrored pair cannot disagree.
- Deterministic seed: renderer trims, lowercases, then SHA-256 hashes input. Bytes 0-3 drive hue/sat/lig, byte 4 selects the template, byte 5 is the density, and cells start at byte 6. A mirrored grid stops at byte 20 (one byte per authored cell, because each drives both columns it mirrors onto) and an unmirrored one at byte 30 (one byte per cell). Byte 31 is the only byte either mode leaves free — the reservation that used to cover 21-31 is what symmetry spent, and it reinterpreted 6-20 as well, so a later axis takes byte 31 or a longer digest rather than assuming a free span. The rationale is recorded above the constants in `core/pattern.js`.
- `core/pattern.js` owns the shape and is a pure function of the digest — no canvas — so `tests/pattern.test.mjs` can assert it directly. A template table names a family per row (noise, frame, cross, diagonal, center, checker) and gives every cell a fill probability: skeleton, background, or unstructured. The table and its constants are the entire tuning surface for how output looks; `core/drawer.js` only paints the grid it returns. Mirroring is a property of the cell index in one loop rather than a second pass, so the two modes cannot drift.
- A mirrored 5 x 5 grid has 15 free bits, so mirroring can never exceed 32768 distinct patterns; switching 左右对称 off spends 25 and reaches 2^25. Within the mirrored ceiling legibility trades directly against variety: a family reads clearly only when its skeleton is dense *and* its background quiet, and a quiet background leaves few distinct patterns in that family. Changing the constants moves you along that trade — the measured numbers for each setting are recorded above them. Keeping every probability strictly inside (0, 1) is what preserves the ceiling, which is why the clamp around them is not optional.
- Background color is an HSL string returned by `drawIdenticon()`; use this return value for export borders. Do not re-read canvas pixels.
- `ui/handlers.js` distinguishes the editable draft from the last successfully rendered seed. Copy and download use the committed result, and so does `rerender()`, which is what a shape-changing setting asks for — a setting change must not silently commit a draft.
- Export without a border is 1000 x 1000px; the border widens it by 2x the chosen width per edge, so the default 80px produces 1160 x 1160px and the 500px maximum produces 2000 x 2000px. `BORDER_MAX` is bounded by canvas area limits rather than aesthetics — the rationale is recorded in `core/config.js`.
- `core/config.js` owns the border bounds (`BORDER_MIN`/`BORDER_MAX`/`BORDER_STEP`/`DEFAULT_BORDER_SIZE`); `ui/features/border.js` applies them to the range control. `borderGeometry()` in `ui/export.js` is the single source of the border math — `getExportCanvas()` and the preview padding both derive from it, so the two cannot drift.
- 添加边框 and 左右对称 are drawn as switches but stay `type="checkbox"` with `role="switch"`: the input itself is the track and its `::before` is the thumb, so keyboard handling, the `.checked` reads in the feature modules and the focus ring from `reset.css` all keep working. Their thumb colors are chosen for contrast against their tracks — white on `--primary` measures 1.71:1, which is why the checked thumb is `--on-primary` instead. `.switch-row` spaces them apart because two adjacent settings at the default label gap read as one.
- The width slider stays in place while 添加边框 is unchecked and is disabled instead of hidden: `border.sync()` sets `disabled` plus `.is-disabled` on the row, and the readout then reports the 1000 x 1000px a border-less export produces. It drives the preview through `--avatar-border-padding` rather than a re-render, which is also why the border declares no `onChange`. Percentage padding resolves against the containing block, not the element, so `.preview-cap` holds the 320px cap and `.preview-frame` stays at `width: 100%`; without that wrapper the preview border is proportionally too thick on wide viewports. Padding is deliberately excluded from the frame's transition so the preview never lags the handle.
- The `checked` and numeric attributes in `index.html` are static pre-JS baselines, so the controls stay usable before modules run. Each feature module is the authoritative JS source and re-applies its own defaults on mount; `core/config.js` remains authoritative for the border bounds.

## Verification
- Node tests are dependency-free and cover hash/color/pattern/rendering/export invariants; the mirrored pattern space is asserted exhaustively over all 32768 states rather than sampled, and the unmirrored one is asserted cell by cell so its byte allocation is pinned rather than described.
- The settings contract is covered in two layers: `tests/features.test.mjs` asserts the registry with plain objects, and `tests/host.test.mjs` asserts the DOM half — defaults applied, the right event bound per control type, readouts and preview padding set, option sets collected, and only a shape-changing setting re-rendering — against a stub whose id table mirrors `index.html`.
- Browser-only checks require a localhost server: clipboard permissions, downloads, keyboard submission, responsive layout at 320px through desktop widths, and the visual result of 左右对称 on and off.
- Do not import, install, or modify the supplied `design-system/` directory; only selected reference styles are adapted into app-owned CSS.

## Deployment
- Deployed via GitHub Pages at `tuning-luna.github.io/github-avatar-generator`.
- Keep asset, stylesheet, and module URLs relative so the app works below the GitHub Pages subpath.
- External Inter and Manrope stylesheets are optional visual enhancements; system/CJK fallbacks must remain usable when the network is unavailable.

## Codebase quirks
- All app files use `// @ts-nocheck`; TypeScript is not configured.
- `roundRect` is defined in `core/drawer.js` but is not currently used by the renderer, and `BORDER_RADIUS` in `core/config.js` is exported but imported nowhere. Both pre-date the settings registry.
- PNG is the only export format; there are no history, persistence, theme, resolution, or live-generation controls. The two switches in the settings row are the whole settings surface.
- `ui/handlers.js` exports `state` for inspection, but nothing imports it.
- The reference design system has no runtime role in this app and must not become an application dependency.
