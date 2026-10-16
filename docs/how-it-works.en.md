# How It Works

[简体中文](./how-it-works.md) | [English](./how-it-works.en.md)

1. **Input** -> Trim the submitted string; the renderer lowercases it for hashing
2. **Hash** -> Compute SHA-256
3. **Color** -> Extract HSL from the hash and convert it to RGB, giving a light background behind a vivid mark; Dark Background swaps that for a dark shade of the same hue behind the light one. Both forms come from bytes 0-3
4. **Pattern** -> Pick a family from the current grid mode's table (mirrored: noise, frame, cross, diagonal, center, checker; unmirrored: scatter, stripe, corner, wedge, pillar, flag), then fill each cell of the 5 x 5 grid against its own probability. Each mode has its own table because the families are *defined* by mirroring — a frame is only a frame once its left half is reflected
5. **Render** -> Draw on an HTML5 canvas at 1000 x 1000 resolution
6. **Export** -> Download or copy a PNG with an optional matching-color border of any width from 0 to 500px per side (1000 x 1000px up to 2000 x 2000px)

The rendering algorithm lives in `core/`. UI state and browser actions live in `ui/`; every user setting is its own module under `ui/features/`, and `ui/features/index.js` is the only list of them. The app does not import or depend on the supplied `design-system/` directory.
