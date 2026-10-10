const { generateStableId } = require('../../utils/stableId')

const round2 = (n) => Math.round(n * 100) / 100

function parseCleanFloat(str) {
  if (!str) return 0
  const clean = String(str).replace(/,/g, '').trim()
  const val = parseFloat(clean)
  return isNaN(val) ? 0 : val
}

module.exports = {
  name: 'Patwari Pharma (PDF)',
  pdfOnly: true,
  identifyPatterns: ['PATWARI PHARMA', 'GRAND TOTAL'],
  mapPDFBuffer: async (fileBuffer) => {
    try {
      const { getDocumentProxy } = await import('unpdf')
      const pdf = await getDocumentProxy(new Uint8Array(fileBuffer))

      const allItems = []
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const textContent = await page.getTextContent()
        for (const it of textContent.items) {
          const s = (it.str || '').trim()
          if (!s) continue
          allItems.push({
            s,
            x: Math.round(it.transform[4]),
            y: Math.round(it.transform[5]),
            page: p
          })
        }
      }

      // Metadata:
      // invoiceNo: find the item whose text (spaces removed, lower case) starts with "taxinv";
      // on the same line (|y diff| <= 3, larger x) take the item matching /^\d{10,}$/; use its LAST 6 DIGITS
      let invoiceNo = ''
      const taxInvItem = allItems.find(it => it.s.replace(/\s+/g, '').toLowerCase().startsWith('taxinv'))
      if (taxInvItem) {
        const cand = allItems.filter(it => it.page === taxInvItem.page && Math.abs(it.y - taxInvItem.y) <= 3 && it.x > taxInvItem.x && /^\d{10,}$/.test(it.s))
        if (cand.length > 0) {
          cand.sort((a, b) => a.x - b.x)
          const fullInv = cand[0].s
          invoiceNo = fullInv.slice(-6)
        }
      }
      if (!invoiceNo) {
        return { error: 'Could not read the invoice number from this PDF.' }
      }

      // date: on page 1, the item matching /^\d{2}-\d{2}-\d{4}$/ with the HIGHEST y (top of the page)
      const dateItems = allItems.filter(it => it.page === 1 && /^\d{2}-\d{2}-\d{4}$/.test(it.s))
      if (dateItems.length === 0) {
        return { error: 'Could not read the invoice date from this PDF.' }
      }
      dateItems.sort((a, b) => b.y - a.y)
      const date = dateItems[0].s

      // grandTotal (internal): the item whose text is "Grand Total" (case-insensitive);
      // take the first numeric item on the same line (|y diff| <= 3) with larger x
      let grandTotal = null
      const gtItem = allItems.find(it => it.s.toLowerCase() === 'grand total')
      if (gtItem) {
        const numItems = allItems.filter(it => it.page === gtItem.page && Math.abs(it.y - gtItem.y) <= 3 && it.x > gtItem.x)
          .map(it => ({ ...it, val: parseCleanFloat(it.s) }))
          .filter(it => it.val > 0)
        if (numItems.length > 0) {
          numItems.sort((a, b) => a.x - b.x)
          grandTotal = numItems[0].val
        }
      }
      if (grandTotal === null) {
        return { error: 'Could not read the bill total from this PDF.' }
      }

      // ITEM ROWS: an item row anchor is an item with x between 668 and 712 whose s matches /^\d{8}$/ (the HSN code).
      // For each anchor, take all items on the same page with |y - anchor.y| <= 3.
      // Output rows ordered by page ascending, then y descending (top to bottom).
      const anchors = allItems.filter(it => it.x >= 668 && it.x < 712 && /^\d{8}$/.test(it.s))
      anchors.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page
        return b.y - a.y
      })

      if (anchors.length === 0) {
        return { error: 'No items could be read from this PDF. Please upload the CSV file instead if you have it.' }
      }

      const items = []
      let sumNet = 0

      for (const anchor of anchors) {
        const rowItems = allItems.filter(it => it.page === anchor.page && Math.abs(it.y - anchor.y) <= 3)
        const getCol = (minX, maxX) => rowItems.filter(it => it.x >= minX && it.x < maxX)

        // Column extraction by coordinate range [minX, maxX)
        const qty = parseCleanFloat(getCol(70, 105)[0]?.s)
        const freeQty = parseCleanFloat(getCol(105, 128)[0]?.s)
        const nameItems = getCol(128, 265).sort((a, b) => a.x - b.x)
        const productName = nameItems.map(it => it.s).join(' ').trim()
        const packItems = getCol(295, 330).sort((a, b) => a.x - b.x)
        const pack = packItems.map(it => it.s).join(' ').trim()
        const batch = getCol(330, 395).map(it => it.s).join('').trim()

        const expiryItem = getCol(395, 425).find(it => /^\d{2}-\d{2}$/.test(it.s))
        let expiry = '12/30'
        if (expiryItem) {
          const m = expiryItem.s.match(/^(\d{2})[-/](\d{2,4})$/)
          if (m) {
            const mm = m[1]
            const yy = m[2].slice(-2)
            expiry = `${mm}/${yy}`
          }
        }

        const mrp = parseCleanFloat(getCol(425, 465)[0]?.s)
        const ptr = parseCleanFloat(getCol(465, 500)[0]?.s)
        const rateCol = parseCleanFloat(getCol(500, 535)[0]?.s)
        const rate = rateCol || ptr || 0
        const rawRate = rate
        const discountPer = parseCleanFloat(getCol(535, 570)[0]?.s)
        const hsn = anchor.s
        const gstPer = parseCleanFloat(getCol(712, 733)[0]?.s)
        const gstAmt = parseCleanFloat(getCol(733, 768)[0]?.s)
        const net = parseCleanFloat(getCol(768, 830)[0]?.s)

        sumNet += net

        const taxable = round2(net - gstAmt)
        const cgstAmt = round2(gstAmt / 2)
        const sgstAmt = round2(gstAmt - cgstAmt)
        const grossAmt = round2(qty * rate)
        const discAmt = round2(grossAmt - taxable)

        // Optional warning check
        const expectedTaxable = qty * rate * (1 - 2 * discountPer / 100)
        if (Math.abs(taxable - expectedTaxable) > 0.10) {
          console.warn(`[patwariPdf] Row taxable differs from formula for ${productName}: taxable=${taxable}, expected=${expectedTaxable.toFixed(2)}`)
        }

        items.push({
          productName,
          prodCode: generateStableId('074', hsn, productName),
          pack,
          batch,
          qty,
          freeQty,
          rate,
          rawRate,
          grossAmt,
          mrp,
          hsn,
          expiry,
          discountPer,
          discAmt,
          taxable,
          cgstAmt,
          sgstAmt,
          gstPer
        })
      }

      // Items total check. A bill can have "Returns Adjusted In This Invoice" (credit note),
      // so Grand Total can be lower than the items. Compare with the printed Taxable + GST Tax
      // from the summary box (right side, label x >= 690) instead. Fall back to Grand Total
      // if those two boxes cannot be read.
      const readBoxAmount = (label) => {
        const labs = allItems.filter(it => it.x >= 690 && it.s.toLowerCase().startsWith(label))
        const lab = labs[labs.length - 1]
        if (!lab) return null
        const cand = allItems
          .filter(it => it.page === lab.page && Math.abs(it.y - lab.y) <= 3 && it.x > lab.x && /^-?[\d,]+\.\d+$/.test(it.s))
          .sort((a, b) => a.x - b.x)[0]
        return cand ? parseCleanFloat(cand.s) : null
      }
      const printedTaxable = readBoxAmount('taxable')
      const printedGst = readBoxAmount('gst tax')
      const expectedItemsTotal = (printedTaxable !== null && printedGst !== null)
        ? round2(printedTaxable + printedGst)
        : grandTotal
      if (Math.abs(sumNet - expectedItemsTotal) > 1.0) {
        return { error: 'The items in this PDF do not add up to the bill total, so it was not converted. Please send this bill to support.' }
      }

      // Rounding reconciliation (same as lines 99-109 of patwari.js)
      if (items.length > 0) {
        const currentTotal = items.reduce((sum, item) => sum + item.taxable + item.cgstAmt + item.sgstAmt, 0)
        const diff = grandTotal - currentTotal
        if (Math.abs(diff) < 1.0 && items[0].qty > 0) {
          items[0].taxable = round2(items[0].taxable + diff)
        }
      }

      return {
        items,
        metadata: {
          partyCode: 'PWP',
          partyName: 'PATWARI PHARMA PVT LTD',
          invoiceNo,
          date
        }
      }
    } catch (err) {
      console.error('[patwariPdf] mapPDFBuffer error:', err)
      return { error: 'Failed to process PDF: ' + (err.message || String(err)) }
    }
  }
}
