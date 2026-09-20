import assert from "node:assert/strict"
import { test } from "node:test"
import { BORDER_MAX, DEFAULT_BORDER_SIZE, SIZE } from "../core/config.js"
import { borderGeometry, canvasToBlob, getExportCanvas } from "../ui/export.js"

function sourceCanvas() {
  return { width: SIZE, height: SIZE }
}

/** Stub the canvas the export composes into, recording the draw calls. */
function stubDocument() {
  const created = []
  const context = { fillStyle: "", fillRect() {}, drawImage() {} }
  globalThis.document = {
    createElement: (tag) => {
      assert.equal(tag, "canvas")
      const result = { getContext: () => context }
      created.push(result)
      return result
    },
  }
  return { created, context }
}

test("export canvas keeps the source when the border width is 0", () => {
  const source = sourceCanvas()
  assert.strictEqual(getExportCanvas(source, "hsl(10,40%,90%)", 0), source)
})

test("export canvas composes a border of the requested width", () => {
  const { created, context } = stubDocument()
  const width = 30

  const result = getExportCanvas(sourceCanvas(), "hsl(117,44%,96%)", width)
  assert.equal(result.width, SIZE + width * 2)
  assert.equal(result.height, SIZE + width * 2)
  assert.equal(context.fillStyle, "hsl(117,44%,96%)")
  assert.equal(created.length, 1)
  delete globalThis.document
})

test("export canvas uses the default border width from config", () => {
  const { context } = stubDocument()

  const result = getExportCanvas(sourceCanvas(), "hsl(0,0%,0%)", DEFAULT_BORDER_SIZE)
  assert.equal(result.width, SIZE + DEFAULT_BORDER_SIZE * 2)
  delete globalThis.document
})

test("border geometry maps a width onto export edge and preview ratio", () => {
  const defaultGeometry = borderGeometry(DEFAULT_BORDER_SIZE)
  assert.equal(defaultGeometry.edge, SIZE + DEFAULT_BORDER_SIZE * 2)
  // 80 / 1160 — the ratio the preview frame pads by.
  assert.ok(Math.abs(defaultGeometry.paddingRatio - 80 / 1160) < Number.EPSILON)

  const none = borderGeometry(0)
  assert.equal(none.edge, SIZE)
  assert.equal(none.paddingRatio, 0)
})

test("border geometry rejects widths outside the supported range", () => {
  for (const input of [-40, Number.NaN, Number.POSITIVE_INFINITY, undefined, "abc"]) {
    assert.equal(borderGeometry(input).border, 0, `expected 0 for ${String(input)}`)
  }
  assert.equal(borderGeometry(BORDER_MAX + 500).border, BORDER_MAX)
  assert.equal(borderGeometry(30.6).border, 31)
})

test("preview padding ratio keeps the pattern at its exported share of the edge", () => {
  // The frame pads by paddingRatio of its width, so the pattern must occupy the
  // remaining share exactly as it does inside the exported PNG.
  for (const width of [10, 80, 200]) {
    const { edge, paddingRatio } = borderGeometry(width)
    assert.ok(Math.abs((1 - paddingRatio * 2) - SIZE / edge) < 1e-12)
  }
})

test("canvasToBlob rejects when the browser cannot encode a PNG", async () => {
  await assert.rejects(
    canvasToBlob({ toBlob: (callback) => callback(null) }),
    /PNG encoding failed/,
  )
})

test("canvasToBlob resolves the browser-generated PNG blob", async () => {
  const blob = { type: "image/png", size: 12 }
  assert.strictEqual(
    await canvasToBlob({ toBlob: (callback) => callback(blob) }),
    blob,
  )
})
