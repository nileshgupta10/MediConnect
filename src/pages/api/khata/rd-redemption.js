import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const redemptions = await prisma.rDRedemption.findMany({
        where: { storeOwnerId },
        include: { bankAccount: true },
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(redemptions);
    } catch (error) {
      console.error('GET rd-redemption error:', error);
      return res.status(500).json({ error: 'Failed to fetch RD redemptions' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, amount, redemptionType, bankAccountId, originalDepositId, maturityDate, narration } = req.body;

      if (!date || !amount || !redemptionType) {
        return res.status(400).json({ error: 'Date, amount and redemption type are required' });
      }

      const redemption = await prisma.rDRedemption.create({
        data: {
          storeOwnerId,
          date: new Date(date),
          amount: Number(amount),
          redemptionType,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          originalDepositId: originalDepositId ? Number(originalDepositId) : null,
          maturityDate: maturityDate ? new Date(maturityDate) : null,
          narration: narration || null,
        },
      });

      return res.status(201).json(redemption);
    } catch (error) {
      console.error('POST rd-redemption error:', error);
      return res.status(500).json({ error: 'Failed to create RD redemption' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Redemption ID is required' });
      }

      await prisma.rDRedemption.delete({
        where: { id: Number(id), storeOwnerId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE rd-redemption error:', error);
      return res.status(500).json({ error: 'Failed to delete RD redemption' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
