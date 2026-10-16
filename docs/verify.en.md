# Verify

[简体中文](./verify.md) | [English](./verify.en.md)

Run the dependency-free Node regression tests with Node 20 or newer:

```sh
node --test tests/*.test.mjs
```

The tests cover hashing, color conversion, template patterns (mirror symmetry checked exhaustively over all 32768 states, with every template's cells verified flippable, and the shared byte allocation of both grid modes verified cell by cell), deterministic rendering, Unicode/empty seeds, and the shared export-canvas dimensions. The settings registry and its DOM host are covered separately, without a browser. Browser-only behavior (clipboard permissions, downloads, responsive layout, and how the shape looks with left-right symmetry off) should be checked from a localhost server.
