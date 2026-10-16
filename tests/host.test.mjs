import assert from "node:assert/strict"
import { test } from "node:test"

/**
 * The settings host wires the manifest to the markup: it resolves selectors,
 * applies each setting's declared default, binds the right event, and keeps the
 * controls in step with each other and with the render. None of that is
 * reachable from the DOM-free suites, and all of it is what a setting added
 * later relies on — so it is exercised here against a stub that is only as wide
 * as `ui/elements.js` and `ui/features/host.js` need.
 */

/**
 * The elements the app binds to, and their control types, as `index.html` has
 * them. A renamed id in the markup fails here rather than in the browser.
 */
const MARKUP = {
  "#cv": "canvas",
  "#previewFrame": "div",
  "#generationForm": "form",
  "#nameInput": "text",
  "#nameLabel": "p",
  "#status": "p",
  "#btnGenerate": "button",
  "#btnRandom": "button",
  "#btnDownload": "button",
  "#btnCopyName": "button",
  "#btnCopyImage": "button",
  "#whiteBorder": "checkbox",
  "#symmetric": "checkbox",
  "#invertBackground": "checkbox",
  "#borderWidth": "range",
  "#borderRow": "div",
  "#borderValue": "output",
  "#borderHint": "p",
}

function createElement(type) {
  const listeners = new Map()
  const classes = new Set()
  const attributes = new Map()
  return {
    type,
    checked: false,
    value: "",
    disabled: false,
    textContent: "",
    style: { setProperty: (name, value) => attributes.set(`style:${name}`, value) },
    classList: {
      toggle(name, on) {
        if (on) classes.add(name)
        else classes.delete(name)
      },
    },
    setAttribute: (name, value) => attributes.set(name, value),
    addEventListener(event, handler) {
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event).push(handler)
    },
    fire(event) {
      for (const handler of listeners.get(event) ?? []) handler({ target: this })
    },
    has: (name) => classes.has(name),
    attribute: (name) => attributes.get(name),
  }
}

/** Install the stub before the modules under test are imported. */
function installDom() {
  const bySelector = new Map()
  const byId = new Map()
  for (const [selector, type] of Object.entries(MARKUP)) {
    const element = createElement(type)
    bySelector.set(selector, element)
    byId.set(selector.slice(1), element)
  }
  globalThis.document = {
    getElementById: (id) => byId.get(id) ?? null,
    querySelector: (selector) => bySelector.get(selector) ?? null,
  }
  return bySelector
}

const elements = installDom()

const { buildPattern } = await import("../core/pattern.js")
const { drawIdenticon } = await import("../core/drawer.js")
const { borderGeometry } = await import("../ui/export.js")
const host = await import("../ui/features/host.js")

// The stub markup carries no `checked` or `value` of its own, so anything set
// below is the host or a feature applying a declared default.
let renders = 0
host.mountFeatures({ rerender: () => { renders += 1 } })

const el = (selector) => elements.get(selector)

/** The background the renderer paints for the options the host collects now. */
async function renderBackground() {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ fillStyle: "", fillRect() {} }),
  }
  return drawIdenticon("octocat", canvas, host.renderOptions())
}

test("mounting applies the defaults the feature modules declare", () => {
  assert.equal(el("#symmetric").checked, true)
  assert.equal(el("#whiteBorder").checked, true)
  // Weak on its own — the stub starts every checkbox unchecked, so this cannot
  // tell `default: false` from no default. The flip below is what covers it.
  assert.equal(el("#invertBackground").checked, false)
  assert.equal(el("#borderWidth").value, "80")
})

test("mounting applies the range bounds that core/config.js owns", () => {
  assert.equal(el("#borderWidth").min, "0")
  assert.equal(el("#borderWidth").max, "500")
  assert.equal(el("#borderWidth").step, "10")
})

test("mounting syncs the readouts and the preview frame", () => {
  assert.equal(el("#borderValue").textContent, "80px")
  assert.equal(el("#borderHint").textContent, "导出尺寸 1160 × 1160px")
  assert.equal(el("#borderWidth").attribute("aria-valuetext"), "80px，导出尺寸 1160 × 1160px")
  assert.equal(el("#borderWidth").attribute("style:--range-progress"), "16%")
  assert.ok(el("#previewFrame").has("has-border"))
  // 80 / 1160, the border's share of the export edge.
  assert.equal(el("#previewFrame").attribute("style:--avatar-border-padding"), "6.897%")
})

test("mounting twice is refused rather than silently rebinding", () => {
  assert.throws(() => host.mountFeatures({ rerender: () => {} }), /already mounted/)
})

test("a mount with no rerender function is refused", async () => {
  // A setting that changes the shape asks for a re-render; mounting without one
  // would leave that switch silently doing nothing.
  const fresh = await import("../ui/features/host.js?no-rerender=1")
  assert.throws(() => fresh.mountFeatures({}), /needs a rerender function/)
  assert.throws(() => fresh.mountFeatures(), /needs a rerender function/)
})

