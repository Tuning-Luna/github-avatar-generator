# How It Works

[简体中文](./how-it-works.md) | [English](./how-it-works.en.md)

1. **Input** -> Trim the submitted string; the renderer lowercases it for hashing
2. **Hash** -> Compute SHA-256
3. **Color** -> Extract HSL from the hash and convert it to RGB
4. **Pattern** -> Use hash bits to determine 5 x 5 mirrored grid cells
5. **Render** -> Draw on an HTML5 canvas at 1000 x 1000 resolution
6. **Export** -> Download or copy a PNG with an optional matching-color border of any width from 0 to 500px per side (1000 x 1000px up to 2000 x 2000px)

The rendering algorithm lives in `core/`. UI state and browser actions live in `ui/`; the app does not import or depend on the supplied `design-system/` directory.
