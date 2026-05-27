/**
 * MANSHI LEAP PDF PROTOCOL (Himalaya / LEAP distributor software)
 *
 * PDF FORMAT: One value per line (Leap tabular format).
 *
 * Each item block follows this sequence:
 *   SN (bare integer: 1..N)
 *   HSN CODE (8 digits)
 *   PRODUCT DESCRIPTION (1 or more text lines, until first decimal value)
 *   M.R.P.          (decimal: e.g. 56.00)
 *   [REDUCED M.R.P] (decimal — optional, only present on specific items)
 *   QTY             (bare integer, no decimal point)
 *   RATE PER UNIT   (decimal)
 *   GROSS AMT       (decimal)
 *   SCH DIS%        (string containing '+', may span 1–2 lines — SKIP)
 *   [H-PRAGATI FIELD] (line starting with '.' like '.00' — SKIP)
 *   DISC AMT        (decimal with leading digit)
 *   TAXABLE AMT     (decimal)
 *   GST %           (integer: 5, 12, 18, 28)
 *   GST AMT         (decimal)
 *   NET AMT         (decimal)
 */

const { generateStableId } = require('../../utils/stableId')

function cleanLines(input) {
  return (Array.isArray(input) ? input : String(input || '').split('\n'))
    .map(line => String(line || '').trim())
}

// A bare integer line: 1..999, used as item serial number
function isSN(line) {
  return /^\d{1,3}$/.test(line.trim())
}

// 8-digit HSN code
function isHSN(line) {
  return /^\d{8}$/.test(line.trim())
}

// A decimal number with a leading digit (e.g. "56.00", "145.47", "8.73")
function isLeadingDecimal(line) {
  return /^\d[\d.]*$/.test(line.trim()) && line.includes('.')
}

// A bare integer (no decimal point) — used for QTY and GST%
function isBareInteger(line) {
  return /^\d+$/.test(line.trim())
}

// Disc% string — contains '+' character (e.g. "0.00+6+0+0+0")
function isDiscPctLine(line) {
  return line.includes('+')
}

// Fragment starting with '.' (e.g. ".00") — the H-Pragati zero field, skip it
function isLeadingDotFragment(line) {
  return /^\.\d+$/.test(line.trim())
}

// Stop line — signals end of items section
function isStopLine(line) {
  return /^(TOTAL\b|STOCKIST FOR\b|PAYMENT TYPE\b|SALESMAN:\b|Rupees\b|For MANSHI AGENCIES\b|GTG1\b|MANSHI AGENCIES\b|PLOT NO\b|STATE:\b|GSTIN:\b|TEL NO:\b|MOBILE:\b|E-MAIL:\b|DL NO:\b|TAX INVOICE\b|INVOICE NO:\b|INVOICE DATE:\b|PO NO\b|Program Type\b|EWAY\b|BILL&DATE\b)/i
    .test(line.trim())
}

// Header lines to skip
function isHeaderLine(line) {
  return /^(SN\.|HSN CODE|PRODUCT DESCRIPTION|M\.R\.P\.|REDU|QTY|R P U|GROSS|SCH\. DIS|DISC|TAXABLE|GST|NET)/i.test(line.trim())
}

/**
 * Checks whether the next non-skip line after MRP is also a decimal
 * AND the line after that is a bare integer — indicating a REDUCED MRP column.
 */
function hasReducedMRP(lines, startIdx) {
  let i = startIdx
  // skip any empty/header/stop lines to find first candidate
  while (i < lines.length && (lines[i] === '' || isHeaderLine(lines[i]) || isStopLine(lines[i]))) i++
  if (i >= lines.length) return false

  const candidate = lines[i]
  if (!isLeadingDecimal(candidate)) return false

  // The value after this candidate — is it a bare integer (qty)?
  let j = i + 1
  while (j < lines.length && (lines[j] === '' || isHeaderLine(lines[j]) || isStopLine(lines[j]))) j++
  if (j >= lines.length) return false

  return isBareInteger(lines[j])
}

