/**
   * MANSHI LEAP PDF PROTOCOL
   * Handles the tabular LEAP-style invoice format used by Manshi Agencies.
   */

  const { generateStableId } = require('../../utils/stableId');

  module.exports = {
    name: 'Manshi Leap PDF',
    identifyPatterns: ['PRODUCT DESCRIPTION', 'HIMALAYA WELLNESS COMPANY', 'INVOICE NO:'],

    getMetadata: (lines) => {
      if (!Array.isArray(lines)) lines = String(lines).split('\n');

      const invoiceIdx = lines.findIndex(x => String(x || '').trim() === 'INVOICE NO:');
      const dateIdx = lines.findIndex(x => String(x || '').trim() === 'INVOICE DATE:');
      const invoiceRaw = invoiceIdx !== -1 ? String(lines[invoiceIdx + 1] || '').trim() : '000000';
      const date = dateIdx !== -1 ? String(lines[dateIdx + 1] || '').trim() : '';
      const invoiceDigits = invoiceRaw.replace(/\D/g, '');

      return {
        partyCode: 'MAN',
        partyName: 'MANSHI AGENCIES',
        invoiceNo: invoiceDigits ? invoiceDigits.slice(-6) : '000000',
        sourceInvoiceNo: invoiceRaw,
        date
      };
    },

    mapRows: (lines) => {
      if (!Array.isArray(lines)) lines = String(lines).split('\n');
      const items = [];

      const totalIdx = lines.findIndex(x => String(x || '').trim() === 'TOTAL');
      let i = 0;

      while (i < lines.length) {
        const seq = String(lines[i] || '').trim();
        const next = String(lines[i + 1] || '').trim();
        if (!/^\d+$/.test(seq) || !/^\d{6,10}$/.test(next)) {
          i++;
          continue;
        }
        if (totalIdx !== -1 && i >= totalIdx) break;

        const hsn = next;
        let j = i + 2;

        while (j < lines.length) {
          const candidate = String(lines[j] || '').trim();
          const following = String(lines[j + 1] || '').trim();
          if (/^\d+(\.\d+)?$/.test(candidate) && /^\d+$/.test(following)) break;
          j++;
        }
        if (j >= lines.length) break;

        const descriptionLines = lines.slice(i + 2, j).map(x => String(x || '').trim()).filter(Boolean);
        const mrp = parseFloat(String(lines[j] || '').trim()) || 0;
        const qty = parseFloat(String(lines[j + 1] || '').trim()) || 0;
        const rate = parseFloat(String(lines[j + 2] || '').trim()) || 0;
        const gross = parseFloat(String(lines[j + 3] || '').trim()) || 0;

        let blockEnd = totalIdx !== -1 ? totalIdx - 1 : lines.length - 1;
        for (let scan = j + 4; scan < lines.length; scan++) {
          const maybeSeq = String(lines[scan] || '').trim();
          const maybeHsn = String(lines[scan + 1] || '').trim();
          if (/^\d+$/.test(maybeSeq) && /^\d{6,10}$/.test(maybeHsn)) {
            blockEnd = scan - 1;
            break;
          }
          if (String(lines[scan] || '').trim() === 'TOTAL') {
            blockEnd = scan - 1;
            break;
          }
        }

        const numericTail = [];
        for (let k = j + 4; k <= blockEnd; k++) {
          const token = String(lines[k] || '').trim();
          if (/^\d+(\.\d+)?$/.test(token)) {
            numericTail.push({ idx: k, value: parseFloat(token) });
          }
        }

        if (numericTail.length < 5) break;

        const tail = numericTail.slice(-5);
        const discAmt = tail[0].value;
        const taxable = tail[1].value;
        const gstPer = tail[2].value;
        const gstAmt = tail[3].value;
        const netAmt = tail[4].value;

        const productName = descriptionLines.join(' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim();
        const pack = extractPack(descriptionLines);
        const discountPer = gross > 0 ? +(((gross - taxable) / gross) * 100).toFixed(2) : 0;
        const cgstAmt = +(gstAmt / 2).toFixed(2);
        const sgstAmt = +(gstAmt / 2).toFixed(2);
        const prodCode = generateStableId('746', hsn, `${productName} ${pack}`);

        items.push({
          productName: productName.substring(0, 30),
          prodCode,
          qty,
          freeQty: 0,
          rate: qty > 0 ? +(taxable / qty).toFixed(4) : rate,
          mrp: mrp || rate,
          pack,
          hsn,
          expiry: '00/00',
          discountPer: 0,
          cgstAmt,
          sgstAmt,
          gstPer,
          taxable,
          netAmt,
          discAmt,
          rawRate: rate
        });

        i = blockEnd + 1;
      }

      return items;
    }
  };

  function extractPack(descriptionLines) {
    for (let idx = descriptionLines.length - 1; idx >= 0; idx--) {
      const line = descriptionLines[idx];
      if (/^(?:\d+\s*)?(ML|GM|G|KG|N|JAR|PCS|PC|TAB|TABS|S|'S)/i.test(line)) return line.substring(0, 6);
      if (/\b\d+(ML|GM|G|KG|N)\b/i.test(line)) {
        const m = line.match(/\b\d+(ML|GM|G|KG|N)\b/i);
        if (m) return m[0].substring(0, 6);
      }
      if (/25'S|10'S|12X12|1N/i.test(line)) return line.substring(0, 6);
    }
    return '1N';
  }