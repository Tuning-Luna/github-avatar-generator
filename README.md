# GitHub Avatar Generator

<div align="center">

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=flat-square&logo=github)](https://tuning-luna.github.io/github-avatar-generator/)

**输入字符串，生成 GitHub 风格头像**  
_Generate GitHub-style identicons from any string_

</div>

---

## Live Demo | 在线体验

[https://tuning-luna.github.io/github-avatar-generator/](https://tuning-luna.github.io/github-avatar-generator/)

## Features | 特性

- **SHA-256 Based** - Deterministic, unique avatar for any input
- **1000 x 1000px HD Output** - High-resolution PNG source canvas
- **Border Option** - Add a background-colored 80px border to exports (1160 x 1160px)
- **Explicit Preview** - Edit a seed, then press Generate or Enter to commit it
- **Random Generator** - Quick random name with number suffix
- **Responsive** - Works with keyboard, mobile widths, and short landscape viewports
- **Accessible feedback** - Labeled input, named canvas, and visible status messages

## Run locally | 本地运行

This is a zero-build vanilla ES module app. No package installation is required for the app itself. Serve the repository from a local HTTP server so Web Crypto and module loading work:

```sh
npx serve .
```

Then open the printed localhost URL. VS Code Live Server also works. Do not open `index.html` with `file://`.

## Verify | 验证

Run the dependency-free Node regression tests with Node 20 or newer:

```sh
node --test tests/*.test.mjs
```

The tests cover hashing, color conversion, deterministic mirrored rendering, Unicode/empty seeds, and the shared export-canvas dimensions. Browser-only behavior (clipboard permissions, downloads, responsive layout) should be checked from a localhost server.

## How It Works | 工作原理

1. **Input** -> Trim the submitted string; the renderer lowercases it for hashing
2. **Hash** -> Compute SHA-256
3. **Color** -> Extract HSL from the hash and convert it to RGB
4. **Pattern** -> Use hash bits to determine 5 x 5 mirrored grid cells
5. **Render** -> Draw on an HTML5 canvas at 1000 x 1000 resolution
6. **Export** -> Download or copy PNG with an optional matching-color border

The rendering algorithm lives in `core/`. UI state and browser actions live in `ui/`; the app does not import or depend on the supplied `design-system/` directory.

## License

See `LICENSE` for project licensing details.
