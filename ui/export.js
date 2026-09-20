// @ts-nocheck

import { BORDER_MAX, SIZE } from "../core/config.js"

/**
 * Coerce a border width into a supported whole pixel count.
 * Non-numeric, negative, or over-large input resolves into [0, BORDER_MAX] so a
 * bad caller cannot allocate a runaway canvas.
 */
function normalizeBorderWidth(width) {
  const value = Number(width)
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.round(value), 0), BORDER_MAX)
}

/**
 * Describe a border width for both the export canvas and the scaled preview.
 * `paddingRatio` is the border's share of the export edge, which is what the
 * preview frame needs to shrink the pattern by the same amount as the PNG.
 */
function borderGeometry(borderWidth) {
  const border = normalizeBorderWidth(borderWidth)
  const edge = SIZE + border * 2
  return { border, edge, paddingRatio: border / edge }
}

/**
 * Compose the canvas used by both PNG export actions.
 * A border width of 0 returns the source canvas unchanged.
 * The renderer's HSL background is passed in so color management cannot alter it.
 */
function getExportCanvas(sourceCanvas, backgroundColor, borderWidth) {
  const { border, edge } = borderGeometry(borderWidth)
  if (border === 0) return sourceCanvas

  const borderedCanvas = document.createElement("canvas")
  borderedCanvas.width = edge
  borderedCanvas.height = edge

  const context = borderedCanvas.getContext("2d")
  if (!context) throw new Error("Unable to create the export canvas.")

  context.fillStyle = backgroundColor
  context.fillRect(0, 0, edge, edge)
  context.drawImage(sourceCanvas, border, border)
  return borderedCanvas
}

/** Resolve a canvas PNG blob, including browsers that return null on failure. */
function canvasToBlob(sourceCanvas) {
  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error("PNG encoding failed."))
      }
    }, "image/png")
  })
}

export { getExportCanvas, canvasToBlob, borderGeometry }
