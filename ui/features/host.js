// @ts-nocheck

import {
  btnCopyImage,
  btnCopyName,
  btnDownload,
  btnGenerate,
  btnRandom,
  canvas,
  canvasFrame,
  generationForm,
  nameInput,
  nameLabel,
  status,
} from "../elements.js"
import { FEATURES } from "./index.js"
import { createRegistry } from "./registry.js"

/**
 * The app's settings host.
 *
 * It owns everything the registry deliberately does not: the shared DOM
 * references, selector resolution, change listeners, and the one place the
 * in-flight render flag is stored. Nothing here names a specific setting.
 */

/** Elements the host owns and shares with features, read-only for them. */
const ui = Object.freeze({
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
})

const registry = createRegistry()
const contexts = new Map()
let loading = false
let mounted = false

/** Replaced at mount. Loud rather than a no-op: a setting that asks for a
 * re-render and silently gets nothing is the bug this whole module avoids. */
let rerenderSeed = () => {
  throw new Error("Features are not mounted yet.")
}

/**
 * Resolve a declared selector.
 * A typo or a missing markup block fails here, loudly and with the feature
 * named, rather than surfacing as a setting that silently does nothing.
 */
function resolveSelector(id, name, selector) {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`Feature "${id}": ${name} selector "${selector}" matched nothing.`)
  return element
}

/** Resolve a feature's controls and apply the defaults it declares. */
function resolveControls(feature) {
  const controls = {}
  for (const [name, spec] of Object.entries(feature.controls ?? {})) {
    const element = resolveSelector(feature.id, name, spec.selector)
    if (typeof spec.default === "boolean") element.checked = spec.default
    else if (spec.default !== undefined) element.value = String(spec.default)
    controls[name] = element
  }
  return controls
}

/** Resolve a feature's read-only elements. */
function resolveElements(feature) {
  const elements = {}
  for (const [name, selector] of Object.entries(feature.elements ?? {})) {
    elements[name] = resolveSelector(feature.id, name, selector)
  }
  return elements
}

/**
 * Re-run every feature's sync.
 * One path for mount, for a change, and for loading, so a control's state can
 * never depend on which of those happened last.
 */
function syncAll() {
  for (const feature of registry.listFeatures()) {
    const context = contexts.get(feature.id)
    if (context) feature.sync?.(context)
  }
}

function handleChange(feature) {
  syncAll()
  feature.onChange?.(contexts.get(feature.id))
}

/**
 * Register the manifest's features and bind them to the DOM.
 * Call once, before the first render: the option collectors below read the
 * contexts this creates.
 * @param {{rerender: () => unknown}} host `rerender` re-renders the committed
 *   seed, and is what a setting that changes the shape asks for.
 */
function mountFeatures(host) {
  if (mounted) throw new Error("Features are already mounted.")
  if (typeof host?.rerender !== "function") {
    throw new Error("mountFeatures needs a rerender function.")
  }
  mounted = true
  rerenderSeed = host.rerender

  for (const feature of FEATURES) registry.registerFeature(feature)

  for (const feature of registry.listFeatures()) {
    const context = {
      ui,
      controls: resolveControls(feature),
      elements: resolveElements(feature),
      loading,
      rerender: () => rerenderSeed(),
      syncAll,
    }
    contexts.set(feature.id, context)

    feature.mount?.(context)

    for (const control of Object.values(context.controls)) {
      // `input` for a range: the preview must follow the handle while dragging.
      const event = control.type === "range" ? "input" : "change"
      control.addEventListener(event, () => handleChange(feature))
    }
  }

  syncAll()
}

/**
 * Reflect an in-flight render on every feature's controls.
 * @param {boolean} on
 */
function syncFeatures(on) {
  loading = on
  for (const context of contexts.values()) context.loading = on
  syncAll()
}

/** Options the renderer should run with, merged across every feature. */
function renderOptions() {
  return registry.collectOptions("renderOptions", contexts)
}

/** Options the exporter should compose with, merged across every feature. */
function exportOptions() {
  return registry.collectOptions("exportOptions", contexts)
}

export { mountFeatures, syncFeatures, renderOptions, exportOptions }
