// @ts-nocheck

/**
 * 更改背景色 — put a dark shade of the seed's hue behind the mark.
 *
 * Off, the palette is a near-white tint behind the vivid mark. On, the
 * background becomes a dark shade of the same hue and the mark stays the vivid
 * colour, lightened only as far as it has to be.
 *
 * Darkening the background without moving the mark is not enough on its own: a
 * dark hue at lightness 50-64 is as dark as the shade behind it, and the
 * darkest marks measure 2.32:1 against pure black, so no shade rescues them and
 * 9% of the reachable palette would fall under 3:1 — the blue band worst.
 * Holding the mark's hue and saturation and raising only its lightness keeps it
 * the same colour while the pair clears 4.5:1 everywhere. Measured over the
 * reachable palette, 56.5% of it renders the mark byte-for-byte unchanged;
 * octocat goes from 1.51:1 to 6.37:1 and keeps rgb(94,230,86) exactly.
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
