/**
 * MANSHI LEAP PDF PROTOCOL (unpdf layout optimized)
 */

const { generateStableId } = require('../../utils/stableId')

function parseLeapItems(lines) {
  const items = []
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i]
    
    // An item starts with a serial number and HSN code: e.g. "1 33061020 "
    const startMatch = line.match(/^(\d+)\s+(\d{8})(?:\s+(.*))?$/)
    if (!startMatch) {
      i++
      continue
    }

    const seq = parseInt(startMatch[1])
    const hsn = startMatch[2]
    let remainder = (startMatch[3] || '').trim()
    
    let j = i
    let tailLine = ''
    
    while (j < lines.length) {
      const currentLine = lines[j]
      const tokens = currentLine.split(' ').map(x => x.trim()).filter(Boolean)
      const lastToken = tokens[tokens.length - 1] || ''
      if (lastToken.includes('+')) {
        tailLine = currentLine
        break
      }
      j++
    }
    
    if (!tailLine) {
      i++
      continue
    }

    // Now collect description
    const descParts = []
    if (j > i) {
      if (remainder) descParts.push(remainder)
      for (let k = i + 1; k < j; k++) {
        descParts.push(lines[k])
      }
    }
    
    // Parse tail line
    const tailTokens = tailLine.split(' ').map(x => x.trim()).filter(Boolean)
    const lastToken = tailTokens[tailTokens.length - 1]
    
    const numericTokens = []
    let firstNumericIdx = -1
    let startIdx = (j === i) ? 2 : 0
    
    for (let k = startIdx; k < tailTokens.length - 1; k++) {
      if (/^\d+(\.\d+)?$/.test(tailTokens[k])) {
        numericTokens.push(parseFloat(tailTokens[k]))
        if (firstNumericIdx === -1) {
          firstNumericIdx = k
        }
      }
    }
    
    if (firstNumericIdx > startIdx) {
      descParts.push(tailTokens.slice(startIdx, firstNumericIdx).join(' '))
    } else if (firstNumericIdx === -1 && tailTokens.length > startIdx) {
      descParts.push(tailTokens.slice(startIdx, -1).join(' '))
    }
    
    const description = descParts.join(' ').replace(/\s+/g, ' ').trim()
    
    const gross = parseFloat(tailTokens[tailTokens.length - 2]) || 0
    const rate = parseFloat(tailTokens[tailTokens.length - 3]) || 0
    const qty = parseFloat(tailTokens[tailTokens.length - 4]) || 0
    
    let mrp = 0
    const mrpIndex = tailTokens.length - 5
    if (mrpIndex >= 0) {
      mrp = parseFloat(tailTokens[mrpIndex]) || 0
      const prevMrpIndex = mrpIndex - 1
      if (prevMrpIndex >= 0 && /^\d+(\.\d+)?$/.test(tailTokens[prevMrpIndex]) && firstNumericIdx <= prevMrpIndex) {
        mrp = parseFloat(tailTokens[prevMrpIndex]) || mrp
      }
    }

    // NEXT line contains remaining fields
    const nextLineIdx = j + 1
    if (nextLineIdx >= lines.length) break
    
    const nextLine = lines[nextLineIdx]
    const nextTokens = nextLine.split(' ').map(x => x.trim()).filter(Boolean)
    
    if (nextTokens.length < 5) {
      i = j + 1
      continue
    }
    
    const discAmt = parseFloat(nextTokens[nextTokens.length - 5]) || 0
    const taxable = parseFloat(nextTokens[nextTokens.length - 4]) || 0
    const gstPer = parseFloat(nextTokens[nextTokens.length - 3]) || 0
    const gstAmt = parseFloat(nextTokens[nextTokens.length - 2]) || 0
    const netAmt = parseFloat(nextTokens[nextTokens.length - 1]) || 0
    
    let pack = '1N'
    const patterns = [
      /\b\d+\s?(?:ML|GM|G|KG|TABS|TAB|S|'S)\b/i,
      /\b\d+s\b/i,
      /\b(?:XXXL|XXL|XL|LG|MD|SM|NB)\b/i,
      /\b(?:Disp|Pk|JAR)\b/i
    ]
    for (const pattern of patterns) {
      const m = description.match(pattern)
      if (m) {
        pack = m[0].replace(/\s+/g, '').substring(0, 6)
        break
      }
    }

    items.push({
      productName: description.substring(0, 30),
      prodCode: generateStableId('746', hsn || description, description),
      qty,
      freeQty: 0,
      rate: qty > 0 ? +(taxable / qty).toFixed(4) : rate,
      mrp: mrp || rate,
      pack,
      hsn,
      discountPer: gross > 0 ? +(((gross - taxable) / gross) * 100).toFixed(2) : 0,
      cgstAmt: +(gstAmt / 2).toFixed(2),
      sgstAmt: +(gstAmt / 2).toFixed(2),
      gstPer,
      taxable,
      netAmt
    })
    
    i = nextLineIdx + 1
  }
  
  return items
}

module.exports = {
  name: 'Manshi Leap PDF',
  identifyPatterns: ['HIMALAYA WELLNESS COMPANY', 'PRODUCT DESCRIPTION'],

  getMetadata: (lines) => {
    const arr = Array.isArray(lines) ? lines : String(lines || '').split('\n')
    const text = arr.map(l => String(l || '').trim()).filter(Boolean).join(' ')
    const invMatch = text.match(/INVOICE\s*NO\.?\s*:\s*([A-Z0-9/-]+)/i)
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
    return parseLeapItems(cleaned)
  }
}
