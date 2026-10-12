// @ts-nocheck

import { sha256 } from "../utils/hash.js"
import { hslToRgb, relativeLuminance, contrastRatio } from "../utils/color.js"
import { GRID, CELL, SIZE, HALF_GRID, MIRROR_MAP } from "./config.js"

/**
 * Draw a rounded-rectangle path using native API if available, fallback to manual.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r
 */
function roundRect(ctx, x, y, w, h, r) {
  // Use native roundRect if available (better performance)
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }
}

/**
 * Background hue offsets relative to the foreground. Choosing the relationship
 * rather than an absolute hue keeps the pattern and its field reading as a
 * deliberate pair instead of two unrelated colors.
 */
const BACKGROUND_HUE_OFFSETS = [0, 25, 180, 120, 330]

/**
 * Fill thresholds out of 256, one per density tier. A cell is inked when its
 * hash byte falls below the threshold, so the tier sets how much of the grid is
 * filled without touching the mirrored layout.
 */
const DENSITY_THRESHOLDS = [72, 128, 196]

/**
 * Contrast the pattern and its field must reach. WCAG 1.4.11 asks for 3:1 for
 * non-text graphics, but an avatar is read at very small sizes, so the target
 * sits above that floor.
 */
const MIN_CONTRAST = 4.5

/**
 * Inked-cell bounds over the drawn grid. A grid that is entirely inked (or
 * entirely empty) renders as one flat color rather than a pattern, so the
 * extremes are pulled back inside these bounds.
 */
const MIN_COVERAGE = 4
const MAX_COVERAGE = 21

/** Relative luminance at which a dark field and a pale one contrast equally. */
const LUMINANCE_PIVOT = 0.179

/** The flat field used when background variation is switched off. */
const FLAT_BACKGROUND = "hsl(0,0%,100%)"

/** The hash byte range holding one byte per independent grid cell. */
const CELL_OFFSET = 8

/** How many drawn cells an independent cell accounts for: mirrored columns count twice. */
function cellWeight(index) {
  return index % HALF_GRID === HALF_GRID - 1 ? 1 : 2
}

/** Inked cells the pattern will actually draw, mirroring included. */
function gridCoverage(cells) {
  return cells.reduce((total, filled, index) => (filled ? total + cellWeight(index) : total), 0)
}

/**
 * HSL lightness whose relative luminance is closest to `target`. Luminance rises
 * monotonically with lightness for a fixed hue and saturation, so a scan is exact
 * enough and avoids needing an inverse formula.
 */
function lightnessForLuminance(hue, saturation, target) {
  let best = 0
  let bestDelta = Infinity
  for (let lightness = 0; lightness <= 100; lightness++) {
    const [r, g, b] = hslToRgb(hue, saturation, lightness)
    const delta = Math.abs(relativeLuminance(r, g, b) - target)
    if (delta < bestDelta) {
      bestDelta = delta
      best = lightness
    }
  }
  return best
}

/**
 * The most tinted field lightness that still reaches `target` contrast against
 * the pattern, i.e. the one furthest from the extreme. Contrast falls off
 * monotonically as the field moves from its extreme toward the pattern's own
 * luminance, so the scan walks inward and keeps the last lightness that still
 * clears the target — returning at the first success would always pick the
 * extreme and pin every field to pure black or white.
 */
function fieldLightness(hue, saturation, patternLuminance, dark, target) {
  let limit = dark ? 0 : 100
  for (let offset = 0; offset <= 100; offset++) {
    const lightness = dark ? offset : 100 - offset
    const [r, g, b] = hslToRgb(hue, saturation, lightness)
    if (contrastRatio(relativeLuminance(r, g, b), patternLuminance) < target) break
    limit = lightness
  }
  return limit
}

/**
 * Render an identicon for `text` onto `canvas`.
 * Canvas dimensions are fixed to GRID×CELL internally.
 *
 * SHA-256 byte map (32 bytes available):
 *   0-1  hue (0..359)          4    background hue relationship
 *   2    foreground saturation 5    field lightness within the contrast budget
 *   3    foreground brightness 6    background saturation
 *   7    density tier
 *   8-22 one byte per independent grid cell (mirrored to 25 by MIRROR_MAP)
 *
 * @param {string} text
 * @param {HTMLCanvasElement} canvas
 * @param {{ varyBackground?: boolean }} [options] `varyBackground: false` keeps a
 *   flat white field, in which case the pattern alone carries the contrast.
 * @returns {Promise<string>} The background color used
 */
