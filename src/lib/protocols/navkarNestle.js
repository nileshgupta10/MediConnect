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

// This template's PDF text extraction glues several adjacent numeric/alphanumeric
// columns together with no separating space (their cell positions abut in the
// source PDF). Each of these helpers splits one glued token back into its
// component fields using the fact that money amounts are always exactly
// "digits.XX" (two decimal places), which makes the boundary unambiguous.

// "266.06290" -> NetAmt "266.06" + MRP "290"
function splitNetAmtMrp(token) {
  const m = String(token || '').match(/^(\d+\.\d{2})(\d+)$/)
  if (!m) return { netAmt: cleanNum(token), mrp: 0 }
  return { netAmt: cleanNum(m[1]), mrp: cleanNum(m[2]) }
}

// "6.336.33253.39" -> SGSTAmt "6.33" + CGSTAmt "6.33" + GrossAmt "253.39"
function splitGstGross(token) {
  const m = String(token || '').match(/^(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})$/)
  if (!m) return { sgstAmt: 0, cgstAmt: 0, grossAmt: cleanNum(token) }
  return { sgstAmt: cleanNum(m[1]), cgstAmt: cleanNum(m[2]), grossAmt: cleanNum(m[3]) }
}

// "2.5000" -> SGST% "2.50" + Free/CS digits (always 0 in observed bills, kept for completeness)
function splitGstPerFreeCs(token) {
  const m = String(token || '').match(/^(\d+\.\d{2})(\d*)$/)
  if (!m) return { gstPer: cleanNum(token), free: 0, cs: 0 }
  const rest = m[2] || ''
  const half = Math.floor(rest.length / 2)
  return {
    gstPer: cleanNum(m[1]),
    free: cleanNum(rest.slice(0, half) || '0'),
    cs: cleanNum(rest.slice(half) || '0')
  }
}

// "0.0061750454A11905" -> CD/RDWSH "0.00" + BCode "61750454A1" + HSN1 "1905"
// B.Code is always exactly 10 characters in this template (can end in a
// letter or a digit), so anchoring on that fixed width — not character
// class — is what makes the boundary with the trailing 4-digit HSN
// chapter code unambiguous.
function splitCdBcodeHsn(token) {
  const m = String(token || '').match(/^(\d+\.\d{2})(.{10})(\d{4})$/)
  if (!m) return { cd: 0, bcode: '', hsn1: '' }
  return { cd: cleanNum(m[1]), bcode: m[2], hsn1: m[3] }
}

function isRowStart(line) {
  const text = String(line || '').trim()
  if (!/^\d+\s+\S/.test(text)) return false
  const tokens = text.split(/\s+/)
  if (tokens.length < 11) return false
  const n = tokens.length
  const hsn2 = tokens[n - 2]
  const hsn3 = tokens[n - 1]
  const cdBlob = tokens[n - 3]
  const gstGrossBlob = tokens[n - 8]
  const netMrpBlob = tokens[n - 10]
  return (
    /^\d{2}$/.test(hsn2) &&
    /^\d{2}$/.test(hsn3) &&
    /^\d+\.\d{2}.{10}\d{4}$/.test(cdBlob) &&
    /^\d+\.\d{2}\d+\.\d{2}\d+\.\d{2}$/.test(gstGrossBlob) &&
    /^\d+\.\d{2}\d+$/.test(netMrpBlob)
  )
}

function parseRow(line) {
  const tokens = String(line || '').trim().split(/\s+/)
  const n = tokens.length

  const srNo = tokens[0]
  const description = tokens.slice(1, n - 10).join(' ').trim()

  const { netAmt, mrp } = splitNetAmtMrp(tokens[n - 10])
  const cd = cleanNum(tokens[n - 9])
  const { sgstAmt, cgstAmt, grossAmt } = splitGstGross(tokens[n - 8])
  const cgstPer = cleanNum(tokens[n - 7])
  const { gstPer: sgstPer, free, cs } = splitGstPerFreeCs(tokens[n - 6])
  const ea = cleanNum(tokens[n - 5])
  const sRate = cleanNum(tokens[n - 4])
  const { cd: rdWsh, bcode, hsn1 } = splitCdBcodeHsn(tokens[n - 3])
  const hsn2 = tokens[n - 2]
  const hsn3 = tokens[n - 1]

  return {
    srNo,
    description,
    netAmt,
    mrp,
    cd,
    rdWsh,
    sgstAmt,
    cgstAmt,
    grossAmt,
    cgstPer,
    sgstPer,
    free,
    cs,
    ea,
    sRate,
    bcode,
    hsn: `${hsn1}${hsn2}${hsn3}`
  }
}

module.exports = {
  name: 'Navkar Cosmetics (Nestle)',
  // More specific than navkar.js's ['NAVKAR COSMETICS'] alone, since both
  // templates share the same company header text. This must be checked
  // BEFORE navkar.js in the PROTOCOLS list so it wins the match.
  // Note: '*Disc+Gst' and 'Benefit' land on separate lines after PDF
  // extraction (newline-joined), so the pattern only uses the fragment
  // that's guaranteed to stay on one line.
  identifyPatterns: ['NAVKAR COSMETICS', '*DISC+GST'],

  getMetadata: (input) => {
    const lines = Array.isArray(input) ? input : String(input || '').split('\n')
    const cleaned = dedupeAdjacent(lines)
    const text = cleaned.join('\n')

    const invMatch = text.match(/\bND\d{4,6}\b/)
    const dateMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/)

    return {
      partyCode: 'NAV',
      partyName: 'NAVKAR COSMETICS',
      invoiceNo: invMatch ? invMatch[0].replace(/\D/g, '') || '000000' : '000000',
      date: dateMatch ? dateMatch[1] : ''
    }
  },

  mapRows: (lines) => {
    if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
    const cleaned = dedupeAdjacent(lines)
    const items = []

    for (const raw of cleaned) {
      const line = String(raw || '').trim()
      if (!isRowStart(line)) continue

      const row = parseRow(line)
      if (!row.description || row.ea <= 0 || row.sRate <= 0) continue

      const gstPer = row.cgstPer + row.sgstPer
      const taxableAmt = row.grossAmt - (row.cd || 0)

      items.push({
        productName: row.description.substring(0, 30),
        prodCode: generateStableId('401', row.hsn, row.description),
        companyName: 'NAVKAR COSMETICS',
        pack: '1N',
        batch: '*',
        qty: row.ea,
        freeQty: row.free || 0,
        rate: row.sRate,
        mrp: row.mrp || row.sRate,
        hsn: row.hsn,
        expiry: '00/00',
        discountPer: 0,
        discAmt: row.cd || 0,
        taxable: taxableAmt,
        cgstAmt: row.cgstAmt,
        sgstAmt: row.sgstAmt,
        gstPer
      })
    }

    return items.filter(item => item.productName && item.qty > 0 && item.rate > 0)
  }
}
