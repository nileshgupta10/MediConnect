/**
 * MANSHI AGENCIES PDF PROTOCOL (unpdf layout optimized)
 */

const { generateStableId } = require('../../utils/stableId')

function isNumStr(s) {
  const t = String(s || '').trim()
  return t !== '' && isFinite(parseFloat(t))
}

function parseRowLine(line) {
  const text = String(line || '').replace(/\s+/g, ' ').trim()
  if (!text) return null

  // Find the qty: the first bare integer token followed by a token starting with a float
  const tokens = text.split(' ')
  let q = -1
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^\d+$/.test(tokens[i]) && /^\d+\.\d{2}/.test(tokens[i + 1])) {
      q = i
      break
    }
  }
  if (q === -1) return null

  const productName = tokens.slice(0, q).join(' ').trim()
  const qty = parseInt(tokens[q])
  if (!productName || isNaN(qty) || qty <= 0) return null

  const rateMrpToken = tokens[q + 1]
  let rate = 0
  let mrp = 0
  let pack = ''

  // rateMrpToken can be like "34.6440.0050ML" or "35.7240.00"
  // Allow '=' in pack pattern (e.g. S=9, XXL=5)
  const m1 = rateMrpToken.match(/^(\d+\.\d{2})(\d+\.\d{2})([A-Z0-9+=]+)$/i)
  const m2 = rateMrpToken.match(/^(\d+\.\d{2})(\d+\.\d{2})$/)
  if (m1) {
    rate = parseFloat(m1[1])
    mrp = parseFloat(m1[2])
    pack = m1[3]
  } else if (m2) {
    rate = parseFloat(m2[1])
    mrp = parseFloat(m2[2])
  } else {
    return null
  }

  // Next tokens
  const nextTokens = tokens.slice(q + 2)
  if (nextTokens.length === 0) return null

  // Identify HSN and GST fields
  let gstPer = 0
  let cgstAmt = 0
  let sgstAmt = 0
  let hsn = ''
  let discountPer = 0
  let taxable = 0
  let netAmt = 0

  // If there's no pack in rateMrpToken, it might be in the next token
  let nextIdx = 0
  if (!pack) {
    const maybePackToken = nextTokens[0]
    const mPackHsn = maybePackToken.match(/^([A-Z0-9+=]+)(\d{8})$/i)
    if (mPackHsn) {
      pack = mPackHsn[1]
      hsn = mPackHsn[2]
      nextIdx = 1
    } else if (/[A-Z]/i.test(maybePackToken) && !isNumStr(maybePackToken)) {
      pack = maybePackToken
      nextIdx = 1
    }
  }

  // Parse remaining fields
  const remaining = nextTokens.slice(nextIdx)
  
  // Search for the HSN / GST merged token in the remaining tokens
  // E.g. "3.363.362.5033059011"
  let hsnTokenIdx = -1
  let gstMatch = null
  for (let i = 0; i < remaining.length; i++) {
    const m = remaining[i].match(/^(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})(\d{8})$/)
    if (m) {
      hsnTokenIdx = i
      gstMatch = m
      break
    }
    // Also handle case where HSN is bare 8 digits
    if (/^\d{8}$/.test(remaining[i])) {
      hsnTokenIdx = i
      hsn = remaining[i]
      break
    }
  }

  let freeQty = 0
  if (pack) {
    // If pack has free qty merged, e.g. "17PADS" (1 free, 7PADS pack) or "112+12" (1 free, 12+12 pack)
    if (pack.startsWith('1') && pack.length > 3 && (pack.includes('+') || pack.includes('PADS') || pack.includes('T') || pack.includes('='))) {
      freeQty = 1
      pack = pack.substring(1)
    }
  }

  if (gstMatch) {
    cgstAmt = parseFloat(gstMatch[1])
    sgstAmt = parseFloat(gstMatch[2])
    gstPer = parseFloat(gstMatch[3]) * 2 // half rate repeat, so double it
    hsn = gstMatch[4]

    // Tokens after the gstMatch are: [discountPer, taxable, netAmt] or [taxable, netAmt]
    const after = remaining.slice(hsnTokenIdx + 1)
    if (after.length >= 3) {
      discountPer = parseFloat(after[0]) || 0
      taxable = parseFloat(after[1]) || 0
      netAmt = parseFloat(after[2]) || 0
    } else if (after.length >= 2) {
      taxable = parseFloat(after[0]) || 0
      netAmt = parseFloat(after[1]) || 0
    }
  } else {
    // Zero GST item
    if (hsnTokenIdx !== -1) {
      if (remaining.length > hsnTokenIdx + 1) {
        taxable = parseFloat(remaining[hsnTokenIdx + 1]) || 0
      } else {
        taxable = parseFloat(remaining[remaining.length - 1]) || 0
      }
    } else {
      taxable = parseFloat(remaining[remaining.length - 1]) || 0
    }
    netAmt = taxable
  }

  return {
    productName: productName.substring(0, 30),
    prodCode: generateStableId('747', hsn || productName, productName),
    pack: pack || '1N',
    qty,
    freeQty,
    rate,
    rawRate: rate,
    mrp: mrp || rate,
    hsn,
    discountPer,
    cgstAmt,
    sgstAmt,
    gstPer,
    taxable,
    netAmt
  }
}

module.exports = {
  name: 'Manshi Agencies PDF',
  identifyPatterns: ['MANSHI AGENCIES'],

  getMetadata: (lines) => {
    const arr = Array.isArray(lines) ? lines : String(lines || '').split('\n')
    const text = arr.map(l => String(l || '').trim()).filter(Boolean).join(' ')
    const invMatch = text.match(/CC-(\d+)/i) || text.match(/Invoice\s*No\.?\s*:\s*([A-Z0-9/-]+)/i)
    const dateMatch =
      text.match(/(\d{2}\/\d{2}\/\d{2,4})/) ||
      text.match(/(\d{2}-[A-Za-z]{3}-\d{4})/i) ||
      text.match(/(\d{2}-\d{2}-\d{4})/)
    return {
      partyCode: 'MNS',
      partyName: 'MANSHI AGENCIES',
      invoiceNo: invMatch ? String(invMatch[1]).replace(/\D/g, '') : '000000',
      date: dateMatch ? dateMatch[1] : ''
    }
  },

  mapRows: (lines) => {
    const arr = Array.isArray(lines) ? lines : String(lines || '').split('\n')
    const cleaned = arr.map(l => String(l || '').trim()).filter(Boolean)

    let capture = false
    const items = []

    for (const line of cleaned) {
      if (line.includes('RAJESHWAR NAMAH')) {
        capture = true
        continue
      }
      if (!capture) continue
      if (line.includes('Auth.Signatory') || line.startsWith('NET AMT.')) {
        capture = false
        continue
      }

      // Check if this looks like a product row (starts with letters, has numbers)
      if (/[A-Z]/i.test(line) && /\d+/.test(line)) {
        const parsed = parseRowLine(line)
        if (parsed) {
          items.push(parsed)
        }
      }
    }

    return items
  }
}
