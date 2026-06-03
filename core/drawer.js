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
 * Render an identicon for `text` onto `canvas`.
 * Canvas dimensions are fixed to GRID×CELL internally.
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
  const sat = 45 + (hash[2] % 30)
  const lig = 38 + (hash[3] % 20)
  const [r, g, b] = hslToRgb(hue, sat, lig)
  const fg = `rgb(${r},${g},${b})`
  const bg = `hsl(${hue},${Math.max(sat - 30, 5)}%,${Math.min(lig + 42, 96)}%)`

  // ── Background ──
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  // ── Pixel grid (mirrored, ~50% density via % 2) ──
  ctx.fillStyle = fg

  // Pre-calculate hash index base and use single loop for better cache locality
  const hashOffset = 4

  for (let row = 0; row < GRID; row++) {
    const rowBase = hashOffset + row * HALF_GRID
    const y = row * CELL

    for (let col = 0; col < GRID; col++) {
      const mirrorCol = MIRROR_MAP[col]
      // Check if cell should be filled (hash % 2 === 0)
      if ((hash[rowBase + mirrorCol] & 1) === 0) {
        ctx.fillRect(col * CELL, y, CELL, CELL)
      }
    }
  }

  return bg
}

export { drawIdenticon, roundRect }
