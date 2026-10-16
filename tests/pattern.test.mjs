import assert from "node:assert/strict"
import { test } from "node:test"
import { GRID, HALF_GRID, MIRROR_MAP } from "../core/config.js"
import {
  MIRRORED_FAMILIES,
  UNMIRRORED_FAMILIES,
  FAMILY_TABLES,
  buildPattern,
  selectFamily,
} from "../core/pattern.js"
import { sha256 } from "../utils/hash.js"

const CELL_BITS = GRID * HALF_GRID // 15
const FAMILY_BYTE = 4
const DENSITY_BYTE = 5
const CELL_BYTE_BASE = 6
const SYMBOLS = new Set(["#", "-", "."])

/** First hash byte selecting each family of a table, so tests can name one. */
function firstByteFor(table) {
  const byId = new Map()
  for (let byte = 0; byte < 256; byte++) {
    const { id } = selectFamily(byte, table)
    if (!byId.has(id)) byId.set(id, byte)
  }
  return byId
}

/**
 * The two grid modes. `{}` is the no-options call, so it is also what pins
 * mirroring as the default.
 */
const MIRRORED = {
  name: "mirrored",
  table: FAMILY_TABLES.mirrored,
  options: {},
  unstructured: "noise",
  byteFor: firstByteFor(FAMILY_TABLES.mirrored),
}
const UNMIRRORED = {
  name: "unmirrored",
  table: FAMILY_TABLES.unmirrored,
  options: { symmetric: false },
  unstructured: "scatter",
  byteFor: firstByteFor(FAMILY_TABLES.unmirrored),
}
const MODES = [MIRRORED, UNMIRRORED]

/** A family that carries a shape, as opposed to the unstructured one. */
const isShaped = (family) => family.rows.some((row) => row.includes("#"))

/** Is a filled grid its own left-right mirror? */
function isMirrored(filled) {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (filled[row * GRID + col] !== filled[row * GRID + (GRID - 1 - col)]) return false
    }
  }
  return true
}

/** Every grid column that reads from one authored column of a mirrored family. */
function columnsFor(authored) {
  return Array.from({ length: GRID }, (_, col) => col).filter(
    (col) => MIRROR_MAP[col] === authored,
  )
}

function digest(familyByte, densityByte, cellByte) {
  const hash = new Uint8Array(32).fill(cellByte)
  hash[FAMILY_BYTE] = familyByte
  hash[DENSITY_BYTE] = densityByte
  return hash
}

/**
 * A digest pinning every mirrored cell to `mask`, bit (row * HALF_GRID + authored).
 * Cell byte 0 forces filled and 255 forces empty, which works only because
 * every cell probability lies strictly inside (0, 1) — the property that keeps
 * all 32768 mirrored patterns reachable.
 */
function digestForMask(familyByte, densityByte, mask) {
  const hash = new Uint8Array(32).fill(0)
  hash[FAMILY_BYTE] = familyByte
  hash[DENSITY_BYTE] = densityByte
  for (let cell = 0; cell < CELL_BITS; cell++) {
    hash[CELL_BYTE_BASE + cell] = (mask >> cell) & 1 ? 0 : 255
  }
  return hash
}

/**
 * A digest whose unmirrored cell (row, col) is forced filled — byte 0 — and
 * every other cell byte forced empty. An unmirrored grid addresses one byte per
 * cell, byte 6 + row * GRID + col.
 */
function digestForCell(familyByte, densityByte, row, col) {
  const hash = new Uint8Array(32).fill(255)
  hash[FAMILY_BYTE] = familyByte
  hash[DENSITY_BYTE] = densityByte
  hash[CELL_BYTE_BASE + row * GRID + col] = 0
  return hash
}

const countFilled = (filled) => filled.filter(Boolean).length

test("every family is a block of known symbols at its table's width", () => {
  for (const mode of MODES) {
    const { families, columns } = mode.table
    assert.ok(families.length > 1, `${mode.name}: a single family would mean no shape variety`)
    for (const family of families) {
      assert.equal(family.rows.length, GRID, `${mode.name}/${family.id} row count`)
      for (const row of family.rows) {
        assert.equal(row.length, columns, `${mode.name}/${family.id} column count`)
        for (const symbol of row) {
          assert.ok(SYMBOLS.has(symbol), `${mode.name}/${family.id} has symbol ${symbol}`)
        }
      }
      assert.ok(
        Number.isInteger(family.weight) && family.weight > 0,
        `${mode.name}/${family.id} weight ${family.weight}`,
      )
      assert.ok(mode.byteFor.has(family.id), `${mode.name}/${family.id} can never be selected`)
    }
  }
})

