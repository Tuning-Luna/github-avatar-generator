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
} from "./elements.js"
import { drawIdenticon } from "../core/drawer.js"
import { canvasToBlob, getExportCanvas } from "./export.js"
import { exportOptions, renderOptions, syncFeatures } from "./features/host.js"
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

function setLoading(on) {
  state.busy = on
  if (on && document.activeElement?.tagName === "BUTTON") {
    focusRestore = document.activeElement
  }
  btnGenerate.disabled = on
  btnRandom.disabled = on
  // Settings decide for themselves which of their own controls a render in
  // flight should lock: one that changes the shape locks its switch, one that
  // only affects the export does not.
  syncFeatures(on)
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

  const label = name || "（空白）"
  state.renderedName = name
  state.backgroundColor = backgroundColor

  nameLabel.textContent = label
  nameLabel.classList.toggle("active", true)
  canvasFrame.style.setProperty("--avatar-bg", backgroundColor)
  canvas.setAttribute("aria-label", `生成的像素头像：${label}`)
  setStatus("生成完毕", "success")
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
    const backgroundColor = await drawIdenticon(name || " ", stagingCanvas, renderOptions())
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

/**
 * Re-render the seed the panel last committed, for a setting that changes the
 * shape. The committed seed stays the one the readouts and the export describe,
 * so a setting change cannot silently commit a draft that was never submitted.
 */
function rerender() {
  return renderFor(state.renderedName ?? nameInput.value)
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
  const { borderWidth = 0 } = exportOptions()
  return getExportCanvas(canvas, state.backgroundColor, borderWidth)
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
    setStatus("已开始下载", "success")
    return true
  } catch (error) {
    console.error("PNG download failed:", error)
    setStatus("导出图片失败，请重试", "error")
    return false
  }
}

async function copyName() {
  if (!state.renderedName) {
    setStatus("没有可复制的名字", "error")
    return false
  }

  try {
    if (!navigator.clipboard?.writeText) throw new Error("Text clipboard is unavailable.")
    await navigator.clipboard.writeText(state.renderedName)
    setStatus("已复制名字到剪贴板", "success")
    return true
  } catch (error) {
    console.error("String copy failed:", error)
    setStatus("复制名字失败，请手动复制", "error")
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
    setStatus("当前环境不支持复制图片，请直接下载", "error")
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
    setStatus("当前浏览器不支持复制 PNG 图片", "error")
    return false
  }

  try {
    const blobPromise = canvasToBlob(exportCanvas)
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })])
    setStatus("已复制图片到剪贴板", "success")
    return true
  } catch (error) {
    console.error("Image copy failed:", error)
    setStatus("复制图片失败，请尝试下载", "error")
    return false
  }
}

export {
  renderFor,
  rerender,
  generate,
  random,
  randomName,
  download,
  copyName,
  copyImage,
  state,
}
