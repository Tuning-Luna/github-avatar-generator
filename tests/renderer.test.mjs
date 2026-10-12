import assert from "node:assert/strict"
import { test } from "node:test"
import { drawIdenticon } from "../core/drawer.js"
import { sha256 } from "../utils/hash.js"
import { hslToRgb } from "../utils/color.js"

async function record(seed) {
  const calls = []
  const assigned = []
  const context = {
    _fillStyle: "",
    // Capture assignments too: a pattern with no inked cells never draws a
    // foreground rect, so the drawn calls alone cannot reveal the palette.
    set fillStyle(value) {
      this._fillStyle = value
      assigned.push(value)
    },
    get fillStyle() {
      return this._fillStyle
    },
    fillRect(...rect) {
      calls.push({ color: this._fillStyle, rect })
    },
  }
  const canvas = { width: 0, height: 0, getContext: () => context }
  const background = await drawIdenticon(seed, canvas)
  return { width: canvas.width, height: canvas.height, background, calls, assigned }
}

/** Foreground lightness of an `rgb()` string, on the same 0-100 scale as HSL. */
function rgbLightness(color) {
  const [r, g, b] = color.match(/\d+/g).map(Number)
  return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255) * 100
}

/** Parse `hsl(h,s%,l%)` into [h, s, l]. */
function parseHsl(color) {
  return color.match(/[\d.]+/g).map(Number)
}

/** Recover the hue of an `rgb()` string so the field/pattern relationship can be checked. */
function rgbHue(color) {
  const [r, g, b] = color.match(/\d+/g).map((value) => Number(value) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const delta = max - min
  const raw = max === r
    ? (g - b) / delta + (g < b ? 6 : 0)
    : max === g
      ? (b - r) / delta + 2
      : (r - g) / delta + 4
  return Math.round(raw * 60) % 360
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

test("octocat pins the current palette and cell positions", async () => {
  const result = await record("octocat")
  assert.equal(result.width, 1000)
  assert.equal(result.height, 1000)
  assert.equal(result.background, "hsl(117,55%,89%)")
  assert.deepEqual(result.calls[0], {
    color: "hsl(117,55%,89%)", rect: [0, 0, 1000, 1000],
  })
  assert.deepEqual(result.calls.slice(1).map(({ rect }) => rect.slice(0, 2)), [
    [0, 0], [800, 0],
    [0, 200], [200, 200], [600, 200], [800, 200],
    [200, 400], [600, 400],
    [200, 800], [400, 800], [600, 800],
  ])
  assert.ok(result.calls.slice(1).every(({ color }) => color === "rgb(68,172,62)"))
})

test("rendering spreads across the palette and density space", async () => {
  const SAMPLES = 400
  const foregroundLightness = []
  const foregroundSaturation = []
  const fieldLightness = []
  const cellCounts = []
  const offsetHuePairings = []

  for (let i = 0; i < SAMPLES; i++) {
    const { calls, assigned } = await record(`spread-${i}`)
    const [bgHue, , bgLig] = parseHsl(assigned[0])
    // The foreground is assigned before any cell is drawn, so it is present even
    // for a pattern that inks nothing.
    const foreground = assigned[1]

    foregroundLightness.push(rgbLightness(foreground))
    foregroundSaturation.push(parseHsl(foreground)[1])
    fieldLightness.push(bgLig)
    cellCounts.push(calls.length - 1)
    offsetHuePairings.push((bgHue - rgbHue(foreground) + 360) % 360)
  }

  const span = (values) => Math.max(...values) - Math.min(...values)

  // Colour: the foreground must leave the old 50-64% lightness band and the old
  // 70-94% saturation band, and the field must land on both sides of it rather
  // than always being a pale tint of the same hue.
  assert.ok(span(foregroundLightness) > 30, `foreground lightness span ${span(foregroundLightness)}`)
  assert.ok(span(foregroundSaturation) > 30, `foreground saturation span ${span(foregroundSaturation)}`)
  assert.ok(Math.min(...fieldLightness) < 30, "no deep field was produced")
  assert.ok(Math.max(...fieldLightness) > 80, "no pale field was produced")

  // Most pairings must rotate the field's hue away from the pattern's; only the
  // monochrome scheme is allowed to reuse it.
  const offset = offsetHuePairings.filter((degrees) => degrees > 15 && degrees < 345)
  assert.ok(offset.length > SAMPLES / 2, `only ${offset.length}/${SAMPLES} used an offset hue`)

  // Density: the tiers must actually separate, from sparse to dense.
  assert.ok(Math.min(...cellCounts) < 10, "no sparse pattern was produced")
  assert.ok(Math.max(...cellCounts) > 15, "no dense pattern was produced")
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
