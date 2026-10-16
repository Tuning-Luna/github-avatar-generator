// @ts-nocheck

// Elements the app shell owns. A setting's own controls and readouts are
// declared in its feature module instead (ui/features/), so deleting a setting
// deletes its DOM references too.
const canvas = document.getElementById("cv")
const canvasFrame = document.getElementById("previewFrame")
const generationForm = document.getElementById("generationForm")
const nameInput = document.getElementById("nameInput")
const nameLabel = document.getElementById("nameLabel")
const status = document.getElementById("status")
const btnGenerate = document.getElementById("btnGenerate")
const btnRandom = document.getElementById("btnRandom")
const btnDownload = document.getElementById("btnDownload")
const btnCopyName = document.getElementById("btnCopyName")
const btnCopyImage = document.getElementById("btnCopyImage")

export {
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
}
