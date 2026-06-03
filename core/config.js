// @ts-nocheck

const GRID = 5
const CELL = 200 // Fixed cell size; canvas is always GRID×CELL = 1000px
const SIZE = GRID * CELL // 1000
const BORDER_RADIUS = 48
const HALF_GRID = Math.ceil(GRID / 2) // 3
const BORDER_SIZE = 80 // 80px border on each side

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
  BORDER_SIZE,
  MIRROR_MAP,
}
