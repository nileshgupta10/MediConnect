// stableId.js
// Generates a deterministic, repeatable product code for a given party prefix + HSN + product name.
// Same inputs ALWAYS produce the same code, so CARE recognizes the same product across multiple
// invoice conversions instead of creating duplicate product entries.
//
// Output is built to fit CARE's PROD_CODE field (10 characters, see smsWriter.js FIELDS list).

function hashString(str) {
  // Simple deterministic hash (djb2 variant) — same string always produces same number.
  let hash = 5381
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i)
    hash = hash & 0xFFFFFFFF // keep it within 32-bit range
  }
  return Math.abs(hash)
}

function generateStableId(partyPrefix, hsn, productName) {
  const prefix = String(partyPrefix || '').trim()
  const combined = `${hsn || ''}|${productName || ''}`.toUpperCase().trim()

  const hashNum = hashString(combined)
  // Convert hash to a fixed-length numeric string, then take enough digits to
  // fill out the remaining space in the 10-character PROD_CODE field.
  const remainingLength = Math.max(10 - prefix.length, 4)
  const hashDigits = String(hashNum).padStart(remainingLength, '0').slice(-remainingLength)

  const code = (prefix + hashDigits).substring(0, 10)
  return code.padStart(10, '0')
}

module.exports = { generateStableId }