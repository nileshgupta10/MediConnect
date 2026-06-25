/**
 * MANSHI LEAP PDF PROTOCOL (unpdf layout optimized)
 *
 * REWRITE — previous version used a "find tailLine with +" approach
 * which was completely wrong for this PDF's actual text layout.
 *
 * ACTUAL PDF LAYOUT (from pdfplumber):
 *   line[i-1]: "0.00+6+0+0+0"          ← SCH disc string on its OWN line BEFORE item
 *   line[i]:   "1 34011190 ALMOND... 60.00 3 51.95 155.85 9.35 143.57 5 7.18 150.75"
 *   line[i+1]: ".00"                    ← orphan, ignored
 *
 * For item 17 (large discAmt split across lines):
 *   line[i-1]: "0.00+0+0+0+2 115.4"   ← disc amt overflows here, ignored
 *   line[i]:   "17 33049990 PURIFYING... 189.00 6 145.62 873.72 743.11 18 133.76 876.88"
 *   line[i+1]: ".00 4"                 ← orphan, ignored
 *   Note: discAmt (115.44) is MISSING from line[i], computed as gross-taxable fallback.
 *         taxable (743.11) IS present and correct so CARE import is accurate.
 *
 * FIX: Read ALL numeric fields directly from the startMatch line, right to left.
 *      No tailLine scanning needed at all.
 */

const { generateStableId } = require('../../utils/stableId')

