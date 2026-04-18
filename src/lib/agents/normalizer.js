class Normalizer {
  normalize(rawItems, metadata) {
    const { partyCode, partyName, date, invoiceNo } = metadata
    const formattedDate = this._formatDate(date)
    const vouNo = String(invoiceNo || '0').replace(/[^0-9]/g, '').substring(0, 6)

    return rawItems.map((item, index) => {
      const productName = String(item.productName || '').trim().toUpperCase()
      let prodCode = item.prodCode || productName.replace(/\s+/g, '').substring(0, 10)
      const finalBatch = (item.batch && String(item.batch).trim())
        ? String(item.batch).trim().substring(0, 15)
        : `AUTO${String(index + 1).padStart(2, '0')}`

      const qty = parseFloat(item.qty) || 0
      const rate = parseFloat(item.rate) || 0
      const discPer = parseFloat(item.discountPer) || 0
      const gstPer = parseFloat(item.gstPer) || 12

      const grossAmt = qty * rate
      const discAmt = grossAmt * (discPer / 100)
      const taxableAmt = grossAmt - discAmt
      const finalCgstAmt = item.cgstAmt !== undefined ? item.cgstAmt : (taxableAmt * (gstPer / 200))
      const finalSgstAmt = item.sgstAmt !== undefined ? item.sgstAmt : (taxableAmt * (gstPer / 200))

      return {
        PARTYCODE: String(partyCode).substring(0, 3).toUpperCase(),
        NAME: String(partyName).substring(0, 40).toUpperCase(),
        ADD1: 'INDIA',
        VOU_NO: vouNo.padStart(6, ' '),
        VOU_TYPE: 'CRB',
        TR_DATE: formattedDate,
        DUE_DATE: formattedDate,
        PROD_CODE: prodCode.toUpperCase().substring(0, 10),
        PROD_NAME: productName.substring(0, 30),
        COMP_NAME: 'UNKNOWN',
        PAK: String(item.pack || '10T').substring(0, 6),
        UOM: '1',
        COMP: String(partyCode).substring(0, 3).toUpperCase(),
        QTY: qty,
        QTY_SCM: parseFloat(item.freeQty) || 0,
        PR_BATCHNO: finalBatch,
        EXPIRY: item.expiry || '12/30',
        RATE: rate,
        MRP: parseFloat(item.mrp) || 0,
        DISCOUNT: discPer,
        DISC_AMT: discAmt,
        PR_PTR: rate,
        DEBIT: taxableAmt + finalCgstAmt + finalSgstAmt,
        GROS_AMT: grossAmt,
        CAT_CODE: 'GEN',
        HSNCODE: String(item.hsn || '30049099').substring(0, 15),
        SGST: gstPer / 2,
        CGST: gstPer / 2,
        SGSTAMT: finalSgstAmt,
        CGSTAMT: finalCgstAmt,
        _NullFlags: Buffer.from([0x00])
      }
    })
  }

  _formatDate(dateInput) {
    if (!dateInput) return new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const clean = String(dateInput).replace(/[/-]/g, '')
    if (clean.length === 8) {
      if (clean.startsWith('20')) return clean
      return clean.substring(4, 8) + clean.substring(2, 4) + clean.substring(0, 2)
    }
    return new Date().toISOString().slice(0, 10).replace(/-/g, '')
  }
}

module.exports = new Normalizer()