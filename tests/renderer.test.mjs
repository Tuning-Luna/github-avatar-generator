import assert from "node:assert/strict"
import { test } from "node:test"
import { drawIdenticon } from "../core/drawer.js"
import { sha256 } from "../utils/hash.js"
import { hslToRgb } from "../utils/color.js"

async function record(seed) {
  const calls = []
  const context = {
    fillRect(...rect) {
      calls.push({ color: this.fillStyle, rect })
    },
  }
  const canvas = { width: 0, height: 0, getContext: () => context }
  const background = await drawIdenticon(seed, canvas)
  return { width: canvas.width, height: canvas.height, background, calls }
}

test("SHA-256 matches the standard abc vector", async () => {
  assert.equal(
    Buffer.from(await sha256("abc")).toString("hex"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  )
})

test("HSL conversion preserves primary colors and grayscale", () => {
  assert.deepEqual(hslToRgb(0, 100, 50), [255, 0, 0])
  assert.deepEqual(hslToRgb(120, 100, 50), [0, 255, 0])
  assert.deepEqual(hslToRgb(240, 100, 50), [0, 0, 255])
  assert.deepEqual(hslToRgb(0, 0, 50), [128, 128, 128])
})

test("octocat retains the pre-redesign palette and cell positions", async () => {
  const result = await record("octocat")
  assert.equal(result.width, 1000)
  assert.equal(result.height, 1000)
  assert.equal(result.background, "hsl(117,44%,96%)")
  assert.deepEqual(result.calls[0], {
    color: "hsl(117,44%,96%)", rect: [0, 0, 1000, 1000],
  })
  assert.deepEqual(result.calls.slice(1).map(({ rect }) => rect.slice(0, 2)), [
    [0, 0], [800, 0],
    [0, 200], [200, 200], [400, 200], [600, 200], [800, 200],
    [400, 400],
    [0, 800], [200, 800], [600, 800], [800, 800],
  ])
  assert.ok(result.calls.slice(1).every(({ color }) => color === "rgb(94,230,86)"))
})

test("rendering is deterministic and normalizes case and outer whitespace", async () => {
  assert.deepEqual(await record("  OcToCaT\n"), await record("octocat"))
  assert.deepEqual(await record("octocat"), await record("octocat"))
})

test("empty and whitespace seeds retain the existing blank-seed result", async () => {
  assert.deepEqual(await record(""), await record(" \t\n "))
})

test("Unicode and long seeds render deterministically with mirrored cells", async () => {
  for (const seed of ["头像🌱", "a".repeat(10000), "another seed"]) {
    const result = await record(seed)
    assert.deepEqual(result, await record(seed))
    const cells = result.calls.slice(1).map(({ rect }) => rect)
    for (const [x, y, width, height] of cells) {
      assert.equal(width, 200)
      assert.equal(height, 200)
      assert.ok(cells.some(([mx, my]) => mx === 800 - x && my === y))
    }
  }
})
