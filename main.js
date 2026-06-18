// @ts-nocheck

import { canvas, nameInput, btnGenerate, btnRandom, btnDownload } from "./ui/elements.js"
import { generate, random, download, renderFor } from "./ui/handlers.js"
import { SAMPLE_NAMES } from "./ui/sample-names.js"

// ─── Bindings ─────────────────────────────────────────────────────────────────

btnGenerate.addEventListener("click", generate)
btnRandom.addEventListener("click", random)
btnDownload.addEventListener("click", download)
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate()
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// Render a random identicon on load and fill the input box
const initialBase = SAMPLE_NAMES[(Math.random() * SAMPLE_NAMES.length) | 0]
const initialSuffix = 1000 + ((Math.random() * 8999) | 0)
const initialName = `${initialBase}${initialSuffix}`
nameInput.value = initialName
renderFor(initialName)
