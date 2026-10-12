# Verify | 验证

Run the dependency-free Node regression tests with Node 20 or newer:

```sh
node --test tests/*.test.mjs
```

The tests cover hashing, color conversion, deterministic mirrored rendering, Unicode/empty seeds, and the shared export-canvas dimensions. Browser-only behavior (clipboard permissions, downloads, responsive layout) should be checked from a localhost server.
