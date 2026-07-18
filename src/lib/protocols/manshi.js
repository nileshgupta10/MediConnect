/**
 * MANSHI AGENCIES PDF PROTOCOL
 *
 * FIXES APPLIED (verified against invoice CC-1552):
 *
 * FIX 1 — 6-digit HSN breaks merged token parse (HB SHAMPOO HSN=330510)
 *   Old: /^(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})(\d{8})$/
 *   New: /^(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})(\d{6,8})$/
 *   Impact: items with 6-digit HSN were getting SGST=0, CGST=0, DISCOUNT=0,
 *           HSN='30049099' (fallback). All now correctly parsed.
 *
 * FIX 2 — SCM (free qty) column causes qty to be mis-identified
 *   When a row has a free-qty column (e.g. "... 47.00  4  1  36.21 ...")
 *   the parser was finding the SCM value (1) as qty, and the real qty (4)
 *   was buried in the product name.
 *   Old: first integer whose next token starts with a float = qty
 *   New: look for TWO consecutive integers before the rate float.
 *        If found: first = qty, second = scm (free qty).
 *        If only one integer before float: qty = that integer, scm = 0.
 *
 * FIX 3 — discAmt missing from returned item (normalizer recomputed it wrong)
 *   Old: returned item had no discAmt field → normalizer used grossAmt*(disc%/100)
 *   New: discAmt = gross - taxable (derived, always matches invoice exactly)
 */

const { generateStableId } = require('../../utils/stableId')

function isNumStr(s) {
  const t = String(s || '').trim()
  return t !== '' && isFinite(parseFloat(t))
}

