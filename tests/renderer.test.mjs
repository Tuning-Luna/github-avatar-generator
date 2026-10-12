import assert from "node:assert/strict"
import { test } from "node:test"
import { drawIdenticon } from "../core/drawer.js"
import { sha256 } from "../utils/hash.js"
import { hslToRgb, relativeLuminance, contrastRatio } from "../utils/color.js"

/** The app renders with a flat white field unless 改变背景颜色 is checked. */
const FLAT = { varyBackground: false }
const VARYING = { varyBackground: true }

async function record(seed, options) {
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
  const background = await drawIdenticon(seed, canvas, options)
  return { width: canvas.width, height: canvas.height, background, calls, assigned }
}

/** Contrast between the pattern and its field, the quantity that decides legibility. */
function contrastOf({ assigned }) {
  const [bgHue, bgSat, bgLig] = parseHsl(assigned[0])
  const pattern = relativeLuminance(...assigned[1].match(/\d+/g).map(Number))
  const field = relativeLuminance(...hslToRgb(bgHue, bgSat, bgLig))
  return contrastRatio(pattern, field)
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

test("relative luminance follows perceived brightness, not HSL lightness", () => {
  assert.equal(relativeLuminance(0, 0, 0), 0)
  assert.equal(relativeLuminance(255, 255, 255), 1)
  // The case that motivated the palette rework: at the same HSL lightness a
  // yellow is roughly ten times as bright as a blue.
  const yellow = relativeLuminance(...hslToRgb(60, 100, 54))
  const blue = relativeLuminance(...hslToRgb(240, 100, 54))
  assert.ok(yellow > 0.8, `yellow ${yellow}`)
  assert.ok(blue < 0.1, `blue ${blue}`)

  // Hence a bright yellow on a pale field is unreadable even though their HSL
  // lightness differs by 40 points.
  const paleField = relativeLuminance(...hslToRgb(60, 55, 96))
  assert.ok(contrastRatio(yellow, paleField) < 1.5)
})

test("contrast ratio matches the WCAG definition at its bounds", () => {
  assert.equal(contrastRatio(0, 1), 21)
  assert.equal(contrastRatio(0.4, 0.4), 1)
  assert.equal(contrastRatio(0, 0), 1)
  // Symmetric, and above the 4.5 threshold the renderer guarantees.
  assert.equal(contrastRatio(0.05, 0.5), contrastRatio(0.5, 0.05))
})

test("octocat pins the current palette and cell positions", async () => {
  const result = await record("octocat", FLAT)
  assert.equal(result.width, 1000)
  assert.equal(result.height, 1000)
  assert.equal(result.background, "hsl(0,0%,100%)")
  assert.deepEqual(result.calls[0], {
    color: "hsl(0,0%,100%)", rect: [0, 0, 1000, 1000],
  })
  assert.deepEqual(result.calls.slice(1).map(({ rect }) => rect.slice(0, 2)), [
    [0, 0], [800, 0],
    [0, 200], [200, 200], [600, 200], [800, 200],
    [200, 400], [600, 400],
    [200, 800], [400, 800], [600, 800],
  ])
  assert.ok(result.calls.slice(1).every(({ color }) => color === "rgb(49,124,45)"))
})

test("flat field is white and the pattern alone carries the contrast", async () => {
  for (const seed of ["octocat", "头像🌱", "flat-field"]) {
    const result = await record(seed, FLAT)
    assert.equal(result.background, "hsl(0,0%,100%)")
    assert.ok(contrastOf(result) >= 4.5, `${seed} contrast ${contrastOf(result).toFixed(2)}`)
  }
})

test("pattern and field stay legible apart in both field modes", async () => {
  const SAMPLES = 400
  for (const options of [FLAT, VARYING]) {
    let worst = Infinity
    for (let i = 0; i < SAMPLES; i++) {
      worst = Math.min(worst, contrastOf(await record(`contrast-${i}`, options)))
    }
    // Contrast is the whole point of the palette rework: a pattern that cannot
    // be told from its field is not an avatar.
    assert.ok(worst >= 4.5, `${JSON.stringify(options)} worst contrast ${worst.toFixed(2)}`)
  }
})

test("no seed renders as a single flat color", async () => {
  const SAMPLES = 400
  for (const options of [FLAT, VARYING]) {
    for (let i = 0; i < SAMPLES; i++) {
      const { calls } = await record(`coverage-${i}`, options)
      const inked = calls.length - 1
      // An entirely inked grid is a solid block of the pattern color and an
      // entirely empty one a solid field, so both extremes must be unreachable.
      assert.ok(inked > 0 && inked < 25, `${JSON.stringify(options)} inked ${inked}`)
    }
  }
})

test("rendering spreads across the palette and density space", async () => {
  const SAMPLES = 400
  const foregroundLightness = []
  const foregroundSaturation = []
  const fieldLightness = []
  const cellCounts = []
  const offsetHuePairings = []

  for (let i = 0; i < SAMPLES; i++) {
    const { calls, assigned } = await record(`spread-${i}`, VARYING)
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

  // Density: the tiers must separate, from sparse to dense, while the coverage
  // guard keeps every pattern between the bounds that rule out a flat result.
  assert.ok(Math.min(...cellCounts) < 10, "no sparse pattern was produced")
  assert.ok(Math.max(...cellCounts) > 15, "no dense pattern was produced")
  assert.ok(Math.min(...cellCounts) >= 4, `coverage fell below the floor: ${Math.min(...cellCounts)}`)
  assert.ok(Math.max(...cellCounts) <= 21, `coverage rose above the ceiling: ${Math.max(...cellCounts)}`)
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
