// @ts-nocheck

import { BORDER_SIZE, SIZE } from "../core/config.js"

/**
 * Compose the canvas used by both PNG export actions.
 * The renderer's HSL background is passed in so color management cannot alter it.
 */
function getExportCanvas(sourceCanvas, backgroundColor, addBorder) {
  if (!addBorder) return sourceCanvas

  const borderedCanvas = document.createElement("canvas")
  borderedCanvas.width = SIZE + BORDER_SIZE * 2
  borderedCanvas.height = SIZE + BORDER_SIZE * 2

  const context = borderedCanvas.getContext("2d")
  if (!context) throw new Error("Unable to create the export canvas.")

  context.fillStyle = backgroundColor
  context.fillRect(0, 0, borderedCanvas.width, borderedCanvas.height)
  context.drawImage(sourceCanvas, BORDER_SIZE, BORDER_SIZE)
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

export { getExportCanvas, canvasToBlob }