function parseRowLine(line) {
  const text = String(line || '').replace(/\s+/g, ' ').trim()
  if (!text) return null

  const tokens = text.split(' ')

  // ── FIX 2: find qty (and optional scm) ──────────────────────────────────
  // Scan for the first integer token whose NEXT token (or next-next, if also
  // an integer) starts with a float.  Pattern can be:
  //   ... MRP(float)  QTY(int)          RATE(float) ...  → scm = 0
  //   ... MRP(float)  QTY(int)  SCM(int)  RATE(float) ... → scm = SCM
  let q = -1          // index of qty token
  let scmIdx = -1     // index of scm token (or -1 if absent)

  for (let i = 0; i < tokens.length - 1; i++) {
    if (!/^\d+$/.test(tokens[i])) continue

    const next = tokens[i + 1] || ''
    const afterNext = tokens[i + 2] || ''

    if (/^\d+\.\d{2}/.test(next)) {
      // Normal: integer followed directly by float = qty, no scm
      q = i
      scmIdx = -1
      break
    }

    if (/^\d+$/.test(next) && /^\d+\.\d{2}/.test(afterNext)) {
      // Two integers before float = qty + scm
      q = i
      scmIdx = i + 1
      break
    }
  }

  if (q === -1) return null

  const productName = tokens.slice(0, q).join(' ').trim()
  const qty = parseInt(tokens[q])
  const freeQtyFromScm = scmIdx !== -1 ? parseInt(tokens[scmIdx]) : 0
  const rateStartIdx = scmIdx !== -1 ? scmIdx + 1 : q + 1

  if (!productName || isNaN(qty) || qty <= 0) return null

  // ── Parse rate+mrp+pack token ────────────────────────────────────────────
  const rateMrpToken = tokens[rateStartIdx]
  if (!rateMrpToken) return null

  let rate = 0, mrp = 0, pack = ''

  // rateMrpToken can be like "34.6440.0050ML" or "35.7240.00"
  const m1 = rateMrpToken.match(/^(\d+\.\d{2})(\d+\.\d{2})([A-Z0-9+=]+)$/i)
  const m2 = rateMrpToken.match(/^(\d+\.\d{2})(\d+\.\d{2})$/)
  if (m1) {
    rate = parseFloat(m1[1])
    mrp  = parseFloat(m1[2])
    pack = m1[3]
  } else if (m2) {
    rate = parseFloat(m2[1])
    mrp  = parseFloat(m2[2])
  } else {
    return null
  }

  // ── Parse remaining tokens after rate+mrp ───────────────────────────────
  const nextTokens = tokens.slice(rateStartIdx + 1)
  if (nextTokens.length === 0) return null

  let gstPer = 0, cgstAmt = 0, sgstAmt = 0, hsn = ''
  let discountPer = 0, taxable = 0, netAmt = 0
  let nextIdx = 0

  // If pack wasn't in rateMrpToken it might be the next token
  if (!pack) {
    const maybePackHsn = nextTokens[0]
    const mPackHsn = maybePackHsn.match(/^([A-Z0-9+=]+)(\d{6,8})$/i)
    if (mPackHsn) {
      pack = mPackHsn[1]
      hsn  = mPackHsn[2]
      nextIdx = 1
    } else if (/[A-Z]/i.test(maybePackHsn) && !isNumStr(maybePackHsn)) {
      pack = maybePackHsn
      nextIdx = 1
    }
  }

  const remaining = nextTokens.slice(nextIdx)

  // ── FIX 1: allow 6, 7, or 8-digit HSN in the merged GST+HSN token ───────
  // Old: (\d{8})   New: (\d{6,8})
  let hsnTokenIdx = -1
  let gstMatch = null

  for (let i = 0; i < remaining.length; i++) {
    const m = remaining[i].match(/^(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})(\d{6,8})$/)
    if (m) {
      hsnTokenIdx = i
      gstMatch = m
      break
    }
    if (/^\d{6,8}$/.test(remaining[i])) {
      hsnTokenIdx = i
      hsn = remaining[i]
      break
    }
  }

  // Handle free-qty encoded in pack string (e.g. "17PADS" = 1 free + "7PADS" pack)
  let freeQty = freeQtyFromScm
  if (!freeQty && pack) {
    const packSchemeMatch = pack.match(/^1(\d+)(PADS|TAB|CAP)$/i)
    if (packSchemeMatch) {
      freeQty = 1
      pack = packSchemeMatch[1] + packSchemeMatch[2]
    }
  }

  if (gstMatch) {
    cgstAmt   = parseFloat(gstMatch[1])
    sgstAmt   = parseFloat(gstMatch[2])
    gstPer    = parseFloat(gstMatch[3]) * 2  // half-rate stored twice → double it
    hsn       = gstMatch[4]

    const after = remaining.slice(hsnTokenIdx + 1)
    if (after.length >= 3) {
      discountPer = parseFloat(after[0]) || 0
      taxable     = parseFloat(after[1]) || 0
      netAmt      = parseFloat(after[2]) || 0
    } else if (after.length >= 2) {
      taxable = parseFloat(after[0]) || 0
      netAmt  = parseFloat(after[1]) || 0
    }
  } else {
    // Zero-GST item
    if (hsnTokenIdx !== -1) {
      taxable = hsnTokenIdx + 1 < remaining.length
        ? parseFloat(remaining[hsnTokenIdx + 1]) || 0
        : parseFloat(remaining[remaining.length - 1]) || 0
    } else {
      taxable = parseFloat(remaining[remaining.length - 1]) || 0
    }
    netAmt = taxable
  }

  // ── FIX 3: compute discAmt so normalizer doesn't recompute it ────────────
  // gross = qty * rate (pre-discount).  discAmt = gross - taxable (always balances).
  const gross   = qty * rate
  const discAmt = Math.max(0, +(gross - taxable).toFixed(2))

  return {
    productName: productName.substring(0, 30),
    prodCode: generateStableId('747', hsn || productName, productName),
    pack: pack || '1N',
    qty,
    freeQty,                         // ✅ FIX 2: correctly captured from scm column
    rate,
    rawRate: rate,
    mrp: mrp || rate,
    hsn,                             // ✅ FIX 1: now parses 6-digit HSN correctly
    discountPer,
    discAmt,                         // ✅ FIX 3: explicit, normalizer uses as-is
    cgstAmt,                         // ✅ FIX 1: now parsed correctly for 6-digit HSN items
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

      if (/[A-Z]/i.test(line) && /\d+/.test(line)) {
        const parsed = parseRowLine(line)
        if (parsed) items.push(parsed)
      }
    }

    return items
  }
}