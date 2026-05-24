/**
   * MANSHI LEAP PDF PROTOCOL
   * Handles the tabular LEAP-style invoice format used by Manshi Agencies.
   */

  const { generateStableId } = require('../../utils/stableId');

  function cleanLines(input) {
    return (Array.isArray(input) ? input : String(input || '').split('\n'))
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

  function isFooterLine(line) {
    return /^(TOTAL\b|STOCKIST FOR\b|PAYMENT TYPE\b|SALESMAN:\b|Rupees\b|For MANSHI AGENCIES\b|GTG1 Page No\b|MANSHI AGENCIES\b|PLOT NO\b|STATE:\b|GSTIN:\b|TEL NO:\b|MOBILE:\b|E-MAIL:\b|DL NO:\b|TAX INVOICE\b|INVOICE NO:\b|INVOICE DATE:\b|PO NO\.\s*:?\b|Program Type\b|EWAY\b|BILL&DATE\b)/i.test(String(line || '').trim());
  }

  function extractPack(text) {
    const raw = String(text || '');
    const patterns = [
      /\b\d{1,4}(?:X\d+)?(?:ML|GM|G|KG|MG|L|N|PCS|PC|TAB|TABS|UNIT)\b/ig,
      /\b(?:XXL|XL|L|M|S|P)\s*=\s*\d+\b/ig,
      /\b\d+'\s*S\b/ig,
      /\b(?:PCS|PC|UNIT|PADS)\b/ig,
      /\b\d+X\d+[A-Z0-9'/-]*\b/ig,
      /\b\d+[A-Z]{1,3}\b/ig
    ];

    for (const pattern of patterns) {
      const matches = raw.match(pattern);
      if (matches && matches.length) {
        const candidate = matches[matches.length - 1].replace(/^0+/, '').substring(0, 6);
        if (!candidate) continue;
        return candidate.toUpperCase();
      }
    }
    return '1N';
  }

  function buildRowChunks(lines) {
    const chunks = [];
    let current = [];

    for (let i = 0; i < lines.length; i++) {
      const line = String(lines[i] || '').trim();
      if (!line) continue;
      if (isFooterLine(line)) break;

      const nextLine = String(lines[i + 1] || '').trim();
      if (isRowStart(line, nextLine)) {
        if (current.length) chunks.push(current);
        current = [line];
        if (/^\d+$/.test(line) && /^\d{6,10}\b/.test(nextLine)) {
          current.push(nextLine);
          i++;
        }
        continue;
      }

      if (current.length) current.push(line);
    }

    if (current.length) chunks.push(current);
    return chunks;
  }

  function parseRowChunk(chunkLines) {
    const text = chunkLines.join(' ').replace(/\s+/g, ' ').trim();
    const startMatch = text.match(/^(\d+)\s+(\d{6,10})\s+(.*)$/);
    if (!startMatch) return null;

    const rest = startMatch[3];
    const restTokens = rest.split(/\s+/);
    const firstNumericIdx = restTokens.findIndex(token => /^\d+(?:\.\d+)?$/.test(token));
    if (firstNumericIdx === -1) return null;

    const description = restTokens.slice(0, firstNumericIdx).join(' ') .replace(/\bBUY\s+\d+\s+GET\s+\d+\s+FREE\b/gi, '').trim();
    const numericTokens = restTokens.slice(firstNumericIdx).filter(token => /^\d+(?:\.\d+)?$/.test(token));
    if (numericTokens.length < 5) return null;

    const qtyIdx = numericTokens.findIndex(token => /^\d+$/.test(token));
    if (qtyIdx === -1 || qtyIdx + 2 >= numericTokens.length) return null;

    let mrp = parseFloat(numericTokens[0]) || 0;
    if (mrp <= 1) {
      const fallbackMrp = numericTokens.find(token => (parseFloat(token) || 0) > 1);
      if (fallbackMrp) mrp = parseFloat(fallbackMrp) || mrp;
    }
    const qty = parseFloat(numericTokens[qtyIdx]) || 0;
    const rateToken = parseFloat(numericTokens[qtyIdx + 1]) || 0;
    const gross = parseFloat(numericTokens[qtyIdx + 2]) || (qty > 0 ? qty * rateToken : 0);
    const tail = numericTokens.slice(-5).map(n => parseFloat(n) || 0);
    const discAmt = tail[0] || 0;
    const taxable = tail[1] || 0;
    const gstPer = tail[2] || 0;
    const gstAmt = tail[3] || 0;
    const netAmt = tail[4] || 0;
    const pack = extractPack(description);
    const derivedRate = qty > 0 ? +(taxable / qty).toFixed(4) : rateToken; const grossRate = qty > 0 && gross > 0 ? +(gross / qty).toFixed(4) : rateToken;
    const discountPer = gross > 0 ? +(((gross - taxable) / gross) * 100).toFixed(2) : 0;
    const cgstAmt = +(gstAmt / 2).toFixed(2);
    const sgstAmt = +(gstAmt / 2).toFixed(2);

    return {
      productName: description.substring(0, 30),
      prodCode: generateStableId('746', startMatch[2], `${description} ${pack}`),
      qty,
      freeQty: 0,
      rate: derivedRate, 
      mrp: mrp || rateToken,
      pack,
      hsn: startMatch[2],
      expiry: '00/00',
      discountPer: discountPer,
      cgstAmt,
      sgstAmt,
      gstPer,
      taxable,
      netAmt,
      discAmt,
      rawRate: rateToken
    };
  }

  module.exports = {
    name: 'Manshi Leap PDF',
    identifyPatterns: ['PRODUCT DESCRIPTION', 'HIMALAYA WELLNESS COMPANY', 'INVOICE NO:'],

    getMetadata: (lines) => {
      const cleaned = cleanLines(lines);
      const text = cleaned.join(' ');
      const invoiceMatch =
        text.match(/INVOICE NO:\s*([A-Z0-9/-]+)/i) ||
        text.match(/INVOICE NO\.\s*:\s*([A-Z0-9/-]+)/i);
      const dateMatch =
        text.match(/\b\d{2}-[A-Za-z]{3}-\d{4}\b/) ||
        text.match(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/) ||
        text.match(/\b\d{2}[/-][A-Za-z]{3}[/-]\d{4}\b/i);
      const invoiceRaw = invoiceMatch ? String(invoiceMatch[1]).trim() : '000000';

      return {
        partyCode: 'MAN',
        partyName: 'MANSHI AGENCIES',
        invoiceNo: (invoiceRaw.replace(/\D/g, '') || '000000').slice(-6),
        sourceInvoiceNo: invoiceRaw,
        date: dateMatch ? dateMatch[0] : ''
      };
    },

    mapRows: (lines) => {
      const cleaned = cleanLines(lines);
      const chunks = buildRowChunks(cleaned);
      const items = [];

      for (const chunk of chunks) {
        const parsed = parseRowChunk(chunk);
        if (!parsed) continue;
        items.push({
          productName: parsed.productName,
          prodCode: parsed.prodCode,
          qty: parsed.qty,
          freeQty: parsed.freeQty,
          rate: parsed.rate,
          mrp: parsed.mrp,
          pack: parsed.pack,
          hsn: parsed.hsn,
          expiry: parsed.expiry,
          discountPer: parsed.discountPer,
          cgstAmt: parsed.cgstAmt,
          sgstAmt: parsed.sgstAmt,
          gstPer: parsed.gstPer,
          taxable: parsed.taxable,
          netAmt: parsed.netAmt,
          discAmt: parsed.discAmt,
          rawRate: parsed.rawRate
        });
      }

      return items;
    }
  };
