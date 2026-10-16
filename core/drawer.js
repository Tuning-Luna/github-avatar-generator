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
 * @param {{symmetric?: boolean, invertBackground?: boolean}} [options]
 *   `symmetric` is passed through to the pattern builder; `invertBackground` is
 *   read here, since it selects which of the two palettes is painted.
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
  // Bytes 0-3 own the palette and core/pattern.js reads 4 upward. 更改背景色
  // re-reads them rather than spending a byte, so the span reserved there is
  // untouched by this setting.
  //
  // Off: a near-white tint behind the vivid mark. On: that tint becomes the
  // mark and the background becomes the tint formula with +42/96 replaced by
  // -42/14. It is not a swap of the two colours — a swap measures the same
  // 1.07:1 worst case as the pair above, being that pair with the roles
  // exchanged — so the dark shade is a third colour rather than a traded one.
  //
  // Measured over the whole reachable palette (360 hues x sat 70-94 x lig
  // 50-64): off is 1.07:1 at its worst, at hue 60/sat 94/lig 50, and 59.9% of
  // that space is under 3:1; on never goes below 6.72:1, at hue 60/sat 94/lig
  // 64, where the two colours are 74 lightness points apart.
  //
  // The mark is the tint rather than the vivid colour, which measures 1.98:1 at
  // hue 240 and puts 9% of the space under 3:1: a dark hue at lightness 50-64
  // is as dark as the shade behind it. Reusing the tint also makes the on-mark
  // string identical to the off-background string, which is what makes "the
  // cells take the light background" checkable in one line.
  //
  // The 14 floor is a hue floor, not a contrast one. The worst case sits at
  // lig 64, where it never binds, and where it does bind (lig 50-55) it lowers
  // the ratio — 15.15:1 down to 10.72:1 at hue 60/sat 94/lig 50. It is there so
  // the shade stays off hsl(60,64%,8%) = rgb(33,33,7), which reads as black
  // rather than as a hue. The cost is that lig 50-55 collapse onto one shade
  // lightness, leaving the shade 9 values across those 15 inputs. A fixed shade
  // lightness would be simpler and cost more: lig would stop reaching the
  // render at all with this on, so two seeds differing only in byte 3 would
  // draw identical palettes.
  const hue = ((hash[0] << 8) | hash[1]) % 360
  const sat = 70 + (hash[2] % 25)
  const lig = 50 + (hash[3] % 15)
  const mutedSat = Math.max(sat - 30, 5)
  const tint = `hsl(${hue},${mutedSat}%,${Math.min(lig + 42, 96)}%)`

  const { invertBackground = false } = options
  // Computed in both modes so the palette stays one straight-line block; the
  // vivid mark is only painted when the background is not inverted.
  const [r, g, b] = hslToRgb(hue, sat, lig)
  const bg = invertBackground
    ? `hsl(${hue},${mutedSat}%,${Math.max(lig - 42, 14)}%)`
    : tint
  const fg = invertBackground ? tint : `rgb(${r},${g},${b})`

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
