// @ts-nocheck

/**
 * 左右对称 — mirror the grid so the right half repeats the left.
 *
 * Mirroring is what makes the mark read as a logo rather than as noise, and it
 * is the shape GitHub's own identicons take. It also holds the shape to 15 free
 * bits, so 32768 patterns is the whole state space (see `core/pattern.js`);
 * switching it off lets both halves fill independently for a busier, far
 * higher-variety mark.
 *
 * The switch changes the shape itself, so it re-renders. It is disabled while a
 * render is in flight, because `renderFor` drops a render it is already busy
 * with — leaving the switch live would flip it without changing the pattern.
 */
const symmetryFeature = {
  id: "symmetry",
  label: "左右对称",
  controls: {
    toggle: { selector: "#symmetric", default: true },
  },
  renderOptions({ controls }) {
    return { symmetric: controls.toggle.checked }
  },
  sync({ controls, loading }) {
    controls.toggle.disabled = loading
  },
  onChange({ rerender }) {
    rerender()
  },
}

export { symmetryFeature }
