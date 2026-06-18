// @ts-nocheck

import { canvas, nameInput, btnGenerate, btnRandom, btnDownload } from "./ui/elements.js"
import { generate, random, download, renderFor, randomName } from "./ui/handlers.js"

// ─── Bindings ─────────────────────────────────────────────────────────────────

btnGenerate.addEventListener("click", generate)
btnRandom.addEventListener("click", random)
btnDownload.addEventListener("click", download)
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate()
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// Render a random identicon on load and fill the input box
const initialName = randomName()
nameInput.value = initialName
renderFor(initialName)
