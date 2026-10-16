// @ts-nocheck

/**
 * 更改背景色 — put a dark shade of the seed's hue behind the mark.
 *
 * Off, the palette is a near-white tint behind the vivid mark. On, that tint
 * becomes the mark and the background becomes a dark shade of the same hue —
 * not a trading of the two colours, which measures the same 1.07:1 worst case
 * as the pair it started from, being that pair with the roles exchanged. The
 * dark shade is a third colour for that reason. Measured over the whole
 * reachable palette, the on pair is never below 6.72:1, and the worst of the
 * seeds this repo pins — `octocat` — goes from 1.51:1 to 9.63:1.
 *
 * The switch changes the render, so it re-renders, and it is disabled while a
 * render is in flight. `renderOptions()` is read as the render starts, so a
 * flip mid-render is not applied to it, and `renderFor` drops a render it is
 * already busy with — a live switch would flip, drop the re-render it asked
 * for, and leave the canvas showing the old palette until the next generate.
 */
const backgroundFeature = {
  id: "background",
  label: "更改背景色",
  controls: {
    toggle: { selector: "#invertBackground", default: false },
  },
  renderOptions({ controls }) {
    return { invertBackground: controls.toggle.checked }
  },
  sync({ controls, loading }) {
    controls.toggle.disabled = loading
  },
  onChange({ rerender }) {
    rerender()
  },
}

export { backgroundFeature }
