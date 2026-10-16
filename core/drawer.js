// @ts-nocheck

import { sha256 } from "../utils/hash.js"
import { hslToRgb } from "../utils/color.js"
import { GRID, CELL, SIZE } from "./config.js"
import { buildPattern } from "./pattern.js"

/**
 * Trace a rounded rectangle.
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
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
}

/**
 * Render an identicon for `text` onto `canvas`.
 * Canvas dimensions are fixed to GRID x CELL internally.
 * @param {string} text
 * @param {HTMLCanvasElement} canvas
 * @param {{symmetric?: boolean}} [options] Passed through to the pattern builder.
 * @returns {Promise<string>} The background color used
 */
async function drawIdenticon(text, canvas, options = {}) {
  const normalizedText = text.trim().toLowerCase() || " "
  const hash = await sha256(normalizedText)

  // Only resize if necessary
  if (canvas.width !== SIZE || canvas.height !== SIZE) {
    canvas.width = SIZE
    canvas.height = SIZE
  }

  const ctx = canvas.getContext("2d")

  // ── Palette from hash ──
  const hue = ((hash[0] << 8) | hash[1]) % 360
  const sat = 70 + (hash[2] % 25)
  const lig = 50 + (hash[3] % 15)
  const [r, g, b] = hslToRgb(hue, sat, lig)
  const fg = `rgb(${r},${g},${b})`
  const bg = `hsl(${hue},${Math.max(sat - 30, 5)}%,${Math.min(lig + 42, 96)}%)`

  // ── Background ──
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  // ── Pixel grid ──
  // core/pattern.js decides the shape; the renderer only paints what it gets.
  ctx.fillStyle = fg
  const pattern = buildPattern(hash, options)

  for (let row = 0; row < GRID; row++) {
    const y = row * CELL
    for (let col = 0; col < GRID; col++) {
      if (pattern[row * GRID + col]) {
        ctx.fillRect(col * CELL, y, CELL, CELL)
      }
    }
  }

  return bg
}

export { drawIdenticon, roundRect }
