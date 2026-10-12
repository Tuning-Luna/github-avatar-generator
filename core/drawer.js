// @ts-nocheck

import { sha256 } from "../utils/hash.js"
import { hslToRgb } from "../utils/color.js"
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
 * Render an identicon for `text` onto `canvas`.
 * Canvas dimensions are fixed to GRID×CELL internally.
 *
 * SHA-256 byte map (32 bytes available):
 *   0-1  hue (0..359)          4    background hue relationship
 *   2    foreground saturation 5    background lightness within its band
 *   3    foreground lightness  6    background saturation
 *   7    density tier
 *   8-22 one byte per independent grid cell (mirrored to 25 by MIRROR_MAP)
 *
 * @param {string} text
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<string>} The background color used
 */
async function drawIdenticon(text, canvas) {
  const normalizedText = text.trim().toLowerCase() || " "
  const hash = await sha256(normalizedText)

  // Only resize if necessary
  if (canvas.width !== SIZE || canvas.height !== SIZE) {
    canvas.width = SIZE
    canvas.height = SIZE
  }

  const ctx = canvas.getContext("2d")

  // ── Palette from hash ──
  // Simplified hue calculation: hash[0:2] % 360, handles negative correctly
  const hue = ((hash[0] << 8) | hash[1]) % 360
  // Wide enough to admit pastels and deep tones, not just vivid mid-tones.
  const sat = 40 + (hash[2] % 61)
  const lig = 35 + (hash[3] % 38)
  const [r, g, b] = hslToRgb(hue, sat, lig)
  const fg = `rgb(${r},${g},${b})`

  // ── Background ──
  // The field is pushed to the opposite side of the foreground rather than
  // always being a pale tint of the same hue: a light pattern gets a deep field
  // and a dark pattern a pale one, so the two always separate (their lightness
  // stays at least 32 points apart). The hash picks how far, and at which hue.
  const bgHue = (hue + BACKGROUND_HUE_OFFSETS[hash[4] % BACKGROUND_HUE_OFFSETS.length]) % 360
  const bgSat = 12 + (hash[6] % 44)
  const bgLig = lig >= 55
    ? 6 + (hash[5] % 18) // deep field, 6..23
    : 86 + (hash[5] % 11) // pale field, 86..96
  const bg = `hsl(${bgHue},${bgSat}%,${bgLig}%)`

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  // ── Pixel grid (mirrored; the hash's tier sets the density) ──
  ctx.fillStyle = fg

  const density = DENSITY_THRESHOLDS[hash[7] % DENSITY_THRESHOLDS.length]
  const hashOffset = 8

  for (let row = 0; row < GRID; row++) {
    const rowBase = hashOffset + row * HALF_GRID
    const y = row * CELL

    for (let col = 0; col < GRID; col++) {
      const mirrorCol = MIRROR_MAP[col]
      if (hash[rowBase + mirrorCol] < density) {
        ctx.fillRect(col * CELL, y, CELL, CELL)
      }
    }
  }

  return bg
}

export { drawIdenticon, roundRect }
