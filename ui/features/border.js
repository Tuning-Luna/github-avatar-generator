// @ts-nocheck

import { BORDER_MAX, BORDER_MIN, BORDER_STEP, DEFAULT_BORDER_SIZE } from "../../core/config.js"
import { borderGeometry } from "../export.js"

/**
 * 添加边框 — surround the export with a border filled in the avatar's own
 * background color, so the mark keeps its breathing room wherever it is shown.
 *
 * The border is a preview-and-export concern only: it never changes the pattern,
 * so this feature declares no `onChange` and ignores `ctx.loading`. Toggling it
 * while a render is in flight is harmless — `sync` re-derives the preview
 * padding from the controls, and the next export picks up the new width.
 */
const borderFeature = {
  id: "border",
  label: "添加边框",
  controls: {
    toggle: { selector: "#whiteBorder", default: true },
    width: { selector: "#borderWidth", default: DEFAULT_BORDER_SIZE },
  },
  elements: {
    row: "#borderRow",
    readout: "#borderValue",
    hint: "#borderHint",
  },
  mount({ controls }) {
    // core/config.js owns the bounds; the markup only carries a static baseline
    // so the control stays usable before modules run.
    controls.width.min = String(BORDER_MIN)
    controls.width.max = String(BORDER_MAX)
    controls.width.step = String(BORDER_STEP)
  },
  /** Border width in px for the next export, or 0 when the switch is off. */
  exportOptions({ controls }) {
    return { borderWidth: controls.toggle.checked ? Number(controls.width.value) : 0 }
  },
  sync({ ui, controls, elements }) {
    const width = Number(controls.width.value)
    const enabled = controls.toggle.checked
    // Geometry follows the width the export will really use, so with the border
    // off the row that stays on screen reports the 1000px square it will produce.
    const { edge, paddingRatio } = borderGeometry(enabled ? width : 0)

    ui.canvasFrame.classList.toggle("has-border", enabled)
    ui.canvasFrame.style.setProperty("--avatar-border-padding", `${(paddingRatio * 100).toFixed(3)}%`)

    // Disabled rather than hidden: the row keeps its place in the panel, so the
    // width can still be read — and set up — without switching the border on.
    controls.width.disabled = !enabled
    elements.row.classList.toggle("is-disabled", !enabled)
    elements.readout.textContent = `${width}px`
    const size = `${edge} × ${edge}px`
    controls.width.setAttribute("aria-valuetext", `${width}px，导出尺寸 ${size}`)
    elements.hint.textContent = `导出尺寸 ${size}`

    // Native ranges expose no filled-track styling, so the fill share is handed
    // to CSS.
    const min = Number(controls.width.min)
    const max = Number(controls.width.max)
    const progress = max > min ? (width - min) / (max - min) : 0
    controls.width.style.setProperty("--range-progress", `${progress * 100}%`)
  },
}

export { borderFeature }
