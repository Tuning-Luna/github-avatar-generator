// @ts-nocheck

// ─── Hash ────────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 of a string, returns a Uint8Array of 32 bytes.
 * @param {string} str
 * @returns {Promise<Uint8Array>}
 */
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  )
  return new Uint8Array(buf)
}

// ─── Color ───────────────────────────────────────────────────────────────────

/**
 * Convert HSL (0-360, 0-100, 0-100) to an RGB tuple.
 * @param {number} h @param {number} s @param {number} l
 * @returns {[number, number, number]}
 */
function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const k = h / 30

  // Inline f(n) calculation for better performance
  const f0 = l - a * Math.max(-1, Math.min((0 + k) % 12 - 3, Math.min(9 - (0 + k) % 12, 1)))
  const f8 = l - a * Math.max(-1, Math.min((8 + k) % 12 - 3, Math.min(9 - (8 + k) % 12, 1)))
  const f4 = l - a * Math.max(-1, Math.min((4 + k) % 12 - 3, Math.min(9 - (4 + k) % 12, 1)))

  return [
    Math.round(f0 * 255),
    Math.round(f8 * 255),
    Math.round(f4 * 255),
  ]
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

const GRID = 5
const CELL = 50 // Fixed cell size; canvas is always GRID×CELL = 250px
const SIZE = GRID * CELL // 250
const BORDER_RADIUS = 12
const HALF_GRID = Math.ceil(GRID / 2) // 3

// Pre-calculate column mapping for mirroring
const MIRROR_MAP = Object.freeze(
  Array.from({ length: GRID }, (_, col) =>
    col < HALF_GRID ? col : GRID - 1 - col
  )
)

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

  // Store bg color for download border
  currentBgColor = bg

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
}

// ─── State & UI helpers ───────────────────────────────────────────────────────

const canvas = document.getElementById("cv")
const nameInput = document.getElementById("nameInput")
const nameLabel = document.getElementById("nameLabel")
const btnGenerate = document.getElementById("btnGenerate")
const btnRandom = document.getElementById("btnRandom")
const btnDownload = document.getElementById("btnDownload")
const whiteBorderCheckbox = document.getElementById("whiteBorder")

// Store the current background color for download border
let currentBgColor = null

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

// ─── Event handlers ───────────────────────────────────────────────────────────

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

  if (addBorder && currentBgColor) {
    // Create a new canvas with border using the generated bg color
    const borderSize = 20 // 20px border on each side
    const borderedCanvas = document.createElement("canvas")
    borderedCanvas.width = canvas.width + borderSize * 2
    borderedCanvas.height = canvas.height + borderSize * 2

    const ctx = borderedCanvas.getContext("2d")
    // Fill with the generated background color
    ctx.fillStyle = currentBgColor
    ctx.fillRect(0, 0, borderedCanvas.width, borderedCanvas.height)
    // Draw the original canvas in the center
    ctx.drawImage(canvas, borderSize, borderSize)

    link.href = borderedCanvas.toDataURL("image/png")
  } else {
    link.href = canvas.toDataURL("image/png")
  }

  link.click()
}

// ─── Bindings ─────────────────────────────────────────────────────────────────

btnGenerate.addEventListener("click", generate)
btnRandom.addEventListener("click", random)
btnDownload.addEventListener("click", download)
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate()
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// Render a default identicon on load without filling the input box
renderFor("Claude")
nameInput.value = "" // keep placeholder visible