async function drawIdenticon(text, canvas, options = {}) {
  const { varyBackground = true } = options
  const normalizedText = text.trim().toLowerCase() || " "
  const hash = await sha256(normalizedText)

  // Only resize if necessary
  if (canvas.width !== SIZE || canvas.height !== SIZE) {
    canvas.width = SIZE
    canvas.height = SIZE
  }

  const ctx = canvas.getContext("2d")

  // ── Palette ──
  // Simplified hue calculation: hash[0:2] % 360, handles negative correctly
  const hue = ((hash[0] << 8) | hash[1]) % 360
  const sat = 40 + (hash[2] % 61)

  // Brightness is chosen as a relative-luminance target and only then turned
  // into an HSL lightness. Lightness alone does not decide contrast — a
  // saturated yellow at 54% lightness is far brighter than a blue at the same
  // lightness — and picking by lightness is what previously paired bright
  // patterns with pale fields at 1:1 contrast.
  //
  // With a varying field the two bands sit either side of LUMINANCE_PIVOT and
  // skip the middle, where no field tint survives the contrast budget. With a
  // flat white field the pattern must clear the target against white alone, so
  // its target stays in the dark band.
  const target = !varyBackground
    ? 0.03 + (hash[3] % 15) * 0.01
    : (hash[3] & 1) === 0
      ? 0.04 + (hash[3] % 11) * 0.01
      : 0.28 + (hash[3] % 28) * 0.01
  const lig = lightnessForLuminance(hue, sat, target)
  const [r, g, b] = hslToRgb(hue, sat, lig)
  const fg = `rgb(${r},${g},${b})`
  const patternLuminance = relativeLuminance(r, g, b)

  // ── Background ──
  // A dark pattern takes a pale field and a bright pattern a deep one, so the
  // two always separate rather than merely differing in lightness.
  let bg = FLAT_BACKGROUND
  if (varyBackground) {
    const bgHue = (hue + BACKGROUND_HUE_OFFSETS[hash[4] % BACKGROUND_HUE_OFFSETS.length]) % 360
    const bgSat = 12 + (hash[6] % 44)
    const darkField = patternLuminance > LUMINANCE_PIVOT
    const limit = fieldLightness(bgHue, bgSat, patternLuminance, darkField, MIN_CONTRAST)
    const bgLig = darkField
      ? hash[5] % (limit + 1)
      : limit + (hash[5] % (101 - limit))
    bg = `hsl(${bgHue},${bgSat}%,${bgLig}%)`
  }

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  // ── Pixel grid ──
  // The independent cells are decided before anything is drawn so the pattern
  // can be checked for coverage first.
  const density = DENSITY_THRESHOLDS[hash[7] % DENSITY_THRESHOLDS.length]
  const cells = []
  for (let index = 0; index < GRID * HALF_GRID; index++) {
    cells.push(hash[CELL_OFFSET + index] < density)
  }

  let coverage = gridCoverage(cells)
  if (coverage < MIN_COVERAGE || coverage > MAX_COVERAGE) {
    // Trim by moving the cells that sat closest to the tier's threshold, making
    // this the smallest adjustment that reaches the coverage band. The mirrored
    // layout survives because only independent cells move.
    const byProximity = cells
      .map((_, index) => index)
      .sort((a, b) => hash[CELL_OFFSET + a] - hash[CELL_OFFSET + b])
    const fill = coverage < MIN_COVERAGE
    const order = fill ? byProximity : byProximity.reverse()
    for (const index of order) {
      if (fill ? coverage >= MIN_COVERAGE : coverage <= MAX_COVERAGE) break
      if (cells[index] === fill) continue
      cells[index] = fill
      coverage += (fill ? 1 : -1) * cellWeight(index)
    }
  }

  ctx.fillStyle = fg
  for (let row = 0; row < GRID; row++) {
    const y = row * CELL
    for (let col = 0; col < GRID; col++) {
      if (cells[row * HALF_GRID + MIRROR_MAP[col]]) {
        ctx.fillRect(col * CELL, y, CELL, CELL)
      }
    }
  }

  return bg
}

export { drawIdenticon, roundRect }
