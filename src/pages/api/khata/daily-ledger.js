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

      const ledgers = await prisma.dailyLedger.findMany({
        where,
        orderBy: { date: 'asc' },
      });

      return res.status(200).json(ledgers);
    } catch (error) {
      console.error('GET daily-ledger error:', error);
      return res.status(500).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, openingBalance, closingBalance, totalIn, totalOut } = req.body;

      if (!date || openingBalance === undefined || closingBalance === undefined) {
        return res.status(400).json({ error: 'Date, opening and closing balance are required' });
      }

      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0); // Anchor date

      const ledger = await prisma.dailyLedger.upsert({
        where: {
          date_storeOwnerId: { date: targetDate, storeOwnerId },
        },
        update: {
          openingBalance: Number(openingBalance),
          closingBalance: Number(closingBalance),
          totalIn: Number(totalIn || 0),
          totalOut: Number(totalOut || 0),
        },
        create: {
          storeOwnerId,
          date: targetDate,
          openingBalance: Number(openingBalance),
          closingBalance: Number(closingBalance),
          totalIn: Number(totalIn || 0),
          totalOut: Number(totalOut || 0),
        },
      });

      return res.status(200).json(ledger);
    } catch (error) {
      console.error('POST daily-ledger error:', error);
      return res.status(500).json({ error: 'Failed to save daily ledger opening/closing' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