function parseItems(lines) {
  const items = []
  const n = lines.length
  let i = 0

  // Find start of items (after the SN./HSN CODE header block)
  // Items are identified by: bare integer SN followed by 8-digit HSN
  while (i < n) {
    const line = lines[i]

    // Skip empty lines, header lines, stop lines
    if (!line || isHeaderLine(line) || isStopLine(line)) { i++; continue }

    // Check for SN + HSN pattern to start an item
    if (isSN(line)) {
      // Peek ahead to confirm next non-empty is HSN
      let j = i + 1
      while (j < n && lines[j] === '') j++
      if (j < n && isHSN(lines[j])) {
        // Parse this item block
        i++ // move past SN
        // Skip to HSN
        while (i < n && lines[i] === '') i++
        const hsn = lines[i++] // consume HSN

        // Collect product description: all non-empty lines until first decimal value
        const nameLines = []
        while (i < n) {
          const cur = lines[i]
          if (!cur || cur === '') { i++; continue }
          if (isLeadingDecimal(cur) || isBareInteger(cur) || isStopLine(cur)) break
          if (isHeaderLine(cur)) { i++; continue }
          nameLines.push(cur)
          i++
        }
        const productName = nameLines
          .join(' ')
          .replace(/BUY\s+\d+\s+GET\s+\d+\s+FREE/gi, '')
          .replace(/\s+/g, ' ')
          .trim()

        if (!productName) continue

        // Skip empty lines before MRP
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read MRP
        if (!isLeadingDecimal(lines[i])) continue
        let mrp = parseFloat(lines[i++])

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Check for REDUCED MRP: if next line is also a decimal AND line after is bare integer
        if (isLeadingDecimal(lines[i]) && i + 1 < n) {
          // Peek at what follows the possible reduced MRP
          let k = i + 1
          while (k < n && lines[k] === '') k++
          if (k < n && isBareInteger(lines[k])) {
            // Reduced MRP confirmed — use it as MRP (override)
            mrp = parseFloat(lines[i++])
          }
        }

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read QTY (bare integer)
        if (!isBareInteger(lines[i])) continue
        const qty = parseInt(lines[i++], 10)
        if (qty <= 0) continue

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read RATE PER UNIT
        if (!isLeadingDecimal(lines[i])) continue
        const ratePerUnit = parseFloat(lines[i++])

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read GROSS AMT
        if (!isLeadingDecimal(lines[i])) continue
        const grossAmt = parseFloat(lines[i++])

        // Skip the SCH DIS% line(s) — these contain '+'
        while (i < n && lines[i] === '') i++
        while (i < n && isDiscPctLine(lines[i])) i++

        // Skip H-Pragati zero field(s) — lines starting with '.' like '.00'
        while (i < n && lines[i] === '') i++
        while (i < n && isLeadingDotFragment(lines[i])) i++

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read DISC AMT
        let discAmt = 0
        if (isLeadingDecimal(lines[i])) {
          discAmt = parseFloat(lines[i++])
        }

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read TAXABLE AMT
        if (!isLeadingDecimal(lines[i])) continue
        const taxable = parseFloat(lines[i++])
        if (taxable <= 0) continue

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read GST% (bare integer)
        if (!isBareInteger(lines[i])) continue
        const gstPer = parseInt(lines[i++], 10)

        // Skip empty
        while (i < n && lines[i] === '') i++
        if (i >= n) continue

        // Read GST AMT
        let gstAmt = 0
        if (isLeadingDecimal(lines[i])) {
          gstAmt = parseFloat(lines[i++])
        }

        // Skip empty
        while (i < n && lines[i] === '') i++

        // Read NET AMT
        let netAmt = taxable + gstAmt
        if (i < n && isLeadingDecimal(lines[i])) {
          netAmt = parseFloat(lines[i++])
        }

        // Derive per-unit rate from taxable (most accurate)
        const rate = qty > 0 ? +(taxable / qty).toFixed(4) : ratePerUnit
        const cgstAmt = +(gstAmt / 2).toFixed(3)
        const sgstAmt = +(gstAmt / 2).toFixed(3)
        // Discount % from gross vs taxable
        const discountPer = grossAmt > 0 ? +(((grossAmt - taxable) / grossAmt) * 100).toFixed(2) : 0

        items.push({
          productName: productName.substring(0, 30),
          prodCode: generateStableId('746', hsn, `${productName}`),
          qty,
          freeQty: 0,
          rate,
          rawRate: ratePerUnit,
          mrp,
          pack: extractPack(productName),
          hsn,
          expiry: '00/00',
          discountPer,
          discAmt: grossAmt - taxable,
          cgstAmt,
          sgstAmt,
          gstPer,
          taxable,
          netAmt
        })

        continue
      }
    }

    i++
  }

  return items
}

function extractPack(text) {
  const raw = String(text || '')
  const patterns = [
    /\b\d{1,4}(?:X\d+)?(?:ML|GM|G|KG|MG|L|N|PCS|PC|TAB|TABS|UNIT)\b/ig,
    /\b(?:XXL|XL|L|M|S|P)\s*=\s*\d+\b/ig,
    /\b\d+'\s*S\b/ig,
    /\b(?:PCS|PC|UNIT|PADS)\b/ig,
    /\b\d+X\d+[A-Z0-9'/-]*\b/ig,
    /\b\d{1,2}[A-Z]{1,3}\b/ig
  ]
  for (const pattern of patterns) {
    const matches = raw.match(pattern)
    if (matches && matches.length) {
      const candidate = matches[matches.length - 1].replace(/^0+/, '').substring(0, 6)
      if (candidate) return candidate.toUpperCase()
    }
  }
  return '1N'
}

module.exports = {
  name: 'Manshi Leap PDF',
  identifyPatterns: ['PRODUCT DESCRIPTION', 'HIMALAYA WELLNESS COMPANY', 'INVOICE NO:'],

  getMetadata: (lines) => {
    const arr = Array.isArray(lines) ? lines : String(lines || '').split('\n')
    const text = arr.map(l => String(l || '').trim()).filter(Boolean).join(' ')
    const invoiceMatch =
      text.match(/INVOICE NO:\s*([A-Z0-9/-]+)/i) ||
      text.match(/INVOICE NO\.\s*:\s*([A-Z0-9/-]+)/i)
    const dateMatch =
      text.match(/\b\d{2}-[A-Za-z]{3}-\d{4}\b/) ||
      text.match(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/) ||
      text.match(/\b\d{2}[/-][A-Za-z]{3}[/-]\d{4}\b/i)
    const invoiceRaw = invoiceMatch ? String(invoiceMatch[1]).trim() : '000000'

    return {
      partyCode: 'MAN',
      partyName: 'MANSHI AGENCIES',
      invoiceNo: (invoiceRaw.replace(/\D/g, '') || '000000').slice(-6),
      sourceInvoiceNo: invoiceRaw,
      date: dateMatch ? dateMatch[0] : ''
    }
  },

  mapRows: (lines) => {
    const arr = Array.isArray(lines) ? lines : String(lines || '').split('\n')
    const cleaned = cleanLines(arr)
    return parseItems(cleaned)
  }
}
