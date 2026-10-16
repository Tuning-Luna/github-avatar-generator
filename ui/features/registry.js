// @ts-nocheck

/**
 * The setting registry.
 *
 * Every user-facing setting is a module that declares which controls it owns,
 * what it contributes to the render and export pipelines, and how it reacts to
 * its own changes. Registering them here is what keeps the rest of the app
 * setting-agnostic: `ui/handlers.js` asks the registry for "render options"
 * rather than naming a setting, so adding, changing or removing one touches its
 * module, one entry in `ui/features/index.js`, and its own markup block — and no
 * other setting's code.
 *
 * This module deliberately touches no DOM and holds no global state, so the
 * contract can be exercised with plain objects in `tests/features.test.mjs`.
 * `ui/features/host.js` is the app's instance: it resolves selectors, binds
 * listeners and holds the live contexts.
 *
 * A feature descriptor may declare:
 *
 *   id                  Unique, stable name. Namespaces this feature's errors.
 *   label               Human-readable name, for docs and diagnostics.
 *   controls            { name: { selector, default } } — the interactive
 *                       controls the feature owns. The host resolves the
 *                       selector and applies `default`: a boolean sets
 *                       `.checked`, anything else sets `.value`. A change
 *                       re-runs `sync` for every feature and then this one's
 *                       `onChange`.
 *   elements            { name: selector } — read-only elements to write to.
 *                       Declared here rather than in `ui/elements.js` so
 *                       deleting a feature deletes its DOM references too.
 *   mount(ctx)          Runs once, after controls and elements exist. For what
 *                       the host cannot infer, such as a range's min/max.
 *   renderOptions(ctx)  Merged into the options object handed to the renderer.
 *   exportOptions(ctx)  Merged into the options object handed to the exporter.
 *   sync(ctx)           Puts this feature's own controls into the state its
 *                       values and `ctx.loading` imply. Called on mount, after
 *                       any change, and whenever loading changes, because a
 *                       single path cannot disagree with itself the way several
 *                       can. A setting that does not affect the render — a
 *                       border, say — simply ignores `ctx.loading` rather than
 *                       being locked out during one.
 *   onChange(ctx)       Extra reaction to this feature's own change; `sync` has
 *                       already run by then. Omit it when syncing is all that
 *                       is needed.
 *
 * Every hook is optional, and `ctx` carries
 * `{ ui, controls, elements, loading, rerender, syncAll }`.
 */

const CONTRIBUTIONS = Object.freeze(["renderOptions", "exportOptions"])

/**
 * Create a registry with its own feature list.
 * Nothing here is module-level state: `ui/features/host.js` holds the app's one
 * instance, so the contract stays testable with plain objects and no test can
 * see another's features.
 */
function createRegistry() {
  const features = []

  /**
   * Add a feature.
   * Rejects a descriptor that could only fail later, at the point where the
   * mistake is still visible.
   * @param {object} feature
   * @returns {object} the same descriptor
   */
  function registerFeature(feature) {
    if (!feature?.id) throw new Error("A feature must declare an id.")
    if (features.some((registered) => registered.id === feature.id)) {
      throw new Error(`Duplicate feature id: ${feature.id}`)
    }
    if (!feature.label) throw new Error(`Feature "${feature.id}" must declare a label.`)
    for (const point of CONTRIBUTIONS) {
      if (feature[point] !== undefined && typeof feature[point] !== "function") {
        throw new Error(`Feature "${feature.id}": ${point} must be a function.`)
      }
    }
    features.push(Object.freeze({ ...feature }))
    return feature
  }

  /** Registered features, in registration order. */
  function listFeatures() {
    return features.slice()
  }

  /**
   * Merge one contribution point across every feature.
   * A feature that does not declare the point contributes nothing, which is what
   * keeps the render and export option sets independent of each other.
   * @param {string} point @param {Map<string, object>} contexts
   * @returns {object}
   */
  function collectOptions(point, contexts) {
    if (!CONTRIBUTIONS.includes(point)) {
      throw new Error(`Unknown contribution point: ${point}`)
    }
    const merged = {}
    for (const feature of features) {
      const context = contexts.get(feature.id)
      if (!context) throw new Error(`Feature "${feature.id}" is registered but was never mounted.`)
      const contribute = feature[point]
      if (typeof contribute === "function") Object.assign(merged, contribute(context) ?? {})
    }
    return merged
  }

  return { registerFeature, listFeatures, collectOptions }
}

export { createRegistry }