test("the two tables share no family id", () => {
  // A shared id would make a failure report, or a comment, ambiguous about which
  // mode it came from.
  const ids = [...MIRRORED_FAMILIES, ...UNMIRRORED_FAMILIES].map(({ id }) => id)
  assert.equal(new Set(ids).size, ids.length)
})

test("every shaped unmirrored family leans, so an unmirrored grid has a direction", () => {
  // This is what the second table is for. Freeing the bits of a mirrored family
  // left the field itself mirrored, so `frame` kept its ring and the two modes
  // differed in 3.8 cells of 25 — the shape the user saw as "barely changed".
  // A full-width field that is its own mirror is that bug again, so assert the
  // field leans rather than asserting anything about one render of it.
  for (const family of UNMIRRORED_FAMILIES) {
    if (!isShaped(family)) continue
    const leans = family.rows.some((row) =>
      Array.from({ length: GRID }, (_, col) => col).some(
        (col) => row[col] !== row[GRID - 1 - col],
      ),
    )
    assert.ok(leans, `${family.id} is its own mirror, which makes it a mirrored family`)
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

test("family selection reaches every family of a table near its weight share", () => {
  for (const mode of MODES) {
    const { families } = mode.table
    const counts = new Map(families.map((family) => [family.id, 0]))
    for (let byte = 0; byte < 256; byte++) {
      const { id } = selectFamily(byte, mode.table)
      counts.set(id, counts.get(id) + 1)
    }

    const total = families.reduce((sum, family) => sum + family.weight, 0)
    let selected = 0
    for (const family of families) {
      const share = counts.get(family.id) / 256
      assert.ok(
        Math.abs(share - family.weight / total) < 0.01,
        `${mode.name}/${family.id} share ${share} should track ${family.weight / total}`,
      )
      selected += counts.get(family.id)
    }
    assert.equal(selected, 256, `${mode.name} left a byte unaccounted for`)
  }
})

test("mirroring is what the renderer gets when it asks for nothing", () => {
  // The cell bytes differ per cell: mirroring changes which byte a cell reads,
  // not the probability it compares against, so a digest of one repeated byte
  // would make the two modes agree by accident and prove nothing here.
  const hash = new Uint8Array(32)
  hash[FAMILY_BYTE] = MIRRORED.byteFor.get("noise")
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
  const familyByte = MIRRORED.byteFor.get("noise")
  let asymmetric = null

  for (let mask = 0; mask < 1 << CELL_BITS; mask++) {
    const filled = buildPattern(digestForMask(familyByte, 128, mask))
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
  // a mirrored grid spends 15 bytes (6-20) because each drives both columns it
  // mirrors onto, and this one spends 25 (6-30). Written as one byte per cell
  // rather than as a mirror check, so it also proves every cell of every family
  // can be filled on its own — the unmirrored state space is 2^25 and no cell may
  // be pinned.
  for (const family of UNMIRRORED_FAMILIES) {
    const familyByte = UNMIRRORED.byteFor.get(family.id)
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const filled = buildPattern(digestForCell(familyByte, 128, row, col), UNMIRRORED.options)
        const expected = new Array(GRID * GRID).fill(false)
        expected[row * GRID + col] = true
        assert.deepEqual(filled, expected, `${family.id} cell ${row},${col}`)
      }
    }
  }
})

test("mirroring makes a mirrored pair share one byte instead of two", () => {
  // Byte 6 is row 0 column 0 in both modes. Byte 10 is row 0 column 4 only when
  // unmirrored: a mirrored grid reads column 4 from column 0's slot, so the two
  // ends of the row cannot disagree however the pair's own byte is set. This is
  // what keeps mirroring a property of the loop rather than a second pass.
  const cases = [
    { firstColumn: 255, lastColumn: 0, unmirrored: [false, false, false, false, true] },
    { firstColumn: 0, lastColumn: 255, unmirrored: [true, false, false, false, false] },
  ]

  for (const { firstColumn, lastColumn, unmirrored } of cases) {
    const hash = digest(MIRRORED.byteFor.get("noise"), 128, 255)
    hash[CELL_BYTE_BASE] = firstColumn
    hash[CELL_BYTE_BASE + GRID - 1] = lastColumn

    const where = `first ${firstColumn} / last ${lastColumn}`
    assert.deepEqual(
      buildPattern(hash, UNMIRRORED.options).slice(0, GRID),
      unmirrored,
      `unmirrored ${where}`,
    )

    const mirrored = buildPattern(hash, MIRRORED.options).slice(0, GRID)
    assert.equal(mirrored[0], mirrored[GRID - 1], `mirrored pair disagreed for ${where}`)
  }
})

test("every cell of every family can be both filled and empty", () => {
  // Cell bytes 0 and 255 are the extremes the renderer can ever hand over, so
  // covering them proves no cell is pinned — which is what keeps the families
  // from collapsing into fixed stamps and both state spaces whole.
  for (const mode of MODES) {
    for (const family of mode.table.families) {
      const familyByte = mode.byteFor.get(family.id)
      for (const densityByte of [0, 255]) {
        const filledAll = buildPattern(digest(familyByte, densityByte, 0), mode.options)
        const emptyAll = buildPattern(digest(familyByte, densityByte, 255), mode.options)
        const where = `${mode.name}/${family.id} density ${densityByte}`

        assert.ok(filledAll.every(Boolean), `${where} cannot be filled`)
        assert.ok(
          emptyAll.every((cell) => !cell),
          `${where} cannot be empty`,
        )
      }
    }
  }
})

test("turning mirroring off changes most cells, in every family", async () => {
  // The regression this table exists to prevent. Sharing the mirrored table and
  // freeing only its bits changed 32% of cells on average, but the shaped
  // families — 46% of seeds — changed under 5 and 7.6% of them were still
  // pixel-for-pixel mirrors, `frame` 20.4%. Reverting to one table fails here.
  const seeds = 600
  const perFamily = new Map()
  let totalDiff = 0
  let stillMirrored = 0

  for (let index = 0; index < seeds; index++) {
    const hash = await sha256(`symmetry-${index}`)
    const family = selectFamily(hash[FAMILY_BYTE], UNMIRRORED.table).id
    const mirrored = buildPattern(hash, MIRRORED.options)
    const unmirrored = buildPattern(hash, UNMIRRORED.options)

    let diff = 0
    for (let cell = 0; cell < GRID * GRID; cell++) {
      if (mirrored[cell] !== unmirrored[cell]) diff++
    }
    totalDiff += diff
    if (isMirrored(unmirrored)) stillMirrored++

    if (!perFamily.has(family)) perFamily.set(family, { n: 0, diff: 0 })
    const stats = perFamily.get(family)
    stats.n++
    stats.diff += diff
  }

  // Measured at 11.43 of 25 and 0.38%; the floors leave room for tuning while
  // still failing on anything close to the old behaviour.
  assert.ok(totalDiff / seeds >= 9, `mean difference was ${(totalDiff / seeds).toFixed(2)} of 25`)
  assert.ok(
    stillMirrored / seeds <= 0.015,
    `${stillMirrored} of ${seeds} unmirrored shapes were still mirrors`,
  )

  for (const family of UNMIRRORED_FAMILIES) {
    const stats = perFamily.get(family.id)
    assert.ok(stats, `${family.id} was never selected in ${seeds} seeds`)
    const mean = stats.diff / stats.n
    assert.ok(mean >= 8, `${family.id} changed only ${mean.toFixed(2)} of 25 cells on average`)
  }
})

test("the density byte moves the unstructured family and nothing else", () => {
  // 128/255 sits roughly midway between the sparse and dense cell
  // probabilities, so identical cell bytes fill or not purely because of the
  // density byte — and the assertion keeps a wide margin if DENSITY_SWING is
  // ever retuned.
  const probe = 128

  for (const mode of MODES) {
    const unstructured = mode.byteFor.get(mode.unstructured)
    assert.equal(
      countFilled(buildPattern(digest(unstructured, 0, probe), mode.options)),
      0,
      `${mode.name} sparse`,
    )
    assert.equal(
      countFilled(buildPattern(digest(unstructured, 255, probe), mode.options)),
      GRID * GRID,
      `${mode.name} dense`,
    )

    // A shaped family keeps its skeleton and background levels, so density must
    // leave it alone — otherwise the family would come apart.
    for (const family of mode.table.families) {
      if (!isShaped(family)) continue
      const familyByte = mode.byteFor.get(family.id)
      assert.deepEqual(
        buildPattern(digest(familyByte, 0, probe), mode.options),
        buildPattern(digest(familyByte, 255, probe), mode.options),
        `${mode.name}/${family.id}`,
      )
    }
  }
})

test("the palette bytes cannot influence the shape", () => {
  for (const mode of MODES) {
    const shape = digest(mode.byteFor.get(mode.unstructured), 40, 120)
    const recolored = Uint8Array.from(shape)
    recolored[0] = 250
    recolored[1] = 7
    recolored[2] = 199
    recolored[3] = 1

    assert.deepEqual(
      buildPattern(recolored, mode.options),
      buildPattern(shape, mode.options),
      mode.name,
    )
  }
})

test("the same digest always builds the same pattern", () => {
  for (const mode of MODES) {
    const family = mode.table.families[1].id
    const first = digest(mode.byteFor.get(family), 90, 60)
    const second = digest(mode.byteFor.get(family), 90, 60)

    assert.deepEqual(
      buildPattern(first, mode.options),
      buildPattern(second, mode.options),
      mode.name,
    )
    assert.deepEqual(buildPattern(first, mode.options), buildPattern(first, mode.options), mode.name)
  }
})
