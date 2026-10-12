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

export { hslToRgb }
