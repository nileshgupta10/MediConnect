const { generateStableId } = require('../../utils/stableId')

  function dedupeAdjacent(lines) {
    const out = []
    for (const raw of lines) {
      const line = String(raw || '').trim()
      if (!line) continue
      if (out.length > 0 && out[out.length - 1] === line) continue
      out.push(line)
    }
    return out
  }

  function cleanNum(value) {
    return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
  }

  function normalizeExpiry(value) {
    const raw = String(value || '').trim()
    const m = raw.match(/^(\d{2})[-/](\d{2,4})$/)
    if (!m) return '00/00'
    return `${m[1]}/${m[2].slice(-2)}`
  }

  function isItemLine(line) {
    const text = String(line || '').trim()
    return (
      /^\d{3}\s+/.test(text) &&
      /\b\d{2}-\d{2}\b/.test(text) &&
      /\b\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}$/.test(text)
    )
  }

  module.exports = {
    name: 'Navkar Cosmetics PDF',
    identifyPatterns: ['NAVKAR COSMETICS', 'GST TAX INVOICE', 'Inv. No : CR/'],

    getMetadata: (lines) => {
      if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
      const cleaned = dedupeAdjacent(lines)
      const text = cleaned.join('\n')

      const invMatch = text.match(/Inv\.\s*No\s*:\s*([A-Z0-9/-]+)/i)
      const dateMatch = text.match(/Date\s*:\s*(\d{2}-\d{2}-\d{4})/i)

      return {
        partyCode: 'NAV',
        partyName: 'NAVKAR COSMETICS',
        invoiceNo: invMatch ? invMatch[1].replace(/\D/g, '') || '000000' : '000000',
        date: dateMatch ? dateMatch[1] : ''
      }
    },

    mapRows: (lines) => {
      if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
      const cleaned = dedupeAdjacent(lines)
      const items = []

      for (const raw of cleaned) {
        const line = String(raw || '').trim()
        if (!isItemLine(line)) continue

        const tokens = line.split(/\s+/)
        if (tokens.length < 12) continue

        const amount = cleanNum(tokens[tokens.length - 1])
        const gstPer = cleanNum(tokens[tokens.length - 2])
        const discPer = cleanNum(tokens[tokens.length - 3])
        const rate = cleanNum(tokens[tokens.length - 4])
        const mrp = cleanNum(tokens[tokens.length - 5])
        const exp = tokens[tokens.length - 6]
        const batch = tokens[tokens.length - 7]
       const packToken = tokens[tokens.length - 10]
const isValidPack = /[A-Z']/i.test(packToken)

const qty = isValidPack
  ? cleanNum(tokens[tokens.length - 9])
  : cleanNum(tokens[tokens.length - 8])

const schQty = isValidPack
  ? cleanNum(tokens[tokens.length - 8])
  : 0

const pack = isValidPack ? packToken : '1'
        const productTokens = tokens.slice(1, tokens.length - 10)
        if (!productTokens.length) continue

        const productName = productTokens.join(' ').trim()
        const hsn = tokens[0]

        items.push({
          productName: productName.substring(0, 30),
          prodCode: generateStableId('401', hsn, productName),
          companyName: 'NAVKAR COSMETICS',
          pack: pack || '1N',
          batch: batch || '',
          qty,
          freeQty: schQty || 0,
          rate,
          mrp: mrp || rate,
          hsn,
          expiry: normalizeExpiry(exp),
          discountPer: discPer || 0,
          cgstAmt: +(amount * (gstPer / 200)).toFixed(2),
          sgstAmt: +(amount * (gstPer / 200)).toFixed(2),
          gstPer: gstPer || 0
        })
      }

      return items.filter(item => item.productName && item.qty > 0 && item.rate > 0)
    }
  }