import assert from "node:assert/strict"
import { test } from "node:test"
import { createRegistry } from "../ui/features/registry.js"

/**
 * The registry is what makes a setting removable: a module declares what it
 * contributes and nothing else has to know it exists. These cases assert that
 * contract directly, with plain objects and no DOM.
 */

/** The contexts a host would build, one per feature id. */
function contextsFor(...ids) {
  const contexts = new Map()
  for (const id of ids) contexts.set(id, { controls: {}, elements: {}, loading: false })
  return contexts
}

test("a feature is addressable by its id once registered", () => {
  const registry = createRegistry()
  const feature = { id: "first", label: "First" }

  assert.equal(registry.registerFeature(feature), feature)
  assert.deepEqual(registry.listFeatures().map(({ id }) => id), ["first"])
})

test("registration order is the merge order, and later features win a shared key", () => {
  const registry = createRegistry()
  registry.registerFeature({ id: "a", label: "A", renderOptions: () => ({ shared: "a", onlyA: true }) })
  registry.registerFeature({ id: "b", label: "B", renderOptions: () => ({ shared: "b" }) })

  assert.deepEqual(registry.collectOptions("renderOptions", contextsFor("a", "b")), {
    shared: "b",
    onlyA: true,
  })
})

test("a feature that does not declare a point contributes nothing to it", () => {
  // This is the isolation the app depends on: a setting that only affects the
  // export cannot reach into the render options, or vice versa.
  const registry = createRegistry()
  registry.registerFeature({ id: "shape", label: "Shape", renderOptions: () => ({ symmetric: false }) })
  registry.registerFeature({ id: "frame", label: "Frame", exportOptions: () => ({ borderWidth: 80 }) })
  const contexts = contextsFor("shape", "frame")

  assert.deepEqual(registry.collectOptions("renderOptions", contexts), { symmetric: false })
  assert.deepEqual(registry.collectOptions("exportOptions", contexts), { borderWidth: 80 })
})

test("a descriptor that could only fail later is rejected at registration", () => {
  const registry = createRegistry()
  registry.registerFeature({ id: "shape", label: "Shape" })

  assert.throws(
    () => registry.registerFeature({ id: "shape", label: "Again" }),
    /Duplicate feature id: shape/,
  )
  assert.throws(() => registry.registerFeature({ label: "No id" }), /must declare an id/)
  assert.throws(() => registry.registerFeature({ id: "unlabelled" }), /must declare a label/)
  assert.throws(
    () => registry.registerFeature({ id: "bad", label: "Bad", renderOptions: {} }),
    /renderOptions must be a function/,
  )
  // Rejections leave the registry as it was, so a bad module cannot half-register.
  assert.deepEqual(registry.listFeatures().map(({ id }) => id), ["shape"])
})

test("collecting from a registry that was never mounted fails loudly", () => {
  const registry = createRegistry()
  registry.registerFeature({ id: "shape", label: "Shape", renderOptions: () => ({ symmetric: false }) })

  // Without this, a registered-but-unmounted setting would render with its
  // default instead of its control's value: a wrong shape, not an error.
  assert.throws(() => registry.collectOptions("renderOptions", new Map()), /never mounted/)
  assert.throws(
    () => registry.collectOptions("nope", contextsFor("shape")),
    /Unknown contribution point: nope/,
  )
})

test("a registered feature cannot be tampered with afterwards", () => {
  const registry = createRegistry()
  const feature = { id: "shape", label: "Shape", renderOptions: () => ({ symmetric: true }) }
  registry.registerFeature(feature)

  // The caller's own reference is not what the registry reads, and the list it
  // hands back is a copy, so neither can change what the app renders with.
  feature.renderOptions = () => ({ symmetric: false })
  registry.listFeatures().push({ id: "sneaky", label: "Sneaky" })

  assert.deepEqual(registry.collectOptions("renderOptions", contextsFor("shape")), { symmetric: true })
  assert.deepEqual(registry.listFeatures().map(({ id }) => id), ["shape"])
})

test("registries do not see each other's features", () => {
  const one = createRegistry()
  const two = createRegistry()
  one.registerFeature({ id: "only-here", label: "Only here" })

  assert.equal(two.listFeatures().length, 0)
  assert.equal(one.listFeatures().length, 1)
})
