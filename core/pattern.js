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

// ── Families ──
// A family is a density field plus a share of the seed space. Every cell carries
// one of three symbols:
//   SKELETON   the family's shape — nearly always filled
//   BACKGROUND the space around it — rarely filled
//   NOISE      unstructured — filled about half the time, and the only symbol the
//              density byte moves
//
// There are two tables rather than one because the two grid modes cannot share a
// family. A mirrored family is authored on the left half and expanded by
// MIRROR_MAP, and the expansion is what makes it the shape it is: `frame` reads
// as a ring only because its left half is mirrored. Read it without mirroring
// and the selfsame field is not a frame, just a left-hand edge. So an unmirrored
// grid gets families authored whole, and the shape difference between the modes
// comes from the tables rather than from how one table is read.
const SKELETON = "#"
const BACKGROUND = "-"
const NOISE = "."

/**
 * Mirrored families: GRID rows x HALF_GRID columns, one symbol per authored cell.
 * MIRROR_MAP expands each authored column onto every column it mirrors onto, so
 * a family is written once and comes out symmetric by construction.
 */
const MIRRORED_FAMILIES = Object.freeze([
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

/**
 * Unmirrored families: GRID rows x GRID columns, the whole field authored.
 * Each one leans somewhere — a stripe falls to one side, a corner sits in one
 * corner — because direction is the one thing an unmirrored grid can show that a
 * mirrored one cannot, and a family with no direction would just be a mirrored
 * shape wearing a different name.
 *
 * They keep the mirrored table's skeleton-to-background contrast so the two
 * modes stay legible by the same rule, and each family is at least three cells
 * thick so that the two-odd background cells that do come up cannot dissolve its
 * outline.
 *
 * Measured over 6000 seeds as "cells differing between the two modes": 11.43 of
 * 25 (46%), against 8.04 (32%) when both modes shared the mirrored table with
 * only their bits freed. That earlier arrangement failed in the shaped
 * families — the ones that kept their mirrored silhouette — which changed 3.8 to
 * 5.6 cells and were still pixel-for-pixel mirrors 7.6% of the time, `frame`
 * alone 20.4%. Here every family changes 11.4 to 12.8 cells and 0.38% of results
 * are still mirrors.
 *
 * The 25 free bits also show up as variety: chance a batch of 20 avatars holds
 * two identical shapes is 6.8% here against 16.8% for the 15-bit mirrored grid,
 * at the same skeleton contrast.
 */
const UNMIRRORED_FAMILIES = Object.freeze([
  { id: "scatter", weight: 6, rows: [".....", ".....", ".....", ".....", "....."] },
  { id: "stripe", weight: 1, rows: ["###--", "####-", "-####", "--###", "---##"] },
  { id: "corner", weight: 1, rows: ["---##", "---##", "--###", "-####", "#####"] },
  { id: "wedge", weight: 1, rows: ["##---", "####-", "#####", "####-", "##---"] },
  { id: "pillar", weight: 1, rows: ["###--", "###--", "###--", "###--", "#####"] },
  { id: "flag", weight: 1, rows: ["####-", "-###-", "-###-", "-###-", "-###-"] },
])

// ── Hash byte allocation ──
// Bytes 0-3 belong to the palette in core/drawer.js and stay byte-for-byte what
// they were. The shape reads bytes 4 upward: 4-18 used to hold cell bits under
// the old fixed-50% rule and now carry different meaning, so every seed draws a
// different shape; 19-20 are newly consumed.
const FAMILY_BYTE = 4
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

// ── Family selection ──
// Cumulative byte thresholds over a table's weight total. The weights do not
// divide 256, so buckets differ by a byte and a family can come up to 1/256 more
// often than its exact share — far below anything a person could notice, and the
// price of keeping the weights readable.
//
// `columns` is also the byte stride: a mirrored grid has one byte per authored
// cell and an unmirrored one a byte per cell, so the field's own width is what
// says where the next row starts.
function createTable(families, columns) {
  const total = families.reduce((sum, family) => sum + family.weight, 0)
  let cumulative = 0
  return Object.freeze({
    families,
    columns,
    thresholds: Object.freeze(
      families.map((family) => {
        cumulative += family.weight
        return Math.round((cumulative / total) * 256)
      }),
    ),
  })
}

const FAMILY_TABLES = Object.freeze({
  mirrored: createTable(MIRRORED_FAMILIES, HALF_GRID),
  unmirrored: createTable(UNMIRRORED_FAMILIES, GRID),
})

/**
 * Pick the family a hash byte selects from a table.
 * @param {number} byte
 * @param {{families: object[], thresholds: number[]}} table
 * @returns {{id: string, weight: number, rows: string[]}}
 */
function selectFamily(byte, table = FAMILY_TABLES.mirrored) {
  const { families, thresholds } = table
  for (let index = 0; index < thresholds.length; index++) {
    if (byte < thresholds[index]) return families[index]
  }
  return families[families.length - 1]
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
 * Mirroring is a property of the cell index rather than a second pass: the loop
 * below is written once, and the mode only decides which table supplies the
 * family, which column of it a cell reads, and which byte it compares against. A
 * mirrored cell reads the byte of the column it mirrors and the column of the
 * family it mirrors onto, so its partner cannot disagree with it.
 * @param {Uint8Array} hash
 * @param {{symmetric?: boolean}} [options] `symmetric: false` reads the
 *   unmirrored table and spends 25 cell bytes instead of 15, so the two modes
 *   are different shapes rather than one shape read two ways.
 * @returns {boolean[]}
 */
function buildPattern(hash, options = {}) {
  const { symmetric = true } = options
  const table = symmetric ? FAMILY_TABLES.mirrored : FAMILY_TABLES.unmirrored
  const family = selectFamily(hash[FAMILY_BYTE], table)
  const offset = (hash[DENSITY_BYTE] / 255 - 0.5) * 2 * DENSITY_SWING
  const filled = new Array(GRID * GRID).fill(false)

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      // A mirrored cell reads its family through MIRROR_MAP and its byte from
      // the mirrored column's slot; an unmirrored cell does both at its own.
      const column = symmetric ? MIRROR_MAP[col] : col
      const probability = cellProbability(family.rows[row][column], offset)
      if (hash[CELL_BYTE_BASE + row * table.columns + column] / 255 < probability) {
        filled[row * GRID + col] = true
      }
    }
  }

  return filled
}

export { FAMILY_TABLES, MIRRORED_FAMILIES, UNMIRRORED_FAMILIES, buildPattern, selectFamily }
