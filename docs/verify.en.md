# Verify

[简体中文](./verify.md) | [English](./verify.en.md)

Run the dependency-free Node regression tests with Node 20 or newer:

```sh
node --test tests/*.test.mjs
```

The tests cover hashing, color conversion, template patterns (mirror symmetry checked exhaustively over all 32768 states, with every template's cells verified flippable), deterministic mirrored rendering, Unicode/empty seeds, and the shared export-canvas dimensions. Browser-only behavior (clipboard permissions, downloads, responsive layout) should be checked from a localhost server.
