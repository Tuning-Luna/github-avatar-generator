import assert from "node:assert/strict"
import { test } from "node:test"
import { GRID, HALF_GRID, MIRROR_MAP } from "../core/config.js"
import { TEMPLATES, buildPattern, selectTemplate } from "../core/pattern.js"

const CELL_BITS = GRID * HALF_GRID // 15
const TEMPLATE_BYTE = 4
const DENSITY_BYTE = 5
const CELL_BYTE_BASE = 6
const SYMBOLS = new Set(["#", "-", "."])

/**
 * Both grid modes, so an invariant that does not depend on mirroring is asserted
 * in each of them rather than assumed to carry over.
 * `{}` is the no-options call, which is also what pins mirroring as the default.
 */
const MODES = [
  { name: "mirrored", options: {} },
  { name: "unmirrored", options: { symmetric: false } },
]

/** Every grid column that reads from one authored column. */
function columnsFor(authored) {
  return Array.from({ length: GRID }, (_, col) => col).filter(
    (col) => MIRROR_MAP[col] === authored,
  )
}

/** First hash byte selecting each template, so tests can name a family. */
const BYTE_FOR = new Map()
for (let byte = 0; byte < 256; byte++) {
  const { id } = selectTemplate(byte)
  if (!BYTE_FOR.has(id)) BYTE_FOR.set(id, byte)
}

function digest(templateByte, densityByte, cellByte) {
  const hash = new Uint8Array(32).fill(cellByte)
  hash[TEMPLATE_BYTE] = templateByte
  hash[DENSITY_BYTE] = densityByte
  return hash
}

/**
 * A digest pinning every cell to `mask`, bit (row * HALF_GRID + authored).
 * Cell byte 0 forces filled and 255 forces empty, which works only because
 * every cell probability lies strictly inside (0, 1) — the property that keeps
 * all 32768 mirrored patterns reachable.
 */
function digestForMask(templateByte, densityByte, mask) {
  const hash = new Uint8Array(32).fill(0)
  hash[TEMPLATE_BYTE] = templateByte
  hash[DENSITY_BYTE] = densityByte
  for (let cell = 0; cell < CELL_BITS; cell++) {
    hash[CELL_BYTE_BASE + cell] = (mask >> cell) & 1 ? 0 : 255
  }
  return hash
}

/**
 * A digest whose unmirrored cell (row, col) is forced filled — byte 0 — and
 * every other cell byte forced empty. `symmetric: false` addresses one byte per
 * cell, byte 6 + row * GRID + col.
 */
function digestForCell(templateByte, densityByte, row, col) {
  const hash = new Uint8Array(32).fill(255)
  hash[TEMPLATE_BYTE] = templateByte
  hash[DENSITY_BYTE] = densityByte
  hash[CELL_BYTE_BASE + row * GRID + col] = 0
  return hash
}

const countFilled = (filled) => filled.filter(Boolean).length

test("every template is a GRID x HALF_GRID block of known symbols", () => {
  assert.ok(TEMPLATES.length > 1, "a single template would mean no families")
  for (const template of TEMPLATES) {
    assert.equal(template.rows.length, GRID, `${template.id} row count`)
    for (const row of template.rows) {
      assert.equal(row.length, HALF_GRID, `${template.id} column count`)
      for (const symbol of row) {
        assert.ok(SYMBOLS.has(symbol), `${template.id} has symbol ${symbol}`)
      }
    }
    assert.ok(
      Number.isInteger(template.weight) && template.weight > 0,
      `${template.id} weight ${template.weight}`,
    )
    assert.ok(BYTE_FOR.has(template.id), `${template.id} can never be selected`)
  }
})

