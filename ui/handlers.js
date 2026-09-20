// @ts-nocheck

import {
  canvas,
  canvasFrame,
  generationForm,
  nameInput,
  nameLabel,
  status,
  btnGenerate,
  btnRandom,
  btnDownload,
  btnCopyName,
  btnCopyImage,
  whiteBorderCheckbox,
  borderRow,
  borderWidthInput,
  borderWidthValue,
  borderWidthHint,
} from "./elements.js"
import { drawIdenticon } from "../core/drawer.js"
import { borderGeometry, canvasToBlob, getExportCanvas } from "./export.js"
import { SAMPLE_NAMES } from "./sample-names.js"

const state = {
  renderedName: null,
  backgroundColor: null,
  busy: false,
}
let pendingRender = null
let focusRestore = null

function setStatus(message, type = "") {
  status.textContent = message
  status.dataset.state = type
}

/** Border width in px for the next export, or 0 when the checkbox is off. */
function selectedBorderWidth() {
  return whiteBorderCheckbox.checked ? Number(borderWidthInput.value) : 0
}

/**
 * Reflect the border controls in the preview frame and the export readout.
 * The preview padding comes from the same geometry as the export canvas, so the
 * frame on screen matches the composed PNG without re-rendering the pattern.
 */
function syncBorderControls() {
  const width = Number(borderWidthInput.value)
  const { edge, paddingRatio } = borderGeometry(width)
  const enabled = whiteBorderCheckbox.checked

  canvasFrame.classList.toggle("has-border", enabled)
  canvasFrame.style.setProperty("--avatar-border-padding", `${(paddingRatio * 100).toFixed(3)}%`)

  borderRow.hidden = !enabled
  borderWidthValue.textContent = `${width}px`
  borderWidthInput.setAttribute("aria-valuetext", `${width}px，导出 ${edge} × ${edge}px`)
  borderWidthHint.textContent = `导出 ${edge} × ${edge}px`

  // Native ranges expose no filled-track styling, so the fill share is handed to CSS.
  const min = Number(borderWidthInput.min)
  const max = Number(borderWidthInput.max)
  const progress = max > min ? (width - min) / (max - min) : 0
  borderWidthInput.style.setProperty("--range-progress", `${progress * 100}%`)
}

function setLoading(on) {
  state.busy = on
  if (on && document.activeElement?.tagName === "BUTTON") {
    focusRestore = document.activeElement
  }

  btnGenerate.disabled = on
  btnRandom.disabled = on
  const canExport = state.renderedName !== null && !on
  btnDownload.disabled = !canExport
  btnCopyImage.disabled = !canExport
  btnCopyName.disabled = !canExport || state.renderedName === ""
  nameInput.readOnly = on
  generationForm.setAttribute("aria-busy", String(on))
  canvas.classList.toggle("loading", on)

  if (!on && focusRestore && document.activeElement?.tagName !== "INPUT") {
    focusRestore.focus()
    focusRestore = null
  }
}

function commitRender(stagingCanvas, name, backgroundColor) {
  canvas.width = stagingCanvas.width
  canvas.height = stagingCanvas.height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Unable to display the generated avatar.")
  context.drawImage(stagingCanvas, 0, 0)

  state.renderedName = name
  state.backgroundColor = backgroundColor
  nameLabel.textContent = name || "空白种子"
  nameLabel.classList.toggle("active", true)
  canvasFrame.style.setProperty("--avatar-bg", backgroundColor)
  canvas.setAttribute("aria-label", `生成的头像：${name || "空白种子"}`)
  setStatus("头像已生成", "success")
}

/** Render into a detached canvas, then publish all related state together. */
async function renderFor(name) {
  if (state.busy) return false

  const renderId = Symbol("render")
  pendingRender = renderId
  const displayName = name.trim()
  const stagingCanvas = document.createElement("canvas")
  setLoading(true)
  setStatus("正在生成…")

  try {
    const backgroundColor = await drawIdenticon(name || " ", stagingCanvas)
    if (pendingRender !== renderId) return false
    commitRender(stagingCanvas, displayName, backgroundColor)
    return true
  } catch (error) {
    console.error("Avatar generation failed:", error)
    if (pendingRender === renderId) {
      setStatus("生成失败，请重试", "error")
    }
    return false
  } finally {
    if (pendingRender === renderId) {
      pendingRender = null
      setLoading(false)
    }
  }
}

function generate(event) {
  event?.preventDefault()
  return renderFor(nameInput.value)
}

function randomName() {
  const base = SAMPLE_NAMES[(Math.random() * SAMPLE_NAMES.length) | 0]
  const suffix = 1000 + ((Math.random() * 8999) | 0)
  return `${base}${suffix}`
}

function random() {
  const name = randomName()
  nameInput.value = name
  return renderFor(name)
}

function currentExportCanvas() {
  if (state.renderedName === null || !state.backgroundColor) return null
  return getExportCanvas(canvas, state.backgroundColor, selectedBorderWidth())
}

async function download() {
  const exportCanvas = currentExportCanvas()
  if (!exportCanvas) {
    setStatus("请先生成头像", "error")
    return false
  }

  try {
    const blob = await canvasToBlob(exportCanvas)
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.download = `identicon-${state.renderedName || "blank"}.png`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setStatus("图片已下载", "success")
    return true
  } catch (error) {
    console.error("PNG download failed:", error)
    setStatus("下载失败，请重试", "error")
    return false
  }
}

async function copyName() {
  if (!state.renderedName) {
    setStatus("暂无可复制的字符串", "error")
    return false
  }

  try {
    if (!navigator.clipboard?.writeText) throw new Error("Text clipboard is unavailable.")
    await navigator.clipboard.writeText(state.renderedName)
    setStatus("字符串已复制", "success")
    return true
  } catch (error) {
    console.error("String copy failed:", error)
    setStatus("复制失败，请检查剪贴板权限", "error")
    return false
  }
}

async function copyImage() {
  const exportCanvas = currentExportCanvas()
  if (!exportCanvas) {
    setStatus("请先生成头像", "error")
    return false
  }

  if (!window.isSecureContext || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    setStatus("当前浏览器不支持复制图片，请改用下载", "error")
    return false
  }

  let pngSupported = true
  try {
    if (typeof ClipboardItem.supports === "function") {
      pngSupported = ClipboardItem.supports("image/png")
    }
  } catch (error) {
    console.error("PNG clipboard capability check failed:", error)
    pngSupported = false
  }

  if (!pngSupported) {
    setStatus("当前浏览器不支持复制 PNG，请改用下载", "error")
    return false
  }

  try {
    const blobPromise = canvasToBlob(exportCanvas)
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })])
    setStatus("图片已复制", "success")
    return true
  } catch (error) {
    console.error("Image copy failed:", error)
    setStatus("复制失败，请改用下载", "error")
    return false
  }
}

export {
  renderFor,
  generate,
  random,
  randomName,
  download,
  copyName,
  copyImage,
  syncBorderControls,
  state,
}
