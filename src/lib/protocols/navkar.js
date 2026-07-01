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

  // DD/MM/YYYY → MM/YY
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[2]}/${ddmmyyyy[3].slice(-2)}`

  // MM/YY or MM-YY already in correct format
  const mmyy = raw.match(/^(\d{2})[-/](\d{2,4})$/)
  if (mmyy) return `${mmyy[1]}/${mmyy[2].slice(-2)}`

  return '00/00'
}

function isItemLine(line) {
  const text = String(line || '').trim()
  return (
    /^\d{3}\s+/.test(text) &&
    /\b\d{2}-\d{2}\b/.test(text) &&
    /\b\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}$/.test(text)
  )
}

// H/T row format column indices (split by comma):
// H row: [0]=H  [2]=date  [3]=invoiceNo  [5]=partyName
// T row: [0]=T  [1]=prodCode  [2]=prodName  [3]=mfg  [4]=pack
//        [5]=schemePack  [6]=qty  [7]=freeQty  [8]=mrp  [9]=rate
//        [10]=batch  [11]=expDate(DD/MM/YYYY)  [12]=grossAmt
//        [13]=tdPer  [14]=cdPer  [15]=discAmt  [16]=gstPer
function parseHTRow(line) {
  return line.split(',')
}

module.exports = {
  name: 'Navkar PDF/CSV',
  // 'NAVKAR' catches both NAVKAR COSMETICS and NAVKAR PHARMA
  identifyPatterns: ['NAVKAR'],

  // ── Metadata ──────────────────────────────────────────────────────────
  // Handles three input shapes:
  //  1. Raw H/T CSV text (string) — from mapRawCSV path
  //  2. Parsed CSV objects (array of objects) — legacy fallback
  //  3. PDF text lines (array of strings) — existing PDF path
  getMetadata: (input) => {
    // Shape 1: raw CSV text string
    if (typeof input === 'string') {
      for (const line of input.split('\n')) {
        const cols = parseHTRow(line.trim())
        if (cols[0] === 'H') {
          const partyName = (cols[5] || '').trim()
          const isCosmetics = partyName.toUpperCase().includes('COSMETICS')
          return {
            partyCode: isCosmetics ? 'NAV' : 'NVP',
            partyName: partyName || 'NAVKAR',
            date: (cols[2] || '').trim(),
            invoiceNo: (cols[3] || '000000').replace(/[^0-9]/g, '') || '000000'
          }
        }
      }
      return { partyCode: 'NAV', partyName: 'NAVKAR', invoiceNo: '000000', date: '' }
    }

    // Shape 2/3: array — detect by whether first element is a string or object
    if (!Array.isArray(input)) {
      return { partyCode: 'NAV', partyName: 'NAVKAR COSMETICS', invoiceNo: '000000', date: '' }
    }

    // PDF text lines (strings)
    if (typeof input[0] === 'string') {
      const cleaned = dedupeAdjacent(input)
      const text = cleaned.join('\n')
      const invMatch = text.match(/Inv\.\s*No\s*:\s*([A-Z0-9/-]+)/i)
      const dateMatch = text.match(/Date\s*:\s*(\d{2}-\d{2}-\d{4})/i)
      const isCosmetics = text.toUpperCase().includes('NAVKAR COSMETICS')
      return {
        partyCode: isCosmetics ? 'NAV' : 'NVP',
        partyName: isCosmetics ? 'NAVKAR COSMETICS' : 'NAVKAR PHARMA',
        invoiceNo: invMatch ? invMatch[1].replace(/\D/g, '') || '000000' : '000000',
        date: dateMatch ? dateMatch[1] : ''
      }
    }

    // Legacy parsed CSV objects (should not happen for H/T format, but safe fallback)
    return { partyCode: 'NAV', partyName: 'NAVKAR COSMETICS', invoiceNo: '000000', date: '' }
  },

  // ── H/T raw CSV parsing (NEW) ─────────────────────────────────────────
  // Called by convert-bill.js when protocol.mapRawCSV exists and file is not a PDF.
  // Receives the raw CSV text string and returns an array of normalised item objects.
  mapRawCSV: (rawText) => {
    const items = []

    for (const line of rawText.split('\n')) {
      const cols = parseHTRow(line.trim())
      if (cols[0] !== 'T') continue              // only process item rows
      if (cols.length < 17) continue             // must have enough columns

      const prodCode  = String(cols[1] || '').trim()
      const prodName  = String(cols[2] || '').trim()
      const mfg       = String(cols[3] || '').trim()
      const pack      = String(cols[4] || '').trim()
      const qty       = cleanNum(cols[6])
      const freeQty   = cleanNum(cols[7])
      const mrp       = cleanNum(cols[8])
      const rate      = cleanNum(cols[9])
      const batch     = String(cols[10] || '').trim()
      const expRaw    = String(cols[11] || '').trim()
      const grossAmt  = cleanNum(cols[12])
      // cols[13] = td%, cols[14] = cd%, cols[15] = disc amount, cols[16] = gst%
      const discAmt   = cleanNum(cols[15])
      const gstPer    = cleanNum(cols[16])

      if (!prodName || qty <= 0 || rate <= 0) continue

      const taxable = grossAmt - discAmt
      const discountPer = grossAmt > 0 && discAmt > 0
        ? +((discAmt / grossAmt) * 100).toFixed(2)
        : 0

      // Use ASPL product code if it looks like a real code, else generate stable ID
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
        hsn: '30049099',           // Navkar doesn't print HSN on CSV; use pharma default
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
  },

  // ── PDF text line mapping (EXISTING — unchanged) ─────────────────────
  mapRows: (lines) => {
    if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
    const cleaned = dedupeAdjacent(lines)
    const items = []

    for (const raw of cleaned) {
      const line = String(raw || '').trim()
      if (!isItemLine(line)) continue

      const tokens = line.split(/\s+/)
      if (tokens.length < 12) continue

      const amount  = cleanNum(tokens[tokens.length - 1])
      const gstPer  = cleanNum(tokens[tokens.length - 2])
      const discPer = cleanNum(tokens[tokens.length - 3])
      const rate    = cleanNum(tokens[tokens.length - 4])
      const mrp     = cleanNum(tokens[tokens.length - 5])
      const exp     = tokens[tokens.length - 6]
      const batch   = tokens[tokens.length - 7]

      const defaultPackIdx = tokens.length - 10
      const shiftedPackIdx = tokens.length - 9

      const looksLikeManufacturer = /^[A-Z]{2,}$/i.test(tokens[defaultPackIdx] || '')
      const looksLikeShiftedUnit  = /^\d+[A-Z']*$/i.test(tokens[shiftedPackIdx] || '')
      const looksLikeShiftedQty   = /^\d+(\.\d+)?$/.test(tokens[tokens.length - 8] || '')
      const looksLikeBatch        = /^[A-Z0-9]+$/i.test(tokens[tokens.length - 7] || '')

      const hasNoSchemeAndShiftedUnit =
        looksLikeManufacturer && looksLikeShiftedUnit &&
        looksLikeShiftedQty   && looksLikeBatch

      const packIdx    = hasNoSchemeAndShiftedUnit ? shiftedPackIdx : defaultPackIdx
      const qtyIdx     = hasNoSchemeAndShiftedUnit ? tokens.length - 8 : tokens.length - 9
      const schIdx     = hasNoSchemeAndShiftedUnit ? -1 : tokens.length - 8
      const mfgIdx     = packIdx - 1

      const pack    = tokens[packIdx] || '1'
      const qty     = cleanNum(tokens[qtyIdx])
      const schQty  = schIdx === -1 ? 0 : cleanNum(tokens[schIdx])
      const productTokens = tokens.slice(1, mfgIdx)
      if (!productTokens.length) continue

      const productName = productTokens.join(' ').trim()
      const hsn = tokens[0]

      const gross   = qty * rate
      const discAmt = gross > amount ? gross - amount : 0

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
        discAmt,
        taxable: amount,
        cgstAmt: +(amount * (gstPer / 200)).toFixed(2),
        sgstAmt: +(amount * (gstPer / 200)).toFixed(2),
        gstPer: gstPer || 0
      })
    }

    return items.filter(item => item.productName && item.qty > 0 && item.rate > 0)
  }
}