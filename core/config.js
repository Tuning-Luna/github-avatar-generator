// @ts-nocheck

const GRID = 5
const CELL = 200 // Fixed cell size; canvas is always GRID×CELL = 1000px
const SIZE = GRID * CELL // 1000
const BORDER_RADIUS = 48
const HALF_GRID = Math.ceil(GRID / 2) // 3

// Export border. The composed PNG is SIZE + 2 × width per edge, so the default
// 80px border produces the documented 1160 × 1160px image. These bounds are the
// single source of truth: main.js applies them to the range control.
//
// BORDER_MAX is capped by canvas limits rather than taste. The export canvas is
// (SIZE + 2 × width)² px, so 500 yields a 2000 × 2000 canvas (16 MB, border at
// 25% of each edge). iOS Safari caps canvas area near 4096² — widths past ~1500
// risk a null 2d context there, which surfaces to the user as a failed export.
const BORDER_MIN = 0
const BORDER_MAX = 500
const BORDER_STEP = 10
const DEFAULT_BORDER_SIZE = 80

// Pre-calculate column mapping for mirroring
const MIRROR_MAP = Object.freeze(
  Array.from({ length: GRID }, (_, col) =>
    col < HALF_GRID ? col : GRID - 1 - col
  )
)

export {
  GRID,
  CELL,
  SIZE,
  BORDER_RADIUS,
  HALF_GRID,
  BORDER_MIN,
  BORDER_MAX,
  BORDER_STEP,
  DEFAULT_BORDER_SIZE,
  MIRROR_MAP,
}
