// @ts-nocheck

import {
  btnCopyImage,
  btnCopyName,
  btnDownload,
  btnRandom,
  canvas,
  generationForm,
  nameInput,
} from "./ui/elements.js"
import {
  copyImage,
  copyName,
  download,
  generate,
  random,
  randomName,
  renderFor,
  rerender,
} from "./ui/handlers.js"
import { mountFeatures } from "./ui/features/host.js"

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

// Settings mount before the first render: the render and export option sets are
// collected from them, so a setting that is not bound yet would render with its
// default instead of its control's value.
mountFeatures({ rerender })

// Keep a semantic canvas fallback for browsers that cannot render canvas pixels.
canvas.textContent = "您的浏览器不支持 HTML5 Canvas。"

const initialName = randomName()
nameInput.value = initialName
void renderFor(initialName)
