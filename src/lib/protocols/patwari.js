const { generateStableId } = require('../../utils/stableId')

  function isPdfLines(input) {
    return Array.isArray(input) && input.length > 0 && typeof input[0] === 'string'
  }

  function cleanNum(value) {
    return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
  }

  function normalizeExpiry(value) {
    const raw = String(value || '').trim()
    const m = raw.match(/^(\d{2})[-/](\d{2,4})$/)
    if (!m) return '12/30'
    const mm = m[1]
    const yy = m[2].slice(-2)
    return `${mm}/${yy}`
  }

  function parseCsvMetadata(rows) {
    return {
      partyCode: 'PWP',
      partyName: rows[0]?.vendor || 'PATWARI PHARMA PVT LTD',
      date: rows[0]?.invdate || '',
      invoiceNo: rows[0]?.invno || '000000'
    }
  }

  function mapCsvRows(rows) {
    const items = rows.map((row) => {
      const productName = row.productdesc || row.pitemname || ''
      const hsn = row.hsncode || ''
      const grsAmt = cleanNum(row.grsamt)
      const qty = cleanNum(row.qty)
      const derivedRate = qty > 0 ? (grsAmt / qty) : cleanNum(row.rate)

      return {
        productName,
        prodCode: generateStableId('074', hsn, productName),
        pack: row.ppack || '',
        batch: row.batchno || '',
        qty,
        freeQty: cleanNum(row.free),
        rate: derivedRate,
        mrp: cleanNum(row.mrp),
        hsn,
        expiry: (() => {
          const d = row.expdate || ''
          if (d.includes('-')) {
            const parts = d.split('-')
            if (parts.length === 3) return `${parts[1]}/${parts[2].substring(2)}`
          }
          if (d.includes('/')) {
            const parts = d.split('/')
            if (parts.length === 3) return `${parts[1]}/${parts[2].substring(2)}`
          }
          return '12/30'
        })(),
        discountPer: 0,
        cgstAmt: cleanNum(row.cgstamt),
        sgstAmt: cleanNum(row.sgstamt),
        gstPer: (cleanNum(row.cgstper) + cleanNum(row.sgstper)) || 12
      }
    }).filter(item => item.productName)

    if (items.length > 0) {
      const targetTotal = cleanNum(rows[0]?.invamt)
      const currentTotal = items.reduce((sum, item) => {
        return sum + (item.qty * item.rate) + item.cgstAmt + item.sgstAmt
      }, 0)
      const diff = targetTotal - currentTotal
      if (Math.abs(diff) < 1.0 && items[0].qty > 0) {
        items[0].rate += (diff / items[0].qty)
      }
    }

    return items
  }

  function parsePdfMetadata(lines) {
    const text = Array.isArray(lines) ? lines.join('\n') : String(lines || '')

    const invoiceNo =
      (text.match(/\*(\d{8,})\*/) || [])[1] ||
      (text.match(/\b2600\d{9,}\b/) || [])[0] ||
      '000000'

    const date =
      (text.match(/\b\d{2}-\d{2}-\d{4}\b/) || [])[0] ||
      (text.match(/\b\d{2}\/\d{2}\/\d{2}\b/) || [])[0] ||
      ''

    return {
      partyCode: 'PWP',
      partyName: 'PATWARI PHARMA PVT LTD',
      date,
      invoiceNo
    }
  }

  function parseTaxHsnBatch(token) {
    const raw = String(token || '').replace(/,/g, '').trim()
    const m = raw.match(/^(\d+\.\d{2})(\d{8})([A-Z0-9]+)$/i)
    if (!m) return null
    return {
      gstAmt: cleanNum(m[1]),
      hsn: m[2],
      batch: m[3]
    }
  }

  function parseAmountQty(token) {
    const raw = String(token || '').replace(/,/g, '').trim()
    const m = raw.match(/^(\d+\.\d{2})(\d+)$/)
    if (!m) return null
    return {
      amount: cleanNum(m[1]),
      qty: cleanNum(m[2])
    }
  }

  function parsePtrMargin(token) {
    const raw = String(token || '').replace(/,/g, '').trim()
    if (raw.length < 6) return null
    const tail = raw.slice(-5)
    const head = raw.slice(0, -5)
    if (!/^\d+\.\d{2}$/.test(head) || !/^\d{2}\.\d{2}$/.test(tail)) return null
    return {
      ptr: cleanNum(head),
      margin: cleanNum(tail)
    }
  }

  function parseAmountScheme(token) {
    const raw = String(token || '').replace(/,/g, '').trim()
    const m = raw.match(/^(\d+\.\d{2})(\d+\.\d+)$/)
    if (!m) return null
    return {
      amount: cleanNum(m[1]),
      scheme: cleanNum(m[2])
    }
  }

  function isPatwariPdfItemLine(line) {
    const text = String(line || '').trim()
    return (
      !!text &&
      /\b\d{2}-\d{2}\b/.test(text) &&
      /\b2600\d{8,}\b/.test(text) &&
      /\d+\.\d{2}\d+\.\d+/.test(text)
    )
  }

  function mapPdfRows(lines) {
    const items = []

    for (const rawLine of lines) {
      const line = String(rawLine || '').trim()
      if (!isPatwariPdfItemLine(line)) continue

      const tokens = line.split(/\s+/)
      if (tokens.length < 12) continue

      let gstIdx = -1
      for (let i = 1; i < tokens.length - 2; i++) {
        if (/^\d+(?:\.\d+)?$/.test(tokens[i]) && parseTaxHsnBatch(tokens[i + 1])) {
          gstIdx = i
          break
        }
      }
      if (gstIdx === -1) continue

      const taxHsnBatch = parseTaxHsnBatch(tokens[gstIdx + 1])
      const amountQty = parseAmountQty(tokens[gstIdx + 2])
      if (!taxHsnBatch || !amountQty) continue

      const expiryIdx = tokens.findIndex((t, idx) => idx > gstIdx + 2 && /^\d{2}-\d{2}$/.test(t))
      if (expiryIdx === -1) continue

      const productName = tokens.slice(gstIdx + 3, expiryIdx).join(' ').trim()
      if (!productName) continue

      const mrp = cleanNum(tokens[expiryIdx + 1])
      const ptrMargin = parsePtrMargin(tokens[expiryIdx + 2])
      const pack = tokens[expiryIdx + 3] || ''
      const prodCodeToken = tokens[expiryIdx + 4] || ''
      const barcodeToken = tokens[expiryIdx + 5] || ''
      const rateToken = cleanNum(tokens[expiryIdx + 6])
      const amountScheme = parseAmountScheme(tokens[expiryIdx + 7])

      const qty = amountQty.qty || 1
      const rate =
        rateToken ||
        ptrMargin?.ptr ||
        (amountScheme?.amount && qty > 0 ? (amountScheme.amount / qty) : 0) ||
        (amountQty.amount && qty > 0 ? (amountQty.amount / qty) : 0)

      items.push({
        productName,
        prodCode: prodCodeToken || generateStableId('074', taxHsnBatch.hsn, productName),
        pack: pack || '',
        batch: taxHsnBatch.batch || '',
        qty,
        freeQty: 0,
        rate,
        mrp,
        hsn: taxHsnBatch.hsn || '',
        expiry: normalizeExpiry(tokens[expiryIdx]),
        discountPer: 0,
        cgstAmt: +(taxHsnBatch.gstAmt / 2).toFixed(2),
        sgstAmt: +(taxHsnBatch.gstAmt / 2).toFixed(2),
        gstPer: cleanNum(tokens[gstIdx]) || 5,
        barcode: barcodeToken
      })
    }

    return items.filter(item => item.productName && item.qty > 0 && item.rate > 0)
  }

  module.exports = {
    name: 'Patwari Pharma',
    identifyPatterns: ['PATWARI PHARMA', '306538'],

    getMetadata: (input) => {
    },

    mapRows: (input) => {
      if (isPdfLines(input)) return mapPdfRows(input)
      return mapCsvRows(input)
    }
  }