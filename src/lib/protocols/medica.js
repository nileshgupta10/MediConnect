module.exports = {
  name: 'Medica / Prem Agency',
  identifyPatterns: ['PREM AGENCY'],

  // ── Metadata ──────────────────────────────────────────────────────────
  // Handles BOTH input shapes:
  //  - CSV mode: rows is an array of parsed row OBJECTS (row.invno, row.invdate, ...)
  //  - PDF mode: rows is an array of plain text LINES (strings)
  getMetadata: (rows) => {
    const isPDFMode = Array.isArray(rows) && typeof rows[0] === 'string'

    if (isPDFMode) {
      const text = rows.join('\n')
      const invMatch = text.match(/Invoice No\s*:\s*([A-Za-z]?\/?\d+)/i)
      const dateMatch = text.match(/Inv Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)
      return {
        partyCode: 'PPH',
        partyName: 'PREM AGENCY',
        date: dateMatch ? dateMatch[1] : '',
        invoiceNo: invMatch ? invMatch[1].replace(/[^0-9]/g, '') : '000000'
      }
    }

    // CSV mode (original logic, unchanged)
    const firstRow = rows[0];
    if (firstRow) {
      return {
        partyCode: 'PPH',
        partyName: 'PREM AGENCY',
        date: firstRow.invdate || '',
        invoiceNo: (firstRow.invno || '000000').replace(/[^0-9]/g, '')
      };
    }
    return { partyCode: 'PPH', partyName: 'PREM AGENCY', invoiceNo: '000000' };
  },

  // ── CSV row mapping (unchanged) ─────────────────────────────────────────
  mapRows: (rows) => {
    return rows.map(row => {
      let expiry = '12/30';
      if (row.expdate && row.expdate.includes('/')) {
        const parts = row.expdate.split('/');
        if (parts.length === 3) {
          expiry = `${parts[1]}/${parts[2].substring(2)}`;
        }
      }

      const rawProdCode = row.prcode || '';
      const finalProdCode = String(rawProdCode).padStart(10, '0');

      return {
        productName: row.productdesc || '',
        prodCode: finalProdCode,
        pack: row.ppack || '',
        batch: row.batchno || '',
        qty: parseFloat(row.qty || 0),
        freeQty: parseFloat(row.free || 0),
        rate: parseFloat(row.rate || 0),
        mrp: parseFloat(row.mrp || 0),
        hsn: row.hsncode || '',
        expiry: expiry,
        discountPer: (parseFloat(row.cdper || 0) + parseFloat(row.schper || 0) + parseFloat(row.tdper || 0)) || parseFloat(row.discountPer || row.disc || 0),
        discAmt: parseFloat(row.discamt || row.schamt || row.cdamt || 0),
        gstPer: (parseFloat(row.cgstper || 0) + parseFloat(row.sgstper || 0)) || 12
      };
    }).filter(item => item.productName);
  },

  // ── PDF line mapping (NEW) ───────────────────────────────────────────────
  // Line format (space-separated, after PDF text extraction):
  // HSN  PRODUCT_DESC...  PACK...  MFG  EXP(mm/yy)  BATCHNO  QTY  LOC  MRP  RATE  AMOUNT  TD%  TAXABLE  CGST%  CGSTAMT  SGST%  SGSTAMT
  //
  // Strategy: anchor on the EXP token (always matches mm/yy) since product
  // names and pack sizes are variable-length free text and can't be
  // reliably split by position alone.
  mapPDF: (lines) => {
    if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
    const cleaned = lines.map(l => String(l || '').trim()).filter(Boolean)

    const items = []

    for (const line of cleaned) {
      const tokens = line.split(/\s+/)
      if (tokens.length < 14) continue

      // HSN must be the first token, an 8-digit code
      if (!/^\d{8}$/.test(tokens[0])) continue

      // Find the expiry token (mm/yy) — it anchors the whole row
      let expIdx = -1
      for (let i = 1; i < tokens.length; i++) {
        if (/^\d{2}\/\d{2}$/.test(tokens[i])) { expIdx = i; break }
      }
      if (expIdx === -1) continue

      const mfgIdx = expIdx - 1
      const batchIdx = expIdx + 1
      if (mfgIdx <= 0 || batchIdx >= tokens.length) continue

      // After BATCHNO: QTY, LOC, MRP, RATE, AMOUNT, TD%, TAXABLE, CGST%, CGSTAMT, SGST%, SGSTAMT  (11 fields)
      const tail = tokens.slice(batchIdx + 1)
      if (tail.length < 11) continue

      const [
        qtyTok, locTok, mrpTok, rateTok, amountTok,
        tdPerTok, taxableTok, cgstPerTok, cgstAmtTok, sgstPerTok, sgstAmtTok
      ] = tail

      if (!/^\d+(\.\d+)?$/.test(qtyTok)) continue // QTY must be numeric

      const hsn = tokens[0]
      const mfg = tokens[mfgIdx]
      const batch = tokens[batchIdx]
      const expRaw = tokens[expIdx] // mm/yy already in CARE's expected format

      // Everything between HSN and MFG = product description + pack combined
      const descAndPack = tokens.slice(1, mfgIdx)
      const { productName, pack } = splitPack(descAndPack)

      const qty = num(qtyTok)
      const mrp = num(mrpTok)
      const rate = num(rateTok)
      const taxable = num(taxableTok)
      const cgstPer = num(cgstPerTok)
      const sgstPer = num(sgstPerTok)
      const cgstAmt = num(cgstAmtTok)
      const sgstAmt = num(sgstAmtTok)
      const grossAmt = num(amountTok)
      const discAmt = grossAmt - taxable

      if (!productName || qty <= 0 || rate <= 0) continue

      items.push({
        productName: productName.substring(0, 30),
        prodCode: '', // not present on the PDF — normalizer will auto-generate from party+index
        companyName: mfg,
        pack: pack || '1N',
        batch: batch || '*',
        qty,
        freeQty: 0,
        rate,
        mrp: mrp || rate,
        hsn,
        expiry: expRaw,
        discountPer: grossAmt > 0 ? +((discAmt / grossAmt) * 100).toFixed(2) : 0,
        discAmt,
        taxable,
        cgstAmt,
        sgstAmt,
        gstPer: cgstPer + sgstPer
      })
    }

    return items
  }
};

