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

      const sales = await prisma.dailySales.findMany({
        where,
        orderBy: { date: 'asc' },
      });

      return res.status(200).json(sales);
    } catch (error) {
      console.error('GET daily-sales error:', error);
      return res.status(500).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, cashSales, upiSales, swipeSales, upiAccountId, swipeAccountId } = req.body;

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0); // Anchor date

      const sales = await prisma.dailySales.upsert({
        where: {
          date_storeOwnerId: { date: targetDate, storeOwnerId },
        },
        update: {
          cashSales: Number(cashSales || 0),
          upiSales: Number(upiSales || 0),
          swipeSales: Number(swipeSales || 0),
          upiAccountId: upiAccountId ? Number(upiAccountId) : null,
          swipeAccountId: swipeAccountId ? Number(swipeAccountId) : null,
        },
        create: {
          storeOwnerId,
          date: targetDate,
          cashSales: Number(cashSales || 0),
          upiSales: Number(upiSales || 0),
          swipeSales: Number(swipeSales || 0),
          upiAccountId: upiAccountId ? Number(upiAccountId) : null,
          swipeAccountId: swipeAccountId ? Number(swipeAccountId) : null,
        },
      });

      return res.status(200).json(sales);
    } catch (error) {
      console.error('POST daily-sales error:', error);
      return res.status(500).json({ error: 'Failed to save daily sales' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
