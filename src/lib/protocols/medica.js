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

    // CSV mode
    const firstRow = rows[0]
    if (firstRow) {
      return {
        partyCode: 'PPH',
        partyName: 'PREM AGENCY',
        date: firstRow.invdate || '',
        invoiceNo: (firstRow.invno || '000000').replace(/[^0-9]/g, '')
      }
    }
    return { partyCode: 'PPH', partyName: 'PREM AGENCY', invoiceNo: '000000' }
  },

  // ── CSV row mapping ───────────────────────────────────────────────────
  mapRows: (rows) => {
    return rows.map(row => {
      // Expiry: CSV has DD/MM/YYYY → convert to MM/YY for CARE
      let expiry = '12/30'
      if (row.expdate && row.expdate.includes('/')) {
        const parts = row.expdate.split('/')
        if (parts.length === 3) {
          expiry = `${parts[1]}/${parts[2].substring(2)}`
        }
      }

      const rawProdCode = row.prcode || ''
      const finalProdCode = String(rawProdCode).padStart(10, '0')

     // ── Discount calculation ──────────────────────────────────────────
      // Prem CSV has cascading discounts: SchPer + CDPer + TDPer applied
      // sequentially — simple addition gives a wrong combined %.
      // FIX: dividing CGSTAmt by CGSTPer amplifies the CSV's own rounding
      // (e.g. a 0.005 rounding on CGSTAmt becomes 0.005/0.025 = 0.20 error
      // at 2.5% GST). Subtracting two already-rounded figures (INetAmt
      // minus the GST amounts) stays exact and ties to the printed invoice.
      const grsAmt  = parseFloat(row.grsamt  || 0)
      const inetAmt = parseFloat(row.inetamt || 0)
      const cgstAmt = parseFloat(row.cgstamt || 0)
      const sgstAmt = parseFloat(row.sgstamt || 0)
      const igstAmt = parseFloat(row.igstamt || 0)
      const cgstPer = parseFloat(row.cgstper || 0)

      const taxable = (inetAmt > 0)
        ? +(inetAmt - cgstAmt - sgstAmt - igstAmt).toFixed(2)
        : grsAmt

      const discAmt = +(Math.max(grsAmt - taxable, 0)).toFixed(2)
      const discountPer = (grsAmt > 0 && discAmt > 0)
        ? +((discAmt / grsAmt) * 100).toFixed(2)
        : 0

      return {
        productName:  row.productdesc || '',
        prodCode:     finalProdCode,
        pack:         row.ppack || '',
        batch:        row.batchno || '',
        qty:          parseFloat(row.qty  || 0),
        freeQty:      parseFloat(row.free || 0),
        rate:         parseFloat(row.rate || 0),
        mrp:          parseFloat(row.mrp  || 0),
        hsn:          row.hsncode || '',
        expiry,
        discountPer,
        discAmt,
        taxable,
        cgstAmt,
        sgstAmt,
        gstPer: cgstPer * 2   // CGSTPer is half of total GST
      }
    }).filter(item => item.productName)
  },

  // ── PDF line mapping ──────────────────────────────────────────────────
  // Anchors on expiry token (mm/yy) since product names are variable-length.
  // Column order after batch: QTY  LOC  MRP  RATE  AMOUNT  TD%  TAXABLE
  //                           CGST%  CGSTAMT  SGST%  SGSTAMT  (11 fields)
  mapPDF: (lines) => {
    if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
    const cleaned = lines.map(l => String(l || '').trim()).filter(Boolean)
    const items = []

    for (const line of cleaned) {
      const tokens = line.split(/\s+/)
      if (tokens.length < 14) continue

      // HSN must be first token, 8-digit
      if (!/^\d{8}$/.test(tokens[0])) continue

      // Find expiry token (mm/yy)
      let expIdx = -1
      for (let i = 1; i < tokens.length; i++) {
        if (/^\d{2}\/\d{2}$/.test(tokens[i])) { expIdx = i; break }
      }
      if (expIdx === -1) continue

      const mfgIdx   = expIdx - 1
      const batchIdx = expIdx + 1
      if (mfgIdx <= 0 || batchIdx >= tokens.length) continue

      const tail = tokens.slice(batchIdx + 1)
      if (tail.length < 11) continue

      const [
        qtyTok, , mrpTok, rateTok, amountTok,
        , taxableTok, cgstPerTok, cgstAmtTok, sgstPerTok, sgstAmtTok
      ] = tail

      if (!/^\d+(\.\d+)?$/.test(qtyTok)) continue

      const hsn      = tokens[0]
      const batch    = tokens[batchIdx]
      const expRaw   = tokens[expIdx]
      const descAndPack = tokens.slice(1, mfgIdx)
      const { productName, pack } = splitPack(descAndPack)

      const qty      = num(qtyTok)
      const mrp      = num(mrpTok)
      const rate     = num(rateTok)
      const taxable  = num(taxableTok)
      const cgstPer  = num(cgstPerTok)
      const sgstPer  = num(sgstPerTok)
      const cgstAmt  = num(cgstAmtTok)
      const sgstAmt  = num(sgstAmtTok)
      const grossAmt = num(amountTok)
      const discAmt  = +(Math.max(grossAmt - taxable, 0)).toFixed(2)

      if (!productName || qty <= 0 || rate <= 0) continue

      items.push({
        productName: productName.substring(0, 30),
        prodCode: '',
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
}

function num(value) {
  return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
}

function splitPack(tokens) {
  if (tokens.length === 0) return { productName: '', pack: '' }
  const last = tokens[tokens.length - 1]
  const secondLast = tokens.length > 1 ? tokens[tokens.length - 2] : ''
  const unitWordRe   = /^(T|TAB|TABS|GM|ML)\.?$/i
  const bareNumberRe = /^\d+(\.\d+)?$/
  const singleTokenPackRe = /^\d+(\.\d+)?(T|TAB|TABS|GM|ML)\.?$/i
  if (unitWordRe.test(last) && bareNumberRe.test(secondLast)) {
    return { productName: tokens.slice(0, -2).join(' ').trim(), pack: `${secondLast} ${last}` }
  }
  if (singleTokenPackRe.test(last)) {
    return { productName: tokens.slice(0, -1).join(' ').trim(), pack: last }
  }
  return { productName: tokens.slice(0, -1).join(' ').trim(), pack: last }
}