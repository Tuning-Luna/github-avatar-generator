// @ts-nocheck

import { borderFeature } from "./border.js"
import { symmetryFeature } from "./symmetry.js"
import { backgroundFeature } from "./background.js"

/**
 * Every registered setting, in the order it appears in the control panel.
 *
 * This list is the only place the app enumerates its settings: adding one is a
 * module in this directory, an entry here, and its own markup block in
 * `index.html`. See `./registry.js` for the descriptor each module must satisfy
 * and `./host.js` for how they are bound to the DOM.
 */
const FEATURES = Object.freeze([borderFeature, symmetryFeature, backgroundFeature])

export { FEATURES }
