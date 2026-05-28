const { generateStableId } = require('../../utils/stableId')

function cleanLines(input) {
  const lines = Array.isArray(input) ? input : String(input || '').split('\n')
  return lines.map(line => String(line || '').trim()).filter(Boolean)
}

function cleanNum(value) {
  return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
}

function isRowStart(line) {
  return /^\d+\s+\d+\s+\d{9}\s+/.test(String(line || '').trim())
}

function isStopLine(line) {
  return /^(TOTAL\b|CLASS\b|SUB TOTAL\b|GST\b|GRAND TOTAL\b|Rs\. Five\b|Reciver\b|For A B MARKETING\b|BANK\b)/i.test(String(line || '').trim())
}

function mergeRows(lines) {
  const rows = []
  let current = ''

  for (const line of lines) {
    if (isStopLine(line)) break

    if (isRowStart(line)) {
      if (current) rows.push(current)
      current = line
      continue
    }

    if (current) current += ` ${line}`
  }

  if (current) rows.push(current)
  return rows
}

function parseMetadata(lines) {
  const text = cleanLines(lines).join('\n')

  const invoiceMatch = text.match(/Invoice No\.\s*:\s*([A-Z0-9/-]+)/i)
  const dateMatch = text.match(/Date\s*:\s*(\d{2}[/-]\d{2}[/-]\d{4})/i)

  return {
    partyCode: 'ABM',
    partyName: 'A B MARKETING',
    invoiceNo: invoiceMatch ? invoiceMatch[1].trim() : '000000',
    date: dateMatch ? dateMatch[1].trim() : ''
  }
}

function parseGrandTotal(lines) {
  const text = cleanLines(lines).join('\n')
  const match = text.match(/GRAND TOTAL\s+(\d+\.\d{2})/i)
  return match ? cleanNum(match[1]) : 0
}

function normalizeProductName(name) {
  return String(name || '')
    .replace(/\bWA SH(\d+)\b/g, 'WASH$1')
    .replace(/\b(\d+)\s+(ML|GM|G|KG|MG|L|N)\b/gi, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRows(lines) {
  const cleaned = cleanLines(lines)
  const rows = mergeRows(cleaned)
  const items = []
  const targetTotal = parseGrandTotal(cleaned)

  for (const row of rows) {
    const tokens = row.split(/\s+/)
    if (tokens.length < 12) continue

    const seq = tokens[0]
    const qty = cleanNum(tokens[1])
    const hsn = tokens[2]
    if (!/^\d+$/.test(seq) || !/^\d{9}$/.test(hsn) || qty <= 0) continue

    const tail = tokens.slice(-8)
    if (tail.length < 8 || tail.some(token => !/^[\d.]+$/.test(token))) continue

    const [
      mrpToken,
      unitRateToken,
      grossToken,
      schToken,
      rsDiscToken,
      cDiscToken,
      gstToken,
      netToken
    ] = tail

    let productStart = 3
    let freeQty = 0
    if (/^\d+$/.test(tokens[3] || '') && tokens.length > 12) {
      freeQty = cleanNum(tokens[3])
      productStart = 4
    }

    const productName = normalizeProductName(tokens.slice(productStart, -8).join(' '))
    if (!productName) continue

    const mrp = cleanNum(mrpToken)
    const unitRate = cleanNum(unitRateToken)
    const gross = cleanNum(grossToken)
    const schPer = cleanNum(schToken)
    const rsDisc = cleanNum(rsDiscToken)
    const cDiscPer = cleanNum(cDiscToken)
    const gstPer = cleanNum(gstToken) || 18
    const net = cleanNum(netToken)
    const schAmt = gross * (schPer / 100)
    const taxableBeforeCDisc = gross - schAmt - rsDisc
    const cDiscAmt = taxableBeforeCDisc * (cDiscPer / 100)
    const totalDiscAmt = schAmt + rsDisc + cDiscAmt
    const taxTotal = Math.max(net - gross + totalDiscAmt, 0)

    items.push({
      productName: productName.substring(0, 30),
      prodCode: generateStableId('2275', hsn, productName),
      companyName: 'A B MARKETING',
      pack: 'PCS',
      batch: '*',
      qty,
      freeQty,
      rate: unitRate || (qty > 0 ? gross / qty : 0),
      mrp: mrp || unitRate,
      hsn,
      expiry: '00/00',
      discountPer: gross > 0 ? +((totalDiscAmt / gross) * 100).toFixed(4) : 0,
      discAmt: totalDiscAmt,
      taxable: gross - totalDiscAmt,
      cgstAmt: +(taxTotal / 2).toFixed(3),
      sgstAmt: +(taxTotal / 2).toFixed(3),
      gstPer
    })
  }

  if (items.length > 0 && targetTotal > 0) {
    const currentTotal = items.reduce((sum, item) => {
      const gross = (cleanNum(item.qty) || 0) * (cleanNum(item.rate) || 0)
      const disc = gross * ((cleanNum(item.discountPer) || 0) / 100)
      return sum + gross - disc + (cleanNum(item.cgstAmt) || 0) + (cleanNum(item.sgstAmt) || 0)
    }, 0)

    const diff = +(targetTotal - currentTotal).toFixed(3)
    if (Math.abs(diff) >= 0.01 && Math.abs(diff) < 1) {
      items[0].cgstAmt = +(cleanNum(items[0].cgstAmt) + (diff / 2)).toFixed(3)
      items[0].sgstAmt = +(cleanNum(items[0].sgstAmt) + (diff / 2)).toFixed(3)
    }
  }

  return items.filter(item => item.productName && item.qty > 0 && item.rate > 0)
}

module.exports = {
  name: 'AB Marketing',
  identifyPatterns: ['RATAN STORES', 'A B MARKETING', 'ABFFA9104P1Z3'],
  getMetadata: (input) => parseMetadata(input),
  mapRows: (input) => parseRows(input)
}