test("authored columns expand onto every grid column exactly once", () => {
  const claimed = []
  for (let authored = 0; authored < HALF_GRID; authored++) {
    claimed.push(...columnsFor(authored))
  }
  assert.equal(claimed.length, GRID)
  assert.equal(new Set(claimed).size, GRID)
  assert.deepEqual(columnsFor(0), [0, GRID - 1])
  assert.deepEqual(columnsFor(HALF_GRID - 1), [HALF_GRID - 1])
})

test("template selection reaches every template near its weight share", () => {
  const counts = new Map(TEMPLATES.map((template) => [template.id, 0]))
  for (let byte = 0; byte < 256; byte++) {
    const { id } = selectTemplate(byte)
    counts.set(id, counts.get(id) + 1)
  }

  const total = TEMPLATES.reduce((sum, template) => sum + template.weight, 0)
  let selected = 0
  for (const template of TEMPLATES) {
    const share = counts.get(template.id) / 256
    assert.ok(
      Math.abs(share - template.weight / total) < 0.01,
      `${template.id} share ${share} should track ${template.weight / total}`,
    )
    selected += counts.get(template.id)
  }
  assert.equal(selected, 256)
})

test("mirroring is what the renderer gets when it asks for nothing", () => {
  // The cell bytes differ per cell: mirroring changes which byte a cell reads,
  // not the probability it compares against, so a digest of one repeated byte
  // would make the two modes agree by accident and prove nothing here.
  const hash = new Uint8Array(32)
  hash[TEMPLATE_BYTE] = BYTE_FOR.get("noise")
  hash[DENSITY_BYTE] = 128
  for (let cell = 0; cell < GRID * GRID; cell++) {
    hash[CELL_BYTE_BASE + cell] = (cell * 37) % 256
  }

  assert.deepEqual(buildPattern(hash), buildPattern(hash, { symmetric: true }))
  assert.notDeepEqual(buildPattern(hash), buildPattern(hash, { symmetric: false }))
})

test("all 32768 mirrored patterns mirror exactly, cell for cell", () => {
  // Exhaustive rather than sampled: the whole state space is 32768, small
  // enough that sampling would only make the assertion weaker.
  const templateByte = BYTE_FOR.get("noise")
  let asymmetric = null

  for (let mask = 0; mask < 1 << CELL_BITS; mask++) {
    const filled = buildPattern(digestForMask(templateByte, 128, mask))
    const expected = new Array(GRID * GRID)

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const bit = row * HALF_GRID + MIRROR_MAP[col]
        expected[row * GRID + col] = ((mask >> bit) & 1) === 1
        if (filled[row * GRID + col] !== filled[row * GRID + MIRROR_MAP[col]]) {
          asymmetric ??= { mask, row, col }
        }
      }
    }

    assert.deepEqual(filled, expected, `mask ${mask}`)
  }

  assert.equal(asymmetric, null, "a mirrored pair disagreed")
})

test("an unmirrored grid reads one byte per cell, byte 6 + row * GRID + col", () => {
  // Pins the byte allocation, which is the whole difference between the modes:
  // a mirrored build spends 15 bytes (6-20) because each drives both columns it
  // mirrors onto, and this one spends 25 (6-30). Written as one byte per cell
  // rather than as a mirror check, so it also proves every cell of every
  // template can be filled on its own — the unmirrored state space is 2^25 and
  // no cell may be pinned.
  for (const template of TEMPLATES) {
    const templateByte = BYTE_FOR.get(template.id)
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const filled = buildPattern(digestForCell(templateByte, 128, row, col), {
          symmetric: false,
        })
        const expected = new Array(GRID * GRID).fill(false)
        expected[row * GRID + col] = true
        assert.deepEqual(filled, expected, `${template.id} cell ${row},${col}`)
      }
    }
  }
})

