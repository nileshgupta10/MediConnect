const { generateStableId } = require('../../utils/stableId')

function cleanLines(input) {
  const lines = Array.isArray(input) ? input : String(input || '').split('\n')
  return lines.map(line => String(line || '').trim()).filter(Boolean)
}

function cleanNum(value) {
  return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
}

function isStopLine(line) {
  return /^(Rs\.\s+Five\b|CLASS\b|TOTAL\b|GRAND TOTAL\b|BANK DETAILS\b|A\/C NO\b|CHECK RETURNED\b)/i.test(String(line || '').trim())
}

function parseMetadata(lines) {
  const text = cleanLines(lines).join('\n')
  const invoiceMatch = text.match(/Invoice No\s*:\s*([A-Z0-9/-]+)/i)
  const dateMatch = text.match(/Bill Date\s*:\s*(\d{2}[/-]\d{2}[/-]\d{4})/i)

  return {
    partyCode: 'MED',
    partyName: 'MEDICINE HOUSE',
    invoiceNo: invoiceMatch ? invoiceMatch[1].trim() : '000000',
    date: dateMatch ? dateMatch[1].trim() : ''
  }
}

function parseRows(lines) {
  const cleaned = cleanLines(lines)
  const items = []

  for (const line of cleaned) {
    if (isStopLine(line)) break
    if (!/^\d+\s+\d{8}\s+/.test(line)) continue

    const tokens = line.split(/\s+/)
    if (tokens.length < 11) continue

    const seq = tokens[0]
    const hsn = tokens[1]
    if (!/^\d+$/.test(seq) || !/^\d{8}$/.test(hsn)) continue

    const tail = tokens.slice(-10)
    if (tail.length < 10 || tail.some(token => !/^[\d.]+$/.test(token))) continue

    const [
      qtyToken,
      schToken,
      mrpToken,
      rateToken,
      cdaToken,
      cdPerToken,
      taxableToken,
      gstPerToken,
      gstAmtToken,
      netToken
    ] = tail

    const productName = tokens.slice(2, -10).join(' ').trim()
    if (!productName) continue

    const qty = cleanNum(qtyToken)
    const rate = cleanNum(rateToken)
    const mrp = cleanNum(mrpToken)
    const gstPer = cleanNum(gstPerToken) || 0
    const gstAmt = cleanNum(gstAmtToken)

    const taxable = cleanNum(taxableToken)
    const gross = qty * rate
    const totalDiscAmt = gross > taxable ? gross - taxable : 0
    const discountPer = gross > 0 ? +((totalDiscAmt / gross) * 100).toFixed(4) : 0

    items.push({
      productName: productName.substring(0, 30),
      prodCode: generateStableId('2276', hsn, productName),
      companyName: 'MEDICINE HOUSE',
      pack: 'PCS',
      batch: '*',
      qty,
      freeQty: 0,
      rate,
      mrp: mrp || rate,
      hsn,
      expiry: '00/00',
      discountPer: discountPer,
      discAmt: totalDiscAmt,
      taxable: taxable,
      cgstAmt: +(gstAmt / 2).toFixed(3),
      sgstAmt: +(gstAmt / 2).toFixed(3),
      gstPer
    })
  }

  return items.filter(item => item.productName && item.qty > 0 && item.rate > 0)
}

module.exports = {
  name: 'Medicine House',
  identifyPatterns: ['MEDICINE HOUSE', 'GST INVOICE', '27BIGPS8329M2ZF'],
  getMetadata: (input) => parseMetadata(input),
  mapRows: (input) => parseRows(input)
}
