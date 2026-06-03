// @ts-nocheck

/**
 * Compute SHA-256 of a string, returns a Uint8Array of 32 bytes.
 * @param {string} str
 * @returns {Promise<Uint8Array>}
 */
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  )
  return new Uint8Array(buf)
}

export { sha256 }
