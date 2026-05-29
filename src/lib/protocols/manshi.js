/**
 * MANSHI AGENCIES PDF PROTOCOL
 *
 * PDF FORMAT (Dava Infotech software):
 * Each item occupies a fixed-sequence block of individual lines (one value per line),
 * with blank-space lines as separators between most fields.
 *
 * Block structure after product name:
 *   [blank] QTY [blank] RATE [blank] MRP
 *   → if blank follows MRP  → FREE_QTY then PACK (no blank before PACK)
 *   → if no blank after MRP → PACK directly (no blank before PACK)
 *   [blank] GST% [blank] CGST_AMT [blank] SGST_AMT [blank] GST%_REPEAT  HSN_CODE
 *   [blank] [DISC%]  ← may be ABSENT when discount=0
 *   [blank] TAXABLE_AMT [blank] NET_AMT
 *
 * Multi-page: each page starts with RAJESHWAR NAMAH and ends with Auth.Signatory.
 */

const { generateStableId } = require('../../utils/stableId')

function isBlankLine(line) {
  return !line || String(line).trim() === '' || String(line).trim() === ' '
}

function toNum(s) {
  return parseFloat(String(s || '').trim()) || 0
}

function isNumStr(s) {
  const t = String(s || '').trim()
  return t !== '' && isFinite(parseFloat(t))
}

function isHSN(s) {
  return /^\d{7,10}$/.test(String(s || '').trim())
}

function isStopLine(s) {
  return /^(Auth\.Signatory|NET AMT\.|FOR$|MANSHI AGENCIES$|Rs\.In Word|VADGAON|Software by|Continue to|Round off|GST Amt|GST Val|GST %|5\.0%|18\.0%|Cash\.Disc|ItDisc|Scm\.Disc|Oth\.\.|Gross Amt|Less Amt|Add Amt|CN\/DN|Subject to)/i
    .test(String(s || '').trim())
}

/**
 * Parses all item blocks between RAJESHWAR NAMAH and Auth.Signatory markers.
 * Handles multi-page PDFs by scanning for all occurrences of the markers.
 */
function parseAllItems(rawLines) {
  const items = []

  let i = 0
  while (i < rawLines.length) {
    // Find next RAJESHWAR NAMAH
    while (i < rawLines.length && String(rawLines[i] || '').trim() !== 'RAJESHWAR NAMAH') i++
    if (i >= rawLines.length) break
    i++ // skip RAJESHWAR NAMAH

    // Collect lines until Auth.Signatory or end
    const sectionLines = []
    while (i < rawLines.length) {
      const t = String(rawLines[i] || '').trim()
      if (t === 'Auth.Signatory' || t.startsWith('NET AMT.')) break
      sectionLines.push(rawLines[i])
      i++
    }

    parseSection(sectionLines, items)
  }

  return items
}

