// @ts-nocheck

import {
  btnCopyImage,
  btnCopyName,
  btnDownload,
  btnRandom,
  canvas,
  generationForm,
  nameInput,
  whiteBorderCheckbox,
} from "./ui/elements.js"
import {
  copyImage,
  copyName,
  download,
  generate,
  random,
  renderFor,
  randomName,
  updateExportMeta,
} from "./ui/handlers.js"

function handleAsync(action) {
  return (event) => {
    event?.preventDefault()
    void action(event)
  }
}

generationForm.addEventListener("submit", handleAsync(generate))
btnRandom.addEventListener("click", handleAsync(random))
btnDownload.addEventListener("click", handleAsync(download))
btnCopyName.addEventListener("click", handleAsync(copyName))
btnCopyImage.addEventListener("click", handleAsync(copyImage))
whiteBorderCheckbox.addEventListener("change", updateExportMeta)

updateExportMeta()
const initialName = randomName()
nameInput.value = initialName
void renderFor(initialName)

// Keep a semantic canvas fallback for browsers that cannot render canvas pixels.
canvas.textContent = "你的头像预览将在这里显示。"