test("render options follow the shape and background switches, and nothing else", async () => {
  assert.deepEqual(host.renderOptions(), { symmetric: true, invertBackground: false })

  el("#symmetric").checked = false
  el("#symmetric").fire("change")
  assert.deepEqual(host.renderOptions(), { symmetric: false, invertBackground: false })

  // What the feature hands over has to be what the pattern builder accepts:
  // a renamed option would otherwise show up as a switch that does nothing.
  const { sha256 } = await import("../utils/hash.js")
  const hash = await sha256("octocat")
  assert.notDeepEqual(buildPattern(hash, host.renderOptions()), buildPattern(hash, { symmetric: true }))
  assert.deepEqual(buildPattern(hash, host.renderOptions()), buildPattern(hash, { symmetric: false }))

  el("#symmetric").checked = true
  el("#symmetric").fire("change")
  assert.deepEqual(host.renderOptions(), { symmetric: true, invertBackground: false })

  // The background key is the renderer's rather than the pattern builder's, so
  // it is checked the same way but through the renderer: the two backgrounds
  // differ only if the option the feature contributes is the one it reads.
  const light = await renderBackground()
  el("#invertBackground").checked = true
  el("#invertBackground").fire("change")
  assert.deepEqual(host.renderOptions(), { symmetric: true, invertBackground: true })
  assert.notEqual(await renderBackground(), light, "the background switch must reach the renderer")

  el("#invertBackground").checked = false
  el("#invertBackground").fire("change")
  assert.equal(await renderBackground(), light)
})

test("export options follow the border controls, and count the width the export will use", () => {
  assert.deepEqual(host.exportOptions(), { borderWidth: 80 })

  el("#whiteBorder").checked = false
  el("#whiteBorder").fire("change")
  assert.deepEqual(host.exportOptions(), { borderWidth: 0 })
  // The key the feature contributes is the one the exporter reads.
  assert.equal(borderGeometry(host.exportOptions().borderWidth).edge, 1000)
  assert.ok(el("#borderRow").has("is-disabled"))
  assert.equal(el("#borderWidth").disabled, true)
  assert.equal(el("#borderHint").textContent, "导出尺寸 1000 × 1000px")
  // The width stays readable while the switch is off.
  assert.equal(el("#borderValue").textContent, "80px")

  el("#whiteBorder").checked = true
  el("#whiteBorder").fire("change")
  // A range listens to `input`, not `change`: the preview has to follow the
  // handle while it is still being dragged.
  el("#borderWidth").value = "500"
  el("#borderWidth").fire("input")
  assert.deepEqual(host.exportOptions(), { borderWidth: 500 })
  assert.equal(borderGeometry(host.exportOptions().borderWidth).edge, 2000)
  assert.equal(el("#previewFrame").attribute("style:--avatar-border-padding"), "25.000%")

  el("#borderWidth").value = "80"
  el("#borderWidth").fire("input")
})

test("only a setting that changes the render asks for a re-render", () => {
  const before = renders

  el("#symmetric").checked = false
  el("#symmetric").fire("change")
  assert.equal(renders, before + 1, "the symmetry switch must re-render")

  // This one recolours the render instead of reshaping it, and still re-renders.
  el("#invertBackground").checked = true
  el("#invertBackground").fire("change")
  assert.equal(renders, before + 2, "the background switch must re-render")

  el("#whiteBorder").checked = false
  el("#whiteBorder").fire("change")
  el("#borderWidth").value = "500"
  el("#borderWidth").fire("input")
  assert.equal(renders, before + 2, "the border must not re-render")

  el("#whiteBorder").checked = true
  el("#whiteBorder").fire("change")
  el("#borderWidth").value = "80"
  el("#borderWidth").fire("input")
  el("#symmetric").checked = true
  el("#symmetric").fire("change")
  el("#invertBackground").checked = false
  el("#invertBackground").fire("change")
})

test("a render in flight locks the settings that would change the render, and nothing else", () => {
  host.syncFeatures(true)
  assert.equal(el("#symmetric").disabled, true, "the shape switch must lock")
  assert.equal(el("#invertBackground").disabled, true, "the palette switch must lock too")
  assert.equal(el("#whiteBorder").disabled, false, "an export setting stays usable")
  assert.equal(el("#borderWidth").disabled, false)

  host.syncFeatures(false)
  assert.equal(el("#symmetric").disabled, false)
  assert.equal(el("#invertBackground").disabled, false)
})

test("a feature whose markup is missing fails at mount, naming the selector", async () => {
  // A fresh host module: the registry and the mount flag are per instance, so
  // this one can mount against markup that is missing a control. It has to come
  // last, because the element is removed from the shared stub to arrange it.
  const missing = el("#symmetric")
  elements.delete("#symmetric")
  try {
    const fresh = await import("../ui/features/host.js?missing-markup=1")
    assert.throws(
      () => fresh.mountFeatures({ rerender: () => {} }),
      /Feature "symmetry": toggle selector "#symmetric" matched nothing/,
    )
  } finally {
    elements.set("#symmetric", missing)
  }
})
