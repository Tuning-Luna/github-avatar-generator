import assert from "node:assert/strict"
import { test } from "node:test"
import { CELL, GRID } from "../core/config.js"
import { drawIdenticon } from "../core/drawer.js"
import { buildPattern } from "../core/pattern.js"
import { sha256 } from "../utils/hash.js"
import { hslToRgb, contrastRatio } from "../utils/color.js"

async function record(seed, options) {
  const calls = []
  const context = {
    fillRect(...rect) {
      calls.push({ color: this.fillStyle, rect })
    },
  }
  const canvas = { width: 0, height: 0, getContext: () => context }
  const background = await drawIdenticon(seed, canvas, options)
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

test("contrast runs from 1 to 21 and does not depend on argument order", () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]), 21)
  assert.equal(contrastRatio([255, 255, 255], [0, 0, 0]), 21)
  assert.equal(contrastRatio([0, 255, 0], [0, 255, 0]), 1)
  // Mid grey against white, the standard example of the sRGB crossover.
  assert.ok(Math.abs(contrastRatio([128, 128, 128], [255, 255, 255]) - 3.949) < 0.001)
})

test("a known seed keeps the palette it had before the pattern redesign", async () => {
  const result = await record("octocat")
  assert.equal(result.width, 1000)
  assert.equal(result.height, 1000)
  assert.equal(result.background, "hsl(117,44%,96%)")
  assert.deepEqual(result.calls[0], {
    color: "hsl(117,44%,96%)", rect: [0, 0, 1000, 1000],
  })
  assert.ok(result.calls.slice(1).every(({ color }) => color === "rgb(94,230,86)"))
})

test("更改背景色 darkens the background and leaves a mark that reads alone", async () => {
  const off = await record("octocat")
  const on = await record("octocat", { invertBackground: true })

  // Same hue and saturation as the default palette, so the switch re-lights the
  // seed rather than recolouring it: lightness 96% one way round, 20% the
  // other. octocat's lig is 62, so the dark shade is the unclamped -42.
  assert.equal(on.background, "hsl(117,44%,20%)")
  assert.deepEqual(on.calls[0], {
    color: "hsl(117,44%,20%)", rect: [0, 0, 1000, 1000],
  })
  // Its mark already reads on that shade, so it comes through byte for byte:
  // darkening the background must not recolour the mark.
  assert.equal(on.calls[1].color, "rgb(94,230,86)")
  assert.ok(on.calls.slice(1).every(({ color }) => color === off.calls[1].color))
  // The shape is untouched: every cell the default render paints, this one
  // paints in the same place.
  assert.deepEqual(
    on.calls.slice(1).map(({ rect }) => rect),
    off.calls.slice(1).map(({ rect }) => rect),
  )
})

test("a mark that cannot read on the shade is lightened, not recoloured", async () => {
  // navy is hue 224 — inside the band where a dark hue at lightness 50-64 is as
  // dark as the shade behind it — so this is the case the lift exists for.
  const off = await record("navy")
  const on = await record("navy", { invertBackground: true })

  assert.equal(on.background, "hsl(224,52%,14%)")
  assert.equal(off.calls[1].color, "rgb(42,93,234)")
  assert.equal(on.calls[1].color, "rgb(88,128,238)")
  // Hue and saturation are held and only lightness moves, so the mark is the
  // same colour turned up: hsl(224,82%,54%) lifted to 64%.
  assert.equal(hslToRgb(224, 82, 54).join(","), "42,93,234")
  assert.equal(hslToRgb(224, 82, 64).join(","), "88,128,238")
})

test("no seed in a sampled corpus puts its mark under 4.5:1 on the dark shade", async () => {
  // The guarantee the lift makes, checked over real seeds rather than one pinned
  // case. A sampled corpus cannot cover all 135,000 reachable palettes — SHA-256
  // cannot be asked for a chosen hue, saturation and lightness — but every seed
  // it does land on has to clear the bar.
  const rgbOf = (css) => {
    const rgb = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(css)
    if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
    const hsl = /^hsl\((\d+),(\d+)%,(\d+)%\)$/.exec(css)
    return hslToRgb(+hsl[1], +hsl[2], +hsl[3])
  }

  let lifted = 0
  for (let i = 0; i < 1500; i++) {
    const seed = `seed-${i}`
    const on = await record(seed, { invertBackground: true })
    const ratio = contrastRatio(rgbOf(on.background), rgbOf(on.calls[1].color))
    assert.ok(ratio >= 4.5, `${seed}: ${on.background} against ${on.calls[1].color} is only ${ratio.toFixed(2)}:1`)
    if (on.calls[1].color !== (await record(seed)).calls[1].color) lifted += 1
  }
  // Both branches have to be exercised or the sweep proves nothing about the
  // lift — it would pass against a renderer that ignored the setting entirely.
  assert.ok(lifted > 0, "the corpus must contain seeds whose mark has to be lifted")
  assert.ok(lifted < 1500, "the corpus must contain seeds whose mark does not")
})

test("the inverted palette stays inert while the switch is off", async () => {
  // The whole risk of this setting is that it moves the default render, so the
  // false case is pinned against the call that passes no options at all.
  assert.deepEqual(await record("octocat", { invertBackground: false }), await record("octocat"))
  for (const seed of ["", "a", "hello", "头像🌱"]) {
    assert.deepEqual(await record(seed, { invertBackground: false }), await record(seed))
  }
})

test("a known seed pins the exact grid the mirrored family table produces", async () => {
  // A deliberate snapshot, kept separate from the palette assertions above so
  // an intentional pattern change does not force edits to the colour contract.
  // It fails if the shape hash bytes or the family tables shift, either of
  // which would silently redraw every existing seed. "octocat" lands in the
  // checker family (hash[4] = 240), hence the checkerboard.
  const result = await record("octocat")
  assert.deepEqual(result.calls.slice(1).map(({ rect }) => rect.slice(0, 2)), [
    [0, 0], [400, 0], [800, 0],
    [200, 200], [600, 200],
    [0, 400], [400, 400], [800, 400],
    [200, 600], [600, 600],
    [0, 800], [400, 800], [800, 800],
  ])
})

test("the renderer paints exactly the grid the pattern module returns", async () => {
  // The snapshot above only covers one seed, so it would still pass if the
  // renderer painted some other grid. These seeds are already trimmed and
  // lowercased, so hashing them directly avoids restating the normalization
  // rule the renderer owns.
  for (const seed of ["octocat", "another seed", "头像🌱"]) {
    const result = await record(seed)
    const cells = buildPattern(await sha256(seed))
    const painted = []
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (cells[row * GRID + col]) painted.push([col * CELL, row * CELL])
      }
    }
    assert.deepEqual(
      result.calls.slice(1).map(({ rect }) => rect.slice(0, 2)),
      painted,
      seed,
    )
  }
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
