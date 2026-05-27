import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const settlements = await prisma.cardSettlement.findMany({
        where: { storeOwnerId },
        include: { bankAccount: true },
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(settlements);
    } catch (error) {
      console.error('GET card-settlement error:', error);
      return res.status(500).json({ error: 'Failed to fetch card settlements' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, amount, bankAccountId, salesDate, narration } = req.body;

      if (!date || !amount || !bankAccountId) {
        return res.status(400).json({ error: 'Date, amount and bank account are required' });
      }

      const settlement = await prisma.cardSettlement.create({
        data: {
          storeOwnerId,
          date: new Date(date),
          amount: Number(amount),
          bankAccountId: Number(bankAccountId),
          salesDate: salesDate ? new Date(salesDate) : null,
          narration: narration || null,
        },
      });

      return res.status(201).json(settlement);
    } catch (error) {
      console.error('POST card-settlement error:', error);
      return res.status(500).json({ error: 'Failed to create card settlement' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, date, amount, bankAccountId, salesDate, narration } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Settlement ID is required' });
      }

      const updated = await prisma.cardSettlement.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          ...(date !== undefined && { date: new Date(date) }),
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(bankAccountId !== undefined && { bankAccountId: Number(bankAccountId) }),
          ...(salesDate !== undefined && { salesDate: salesDate ? new Date(salesDate) : null }),
          ...(narration !== undefined && { narration: narration || null }),
        },
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error('PUT card-settlement error:', error);
      return res.status(500).json({ error: 'Failed to update card settlement' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Settlement ID is required' });
      }

      await prisma.cardSettlement.delete({
        where: { id: Number(id), storeOwnerId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE card-settlement error:', error);
      return res.status(500).json({ error: 'Failed to delete card settlement' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
