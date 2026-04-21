

  module.exports = {
    name: 'Medica / Prem Agency',
    identifyPatterns: ['M_MEDICA', 'PREM AGENCY'],

    getMetadata: (rows) => {
      const firstRow = rows[0];
      if (firstRow) {
        return {
          partyCode: 'PPH', // Use PPH as identified in working reference
          partyName: 'PREM AGENCY',
          date: firstRow.invdate || '',
          invoiceNo: (firstRow.invno || '000000').replace(/[^0-9]/g, '')
        };
      }
      return { partyCode: 'PPH', partyName: 'PREM AGENCY', invoiceNo: '000000' };
    },

    mapRows: (rows) => {
      return rows.map(row => {
        let expiry = '12/30';
        if (row.expdate && row.expdate.includes('/')) {
          const parts = row.expdate.split('/');
          if (parts.length === 3) {
            expiry = `${parts[1]}/${parts[2].substring(2)}`;
          }
        }

        // Ensure 10-digit zero-padded product code for compatibility
        const rawProdCode = row.prcode || '';
        const finalProdCode = String(rawProdCode).padStart(10, '0');

        return {
          productName: row.productdesc || '',
          prodCode: finalProdCode,
          pack: row.ppack || '',
          batch: row.batchno || '',
          qty: parseFloat(row.qty || 0),
          freeQty: parseFloat(row.free || 0),
          rate: parseFloat(row.rate || 0),
          mrp: parseFloat(row.mrp || 0),
          hsn: row.hsncode || '',
          expiry: expiry,
          discountPer: parseFloat(row.cdper || 0),
          gstPer: (parseFloat(row.cgstper || 0) + parseFloat(row.sgstper || 0)) || 12
        };
      }).filter(item => item.productName);
    }
  };