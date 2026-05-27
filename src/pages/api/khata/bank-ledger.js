import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const { from, to, accountId } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from and to dates are required' });
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const accFilter = accountId ? { bankAccountId: Number(accountId) } : {};

      // 1. Fetch entries from different tables filtered by storeOwnerId and date range
      const [
        deposits,
        rdRedemptions,
        clearedCheques,
        bankCharges,
        cardSettlements,
        dailySales,
        bankAccounts
      ] = await Promise.all([
        prisma.bankDeposit.findMany({
          where: { date: { gte: fromDate, lte: toDate }, storeOwnerId, ...accFilter },
          include: { bankAccount: true },
          orderBy: { date: 'asc' }
        }),
        prisma.rDRedemption.findMany({
          where: { date: { gte: fromDate, lte: toDate }, storeOwnerId, ...accFilter },
          include: { bankAccount: true },
          orderBy: { date: 'asc' }
        }),
        prisma.cheque.findMany({
          where: { chequeDate: { gte: fromDate, lte: toDate }, status: 'Cleared', storeOwnerId, ...accFilter },
          orderBy: { chequeDate: 'asc' }
        }),
        prisma.bankCharge.findMany({
          where: { date: { gte: fromDate, lte: toDate }, storeOwnerId, ...accFilter },
          include: { bankAccount: true },
          orderBy: { date: 'asc' }
        }),
        prisma.cardSettlement.findMany({
          where: { date: { gte: fromDate, lte: toDate }, storeOwnerId, ...accFilter },
          include: { bankAccount: true },
          orderBy: { date: 'asc' }
        }),
        accountId ? [] : prisma.dailySales.findMany({
          where: { date: { gte: fromDate, lte: toDate }, storeOwnerId },
          orderBy: { date: 'asc' }
        }),
        prisma.bankAccount.findMany({
          where: { storeOwnerId }
        })
      ]);

      const allEntries = [];

      // A. Bank Deposits (Credits if Standard, Debits if RD deposit outflow from HDFC bank)
      for (const d of deposits) {
        if (d.isRD) {
          allEntries.push({
            id: `rd-dep-${d.id}`,
            date: d.date,
            type: 'RD Deposit',
            narration: d.narration || `RD Payout #${d.reference}`,
            debit: d.amount,
            credit: 0,
            reference: d.reference || '',
            bankAccount: d.bankAccount?.name || d.bankName || 'Bank Account',
          });
        } else {
          allEntries.push({
            id: `std-dep-${d.id}`,
            date: d.date,
            type: 'Cash Deposit',
            narration: d.narration || 'Excess Cash Drawer Deposit',
            debit: 0,
            credit: d.amount,
            reference: d.reference || '',
            bankAccount: d.bankAccount?.name || d.bankName || 'Bank Account',
          });
        }
      }

      // B. RD Redemptions (Credits, only if redeemed to Account)
      for (const r of rdRedemptions) {
        if (r.redemptionType === 'Account') {
          allEntries.push({
            id: `rd-red-${r.id}`,
            date: r.date,
            type: 'RD Redemption',
            narration: r.narration || `RD Mature Payout #${r.originalDepositId}`,
            debit: 0,
            credit: r.amount,
            reference: '',
            bankAccount: r.bankAccount?.name || 'Bank Account',
          });
        }
      }

      // C. Cleared Cheques (Supplier cheques are debits, Customer cheques are credits)
      for (const c of clearedCheques) {
        const mode = c.paymentMode || 'Cheque';
        if (c.partyType === 'Customer') {
          allEntries.push({
            id: `chq-in-${c.id}`,
            date: c.chequeDate,
            type: `${mode} Inflow`,
            narration: `Cleared Customer Cheque #${c.chequeNumber} from ${c.supplierName}`,
            debit: 0,
            credit: c.amount,
            reference: c.chequeNumber,
            bankAccount: c.bankName || 'Bank Account',
          });
        } else {
          // Supplier cheque outflow
          allEntries.push({
            id: `chq-out-${c.id}`,
            date: c.chequeDate,
            type: `${mode} Payment`,
            narration: `Payment to ${c.supplierName} (Ref: ${c.chequeNumber})`,
            debit: c.amount,
            credit: 0,
            reference: c.chequeNumber,
            bankAccount: c.bankName || 'Bank Account',
          });

          // Optional Bank charge debit linked to the cleared transfer
          if (c.bankCharge && c.bankCharge > 0) {
            allEntries.push({
              id: `chq-charge-${c.id}`,
              date: c.chequeDate,
              type: 'Bank Charge',
              narration: `Transaction charge for ${mode} #${c.chequeNumber}`,
              debit: c.bankCharge,
              credit: 0,
              reference: c.chequeNumber,
              bankAccount: c.bankName || 'Bank Account',
            });
          }
        }
      }

      // D. Bank Charges (Debits)
      for (const bc of bankCharges) {
        allEntries.push({
          id: `charge-${bc.id}`,
          date: bc.date,
          type: 'Bank Charge',
          narration: bc.narration || bc.chargeType,
          debit: bc.amount,
          credit: 0,
          reference: bc.chargeType,
          bankAccount: bc.bankAccount?.name || 'Bank Account',
        });
      }

      // E. Card Swipe Settlements (Credits)
      for (const cs of cardSettlements) {
        allEntries.push({
          id: `settle-${cs.id}`,
          date: cs.date,
          type: 'Card Settlement',
          narration: cs.narration || `Card Sale Settlement (Sales Date: ${cs.salesDate ? cs.salesDate.toISOString().split('T')[0] : '—'})`,
          debit: 0,
          credit: cs.amount,
          reference: '',
          bankAccount: cs.bankAccount?.name || 'Bank Account',
        });
      }

      // F. UPI Sales (Credits)
      for (const s of dailySales) {
        if (s.upiSales > 0) {
          const upiAcc = bankAccounts.find(a => a.id === s.upiAccountId);
          const resolvedAccountName = upiAcc ? upiAcc.name : 'HDFC Bank Main';
          
          if (!accountId || (upiAcc && upiAcc.id === Number(accountId))) {
            allEntries.push({
              id: `upi-sales-${s.id}`,
              date: s.date,
              type: 'UPI Sales',
              narration: `Daily UPI sales collection`,
              debit: 0,
              credit: s.upiSales,
              reference: '',
              bankAccount: resolvedAccountName,
            });
          }
        }
      }

      // Sort all entries chronologically by date
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Compute sums and continuous running balances
      let totalCredit = 0;
      let totalDebit = 0;

      // Initial opening balance is calculated by summing all previous bank account openings for active selected bank accounts
      let baseOpeningBalance = 0;
      if (accountId) {
        const activeAcc = bankAccounts.find(a => a.id === Number(accountId));
        if (activeAcc) {
          baseOpeningBalance = activeAcc.openingBalance;
        }
      } else {
        baseOpeningBalance = bankAccounts.reduce((sum, a) => sum + a.openingBalance, 0);
      }

      let running = baseOpeningBalance;
      const resultRows = [];

      for (const e of allEntries) {
        totalCredit += e.credit;
        totalDebit += e.debit;
        running += e.credit - e.debit;
        
        resultRows.push({
          ...e,
          balance: running,
        });
      }

      // Reverse to desc for UI display
      resultRows.reverse();

      return res.status(200).json({
        rows: resultRows,
        totalCredit,
        totalDebit,
        netBalance: totalCredit - totalDebit,
        baseOpeningBalance,
      });

    } catch (error) {
      console.error('GET bank-ledger error:', error);
      return res.status(500).json({ error: 'Failed to compute bank ledger log' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
