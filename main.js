// @ts-nocheck

import {
  btnCopyImage,
  btnCopyName,
  btnDownload,
  btnRandom,
  borderWidthInput,
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
  syncBorderControls,
} from "./ui/handlers.js"
import {
  BORDER_MAX,
  BORDER_MIN,
  BORDER_STEP,
  DEFAULT_BORDER_SIZE,
} from "./core/config.js"

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

// config.js owns the border bounds; the markup only carries a static baseline so
// the control stays usable before modules run.
borderWidthInput.min = String(BORDER_MIN)
borderWidthInput.max = String(BORDER_MAX)
borderWidthInput.step = String(BORDER_STEP)
borderWidthInput.value = String(DEFAULT_BORDER_SIZE)
whiteBorderCheckbox.addEventListener("change", syncBorderControls)
// `input` rather than `change`: the preview must follow the handle while dragging.
borderWidthInput.addEventListener("input", syncBorderControls)

syncBorderControls()
const initialName = randomName()
nameInput.value = initialName
void renderFor(initialName)

// Keep a semantic canvas fallback for browsers that cannot render canvas pixels.
canvas.textContent = "你的头像预览将在这里显示。"
