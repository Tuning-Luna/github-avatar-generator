# Verify

[简体中文](./verify.md) | [English](./verify.en.md)

Run the dependency-free Node regression tests with Node 20 or newer:

```sh
node --test tests/*.test.mjs
```

The tests cover hashing, color conversion and contrast, the palette (both modes pinned to a known seed's exact values, the default asserted to be untouched while Dark Background is off, and the 4.5:1 floor swept over a corpus of seeds), family patterns (mirror symmetry checked exhaustively over all 32768 states, every family's cells verified flippable, each grid mode's byte allocation verified cell by cell, and the difference between the two modes asserted per family so it cannot silently shrink), deterministic rendering, Unicode/empty seeds, and the shared export-canvas dimensions. The settings registry and its DOM host are covered separately, without a browser. Browser-only behavior (clipboard permissions, downloads, responsive layout, and how the mark looks with left-right symmetry off and with Dark Background on) should be checked from a localhost server.
