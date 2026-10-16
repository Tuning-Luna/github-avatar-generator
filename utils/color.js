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
 * WCAG 2.x relative luminance of an RGB tuple (0-255 per channel).
 * @param {[number, number, number]} rgb
 * @returns {number} 0 for black, 1 for white
 */
function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * WCAG 2.x contrast ratio between two RGB tuples: 1 when they are identical,
 * 21 for black against white. Symmetric, so the argument order does not matter.
 * @param {[number, number, number]} a @param {[number, number, number]} b
 * @returns {number}
 */
function contrastRatio(a, b) {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

export { hslToRgb, contrastRatio }