// ── Helpers ────────────────────────────────────────────────────────────

function num(value) {
  return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
}

// Splits a combined [description..., pack...] token array into
// { productName, pack }. Pack is usually the last 1–2 tokens
// (e.g. "10T", "20GM.", "15TAB", or two tokens like "10" "TAB").
function splitPack(tokens) {
  if (tokens.length === 0) return { productName: '', pack: '' }

  const last = tokens[tokens.length - 1]
  const secondLast = tokens.length > 1 ? tokens[tokens.length - 2] : ''

  // Single-token pack: digits followed by a unit (T, TAB, TABS, GM, ML), optional trailing period
  const singleTokenPackRe = /^\d+(\.\d+)?(T|TAB|TABS|GM|ML)\.?$/i

  // Two-token pack: a bare number followed by a unit word (e.g. "10" "TAB")
  const unitWordRe = /^(T|TAB|TABS|GM|ML)\.?$/i
  const bareNumberRe = /^\d+(\.\d+)?$/

  if (unitWordRe.test(last) && bareNumberRe.test(secondLast)) {
    return {
      productName: tokens.slice(0, -2).join(' ').trim(),
      pack: `${secondLast} ${last}`
    }
  }

  if (singleTokenPackRe.test(last)) {
    return {
      productName: tokens.slice(0, -1).join(' ').trim(),
      pack: last
    }
  }

  // Fallback: treat the very last token as pack, rest as product name
  return {
    productName: tokens.slice(0, -1).join(' ').trim(),
    pack: last
  }
}