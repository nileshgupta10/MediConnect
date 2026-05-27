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
      // 2. Fetch all bank account transactions once to compute timezone-safe daily starting balances
      const [deposits, rdRedemptions, clearedCheques, bankCharges, cardSettlements, expenses, dailySales] = await Promise.all([
        prisma.bankDeposit.findMany({ where: { storeOwnerId, bankAccountId: acc.id } }),
        prisma.rDRedemption.findMany({ where: { storeOwnerId, bankAccountId: acc.id, redemptionType: 'Account' } }),
        prisma.cheque.findMany({ where: { storeOwnerId, bankAccountId: acc.id, status: 'Cleared' } }),
        prisma.bankCharge.findMany({ where: { storeOwnerId, bankAccountId: acc.id } }),
        prisma.cardSettlement.findMany({ where: { storeOwnerId, bankAccountId: acc.id } }),
        prisma.expense.findMany({ where: { storeOwnerId, bankAccountId: acc.id, paymentMode: { in: ['Bank', 'UPI'] } } }),
        prisma.dailySales.findMany({ where: { storeOwnerId, upiAccountId: acc.id } }),
      ]);

      // Calculate baseline opening balance before `from` date (in local time)
      let balance = acc.openingBalance || 0;
      const openingDateStr = acc.openingBalanceDate ? getLocalDateStr(acc.openingBalanceDate) : '';

      // Group day-by-day active transactions by their local Indian date string
      const activeTransactions = {};
      for (const d of dateSequence) {
        activeTransactions[d] = { credits: 0, debits: 0 };
      }

      // 2.1 Process Deposits
      for (const d of deposits) {
        const localDate = getLocalDateStr(d.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        const amount = d.amount;
        if (localDate < from) {
          balance += d.isRD ? -amount : amount;
        } else if (localDate <= to) {
          if (d.isRD) {
            activeTransactions[localDate].debits += amount;
          } else {
            activeTransactions[localDate].credits += amount;
          }
        }
      }

      // 2.2 Process RD Redemptions
      for (const r of rdRedemptions) {
        const localDate = getLocalDateStr(r.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        if (localDate < from) {
          balance += r.amount;
        } else if (localDate <= to) {
          activeTransactions[localDate].credits += r.amount;
        }
      }

      // 2.3 Process Cleared Cheques (Customer is credit +, Supplier is debit -)
      for (const c of clearedCheques) {
        const localDate = getLocalDateStr(c.chequeDate);
        if (openingDateStr && localDate < openingDateStr) continue;
        const total = c.amount + (c.bankCharge || 0);
        if (localDate < from) {
          if (c.partyType === 'Customer') {
            balance += c.amount;
          } else {
            balance -= total;
          }
        } else if (localDate <= to) {
          if (c.partyType === 'Customer') {
            activeTransactions[localDate].credits += c.amount;
          } else {
            activeTransactions[localDate].debits += total;
          }
        }
      }

      // 2.4 Process Bank Charges
      for (const bc of bankCharges) {
        const localDate = getLocalDateStr(bc.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        if (localDate < from) {
          balance -= bc.amount;
        } else if (localDate <= to) {
          activeTransactions[localDate].debits += bc.amount;
        }
      }

      // 2.5 Process Card Settlements
      for (const cs of cardSettlements) {
        const localDate = getLocalDateStr(cs.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        if (localDate < from) {
          balance += cs.amount;
        } else if (localDate <= to) {
          activeTransactions[localDate].credits += cs.amount;
        }
      }

      // 2.6 Process UPI Sales
      for (const s of dailySales) {
        const localDate = getLocalDateStr(s.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        if (localDate < from) {
          balance += s.upiSales;
        } else if (localDate <= to) {
          activeTransactions[localDate].credits += s.upiSales;
        }
      }

      // 2.7 Process Expenses
      for (const e of expenses) {
        const localDate = getLocalDateStr(e.date);
        if (openingDateStr && localDate < openingDateStr) continue;
        if (localDate < from) {
          balance -= e.amount;
        } else if (localDate <= to) {
          activeTransactions[localDate].debits += e.amount;
        }
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
