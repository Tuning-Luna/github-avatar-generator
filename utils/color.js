// @ts-nocheck

/**
 * Convert HSL (0-360, 0-100, 0-100) to an RGB tuple.
 * @param {number} h @param {number} s @param {number} l
 * @returns {[number, number, number]}
 */
function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const k = h / 30

  // Inline f(n) calculation for better performance
  const f0 = l - a * Math.max(-1, Math.min((0 + k) % 12 - 3, Math.min(9 - (0 + k) % 12, 1)))
  const f8 = l - a * Math.max(-1, Math.min((8 + k) % 12 - 3, Math.min(9 - (8 + k) % 12, 1)))
  const f4 = l - a * Math.max(-1, Math.min((4 + k) % 12 - 3, Math.min(9 - (4 + k) % 12, 1)))

  return [
    Math.round(f0 * 255),
    Math.round(f8 * 255),
    Math.round(f4 * 255),
  ]
}

/**
 * sRGB channel (0-255) to its linear-light value.
 * @param {number} value
 * @returns {number}
 */
function linearize(value) {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
}

/**
 * WCAG relative luminance of an sRGB triple, 0 (black) to 1 (white).
 * This is the quantity contrast actually depends on, so it is what decides
 * whether a pattern reads against its field — HSL lightness is not a substitute,
 * since a saturated yellow at 54% lightness is far brighter than a blue at 54%.
 * @param {number} r @param {number} g @param {number} b
 * @returns {number}
 */
function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/**
 * WCAG contrast ratio between two relative luminances, 1 (identical) to 21.
 * @param {number} luminanceA @param {number} luminanceB
 * @returns {number}
 */
function contrastRatio(luminanceA, luminanceB) {
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

export { hslToRgb, relativeLuminance, contrastRatio }
