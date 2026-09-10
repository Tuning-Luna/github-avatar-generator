import assert from "node:assert/strict"
import { test } from "node:test"
import { BORDER_SIZE, SIZE } from "../core/config.js"
import { canvasToBlob, getExportCanvas } from "../ui/export.js"

function sourceCanvas() {
  return { width: SIZE, height: SIZE }
}

test("export canvas keeps the source when border is disabled", () => {
  const source = sourceCanvas()
  assert.strictEqual(getExportCanvas(source, "hsl(10,40%,90%)", false), source)
})

test("export canvas composes the matching background border", () => {
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

  const result = getExportCanvas(sourceCanvas(), "hsl(117,44%,96%)", true)
  assert.equal(result.width, SIZE + BORDER_SIZE * 2)
  assert.equal(result.height, SIZE + BORDER_SIZE * 2)
  assert.equal(context.fillStyle, "hsl(117,44%,96%)")
  assert.equal(created.length, 1)
  delete globalThis.document
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
