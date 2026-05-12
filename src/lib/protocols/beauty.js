/**
   * BEAUTY COSMETICS PDF PROTOCOL
   * Handles duplicated line extraction from MARG-style GST invoice PDFs.
   */

  const { generateStableId } = require('../utils/stableId');

  function dedupeAdjacent(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const curr = String(lines[i] || '').trim();
      if (!curr) continue;
      if (out.length > 0 && out[out.length - 1] === curr) continue;
      out.push(curr);
    }
    return out;
  }

  module.exports = {
    name: 'Beauty Cosmetics PDF',
    identifyPatterns: ['BEAUTY COSMETICS', 'A020699', 'MARG'],

    getMetadata: (lines) => {
      const cleaned = dedupeAdjacent(Array.isArray(lines) ? lines : String(lines).split('\n'));
      let invoiceNo = '000000';
      let date = '';

      for (let i = 0; i < cleaned.length; i++) {
        const curr = cleaned[i];
        const next = cleaned[i + 1] || '';
        const next2 = cleaned[i + 2] || '';

        if (/^Invoice No\.?$/i.test(curr)) {
          if (/^:\s*[A-Z0-9/-]+$/i.test(next)) {
            invoiceNo = next.replace(/^:\s*/i, '').trim();
          } else if (next === ':' && /^[A-Z0-9/-]+$/i.test(next2)) {
            invoiceNo = next2;
          } else if (/^[A-Z0-9/-]+$/i.test(next)) {
            invoiceNo = next;
          }
        }

        if (/^Date$/i.test(curr)) {
          if (/^:\s*\d{2}-\d{2}-\d{4}$/.test(next)) {
            date = next.replace(/^:\s*/, '').trim();
          } else if (next === ':' && /^\d{2}-\d{2}-\d{4}$/.test(next2)) {
            date = next2;
          } else if (/^\d{2}-\d{2}-\d{4}$/.test(next)) {
            date = next;
          }
        }
      }

      return {
        partyCode: 'BCS',
        partyName: 'BEAUTY COSMETICS',
        invoiceNo,
        date
      };
    },

    mapRows: (lines) => {
      if (!Array.isArray(lines)) lines = lines.split('\n');
      const cleaned = dedupeAdjacent(lines);
      const items = [];

      let startIdx = -1;
      for (let i = 0; i < cleaned.length; i++) {
        if (
          cleaned[i] === 'Sr No' &&
          cleaned[i + 1] === 'Product Name' &&
          cleaned[i + 2] === 'Pack'
        ) {
          startIdx = i + 8;
          break;
        }
      }

      if (startIdx === -1) return [];

      for (let i = startIdx; i < cleaned.length; i++) {
        const line = cleaned[i];

        if (line.includes('SUB TOTAL') || line.includes('GRAND TOTAL')) break;
        if (!/^\d+\.$/.test(line)) continue;

        const productName = (cleaned[i + 1] || '')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .trim();
        const pack = (cleaned[i + 2] || '').trim();
        const mrp = parseFloat(cleaned[i + 3]) || 0;
        const qty = parseFloat(cleaned[i + 4]) || 0;
        const hsn = (cleaned[i + 5] || '').trim();
        const rate = parseFloat(cleaned[i + 6]) || 0;
        const discountPer = parseFloat(cleaned[i + 7]) || 0;
        const gstPer = parseFloat(cleaned[i + 8]) || 0;
        const amount = parseFloat(cleaned[i + 9]) || 0;

        if (!productName || qty <= 0 || rate <= 0) continue;

        const taxAmt = amount * (gstPer / 100);
        const prodCode = generateStableId('858', hsn, productName);

        items.push({
          productName: productName.substring(0, 30),
          prodCode,
          pack: pack || '1N',
          batch: '',
          qty,
          freeQty: 0,
          rate,
          mrp: mrp || rate,
          hsn: hsn || '30049099',
          expiry: '00/00',
          discountPer,
          cgstAmt: taxAmt / 2,
          sgstAmt: taxAmt / 2,
          gstPer: gstPer || 18
        });

        i += 9;
      }

      return items;
    }
  };