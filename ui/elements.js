// @ts-nocheck

const canvas = document.getElementById("cv")
const canvasFrame = document.getElementById("previewFrame")
const generationForm = document.getElementById("generationForm")
const nameInput = document.getElementById("nameInput")
const nameLabel = document.getElementById("nameLabel")
const status = document.getElementById("status")
const btnGenerate = document.getElementById("btnGenerate")
const btnRandom = document.getElementById("btnRandom")
const btnDownload = document.getElementById("btnDownload")
const whiteBorderCheckbox = document.getElementById("whiteBorder")
const borderRow = document.getElementById("borderRow")
const borderWidthInput = document.getElementById("borderWidth")
const borderWidthValue = document.getElementById("borderValue")
const borderWidthHint = document.getElementById("borderHint")
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
  whiteBorderCheckbox,
  borderRow,
  borderWidthInput,
  borderWidthValue,
  borderWidthHint,
  btnCopyName,
  btnCopyImage,
}
