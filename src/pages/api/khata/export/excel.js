import { prisma } from '../../../../lib/prisma';
import { getStoreOwnerId } from '../../../../lib/khata-auth';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  try {
    const { from, to, type = 'all', accountId } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to dates are required' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    const label = `${from} to ${to}`;

    const wb = XLSX.utils.book_new();

    const addSheet = (name, headers, rows) => {
      const ws = XLSX.utils.aoa_to_sheet([
        [`Period: ${label}`],
        [],
        headers,
        ...rows,
      ]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const fmtAmt = (n) => Number(n || 0).toFixed(2);

    if (type === 'bank-ledger' || type === 'all') {
      const accFilter = accountId ? { bankAccountId: Number(accountId) } : {};

      const deposits = await prisma.bankDeposit.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate }, isRD: false, ...accFilter },
        include: { bankAccount: true },
        orderBy: { date: 'asc' }
      });
      const rdDeposits = await prisma.bankDeposit.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate }, isRD: true, ...accFilter },
        include: { bankAccount: true },
        orderBy: { date: 'asc' }
      });
      const rdRedemptions = await prisma.rDRedemption.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate }, ...accFilter },
        include: { bankAccount: true },
        orderBy: { date: 'asc' }
      });
      const clearedCheques = await prisma.cheque.findMany({
        where: { storeOwnerId, chequeDate: { gte: fromDate, lte: toDate }, status: 'Cleared', ...accFilter },
        orderBy: { chequeDate: 'asc' }
      });
      const bankCharges = await prisma.bankCharge.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate }, ...accFilter },
        include: { bankAccount: true },
        orderBy: { date: 'asc' }
      });
      const cardSettlements = await prisma.cardSettlement.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate }, ...accFilter },
        include: { bankAccount: true },
        orderBy: { date: 'asc' }
      });

      const bankRows = [];
      let running = 0;

      const pushRow = (date, transType, narration, debit, credit, ref, account) => {
        running += credit - debit;
        bankRows.push([fmtDate(date), transType, narration, ref, fmtAmt(debit), fmtAmt(credit), fmtAmt(running), account]);
      };

      const allEntries = [
        ...deposits.map(d => ({ date: d.date, type: 'Cash Deposit', narration: d.narration || d.reference || 'Deposit', debit: 0, credit: d.amount, ref: d.reference || '', account: d.bankAccount?.name || d.bankName })),
        ...rdDeposits.map(d => ({ date: d.date, type: 'RD Deposit', narration: d.narration || 'RD Deposit', debit: d.amount, credit: 0, ref: d.reference || '', account: d.bankAccount?.name || d.bankName })),
        ...rdRedemptions.filter(r => r.redemptionType === 'Account').map(r => ({ date: r.date, type: 'RD Redemption', narration: r.narration || 'RD Redeemed to Account', debit: 0, credit: r.amount, ref: '', account: r.bankAccount?.name || '' })),
        ...clearedCheques.map(c => ({ date: c.chequeDate, type: `${c.paymentMode || 'Cheque'} Payment`, narration: `Payment to ${c.supplierName} (${c.chequeNumber})`, debit: c.amount + (c.bankCharge || 0), credit: 0, ref: c.chequeNumber, account: c.bankName })),
        ...bankCharges.map(bc => ({ date: bc.date, type: 'Bank Charge', narration: bc.narration || bc.chargeType, debit: bc.amount, credit: 0, ref: bc.chargeType, account: bc.bankAccount?.name || '' })),
        ...cardSettlements.map(cs => ({ date: cs.date, type: 'Card Settlement', narration: cs.narration || 'Card Sale Settlement', debit: 0, credit: cs.amount, ref: '', account: cs.bankAccount?.name || '' })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const e of allEntries) pushRow(e.date, e.type, e.narration, e.debit, e.credit, e.ref, e.account);

      const totCredit = allEntries.reduce((s, r) => s + r.credit, 0);
      const totDebit = allEntries.reduce((s, r) => s + r.debit, 0);
      bankRows.push(['', '', 'TOTAL', '', fmtAmt(totDebit), fmtAmt(totCredit), fmtAmt(totCredit - totDebit), '']);

      addSheet('Bank Ledger', ['Date', 'Transaction Type', 'Narration', 'Reference', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)', 'Bank Account'], bankRows);
    }

    if (type === 'purchases' || type === 'all') {
      const purchases = await prisma.purchase.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate } },
        orderBy: { date: 'asc' }
      });
      const pRows = purchases.map(p => [fmtDate(p.date), p.supplierName, p.invoiceNumber, p.paymentType, fmtAmt(p.invoiceAmount)]);
      const total = purchases.reduce((s, p) => s + p.invoiceAmount, 0);
      const cashTotal = purchases.filter(p => p.paymentType === 'Cash').reduce((s, p) => s + p.invoiceAmount, 0);
      const creditTotal = purchases.filter(p => p.paymentType === 'Credit').reduce((s, p) => s + p.invoiceAmount, 0);
      pRows.push(['', '', '', 'Cash Total:', fmtAmt(cashTotal)]);
      pRows.push(['', '', '', 'Credit Total:', fmtAmt(creditTotal)]);
      pRows.push(['', '', '', 'GRAND TOTAL:', fmtAmt(total)]);
      addSheet('Purchases', ['Date', 'Supplier', 'Invoice No.', 'Payment Type', 'Amount (₹)'], pRows);
    }

    if (type === 'expenses' || type === 'all') {
      const expenses = await prisma.expense.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate } },
        orderBy: { date: 'asc' }
      });
      const eRows = expenses.map(e => [fmtDate(e.date), e.category, e.narration, fmtAmt(e.amount)]);
      const shopTotal = expenses.filter(e => e.category === 'Shop').reduce((s, e) => s + e.amount, 0);
      const homeTotal = expenses.filter(e => e.category === 'Home').reduce((s, e) => s + e.amount, 0);
      eRows.push(['', 'Shop Total:', '', fmtAmt(shopTotal)]);
      eRows.push(['', 'Home Total:', '', fmtAmt(homeTotal)]);
      eRows.push(['', 'GRAND TOTAL:', '', fmtAmt(shopTotal + homeTotal)]);
      addSheet('Expenses', ['Date', 'Category', 'Narration', 'Amount (₹)'], eRows);
    }

    if (type === 'sales' || type === 'all') {
      const sales = await prisma.dailySales.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate } },
        orderBy: { date: 'asc' }
      });
      const sRows = sales.map(s => [fmtDate(s.date), fmtAmt(s.cashSales), fmtAmt(s.upiSales), fmtAmt(s.swipeSales), fmtAmt(s.cashSales + s.upiSales + s.swipeSales)]);
      const totCash = sales.reduce((s, r) => s + r.cashSales, 0);
      const totUPI = sales.reduce((s, r) => s + r.upiSales, 0);
      const totSwipe = sales.reduce((s, r) => s + r.swipeSales, 0);
      sRows.push(['TOTAL:', fmtAmt(totCash), fmtAmt(totUPI), fmtAmt(totSwipe), fmtAmt(totCash + totUPI + totSwipe)]);
      addSheet('Daily Collection', ['Date', 'Cash Collection (₹)', 'UPI Sales (₹)', 'Card Sales (₹)', 'Total Collection (₹)'], sRows);
    }

    if (type === 'deposits' || type === 'all') {
      const allDeposits = await prisma.bankDeposit.findMany({
        where: { storeOwnerId, date: { gte: fromDate, lte: toDate } },
        include: { bankAccount: true },
        orderBy: { date: 'asc' }
      });
      const dRows = allDeposits.map(d => [fmtDate(d.date), d.bankAccount?.name || d.bankName, d.isRD ? 'RD' : 'Standard', d.reference || '', d.narration || '', fmtAmt(d.amount), d.maturityDate ? fmtDate(d.maturityDate) : '']);
      const rdTotal = allDeposits.filter(d => d.isRD).reduce((s, d) => s + d.amount, 0);
      const stdTotal = allDeposits.filter(d => !d.isRD).reduce((s, d) => s + d.amount, 0);
      dRows.push(['', '', 'RD Total:', '', '', fmtAmt(rdTotal), '']);
      dRows.push(['', '', 'Standard Total:', '', '', fmtAmt(stdTotal), '']);
      addSheet('Bank Deposits', ['Date', 'Bank Account', 'Type', 'Reference', 'Narration', 'Amount (₹)', 'Maturity Date'], dRows);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MediCLan_Ledger_${from}_to_${to}.xlsx"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);

  } catch (error) {
    console.error('Excel export error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel file' });
  }
}
