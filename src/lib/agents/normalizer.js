/**
   * DATA NORMALIZATION AGENT
   * Converts raw extracted distributor data into the standard internal schema.
   * Enforces business rules like VOU_NO=actual, VOU_TYPE='CRB', and stable IDs.
   */

  class Normalizer {
    /**
     * Normalizes raw items based on protocol instructions.
     * @param {Array} rawItems - Extracted items from the Parser.
     * @param {Object} metadata - Metadata from Input Detection (party code, date, etc.)
     * @returns {Array} Normalized records ready for validation.
     */
    normalize(rawItems, metadata) {
      const { partyCode, partyName, date, invoiceNo } = metadata
      const formattedDate = this._formatDate(date)
      const vouNo = String(invoiceNo || '0').replace(/[^0-9]/g, '').substring(0, 6)

      return rawItems.map((item) => {
        const productName = String(item.productName || '').trim().toUpperCase()

        let prodCode = item.prodCode || productName.replace(/\s+/g, '').substring(0, 10)
        if (prodCode.length > 10) prodCode = prodCode.substring(0, 10)

        const finalBatch = (item.batch && String(item.batch).trim())
          ? String(item.batch).trim().substring(0, 15)
          : '*'

        const qty = parseFloat(item.qty) || 0
        const rate = parseFloat(item.rate) || 0
        const mrp = parseFloat(item.mrp) || 0
        const discPer = parseFloat(item.discountPer) || 0
        const validGST = [0, 5, 12, 18, 28]
        const parsedGST = parseFloat(item.gstPer)
        const gstPer = (() => {
          if (!isFinite(parsedGST)) return 0
          if (validGST.includes(parsedGST)) return parsedGST
          let closest = 0
          let minDiff = Infinity
          for (const rate of validGST) {
            const diff = Math.abs(rate - parsedGST)
            if (diff < minDiff) {
              minDiff = diff
              closest = rate
            }
          }
          return minDiff <= 0.5 ? closest : 0
        })()

        const grossAmt = qty * rate
        const discAmt = grossAmt * (discPer / 100)
        const taxableAmt = grossAmt - discAmt

        let finalCgstAmt = item.cgstAmt !== undefined ? item.cgstAmt : (taxableAmt * (gstPer / 200))
        let finalSgstAmt = item.sgstAmt !== undefined ? item.sgstAmt : (taxableAmt * (gstPer / 200))

        if (!isFinite(finalCgstAmt)) finalCgstAmt = 0
        if (!isFinite(finalSgstAmt)) finalSgstAmt = 0

        return {
          PARTYCODE: String(partyCode || 'GEN').substring(0, 3).toUpperCase(),
          NAME: String(partyName || 'GENERIC DISTRIBUTOR').substring(0, 40).toUpperCase(),
          ADD1: 'INDIA',
          VOU_NO: vouNo.padStart(6, ' '),
          VOU_TYPE: 'CRB',
          TR_DATE: formattedDate,
          DUE_DATE: formattedDate,
          PROD_CODE: prodCode.toUpperCase().substring(0, 10),
          PROD_NAME: productName.substring(0, 30),
          COMP_NAME: String(item.companyName || 'UNKNOWN').substring(0, 30).toUpperCase(),
          PAK: String(item.pack || '10T').substring(0, 6),
          UOM: '1',
          COMP: String(partyCode || 'GEN').substring(0, 3).toUpperCase(),
          QTY: qty,
          QTY_SCM: parseFloat(item.freeQty) || 0,
          DISC_SCM: 0,
          PR_BATCHNO: finalBatch,
          EXPIRY: item.expiry || '00/00',
          RATE: rate,
          MRP: mrp,
          DISCOUNT: discPer,
          DISC_AMT: discAmt,
          PR_PTR: rate,
          SPL_DISC: 0,
          SURCHARGE: 0,
          DISC_PER: discPer,
          CASH_DISC: 0,
          CR_AMT: 0,
          PTS_PER: 0,
          PTS_AMT: 0,
          DEBIT: taxableAmt + finalCgstAmt + finalSgstAmt,
          GROS_AMT: grossAmt,
          CAT_CODE: 'GEN',
          FREIGHT: 0,
          BAR_CODE: ''.padEnd(50, ' '),
          HSNCODE: String(item.hsn || '30049099').substring(0, 15),
          SGST: gstPer / 2,
          CGST: gstPer / 2,
          IGST: 0,
          SGSTAMT: finalSgstAmt,
          CGSTAMT: finalCgstAmt,
          IGSTAMT: 0,
          SHELF_NO: '',
          _NullFlags: Buffer.from([0x00])
        }
      })
    }

    /**
     * Internal: Normalizes various date formats to YYYYMMDD
     */
    _formatDate(dateInput) {
      if (!dateInput) return new Date().toISOString().slice(0, 10).replace(/-/g, '')

      const raw = String(dateInput).trim()
      const normalizedMonth = raw.replace(
        /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\b/i,
        (m) => ({
          JAN: '01',
          FEB: '02',
          MAR: '03',
          APR: '04',
          MAY: '05',
          JUN: '06',
          JUL: '07',
          AUG: '08',
          SEP: '09',
          SEPT: '09',
          OCT: '10',
          NOV: '11',
          DEC: '12'
        })[m.toUpperCase()]
      )

      const clean = normalizedMonth.replace(/[A-Za-z\s,]/g, '').replace(/[/-]/g, '')

      if (/^\d{2}\/\d{2}\/\d{2}$/.test(raw) || /^\d{2}-\d{2}-\d{2}$/.test(raw)) {
        const parts = raw.split(/[/-]/)
        return `20${parts[2]}${parts[1]}${parts[0]}`
      }

      const monthNameMatch = raw.match(/^(\d{2})[- ]([A-Za-z]{3,4})[- ](\d{4})$/)
      if (monthNameMatch) {
        const day = monthNameMatch[1]
        const monthText = monthNameMatch[2].toUpperCase()
        const year = monthNameMatch[3]
        const month = {
          JAN: '01',
          FEB: '02',
          MAR: '03',
          APR: '04',
          MAY: '05',
          JUN: '06',
          JUL: '07',
          AUG: '08',
          SEP: '09',
          SEPT: '09',
          OCT: '10',
          NOV: '11',
          DEC: '12'
        }[monthText]
        if (month) return `${year}${month}${day}`
      }

      if (clean.length === 8) {
        if (clean.startsWith('20')) {
          const month = parseInt(clean.substring(4, 6))
          if (month >= 1 && month <= 12) {
            return clean
          }
        }
        return clean.substring(4, 8) + clean.substring(2, 4) + clean.substring(0, 2)
      }

      return new Date().toISOString().slice(0, 10).replace(/-/g, '')
    }
  }

  module.exports = new Normalizer()
