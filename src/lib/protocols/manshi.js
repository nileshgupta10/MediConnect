/**
   * MANSHI AGENCIES PDF PROTOCOL
   * Parses item blocks using the HSN/taxable/amount tail as the anchor.
   */

  const { generateStableId } = require('../utils/stableId');

  module.exports = {
    name: 'Manshi Agencies PDF',
    identifyPatterns: ['MANSHI AGENCIES', 'CC-'],

    getMetadata: (lines) => {
      // text is passed as array of lines here
      const text = Array.isArray(lines) ? lines.join(' ') : lines;
      const invMatch = text.match(/CC-(\d+)/);
      const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{2})/);
      return {
        partyCode: 'MAN',
        partyName: 'MANSHI AGENCIES',
        invoiceNo: invMatch ? invMatch[1] : '000000',
        date: dateMatch ? dateMatch[1] : ''
      };
    },

    mapRows: (lines) => {
      if (!Array.isArray(lines)) lines = lines.split('\n');
      const items = [];
      const pageStarts = [];
      for (let i = 0; i < lines.length; i++) {
        if (String(lines[i] || '').includes('RAJESHWAR NAMAH')) pageStarts.push(i);
      }

      const segments = pageStarts.length ? pageStarts : [0];
      for (const segmentStart of segments) {
        let segmentEnd = lines.length - 1;
        for (let j = segmentStart + 1; j < lines.length; j++) {
          const candidate = String(lines[j] || '').trim();
          if (candidate.includes('Auth.Signatory') || candidate.includes('NET AMT.')) {
            segmentEnd = j - 1;
            break;
          }
        }

        for (let i = segmentStart + 1; i <= segmentEnd; i++) {
          const line = String(lines[i] || '').trim();
          const nextLine = String(lines[i + 1] || '').trim();
          if (!isProductStart(line, nextLine)) continue;

          let endIdx = segmentEnd;
          for (let j = i + 1; j <= segmentEnd; j++) {
            const candidate = String(lines[j] || '').trim();
            const following = String(lines[j + 1] || '').trim();
            if (isProductStart(candidate, following)) {
              endIdx = j - 1;
              break;
            }
          }

          const block = lines.slice(i, endIdx + 1).map(x => String(x || '').trim()).filter(Boolean);
          const parsed = parseItemBlock(block);
          if (!parsed) continue;

          const uniqueProdCode = generateStableId('747', parsed.hsn, `${parsed.productName} ${parsed.pack}`);
          items.push({
            productName: parsed.productName.substring(0, 30),
            prodCode: uniqueProdCode,
            qty: parsed.qty,
            freeQty: parsed.freeQty,
            rate: parsed.qty > 0 ? (parsed.taxable / parsed.qty) : parsed.rate,
            mrp: parsed.mrp,
            pack: parsed.pack || '10T',
            hsn: parsed.hsn,
            expiry: '00/00',
            discountPer: 0,
            cgstAmt: parsed.cgstAmt,
            sgstAmt: parsed.sgstAmt,
            gstPer: parsed.gstPer
          });

          i = endIdx;
        }
      }

      const targetTotal = extractNetAmount(lines);
      if (items.length > 0 && targetTotal > 0) {
        const currentTotal = items.reduce((sum, item) => {
          return sum + (item.qty * item.rate) + item.cgstAmt + item.sgstAmt;
        }, 0);
        const diff = targetTotal - currentTotal;

        if (Math.abs(diff) < 2) {
          items[0].rate += (diff / items[0].qty);
        }
      }

      return items;
    }
  };

  function parseItemBlock(block) {
    if (block.length < 11) return null;

    const productName = block[0];
    const qty = parseFloat(block[1]);
    const rate = parseFloat(block[2]);
    const mrp = parseFloat(block[3]);

    if (!productName || isNaN(qty) || isNaN(rate) || isNaN(mrp)) return null;

    const numeric = (value) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };

    let hsnIdx = -1;
    for (let idx = block.length - 3; idx >= 4; idx--) {
      if (/^\d{4,8}$/.test(block[idx])) {
        hsnIdx = idx;
        break;
      }
    }
    if (hsnIdx === -1) return null;

    const amount = numeric(block[block.length - 1]) || 0;
    const taxable = numeric(block[block.length - 2]) || 0;
    const hasDiscAfterHsn = hsnIdx === block.length - 4;
    const discountPer = hasDiscAfterHsn ? (numeric(block[hsnIdx + 1]) || 0) : 0;

    const sgstRate = numeric(block[hsnIdx - 1]) || 0;
    const sgstAmt = numeric(block[hsnIdx - 2]) || 0;
    const cgstAmt = numeric(block[hsnIdx - 3]) || 0;
    const cgstRate = numeric(block[hsnIdx - 4]) || 0;
    const gstPer = cgstRate + sgstRate;

    const preTaxTokens = block.slice(4, Math.max(4, hsnIdx - 4));
    let freeQty = 0;
    let pack = '10T';

    if (preTaxTokens.length === 1) {
      pack = preTaxTokens[0];
    } else if (preTaxTokens.length >= 2) {
      const maybeFree = numeric(preTaxTokens[0]);
      if (maybeFree !== null && !/[A-Z]/i.test(preTaxTokens[0]) && /[A-Z*]/i.test(preTaxTokens[1])) {
        freeQty = maybeFree;
        pack = preTaxTokens[1];
      } else {
        pack = preTaxTokens[0];
      }
    }

    if (pack === '*****') pack = 'PC';

    return {
      productName,
      qty,
      freeQty,
      rate,
      mrp,
      pack,
      hsn: block[hsnIdx],
      discountPer,
      taxable,
      amount,
      cgstAmt,
      sgstAmt,
      gstPer
    };
  }

  function extractNetAmount(lines) {
    for (let i = 0; i < lines.length; i++) {
      if (String(lines[i] || '').trim() === 'NET AMT.') {
        const val = parseFloat(String(lines[i + 1] || '').trim());
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  }

  function isProductStart(line, nextLine) {
    const qty = parseFloat(nextLine);
    return !!(
      line &&
      line.length > 5 &&
      /[A-Z]/i.test(line) &&
      isNaN(parseFloat(line)) &&
      !isNaN(qty) &&
      qty > 0 &&
      qty < 1000
    );
  }