// @ts-nocheck

import {
  canvas,
  nameInput,
  nameLabel,
  btnGenerate,
  btnRandom,
  btnDownload,
  whiteBorderCheckbox,
} from "./elements.js"

import { drawIdenticon } from "../core/drawer.js"
import { BORDER_SIZE } from "../core/config.js"

// Track pending render to avoid race conditions
let pendingRender = null

/** Set all interactive elements to disabled/enabled. */
function setLoading(on) {
  const disabled = on
  btnGenerate.disabled = disabled
  btnRandom.disabled = disabled
  btnDownload.disabled = disabled
  nameInput.disabled = disabled
  canvas.classList.toggle("loading", on)
}

/** Render the identicon for the given name and update the label. */
async function renderFor(name) {
  const trimmedName = name.trim()
  const display = trimmedName || "—"

  // Update UI immediately
  nameLabel.textContent = display
  nameLabel.classList.toggle("active", trimmedName.length > 0)

  // Cancel any pending render
  const renderId = Symbol()
  pendingRender = renderId

  setLoading(true)
  try {
    await drawIdenticon(name || " ", canvas)
  } finally {
    // Only clear loading if this is still the current render
    if (pendingRender === renderId) {
      setLoading(false)
      pendingRender = null
    }
  }
}

async function generate() {
  await renderFor(nameInput.value)
}

const SAMPLE_NAMES = Object.freeze([
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank",
  "Grace", "Hiro", "Iris", "Jack", "Kai", "Luna",
  "Max", "Nora", "Oscar", "Panda", "Quinn", "River",
  "Sam", "Tara", "Uma", "Vince", "Wren", "Xena",
  "Yuki", "Zara", "Claude", "GPT", "Gemini", "Grok",
])

const SAMPLE_COUNT = SAMPLE_NAMES.length

async function random() {
  const base = SAMPLE_NAMES[(Math.random() * SAMPLE_COUNT) | 0]
  const suffix = (Math.random() * 99) | 0
  const name = `${base}${suffix}`
  nameInput.value = name
  await renderFor(name)
}

function download() {
  const name = nameLabel.textContent.trim()
  // Use a safe fallback filename if label is still the placeholder dash
  const safeName = name === "—" || name === "" ? "identicon" : name
  const link = document.createElement("a")
  link.download = `identicon-${safeName}.png`

  // Check if border is enabled
  const addBorder = whiteBorderCheckbox && whiteBorderCheckbox.checked

  if (addBorder) {
    // Create a new canvas with border
    const borderedCanvas = document.createElement("canvas")
    borderedCanvas.width = canvas.width + BORDER_SIZE * 2
    borderedCanvas.height = canvas.height + BORDER_SIZE * 2

    const ctx = borderedCanvas.getContext("2d")
    // Extract background color from canvas pixel (top-left corner)
    const imageData = ctx.getImageData(0, 0, 1, 1)
    const pixel = canvas.getContext("2d").getImageData(0, 0, 1, 1).data
    const bgColor = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`

    // Fill with the extracted background color
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, borderedCanvas.width, borderedCanvas.height)
    // Draw the original canvas in the center
    ctx.drawImage(canvas, BORDER_SIZE, BORDER_SIZE)

    link.href = borderedCanvas.toDataURL("image/png")
  } else {
    link.href = canvas.toDataURL("image/png")
  }

  link.click()
}

export { renderFor, generate, random, download }
