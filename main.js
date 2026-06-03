// @ts-nocheck

import { canvas, nameInput, btnGenerate, btnRandom, btnDownload } from "./ui/elements.js"
import { generate, random, download, renderFor } from "./ui/handlers.js"

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
