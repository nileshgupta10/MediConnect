 module.exports = {
    name: 'C G Marketing PDF',
    identifyPatterns: ['C G MARKETING PVT LTD', 'DISTRIBUTOR OF P & G', 'CGTAL-'],

    getMetadata: (lines) => {
      if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
      const cleaned = lines.map(x => String(x || '').trim()).filter(Boolean)
      const text = cleaned.join('\n')

      const invMatch = text.match(/\bCGTAL-\d{2}-I(\d{6})\b/i)
  const dateMatch = text.match(/Invoice Date:\s*(\d{2}-[A-Za-z]{3}-\d{4})/i)

  return {
    partyCode: 'CGM',
    partyName: 'C G MARKETING PVT LTD',
    invoiceNo: invMatch ? invMatch[1] : '000000',
    date: dateMatch ? dateMatch[1] : ''
  }
    },

    mapRows: (lines) => {
      if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
      const cleaned = lines.map(x => String(x || '').trim()).filter(Boolean)

      // ROW LAYOUT FIX: rows are seq, PCode(8-digit), Item Description (text),
      // HSN(8-digit), UPC, MRP, Cs, Pcs, PcPrice, GrossAmt, SCHAmt, Disc%, DiscAmt,
      // TaxableAmt, GST%, IGST/CGSTAmt, SGSTAmt, TCSAmt, NetAmt.
      // HSN is NOT adjacent to PCode — the item description sits between them —
      // so a row starts with seq + 8-digit PCode + a non-digit (the description).
      const merged = []
      for (let i = 0; i < cleaned.length; i++) {
        const line = cleaned[i]

        if (/^\d+\s+\d{8}\s+[^\d\s]/.test(line)) {
          const next = cleaned[i + 1] || ''

          // Some rows are wrapped; merge continuation line if needed
          if (!hasNumericTail(line) && next && !/^\d+\s+\d{8}\s+[^\d\s]/.test(next)) {
            merged.push(`${line} ${next}`.replace(/\s+/g, ' ').trim())
            i++
          } else {
            merged.push(line)
          }
        }
      }

      const items = []

      for (const line of merged) {
        const tokens = line.split(/\s+/)
        if (tokens.length < 18) continue

        const seq = tokens[0]
        const pcode = tokens[1]

        if (!/^\d+$/.test(seq) || !/^\d{8}$/.test(pcode)) continue

        // Tail now includes HSN as its first element (16 fields total), since
        // HSN comes after the description rather than being a fixed leading token.
        const tailLen = 16
        if (tokens.length <= 2 + tailLen) continue

        const descTokens = tokens.slice(2, tokens.length - tailLen)
        const tail = tokens.slice(tokens.length - tailLen)

        const [
          hsnToken,
          upcToken,
          mrpToken,
          csToken,
          pcsToken,
          pcPriceToken,
          grossAmtToken,
          schAmtToken,
          discPerToken,
          discAmtToken,
          taxableAmtToken,
          gstPerToken,
          cgstAmtToken,
          sgstAmtToken,
          tcsAmtToken,
          netAmtToken
        ] = tail

        if (!/^\d{6,8}$/.test(hsnToken)) continue

        const hsn = hsnToken
        const productName = descTokens.join(' ').trim()
        if (!productName) continue

        const pack = extractPack(descTokens)
        const pcs = num(pcsToken)
        const cs = num(csToken)
        // When Pcs=0 (wholesale/carton-only line), fall back to Cs count as qty
        const qty = pcs > 0 ? pcs : cs
        const rate = num(pcPriceToken)
        const mrp = num(mrpToken)
        const gstPer = num(gstPerToken)
        const cgstAmt = num(cgstAmtToken)
        const sgstAmt = num(sgstAmtToken)
        const discAmt = num(schAmtToken) + num(discAmtToken)

        items.push({
            productName: productName.substring(0, 30),
            prodCode: String(pcode || '').padStart(10, '0'),
            companyName: 'C G MARKETING PVT LTD',
            pack: pack || '1N',
            batch: '*',
            qty,
          freeQty: 0,
          rate,
          mrp: mrp || rate,
          hsn,
          expiry: '00/00',
          discountPer: grossPercent(num(grossAmtToken), discAmt),
          discAmt,
          taxable: num(taxableAmtToken),
          cgstAmt,
          sgstAmt,
          gstPer
        })
      }

      return items.filter(item => item.productName && item.qty > 0 && item.rate > 0)
    }
  }

  function hasNumericTail(line) {
    return /\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}$/.test(String(line || '').trim())
  }

  function num(value) {
    return parseFloat(String(value || '').replace(/,/g, '').trim()) || 0
  }

  function grossPercent(grossAmt, discAmt) {
    if (!grossAmt || grossAmt <= 0 || !discAmt || discAmt <= 0) return 0
    return +((discAmt / grossAmt) * 100).toFixed(2)
  }

  function extractPack(descTokens) {
    const joined = descTokens.join(' ').trim()
    const patterns = [
      /\b\d+\s?(?:ML|GM|G|KG)\b/i,
      /\b\d+s\b/i,
      /\b(?:XXXL|XXL|XL|LG|MD|SM|NB)\b/i,
      /\b(?:Disp|Pk)\b/i
    ]

    for (const pattern of patterns) {
      const m = joined.match(pattern)
      if (m) return m[0].replace(/\s+/g, '').substring(0, 6)
    }

    const last = descTokens[descTokens.length - 1] || ''
    return String(last).substring(0, 6) || '1N'
  }