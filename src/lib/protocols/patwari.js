const { generateStableId } = require('../../utils/stableId')

module.exports = {
  name: 'Patwari Pharma',
  identifyPatterns: ['PATWARI PHARMA', '306538'],

  getMetadata: (rows) => {
    return {
      partyCode: 'PWP',
      partyName: rows[0].vendor || 'PATWARI PHARMA PVT LTD',
      date: rows[0].invdate || '',
      invoiceNo: rows[0].invno || '000000'
    }
  },

  mapRows: (rows) => {
    const items = rows.map((row) => {
      const productName = row.productdesc || row.pitemname || ''
      const hsn = row.hsncode || ''
      const grsAmt = parseFloat(row.grsamt || 0)
      const qty = parseFloat(row.qty || 0)
      const derivedRate = qty > 0 ? (grsAmt / qty) : parseFloat(row.rate || 0)

      return {
        productName,
        prodCode: generateStableId('074', hsn, productName),
        pack: row.ppack || '',
        batch: row.batchno || '',
        qty,
        freeQty: parseFloat(row.free || 0),
        rate: derivedRate,
        mrp: parseFloat(row.mrp || 0),
        hsn,
        expiry: row.expdate || '12/30',
        discountPer: 0,
        cgstAmt: parseFloat(row.cgstamt || 0),
        sgstAmt: parseFloat(row.sgstamt || 0),
        gstPer: (parseFloat(row.cgstper || 0) + parseFloat(row.sgstper || 0)) || 12
      }
    }).filter(item => item.productName)

    if (items.length > 0) {
      const targetTotal = parseFloat(rows[0].invamt) || 0
      const currentTotal = items.reduce((sum, item) => sum + (item.qty * item.rate) + item.cgstAmt + item.sgstAmt, 0)
      const diff = targetTotal - currentTotal
      if (Math.abs(diff) < 1.0) items[0].rate += (diff / items[0].qty)
    }

    return items
  }
}