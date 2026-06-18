// @ts-nocheck

import { canvas, nameInput, btnGenerate, btnRandom, btnDownload, btnCopyName, btnCopyImage } from "./ui/elements.js"
import { generate, random, download, renderFor, randomName, copyName, copyImage } from "./ui/handlers.js"

// ─── Bindings ─────────────────────────────────────────────────────────────────

btnGenerate.addEventListener("click", generate)
btnRandom.addEventListener("click", random)
btnDownload.addEventListener("click", download)
btnCopyName.addEventListener("click", copyName)
btnCopyImage.addEventListener("click", copyImage)
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate()
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// Render a random identicon on load and fill the input box
const initialName = randomName()
nameInput.value = initialName
renderFor(initialName)
