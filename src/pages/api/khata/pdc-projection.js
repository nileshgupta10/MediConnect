import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

// Indian local date converter helper (GMT +5.5 hours timezone adjustment)
const getLocalDateStr = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  // Add 5.5 hours (19800000 ms) to align UTC with IST date boundaries
  const localDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to parameters are required' });
    }

    // 1. Fetch all active bank accounts under the storeOwnerId
    const accounts = await prisma.bankAccount.findMany({
      where: { storeOwnerId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // Generate date sequence YYYY-MM-DD in local time
    const dateSequence = [];
    const tempDate = new Date(from);
    const endDateCheck = new Date(to);
    while (tempDate <= endDateCheck) {
      dateSequence.push(tempDate.toISOString().split('T')[0]);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const resultAccounts = [];

    for (const acc of accounts) {
      // Date boundaries as Date objects for Prisma where clauses
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      // 2. Two sets of queries per account:
      //    (a) Pre-period: date < fromDate  → only used for opening-balance carry-forward
      //    (b) In-period:  fromDate <= date <= toDate → used for daily projections
      //    Cheque uses chequeDate instead of date.
      const [
        preDeposits, inDeposits,
        preRd, inRd,
        preCheques, inCheques,
        preCharges, inCharges,
        preCard, inCard,
        preExpenses, inExpenses,
        preSales, inSales,
      ] = await Promise.all([
        // BankDeposit — pre
        prisma.bankDeposit.findMany({ where: { storeOwnerId, bankAccountId: acc.id, date: { lt: fromDate } } }),
        // BankDeposit — in
        prisma.bankDeposit.findMany({ where: { storeOwnerId, bankAccountId: acc.id, date: { gte: fromDate, lte: toDate } } }),
        // RDRedemption — pre
        prisma.rDRedemption.findMany({ where: { storeOwnerId, bankAccountId: acc.id, redemptionType: 'Account', date: { lt: fromDate } } }),
        // RDRedemption — in
        prisma.rDRedemption.findMany({ where: { storeOwnerId, bankAccountId: acc.id, redemptionType: 'Account', date: { gte: fromDate, lte: toDate } } }),
        // Cheque — pre (uses chequeDate)
        prisma.cheque.findMany({ where: { storeOwnerId, bankAccountId: acc.id, status: 'Cleared', chequeDate: { lt: fromDate } } }),
        // Cheque — in
        prisma.cheque.findMany({ where: { storeOwnerId, bankAccountId: acc.id, status: 'Cleared', chequeDate: { gte: fromDate, lte: toDate } } }),
        // BankCharge — pre
        prisma.bankCharge.findMany({ where: { storeOwnerId, bankAccountId: acc.id, date: { lt: fromDate } } }),
        // BankCharge — in
        prisma.bankCharge.findMany({ where: { storeOwnerId, bankAccountId: acc.id, date: { gte: fromDate, lte: toDate } } }),
        // CardSettlement — pre
        prisma.cardSettlement.findMany({ where: { storeOwnerId, bankAccountId: acc.id, date: { lt: fromDate } } }),
        // CardSettlement — in
        prisma.cardSettlement.findMany({ where: { storeOwnerId, bankAccountId: acc.id, date: { gte: fromDate, lte: toDate } } }),
        // Expense — pre
        prisma.expense.findMany({ where: { storeOwnerId, bankAccountId: acc.id, paymentMode: { in: ['Bank', 'UPI'] }, date: { lt: fromDate } } }),
        // Expense — in
        prisma.expense.findMany({ where: { storeOwnerId, bankAccountId: acc.id, paymentMode: { in: ['Bank', 'UPI'] }, date: { gte: fromDate, lte: toDate } } }),
        // DailySales — pre
        prisma.dailySales.findMany({ where: { storeOwnerId, upiAccountId: acc.id, date: { lt: fromDate } } }),
        // DailySales — in
        prisma.dailySales.findMany({ where: { storeOwnerId, upiAccountId: acc.id, date: { gte: fromDate, lte: toDate } } }),
      ]);

      // Calculate baseline opening balance before `from` date (in local time)
      let balance = acc.openingBalance || 0;
      const openingDateStr = acc.openingBalanceDate ? getLocalDateStr(acc.openingBalanceDate) : '';

      // Group day-by-day active transactions by their local Indian date string
      const activeTransactions = {};
      for (const d of dateSequence) {
        activeTransactions[d] = { credits: 0, debits: 0 };
      }

      // 2.1 Process Deposits — pre-period for balance, in-period for projection
      for (const d of preDeposits) {
        const localDate = getLocalDateStr(d.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        const amount = d.amount;
        balance += d.isRD ? -amount : amount;
      }
      for (const d of inDeposits) {
        const localDate = getLocalDateStr(d.date);
        if (d.isRD) {
          activeTransactions[localDate].debits += d.amount;
        } else {
          activeTransactions[localDate].credits += d.amount;
        }
      }

      // 2.2 Process RD Redemptions
      for (const r of preRd) {
        const localDate = getLocalDateStr(r.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        balance += r.amount;
      }
      for (const r of inRd) {
        const localDate = getLocalDateStr(r.date);
        activeTransactions[localDate].credits += r.amount;
      }

      // 2.3 Process Cleared Cheques (Customer is credit +, Supplier is debit -)
      for (const c of preCheques) {
        const localDate = getLocalDateStr(c.chequeDate);
        if (openingDateStr && localDate < openingDateStr) continue;
        const total = c.amount + (c.bankCharge || 0);
        if (c.partyType === 'Customer') {
          balance += c.amount;
        } else {
          balance -= total;
        }
      }
      for (const c of inCheques) {
        const localDate = getLocalDateStr(c.chequeDate);
        const total = c.amount + (c.bankCharge || 0);
        if (c.partyType === 'Customer') {
          activeTransactions[localDate].credits += c.amount;
        } else {
          activeTransactions[localDate].debits += total;
        }
      }

      // 2.4 Process Bank Charges
      for (const bc of preCharges) {
        const localDate = getLocalDateStr(bc.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        balance -= bc.amount;
      }
      for (const bc of inCharges) {
        const localDate = getLocalDateStr(bc.date);
        activeTransactions[localDate].debits += bc.amount;
      }

      // 2.5 Process Card Settlements
      for (const cs of preCard) {
        const localDate = getLocalDateStr(cs.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        balance += cs.amount;
      }
      for (const cs of inCard) {
        const localDate = getLocalDateStr(cs.date);
        activeTransactions[localDate].credits += cs.amount;
      }

      // 2.6 Process UPI Sales
      for (const s of preSales) {
        const localDate = getLocalDateStr(s.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        balance += s.upiSales;
      }
      for (const s of inSales) {
        const localDate = getLocalDateStr(s.date);
        activeTransactions[localDate].credits += s.upiSales;
      }

      // 2.7 Process Expenses
      for (const e of preExpenses) {
        const localDate = getLocalDateStr(e.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        balance -= e.amount;
      }
      for (const e of inExpenses) {
        const localDate = getLocalDateStr(e.date);
        activeTransactions[localDate].debits += e.amount;
      }

      // 3. Step through active date range day-by-day to assign daily starting balances
      const dailyBalances = {};

      for (let i = 0; i < dateSequence.length; i++) {
        const currentDateStr = dateSequence[i];
        
        // Starting balance of today = accumulated balance up to the end of yesterday (local time)
        dailyBalances[currentDateStr] = balance;

        // Apply today's local transactions to update balance (which becomes tomorrow's starting balance)
        const dayTxs = activeTransactions[currentDateStr];
        balance += dayTxs.credits - dayTxs.debits;
      }

      resultAccounts.push({
        id: acc.id,
        name: acc.name,
        accountNo: acc.accountNo,
        dailyBalances,
      });
    }

    return res.status(200).json({ accounts: resultAccounts });
  } catch (error) {
    console.error('PDC projection calculation error:', error);
    return res.status(550).json({ error: 'Failed to calculate projections' });
  }
}
