import { prisma } from '../../../../lib/prisma';
import { getStoreOwnerId } from '../../../../lib/khata-auth';
import * as XLSX from 'xlsx';

const fmtDate = (d) => {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
};

const fmtAmt = (n) => Number(n || 0).toFixed(2);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  try {
    const { from, to, supplierName } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to dates are required' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    const label = `${from} to ${to}`;

    const purchaseWhere = { storeOwnerId, date: { gte: fromDate, lte: toDate } };
    const chequeWhere = { storeOwnerId, chequeDate: { gte: fromDate, lte: toDate }, status: 'Cleared' };

    if (supplierName) {
      purchaseWhere.supplierName = supplierName;
      chequeWhere.supplierName = supplierName;
    }

    const [
      dailySales,
      cardSettlements,
      purchases,
      clearedCheques,
      deposits,
      rdRedemptions,
      bankCharges,
      expenses,
      bankAccounts
    ] = await Promise.all([
      supplierName ? [] : prisma.dailySales.findMany({ where: { storeOwnerId, date: { gte: fromDate, lte: toDate } } }),
      supplierName ? [] : prisma.cardSettlement.findMany({ where: { storeOwnerId, date: { gte: fromDate, lte: toDate } }, include: { bankAccount: true } }),
      prisma.purchase.findMany({ where: purchaseWhere }),
      prisma.cheque.findMany({ where: chequeWhere, include: { bankAccount: true } }),
      supplierName ? [] : prisma.bankDeposit.findMany({ where: { storeOwnerId, date: { gte: fromDate, lte: toDate } }, include: { bankAccount: true } }),
      supplierName ? [] : prisma.rDRedemption.findMany({ where: { storeOwnerId, date: { gte: fromDate, lte: toDate } }, include: { bankAccount: true } }),
      supplierName ? [] : prisma.bankCharge.findMany({ where: { storeOwnerId, date: { gte: fromDate, lte: toDate } }, include: { bankAccount: true } }),
      supplierName ? [] : prisma.expense.findMany({ where: { storeOwnerId, date: { gte: fromDate, lte: toDate } }, include: { bankAccount: true } }),
      prisma.bankAccount.findMany({ where: { storeOwnerId } })
    ]);

    const excelRows = [];

    const pushRow = (date, vchType, drLedger, crLedger, amount, narration, ref = '') => {
      excelRows.push({
        rawDate: new Date(date),
        displayDate: fmtDate(date),
        vchType,
        drLedger,
        crLedger,
        amount: Number(fmtAmt(amount)),
        narration: narration || '',
        ref: ref || ''
      });
    };

    // 1. Daily Sales -> Receipt
    for (const s of dailySales) {
      const displayDateStr = new Date(s.date).toLocaleDateString('en-IN');
      const upiAcc = bankAccounts.find(a => a.id === s.upiAccountId);
      const upiLedger = upiAcc ? upiAcc.name : 'Bank (UPI)';
      
      if (s.cashSales > 0) {
        pushRow(s.date, 'Receipt', 'Cash', 'Sales (Composite)', s.cashSales, `Cash Collection - ${displayDateStr}`);
      }
      if (s.upiSales > 0) {
        pushRow(s.date, 'Receipt', upiLedger, 'Sales (Composite)', s.upiSales, `UPI Sales - ${displayDateStr}`);
      }
      if (s.swipeSales > 0) {
        pushRow(s.date, 'Receipt', 'Card Sales Receivable', 'Sales (Composite)', s.swipeSales, `Card Sales - ${displayDateStr} (Settlement pending)`);
      }
    }

    // 2. Card Settlements -> Journal
    for (const cs of cardSettlements) {
      const bankLedger = cs.bankAccount?.name || 'Bank Account';
      pushRow(cs.date, 'Journal', bankLedger, 'Card Sales Receivable', cs.amount, cs.narration || 'Card Settlement received');
    }

    // 3. Purchases -> Payment (Cash) or Journal (Credit)
    for (const p of purchases) {
      if (p.paymentType === 'Cash') {
        pushRow(p.date, 'Payment', 'Purchases (Composite)', 'Cash', p.invoiceAmount, `Cash Purchase - ${p.supplierName} (Inv: #${p.invoiceNumber})`, p.invoiceNumber);
      } else {
        pushRow(p.date, 'Journal', 'Purchases (Composite)', p.supplierName, p.invoiceAmount, `Credit Purchase - ${p.supplierName} (Inv: #${p.invoiceNumber})`, p.invoiceNumber);
      }
    }

    // 4. Cleared Supplier Cheques / Bank Transfers -> Payment
    for (const c of clearedCheques) {
      const mode = c.paymentMode || (c.bankName?.toLowerCase().includes('cash') ? 'Cash' : 'Cheque');
      const bankLedger = mode === 'Cash' ? 'Cash' : (c.bankAccount?.name || c.bankName || 'Bank Account');
      
      pushRow(c.chequeDate, 'Payment', c.supplierName, bankLedger, c.amount, `${mode} Payment to ${c.supplierName} (Ref: ${c.chequeNumber})`, c.chequeNumber);
      
      if (c.bankCharge && c.bankCharge > 0) {
        pushRow(c.chequeDate, 'Payment', 'Bank Charges', bankLedger, c.bankCharge, `Bank charges for cheque payout (Ref: ${c.chequeNumber})`, c.chequeNumber);
      }
    }

    // 5. Bank Deposits -> Contra or Journal (RD)
    for (const d of deposits) {
      const bankLedger = d.bankAccount?.name || d.bankName || 'Bank Account';
      if (d.isRD) {
        pushRow(d.date, 'Journal', 'RD Investment', bankLedger, d.amount, d.narration || `RD Deposit - ${bankLedger}`, d.reference || '');
      } else {
        pushRow(d.date, 'Contra', bankLedger, 'Cash', d.amount, d.narration || `Bank Cash Deposit - ${bankLedger}`, d.reference || '');
      }
    }

    // 6. RD Redemptions -> Journal
    for (const r of rdRedemptions) {
      const creditLedger = r.redemptionType === 'Cash' ? 'Cash' : (r.bankAccount?.name || 'Bank Account');
      pushRow(r.date, 'Journal', creditLedger, 'RD Investment', r.amount, r.narration || `RD Redemption (${r.redemptionType})`);
    }

    // 7. Bank Charges -> Payment
    for (const bc of bankCharges) {
      const bankLedger = bc.bankAccount?.name || 'Bank Account';
      pushRow(bc.date, 'Payment', 'Bank Charges', bankLedger, bc.amount, bc.narration || `Bank Charge - ${bc.chargeType}`, bc.chargeType);
    }

    // 8. Expenses (Shop & Home) -> Payment
    for (const e of expenses) {
      const cashOrBank = e.paymentMode === 'Cash' ? 'Cash' : (e.bankAccount?.name || 'Bank Account');
      if (e.category === 'Shop') {
        pushRow(e.date, 'Payment', 'Shop Expenses', cashOrBank, e.amount, e.narration || 'Shop Expense');
      } else {
        pushRow(e.date, 'Payment', "Proprietor's Personal Expenses", cashOrBank, e.amount, e.narration || 'Home Expense');
      }
    }

    excelRows.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    const wb = XLSX.utils.book_new();
    
    const sheetData = [
      [`MediCLan ${supplierName ? `${supplierName} Ledger` : 'Consolidated'} Tally Entries Excel Sheet`],
      [`Period: ${label}`],
      [],
      ['Date', 'Voucher Type', 'Dr. Ledger (Debit Account)', 'Cr. Ledger (Credit Account)', 'Amount (₹)', 'Narration', 'Reference No / Cheque No']
    ];

    for (const row of excelRows) {
      sheetData.push([
        row.displayDate,
        row.vchType,
        row.drLedger,
        row.crLedger,
        row.amount,
        row.narration,
        row.ref
      ]);
    }

    const grandTotal = excelRows.reduce((sum, r) => sum + r.amount, 0);
    sheetData.push([]);
    sheetData.push(['', '', '', 'GRAND TOTAL:', grandTotal, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    ws['!cols'] = [
      { wch: 15 }, // Date
      { wch: 15 }, // Voucher Type
      { wch: 30 }, // Dr. Ledger
      { wch: 30 }, // Cr. Ledger
      { wch: 15 }, // Amount
      { wch: 45 }, // Narration
      { wch: 25 }  // Ref
    ];

    XLSX.utils.book_append_sheet(wb, ws, supplierName ? `${supplierName.slice(0, 20)} Ledger` : 'Tally CA Consolidated');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = supplierName 
      ? `MediCLan_${supplierName.replace(/\s+/g, '_')}_CA_Entries_${from}_to_${to}.xlsx`
      : `MediCLan_CA_Tally_Entries_${from}_to_${to}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);

  } catch (error) {
    console.error('Tally CA Excel export error:', error);
    return res.status(500).json({ error: 'Failed to generate Tally CA Excel file' });
  }
}