function parseSection(lines, items) {
  let pos = 0

  function peek(offset = 0) {
    return pos + offset < lines.length ? lines[pos + offset] : null
  }
  function consume() {
    return pos < lines.length ? lines[pos++] : null
  }
  function skipBlank() {
    if (pos < lines.length && isBlankLine(lines[pos])) pos++
  }
  function readNonBlank() {
    skipBlank()
    if (pos >= lines.length) return null
    return lines[pos++]
  }

  // Collect all non-blank numeric values from current pos until non-numeric
  // (used to look-ahead without consuming)
  function peekNumericValues(maxCount) {
    const vals = []
    let j = pos
    let found = 0
    while (j < lines.length && found < maxCount) {
      const l = String(lines[j] || '').trim()
      if (isBlankLine(lines[j])) { j++; continue }
      if (isNumStr(lines[j]) && !isHSN(lines[j])) {
        vals.push(toNum(lines[j]))
        found++
      } else {
        break
      }
      j++
    }
    return vals
  }

  while (pos < lines.length) {
    const line = peek()
    if (line === null) break

    const t = String(line || '').trim()

    // Skip blank lines, pure numbers, HSN codes, and stop lines
    if (isBlankLine(line) || isNumStr(line) || isHSN(line) || isStopLine(line)) {
      consume()
      continue
    }

    // Must contain letters to be a product name
    if (!/[A-Za-z]/.test(t)) {
      consume()
      continue
    }

    // ── Product name found ──
    const productName = consume().trim()

    // --- QTY (after one blank) ---
    skipBlank()
    if (!isNumStr(peek())) continue
    const qty = toNum(consume())
    if (qty <= 0) continue

    // --- RATE (after one blank) ---
    skipBlank()
    if (!isNumStr(peek())) continue
    const rawRate = toNum(consume())

    // --- MRP (after one blank) ---
    skipBlank()
    if (!isNumStr(peek())) continue
    const mrp = toNum(consume())

    // --- FREE QTY and PACK ---
    // Blank after MRP → free qty present before pack
    // No blank after MRP → pack directly
    let freeQty = 0
    let pack = ''

    if (isBlankLine(peek())) {
      pos++ // consume the blank
      const afterBlank = peek()
      if (afterBlank !== null && isNumStr(afterBlank) && !isHSN(afterBlank)) {
        // Numeric → free qty
        freeQty = toNum(consume())
        // Pack immediately follows free qty (no blank)
        if (peek() !== null && !isBlankLine(peek()) && /[A-Za-z]/.test(String(peek()).trim())) {
          pack = consume().trim()
        }
      } else if (afterBlank !== null && !isBlankLine(afterBlank) && /[A-Za-z]/.test(String(afterBlank).trim())) {
        pack = consume().trim()
      }
    } else if (peek() !== null && !isBlankLine(peek()) && /[A-Za-z]/.test(String(peek()).trim())) {
      // Pack directly after MRP (no blank)
      pack = consume().trim()
    }

    // --- GST% (after blank) ---
    skipBlank()
    if (!isNumStr(peek())) continue
    const gstPer = toNum(consume())

    // --- CGST AMT (after blank) ---
    skipBlank()
    if (!isNumStr(peek())) continue
    const cgstAmt = toNum(consume())

    // --- SGST AMT (after blank) ---
    skipBlank()
    if (!isNumStr(peek())) continue
    const sgstAmt = toNum(consume())

    // --- GST% REPEAT (after blank), then HSN immediately after ---
    skipBlank()
    if (!isNumStr(peek())) continue
    consume() // skip gst% repeat value

    // HSN follows immediately (no blank between gst% repeat and HSN)
    let hsn = ''
    if (peek() !== null && isHSN(peek())) {
      hsn = consume().trim()
    } else {
      // Fallback: skip any stray blank and try
      skipBlank()
      if (peek() !== null && isHSN(peek())) {
        hsn = consume().trim()
      }
    }

    // --- DISC% and TAXABLE and NET ---
    // Some items have disc% (when discount > 0), some go straight to taxable.
    // Peek at the next 2-3 numeric values to decide:
    //   • 3 values → discPct, taxable, net
    //   • 2 values → taxable, net (no discount)
    const remainingNums = peekNumericValues(3)

    let discPct = 0
    let taxable = 0
    let netAmt = 0

    if (remainingNums.length === 3) {
      discPct = toNum(readNonBlank())
      taxable = toNum(readNonBlank())
      netAmt = toNum(readNonBlank())
    } else if (remainingNums.length === 2) {
      taxable = toNum(readNonBlank())
      netAmt = toNum(readNonBlank())
    } else if (remainingNums.length === 1) {
      taxable = toNum(readNonBlank())
      netAmt = taxable + cgstAmt + sgstAmt
    } else {
      continue
    }

    if (taxable <= 0) continue

    const rate = qty > 0 ? +(taxable / qty).toFixed(4) : rawRate

    items.push({
      productName: productName.substring(0, 30),
      prodCode: generateStableId('747', hsn || productName, productName),
      pack: pack || '1N',
      qty,
      freeQty,
      rate,
      rawRate,
      mrp,
      hsn,
      expiry: '00/00',
      discountPer: discPct,
      cgstAmt,
      sgstAmt,
      gstPer,
      taxable,
      netAmt
    })
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
    return parseAllItems(arr)
  }
}
