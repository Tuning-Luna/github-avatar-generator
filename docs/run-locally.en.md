# Run locally

[简体中文](./run-locally.md) | [English](./run-locally.en.md)

This is a zero-build vanilla ES module app. No package installation is required for the app itself. Serve the repository from a local HTTP server so Web Crypto and module loading work:

```sh
npx serve .
```

Then open the printed localhost URL. VS Code Live Server also works. Do not open `index.html` with `file://`.
