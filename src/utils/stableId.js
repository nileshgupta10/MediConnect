function generateStableId(prefix, hsn, name) {
  const str = String(name || '').toUpperCase().trim()
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  const suffix = (Math.abs(hash) % 1000000).toString().padStart(6, '0')
  return `${prefix.padStart(4, '0')}${suffix}`.substring(0, 10)
}

module.exports = { generateStableId }