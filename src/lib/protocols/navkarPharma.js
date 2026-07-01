const { generateStableId } = require('../../utils/stableId')

function cleanNum(value) {
  return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
}

function normalizeExpiry(value) {
  const raw = String(value || '').trim()
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[2]}/${ddmmyyyy[3].slice(-2)}`
  const mmyy = raw.match(/^(\d{2})[-/](\d{2,4})$/)
  if (mmyy) return `${mmyy[1]}/${mmyy[2].slice(-2)}`
  return '00/00'
}

function parseHTRow(line) {
  return line.split(',')
}

module.exports = {
  name: 'Navkar Pharma',
  identifyPatterns: ['NAVKAR PHARMA'],

  getMetadata: (input) => {
    if (typeof input === 'string') {
      for (const line of input.split('\n')) {
        const cols = parseHTRow(line.trim())
        if (cols[0] === 'H') {
          return {
            partyCode: 'NKP',
            partyName: 'NAVKAR PHARMA',
            date: (cols[2] || '').trim(),
            invoiceNo: (cols[3] || '000000').replace(/[^0-9]/g, '') || '000000'
          }
        }
      }
      return { partyCode: 'NVP', partyName: 'NAVKAR PHARMA', invoiceNo: '000000', date: '' }
    }

    return { partyCode: 'NVP', partyName: 'NAVKAR PHARMA', invoiceNo: '000000', date: '' }
  },

  mapRawCSV: (rawText) => {
    const items = []
    for (const line of rawText.split('\n')) {
      const cols = parseHTRow(line.trim())
      if (cols[0] !== 'T') continue
      if (cols.length < 17) continue

      const prodCode = String(cols[1] || '').trim()
      const prodName = String(cols[2] || '').trim()
      const mfg      = String(cols[3] || '').trim()
      const pack     = String(cols[4] || '').trim()
      const qty      = cleanNum(cols[6])
      const freeQty  = cleanNum(cols[7])
      const mrp      = cleanNum(cols[8])
      const rate     = cleanNum(cols[9])
      const batch    = String(cols[10] || '').trim()
      const expRaw   = String(cols[11] || '').trim()
      const grossAmt = cleanNum(cols[12])
      const discAmt  = cleanNum(cols[15])
      const gstPer   = cleanNum(cols[16])

      if (!prodName || qty <= 0 || rate <= 0) continue

      const taxable = grossAmt - discAmt
      const discountPer = grossAmt > 0 && discAmt > 0
        ? +((discAmt / grossAmt) * 100).toFixed(2)
        : 0

      const finalProdCode = /^ASPL\d+$/i.test(prodCode)
        ? prodCode.padStart(10, '0')
        : generateStableId('401', prodName, prodName)

      items.push({
        productName: prodName.substring(0, 30),
        prodCode: finalProdCode,
        companyName: mfg,
        pack: pack || '1N',
        batch: (batch === '...' || batch === '**' || !batch) ? '*' : batch,
        qty,
        freeQty,
        rate,
        mrp: mrp || rate,
        hsn: '30049099',
        expiry: normalizeExpiry(expRaw),
        discountPer,
        discAmt,
        taxable: taxable > 0 ? taxable : grossAmt,
        cgstAmt: +(taxable * (gstPer / 200)).toFixed(2),
        sgstAmt: +(taxable * (gstPer / 200)).toFixed(2),
        gstPer
      })
    }
    return items
  }
}