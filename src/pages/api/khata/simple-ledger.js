import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const { from, to } = req.query;

      const where = { storeOwnerId };
      if (from && to) {
        where.date = {
          gte: new Date(from),
          lte: new Date(to),
        };
      }

      const entries = await prisma.simpleLedgerEntry.findMany({
        where,
        orderBy: { date: 'asc' },
      });

      return res.status(200).json(entries);
    } catch (error) {
      console.error('GET simple-ledger error:', error);
      return res.status(500).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, cashPurchase, creditPurchase, cashSales, upiSales, cardSales } = req.body;

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0); // Anchor date

      const entry = await prisma.simpleLedgerEntry.upsert({
        where: {
          date_storeOwnerId: { date: targetDate, storeOwnerId },
        },
        update: {
          cashPurchase: Number(cashPurchase || 0),
          creditPurchase: Number(creditPurchase || 0),
          cashSales: Number(cashSales || 0),
          upiSales: Number(upiSales || 0),
          cardSales: Number(cardSales || 0),
        },
        create: {
          storeOwnerId,
          date: targetDate,
          cashPurchase: Number(cashPurchase || 0),
          creditPurchase: Number(creditPurchase || 0),
          cashSales: Number(cashSales || 0),
          upiSales: Number(upiSales || 0),
          cardSales: Number(cardSales || 0),
        },
      });

      return res.status(200).json(entry);
    } catch (error) {
      console.error('POST simple-ledger error:', error);
      return res.status(500).json({ error: 'Failed to save simple ledger entry' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