function parseLeapItems(lines) {
  const items = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Item lines start with: serial_number  8-digit-HSN  [rest...]
    const startMatch = line.match(/^(\d+)\s+(\d{8})\s*(.*)/)
    if (!startMatch) continue

    const seq  = parseInt(startMatch[1])
    const hsn  = startMatch[2]
    const rest = (startMatch[3] || '').trim()

    const tokens = rest.split(/\s+/).filter(Boolean)

    // Need at least 8 tokens: mrp qty rate gross discAmt taxable gst% gstAmt net
    // (item 17 has 8 because discAmt is missing; all others have 9+)
    if (tokens.length < 8) continue

    // --- Read fixed fields from the RIGHT (always reliable) ---
    const net     = parseFloat(tokens[tokens.length - 1]) || 0
    const gstAmt  = parseFloat(tokens[tokens.length - 2]) || 0
    const gstPer  = parseFloat(tokens[tokens.length - 3]) || 0
    const taxable = parseFloat(tokens[tokens.length - 4]) || 0

    // --- Read numeric fields from the LEFT (after skipping desc words) ---
    const numericPattern = /^\d+(\.\d+)?$/
    const leftTokens = tokens.slice(0, tokens.length - 4)

    const descWords = []
    const leftNumerics = []
    let foundFirstNumeric = false

    for (const tok of leftTokens) {
      if (numericPattern.test(tok)) {
        leftNumerics.push(parseFloat(tok))
        foundFirstNumeric = true
      } else if (!foundFirstNumeric) {
        descWords.push(tok)
      }
      // non-numeric tokens after first numeric are embedded desc fragments — skip
    }

    // leftNumerics order: mrp, qty, rate, gross, [discAmt]
    if (leftNumerics.length < 4) continue

    const mrp   = leftNumerics[0]
    const qty   = leftNumerics[1]
    const rate  = leftNumerics[2]
    const gross = leftNumerics[3]
    // discAmt: use parsed value if present; else compute from gross-taxable
    const discAmt = leftNumerics.length >= 5
      ? leftNumerics[4]
      : parseFloat((gross - taxable).toFixed(2))

    // --- Build description ---
    // desc words found on this line
    let description = descWords.join(' ').trim()

    // Check line ABOVE for a continuation description fragment
    // (e.g. "ANTI-HAIR FALL BHRINGARAJA SHAMPOO 0.00+6+0+0+0" appears on line i-1)
    if (i > 0) {
      const prevLine = lines[i - 1].trim()
      // If prev line has no 8-digit HSN and no serial pattern, it may contain desc words
      if (prevLine && !/^\d+\s+\d{8}/.test(prevLine) && !/^[\d.]+$/.test(prevLine)) {
        // Strip any trailing SCH disc string (the +0+0 part)
        const prevDesc = prevLine.replace(/\s*0\.00\+[\d+.]+$/, '').trim()
        if (prevDesc && !/^(TOTAL|SALE|DISC|TAXABLE|SGST|CGST|PAYMENT|STOCKIST|BEAT|SUBJECT)/i.test(prevDesc)) {
          description = (prevDesc + ' ' + description).trim()
        }
      }
    }

    // Check line BELOW for pack size continuation (e.g. "180ML .00" or "50ML 2.00")
    let pack = '1N'
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      // Pack lines look like "180ML .00" or "50ML 2.00" or "WINDOW) WITH RIBBON .00"
      if (nextLine && !/^\d+\s+\d{8}/.test(nextLine)) {
        const packMatch = nextLine.match(/^(\S+)\s+[\d.]+$/)
        if (packMatch && !/^\.00$/.test(packMatch[1])) {
          const packCandidate = packMatch[1].replace(/[^A-Za-z0-9']/g, '')
          if (packCandidate.length >= 2) {
            description = (description + ' ' + packMatch[1]).trim()
            pack = packCandidate.substring(0, 6)
          }
        }
        // Also check for pack patterns in description
        const packPatterns = [
          /\b\d+\s?(?:ML|GM|G|KG|TABS?|S|'S)\b/i,
          /\b\d+s\b/i,
          /\b(?:XXXL|XXL|XL|LG|MD|SM|NB)\b/i,
        ]
        for (const pat of packPatterns) {
          const m = description.match(pat)
          if (m) {
            pack = m[0].replace(/\s+/g, '').substring(0, 6)
            break
          }
        }
      }
    }

    // Fallback pack from description
    if (pack === '1N') {
      const packPatterns = [
        /\b\d+\s?(?:ML|GM|G|KG|TABS?|S|'S)\b/i,
        /\b\d+s\b/i,
      ]
      for (const pat of packPatterns) {
        const m = description.match(pat)
        if (m) {
          pack = m[0].replace(/\s+/g, '').substring(0, 6)
          break
        }
      }
    }

    const discountPer = gross > 0
      ? parseFloat(((gross - taxable) / gross * 100).toFixed(2))
      : 0

    items.push({
      productName:  description.substring(0, 30),
      prodCode:     generateStableId('746', hsn || description, description),
      qty,
      freeQty:      0,
      rate:         qty > 0 ? parseFloat((taxable / qty).toFixed(4)) : rate,
      rawRate:      rate,
      mrp:          mrp || rate,
      pack,
      hsn,
      discountPer,
      discAmt:      parseFloat(discAmt.toFixed(2)),
      grossAmt:     gross,
      taxable,
      cgstAmt:      parseFloat((gstAmt / 2).toFixed(2)),
      sgstAmt:      parseFloat((gstAmt / 2).toFixed(2)),
      gstPer,
      netAmt:       net,
    })
  }

  return items
}

module.exports = {
  name: 'Manshi Leap PDF',
  identifyPatterns: ['HIMALAYA WELLNESS COMPANY', 'PRODUCT DESCRIPTION'],

  getMetadata: (lines) => {
    const arr = Array.isArray(lines) ? lines : String(lines || '').split('\n')
    const text = arr.map(l => String(l || '').trim()).filter(Boolean).join(' ')
    const invMatch  = text.match(/INVOICE\s*NO\.?\s*:\s*([A-Z0-9/-]+)/i)
    const dateMatch =
      text.match(/(\d{2}\/\d{2}\/\d{2,4})/) ||
      text.match(/(\d{2}-[A-Za-z]{3}-\d{4})/i) ||
      text.match(/(\d{2}-\d{2}-\d{4})/)
    return {
      partyCode:  'MNS',
      partyName:  'MANSHI AGENCIES',
      invoiceNo:  invMatch ? String(invMatch[1]).replace(/\D/g, '') : '000000',
      date:       dateMatch ? dateMatch[1] : '',
    }
  },

  mapRows: (lines) => {
    const arr     = Array.isArray(lines) ? lines : String(lines || '').split('\n')
    const cleaned = arr.map(l => String(l || '').trim()).filter(Boolean)
    return parseLeapItems(cleaned)
  },
}