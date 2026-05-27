import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const charges = await prisma.bankCharge.findMany({
        where: { storeOwnerId },
        include: { bankAccount: true },
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(charges);
    } catch (error) {
      console.error('GET bank-charge error:', error);
      return res.status(500).json({ error: 'Failed to fetch bank charges' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, amount, bankAccountId, chargeType, narration } = req.body;

      if (!date || !amount || !bankAccountId || !chargeType) {
        return res.status(400).json({ error: 'Date, amount, bank account and charge type are required' });
      }

      const charge = await prisma.bankCharge.create({
        data: {
          storeOwnerId,
          date: new Date(date),
          amount: Number(amount),
          bankAccountId: Number(bankAccountId),
          chargeType,
          narration: narration || null,
        },
      });

      return res.status(201).json(charge);
    } catch (error) {
      console.error('POST bank-charge error:', error);
      return res.status(500).json({ error: 'Failed to create bank charge' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, date, amount, bankAccountId, chargeType, narration } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Charge ID is required' });
      }

      const updated = await prisma.bankCharge.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          ...(date !== undefined && { date: new Date(date) }),
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(bankAccountId !== undefined && { bankAccountId: Number(bankAccountId) }),
          ...(chargeType !== undefined && { chargeType }),
          ...(narration !== undefined && { narration: narration || null }),
        },
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error('PUT bank-charge error:', error);
      return res.status(500).json({ error: 'Failed to update bank charge' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Charge ID is required' });
      }

      await prisma.bankCharge.delete({
        where: { id: Number(id), storeOwnerId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE bank-charge error:', error);
      return res.status(500).json({ error: 'Failed to delete bank charge' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
