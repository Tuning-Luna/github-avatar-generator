// @ts-nocheck

import { GRID, HALF_GRID, MIRROR_MAP } from "./config.js"

// ── Tunables ──
// Per-cell fill probabilities, and the whole tuning surface for how the output
// looks. Retune these and re-measure rather than adding new mechanisms.
//
// A mirrored 5x5 grid has 15 free bits, so mirroring can never show more than
// 32768 distinct patterns. Within that ceiling, legibility and variety trade
// off directly: a family reads clearly only when its skeleton is dense *and*
// its background is quiet, and a quiet background leaves few distinct patterns
// in that family. Measured at skeleton 0.97 as "chance a batch of 20 avatars
// contains two identical shapes": background 0.06 -> 92%, 0.22 -> 16%,
// 0.45 -> 6% (families then read only sometimes).
const SKELETON_P = 0.97
const BACKGROUND_P = 0.22
const NOISE_P = 0.5

// How far the density byte may pull the unstructured family either way.
const DENSITY_SWING = 0.12

// Clamp so no cell is ever certain. A cell pinned at 0 or 1 would be dropped
// from the state space and shrink the pattern ceiling above, so this guards the
// tuning surface from a careless edit. None of today's constants reach the
// bounds, which is why the clamp is deliberately slack.
const PROBABILITY_FLOOR = 0.02
const PROBABILITY_CEILING = 0.98

// ── Templates ──
// Each template spells out the left half only: GRID rows x HALF_GRID columns,
// one symbol per cell.
//   SKELETON   the family's shape — nearly always filled
//   BACKGROUND the space around it — rarely filled
//   NOISE      unstructured — filled about half the time
// MIRROR_MAP expands each authored column onto every column it mirrors onto,
// so a template is written once and comes out symmetric by construction.
const SKELETON = "#"
const BACKGROUND = "-"
const NOISE = "."

const TEMPLATES = Object.freeze([
  // The unstructured family carries the majority share because a shaped family
  // spends the state space on one silhouette: a frame reads as a ring and a
  // checker as a checkerboard however their own cells happen to land. Keeping
  // this share dominant keeps arbitrary shapes the common case, not the
  // exception.
  { id: "noise", weight: 6, rows: ["...", "...", "...", "...", "..."] },
  { id: "frame", weight: 1, rows: ["###", "#--", "#--", "#--", "###"] },
  { id: "cross", weight: 1, rows: ["--#", "--#", "###", "--#", "--#"] },
  { id: "diagonal", weight: 1, rows: ["#--", "-#-", "--#", "-#-", "#--"] },
  { id: "center", weight: 1, rows: ["---", "-##", "-##", "-##", "---"] },
  { id: "checker", weight: 1, rows: ["#-#", "-#-", "#-#", "-#-", "#-#"] },
])

// ── Hash byte allocation ──
// Bytes 0-3 belong to the palette in core/drawer.js and stay byte-for-byte what
// they were. The shape reads bytes 4 upward: 4-18 used to hold cell bits under
// the old fixed-50% rule and now carry different meaning, so every seed draws a
// different shape; 19-20 are newly consumed.
const TEMPLATE_BYTE = 4
const DENSITY_BYTE = 5
const CELL_BYTE_BASE = 6

// A mirrored grid spends one byte per authored cell (GRID x HALF_GRID = 15,
// bytes 6-20) because each byte drives both columns it mirrors onto. An
// unmirrored grid needs one byte per cell (GRID x GRID = 25, bytes 6-30), so the
// two modes read different spans and byte 31 is all that is left over.
//
// Bytes 21-31 were reserved as free room so a later axis could claim one without
// shifting a byte an already-rendered avatar depends on. Symmetry is the axis
// that claimed them, and it took bytes 21-30 rather than one byte, because it
// changes how 6-20 are read as well: the same byte addresses a different cell
// depending on the mode. Any later axis therefore has byte 31, or a longer
// digest, and cannot assume a reserved span.

// ── Template selection ──
// Cumulative byte thresholds over the weight total. The weights do not divide
// 256, so buckets differ by a byte and a template can come up to 1/256 more
// often than its exact share — far below anything a person could notice, and
// the price of keeping the weights readable.
const SELECTION_THRESHOLDS = Object.freeze(
  (() => {
    const total = TEMPLATES.reduce((sum, template) => sum + template.weight, 0)
    let cumulative = 0
    return TEMPLATES.map((template) => {
      cumulative += template.weight
      return Math.round((cumulative / total) * 256)
    })
  })(),
)

/**
 * Pick the template a hash byte selects.
 * @param {number} byte
 * @returns {{id: string, weight: number, rows: string[]}}
 */
function selectTemplate(byte) {
  for (let index = 0; index < SELECTION_THRESHOLDS.length; index++) {
    if (byte < SELECTION_THRESHOLDS[index]) return TEMPLATES[index]
  }
  return TEMPLATES[TEMPLATES.length - 1]
}

/**
 * Fill probability of one authored cell.
 * Density shifts the unstructured cells only: a family's skeleton and
 * background levels are the legibility that was chosen for it, so letting the
 * density byte move them would break the family apart.
 * @param {string} symbol @param {number} offset
 * @returns {number}
 */
function cellProbability(symbol, offset) {
  const base =
    symbol === SKELETON
      ? SKELETON_P
      : symbol === BACKGROUND
        ? BACKGROUND_P
        : NOISE_P + offset
  return Math.min(PROBABILITY_CEILING, Math.max(PROBABILITY_FLOOR, base))
}

/**
 * Build the fill grid for a SHA-256 digest.
 * Returns a flat GRID x GRID array in row-major order, so the renderer only has
 * to walk it.
 *
 * Mirroring is a property of the cell index rather than a second pass: every
 * cell — mirrored or not — reads its template column through MIRROR_MAP and its
 * byte from its own cell slot, and only the byte stride and index change between
 * the modes. Writing it once is what keeps the two modes from drifting apart,
 * and a mirrored cell still reads the byte of the column it mirrors, so its
 * partner cannot disagree with it.
 * @param {Uint8Array} hash
 * @param {{symmetric?: boolean}} [options] `symmetric: false` fills both halves
 *   independently, which spends 25 cell bytes instead of 15.
 * @returns {boolean[]}
 */
function buildPattern(hash, options = {}) {
  const { symmetric = true } = options
  const template = selectTemplate(hash[TEMPLATE_BYTE])
  const offset = (hash[DENSITY_BYTE] / 255 - 0.5) * 2 * DENSITY_SWING
  const stride = symmetric ? HALF_GRID : GRID
  const filled = new Array(GRID * GRID).fill(false)

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const authored = MIRROR_MAP[col]
      const cell = symmetric ? authored : col
      const probability = cellProbability(template.rows[row][authored], offset)
      if (hash[CELL_BYTE_BASE + row * stride + cell] / 255 < probability) {
        filled[row * GRID + col] = true
      }
    }
  }

  return filled
}

export { TEMPLATES, buildPattern, selectTemplate }
