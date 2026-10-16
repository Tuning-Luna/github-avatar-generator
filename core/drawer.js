// @ts-nocheck

import { sha256 } from "../utils/hash.js"
import { hslToRgb, contrastRatio } from "../utils/color.js"
import { GRID, CELL, SIZE } from "./config.js"
import { buildPattern } from "./pattern.js"

// The mark has to stay legible on 更改背景色's dark shade, and a dark hue at
// lightness 50-64 is as dark as that shade is: left alone the two come as close
// as 1.98:1 at hue 240, and 9% of the reachable palette lands under 3:1. The
// background cannot fix it either — the darkest mark, rgb(25,25,230), measures
// 2.32:1 against pure black, so no shade is dark enough for it. The mark
// therefore moves, by lightness alone: hue and saturation are held, so a lifted
// mark is the same colour turned up rather than a different one.
const MIN_MARK_CONTRAST = 4.5

/**
 * `hue`/`sat`/`lig` as an RGB tuple, lightened only as far as it takes to reach
 * MIN_MARK_CONTRAST against `background`.
 *
 * The colour comes back untouched when it already clears it, which is 56.5% of
 * the reachable palette. Nothing in that palette needs a lightness above 73%,
 * so the walk always finds an answer and the ceiling is a stop rather than a
 * clamp.
 * @returns {[number, number, number]}
 */
function legibleMark(hue, sat, lig, background) {
  for (let lightness = lig; lightness <= 96; lightness++) {
    const mark = hslToRgb(hue, sat, lightness)
    if (contrastRatio(mark, background) >= MIN_MARK_CONTRAST) return mark
  }
  return hslToRgb(hue, sat, 96)
}

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
 *   read here, since it picks the background and with it how far the mark has
 *   to be lifted.
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
  // Off: a near-white tint behind the vivid mark. On: the background becomes a
  // dark shade of the same hue — the tint's formula with +42/96 replaced by
  // -42/14 — while the mark keeps its hue and saturation and is lightened only
  // as far as MIN_MARK_CONTRAST needs. Measured over the whole reachable
  // palette (360 hues x sat 70-94 x lig 50-64): off is 1.07:1 at its worst, at
  // hue 60/sat 94/lig 50, and 59.9% of that space is under 3:1; on never goes
  // below 4.5:1, and 56.5% of that space returns the mark byte-for-byte
  // unchanged. Over the seeds this repo pins, octocat moves 1.51:1 to 6.37:1.
  //
  // Writing the shade as the tint's own formula rather than a fixed lightness
  // keeps it one rule read two ways, and keeps the shade's depth following the
  // seed instead of being the same dark for every seed of a hue.
  //
  // The 14 floor is a hue floor, not a contrast one: it keeps the shade off
  // hsl(60,64%,8%) = rgb(33,33,7), which reads as black rather than as a hue.
  // Its cost is that lig 50-55 collapse onto one shade lightness, leaving the
  // shade 9 values across those 15 inputs.
  const hue = ((hash[0] << 8) | hash[1]) % 360
  const sat = 70 + (hash[2] % 25)
  const lig = 50 + (hash[3] % 15)
  const mutedSat = Math.max(sat - 30, 5)
  const tint = `hsl(${hue},${mutedSat}%,${Math.min(lig + 42, 96)}%)`

  const { invertBackground = false } = options
  const shadeLightness = Math.max(lig - 42, 14)
  const bg = invertBackground ? `hsl(${hue},${mutedSat}%,${shadeLightness}%)` : tint
  const mark = invertBackground
    ? legibleMark(hue, sat, lig, hslToRgb(hue, mutedSat, shadeLightness))
    : hslToRgb(hue, sat, lig)
  const fg = `rgb(${mark.join(",")})`

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
