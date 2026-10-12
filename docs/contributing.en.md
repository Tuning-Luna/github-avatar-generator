# Contributing

[简体中文](./contributing.md) | [English](./contributing.en.md)

Contributions of any kind are welcome: bug reports, feature suggestions, documentation improvements, and code.

## Reporting a problem

Open an [issue](https://github.com/Tuning-Luna/github-avatar-generator/issues) with the steps to reproduce, the expected result, and the actual result. For rendering or export problems, include the seed string you used and your browser version.

## Sending code

1. Fork the repository
2. Branch off `main`
3. Make the change and pass the regression tests under [Verify](./verify.en.md) locally
4. Open a pull request explaining why the change is needed and how you verified it

## Local development

This is a build-free vanilla ES module app with no runtime dependencies, so a change takes effect on page reload with no bundling step. See [Run locally](./run-locally.en.md) to get it started.

## Project conventions

- Keep asset, stylesheet, and module URLs relative so the app keeps working below the GitHub Pages subpath
- `core/` and `ui/` hold JavaScript only; every stylesheet lives in `styles/`
- Do not add runtime dependencies or build tooling; add regression tests under `tests/` for new logic
- Do not make the supplied `design-system/` directory a dependency of the app