test("mirroring makes a mirrored pair share one byte instead of two", () => {
  // Byte 6 is row 0 column 0 in both modes. Byte 10 is row 0 column 4 only when
  // unmirrored: a mirrored build reads column 4 from column 0's slot, so the two
  // ends of the row cannot disagree however the pair's own byte is set. This is
  // what keeps mirroring a property of the loop rather than a second pass.
  const cases = [
    { firstColumn: 255, lastColumn: 0, unmirrored: [false, false, false, false, true] },
    { firstColumn: 0, lastColumn: 255, unmirrored: [true, false, false, false, false] },
  ]

  for (const { firstColumn, lastColumn, unmirrored } of cases) {
    const hash = digest(BYTE_FOR.get("noise"), 128, 255)
    hash[CELL_BYTE_BASE] = firstColumn
    hash[CELL_BYTE_BASE + GRID - 1] = lastColumn

    const where = `first ${firstColumn} / last ${lastColumn}`
    assert.deepEqual(
      buildPattern(hash, { symmetric: false }).slice(0, GRID),
      unmirrored,
      `unmirrored ${where}`,
    )

    const mirrored = buildPattern(hash).slice(0, GRID)
    assert.equal(mirrored[0], mirrored[GRID - 1], `mirrored pair disagreed for ${where}`)
  }
})

test("every mirrored cell of every template can be both filled and empty", () => {
  // Cell bytes 0 and 255 are the extremes the renderer can ever hand over, so
  // covering them proves no cell is pinned — which is what keeps the families
  // from collapsing into fixed stamps and the state space at 32768.
  for (const template of TEMPLATES) {
    const templateByte = BYTE_FOR.get(template.id)
    for (const densityByte of [0, 255]) {
      const filledAll = buildPattern(digest(templateByte, densityByte, 0))
      const emptyAll = buildPattern(digest(templateByte, densityByte, 255))

      for (let row = 0; row < GRID; row++) {
        for (let authored = 0; authored < HALF_GRID; authored++) {
          for (const col of columnsFor(authored)) {
            const where = `${template.id} density ${densityByte} at ${row},${authored}`
            assert.ok(filledAll[row * GRID + col], `${where} cannot be filled`)
            assert.ok(!emptyAll[row * GRID + col], `${where} cannot be empty`)
          }
        }
      }
    }
  }
})

test("the density byte moves the unstructured family and nothing else", () => {
  // 128/255 sits roughly midway between the sparse and dense cell
  // probabilities, so identical cell bytes fill or not purely because of the
  // density byte — and the assertion keeps a wide margin if DENSITY_SWING is
  // ever retuned.
  const probe = 128
  const noise = BYTE_FOR.get("noise")
  const frame = BYTE_FOR.get("frame")

  for (const { name, options } of MODES) {
    assert.equal(countFilled(buildPattern(digest(noise, 0, probe), options)), 0, `${name} sparse`)
    assert.equal(
      countFilled(buildPattern(digest(noise, 255, probe), options)),
      GRID * GRID,
      `${name} dense`,
    )

    // A shaped family keeps its skeleton and background levels, so density must
    // leave it alone — otherwise the family would come apart.
    assert.deepEqual(
      buildPattern(digest(frame, 0, probe), options),
      buildPattern(digest(frame, 255, probe), options),
      `${name} frame`,
    )
  }
})

test("the palette bytes cannot influence the shape", () => {
  for (const { name, options } of MODES) {
    const shape = digest(BYTE_FOR.get("diagonal"), 40, 120)
    const recolored = Uint8Array.from(shape)
    recolored[0] = 250
    recolored[1] = 7
    recolored[2] = 199
    recolored[3] = 1

    assert.deepEqual(buildPattern(recolored, options), buildPattern(shape, options), name)
  }
})

test("the same digest always builds the same pattern", () => {
  for (const { name, options } of MODES) {
    const first = digest(BYTE_FOR.get("checker"), 90, 60)
    const second = digest(BYTE_FOR.get("checker"), 90, 60)

    assert.deepEqual(buildPattern(first, options), buildPattern(second, options), name)
    assert.deepEqual(buildPattern(first, options), buildPattern(first, options), name)
  }
})
