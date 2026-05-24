/**
   * MANSHI AGENCIES PDF PROTOCOL
   * Parses item blocks using the HSN/taxable/amount tail as the anchor.
   */

  const { generateStableId } = require('../../utils/stableId');

  function cleanLines(lines) {
    return (Array.isArray(lines) ? lines : String(lines || '').split('\n'))
      .map(line => String(line || '').trim())
      .filter(Boolean);
  }

  function isRowStart(line, nextLine) {
    const text = String(line || '').trim();
    const next = String(nextLine || '').trim();
    return (
      /^\d+\s+\d{6,10}\b/.test(text) ||
      (/^\d+$/.test(text) && /^\d{6,10}\b/.test(next))
    );
  }

  function extractPack(text) {
    const raw = String(text || '');
    const patterns = [
  /\b\d{1,4}(?:X\d+)?(?:ML|GM|G|KG|MG|L|N|PCS|PC|TAB|TABS|UNIT)\b/ig,
  /\b(?:XXL|XL|L|M|S|P)\s*=\s*\d+\b/ig,
  /\b\d+'\s*S\b/ig,
  /\b(?:PCS|PC|UNIT|PADS)\b/ig,
  /\b\d+X\d+[A-Z0-9'/-]*\b/ig,
  /\b\d{1,2}[A-Z]{1,4}\b/ig
];

    for (const pattern of patterns) {
      const matches = raw.match(pattern);
      if (matches && matches.length) {
        const candidate = matches[matches.length - 1].replace(/^0+/, '').substring(0, 6);
        if (!candidate) continue;
        return candidate.toUpperCase();
      }
    }
    return '10T';
  }

  function parseRowLine(line) {
    const text = String(line || '').replace(/\s+/g, ' ').trim();
    if (!text || !/\d{7,}/.test(text)) return null;

    const qtyMatch = text.match(/^(.+?)\s+(\d{1,3})\s+(.*)$/);
    if (!qtyMatch) return null;

    const productName = qtyMatch[1].trim();
    const qty = parseFloat(qtyMatch[2]);
    const rest = qtyMatch[3];
    const hsnRuns = rest.match(/\d{7,}/g); if (!hsnRuns || !hsnRuns.length) return null; const hsnRun = hsnRuns[hsnRuns.length - 1]; let hsn = hsnRun.slice(-8); if (hsn.length === 7) hsn = '0' + hsn;
    const hsnStart = rest.lastIndexOf(hsnRun);
    const beforeHsn = rest.slice(0, hsnStart).trim();
    const afterHsn = rest.slice(hsnStart + hsnRun.length).trim();
    const beforeNums = (beforeHsn.match(/\d+\.\d{2}/g) || []).map(Number);
    const afterNums = (afterHsn.match(/\d+(?:\.\d+)?/g) || []).map(Number);

    if (!qty || afterNums.length === 0) return null;

    const pack = extractPack(`${productName} ${beforeHsn} ${afterHsn}`);
    const mrpHint = (productName.match(/\bMRP\s*=\s*(\d+(?:\.\d+)?)/i) || [])[1];
    let mrp = beforeNums.length > 1 ? beforeNums[1] : (beforeNums[0] || 0);
    if ((!mrp || mrp < 1) && mrpHint) mrp = parseFloat(mrpHint) || mrp;
    let taxable = afterNums.length >= 1
  ? afterNums[0]
  : (qty > 0 && beforeNums.length > 0 ? qty * beforeNums[0] : 0);
let amount = afterNums.length >= 1
  ? afterNums[afterNums.length - 1]
  : taxable;
    let gstPer = taxable > 0 ? +(((Math.max(amount - taxable, 0)) / taxable) * 100).toFixed(2) : 0;

    if (afterNums.length === 2 && afterNums[0] > 0 && afterNums[0] <= 28 && afterNums[1] > 50) {
      gstPer = +afterNums[0].toFixed(2);
      amount = afterNums[1];
      taxable = gstPer > 0 ? +(amount / (1 + (gstPer / 100))).toFixed(2) : amount;
    }

    const gstTotal = Math.max(amount - taxable, 0);
    const gstAmt = +(gstTotal / 2).toFixed(2);
    const rate = qty > 0 ? +(taxable / qty).toFixed(4) : 0;
    const prodCode = generateStableId('747', hsn, `${productName} ${pack}`);

    return {
      productName,
      prodCode,
      qty,
      freeQty: 0,
      rate,
      mrp,
      pack,
      hsn,
      expiry: '00/00',
discountPer: taxable > 0 && beforeNums.length > 0 ? +(((qty * beforeNums[0] - taxable) / (qty * beforeNums[0])) * 100).toFixed(2) : 0,
rawRate: beforeNums[0] || rate,      cgstAmt: gstAmt,
      sgstAmt: gstAmt,
      gstPer,
      taxable,
      amount
    };
  }

  module.exports = {
    name: 'Manshi Agencies PDF',
    identifyPatterns: ['MANSHI AGENCIES', 'CC-'],

    getMetadata: (lines) => {
      const text = cleanLines(lines).join(' ');
      const invMatch = text.match(/CC-(\d+)/i) || text.match(/Invoice No\.?\s*:\s*([A-Z0-9/-]+)/i);
      const dateMatch =
        text.match(/(\d{2}\/\d{2}\/\d{2,4})/) ||
        text.match(/(\d{2}-[A-Za-z]{3}-\d{4})/i) ||
        text.match(/(\d{2}-\d{2}-\d{4})/);
      return {
        partyCode: 'MAN',
        partyName: 'MANSHI AGENCIES',
        invoiceNo: invMatch ? String(invMatch[1]).replace(/\D/g, '') : '000000',
        date: dateMatch ? dateMatch[1] : ''
      };
    },

    mapRows: (lines) => {
      const cleaned = cleanLines(lines);
      let capture = false;
      const items = [];

      for (const line of cleaned) {
        if (line.includes('RAJESHWAR NAMAH')) {
          capture = true;
          continue;
        }
        if (!capture) continue;
        if (line.includes('Auth.Signatory') || line.startsWith('NET AMT.')) {
          capture = false;
          continue;
        }

        const parsed = parseRowLine(line);
        if (!parsed) continue;
        items.push({
          productName: parsed.productName.substring(0, 30),
          prodCode: parsed.prodCode,
          qty: parsed.qty,
          freeQty: parsed.freeQty,
          rate: parsed.rate,
          mrp: parsed.mrp,
          pack: parsed.pack || '10T',
          hsn: parsed.hsn,
          expiry: '00/00',
          discountPer: parsed.discountPer,
          cgstAmt: parsed.cgstAmt,
          sgstAmt: parsed.sgstAmt,
          gstPer: parsed.gstPer,
          rawRate: parsed.rawRate,
          taxable: parsed.taxable,
          discAmt: parsed.cgstAmt + parsed.sgstAmt > 0
            ? Math.max((parsed.qty * (parsed.rawRate || parsed.rate)) - parsed.taxable, 0)
            : 0
        });
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

function extractNetAmount(lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || '').trim();
    const inlineMatch = line.match(/^NET AMT\.?\s+([0-9,]+(?:\.[0-9]+)?)/i);
    if (inlineMatch) {
      const val = parseFloat(inlineMatch[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }
    if (line === 'NET AMT.') {
      const val = parseFloat(String(lines[i + 1] || '').trim().replace(/,/g, ''));
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
