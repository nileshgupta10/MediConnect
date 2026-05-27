import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const deposits = await prisma.bankDeposit.findMany({
        where: { storeOwnerId },
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(deposits);
    } catch (error) {
      console.error('GET bank deposit error:', error);
      return res.status(500).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, amount, bankName, reference, narration, isRD, maturityDate, bankAccountId } = req.body;

      if (!date || !amount) {
        return res.status(400).json({ error: 'Date and amount are required' });
      }

      let resolvedBankName = bankName || '';
      if (bankAccountId) {
        const bankAcc = await prisma.bankAccount.findFirst({
          where: { id: Number(bankAccountId), storeOwnerId }
        });
        if (bankAcc) {
          resolvedBankName = bankAcc.name;
        }
      }

      if (!resolvedBankName) {
        return res.status(400).json({ error: 'Bank account or bank name is required' });
      }

      const deposit = await prisma.bankDeposit.create({
        data: {
          storeOwnerId,
          date: new Date(date),
          amount: Number(amount),
          bankName: resolvedBankName,
          reference: reference || null,
          narration: narration || null,
          isRD: !!isRD,
          maturityDate: maturityDate ? new Date(maturityDate) : null,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
        },
      });
      return res.status(201).json(deposit);
    } catch (error) {
      console.error('POST bank deposit error:', error);
      return res.status(500).json({ error: 'Failed to create bank deposit' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, date, amount, bankName, reference, narration, isRD, maturityDate, bankAccountId } = req.body;

      if (!id) return res.status(400).json({ error: 'ID required' });

      let resolvedBankName = bankName;
      if (bankAccountId) {
        const bankAcc = await prisma.bankAccount.findFirst({
          where: { id: Number(bankAccountId), storeOwnerId }
        });
        if (bankAcc) {
          resolvedBankName = bankAcc.name;
        }
      }

      const updated = await prisma.bankDeposit.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          date: new Date(date),
          amount: Number(amount),
          bankName: resolvedBankName,
          reference: reference || null,
          narration: narration || null,
          isRD: isRD !== undefined ? !!isRD : undefined,
          maturityDate: maturityDate ? new Date(maturityDate) : (maturityDate === null ? null : undefined),
          bankAccountId: bankAccountId !== undefined ? (bankAccountId ? Number(bankAccountId) : null) : undefined,
        },
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error('PUT bank deposit error:', error);
      return res.status(500).json({ error: 'Failed to update bank deposit' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID required' });

      await prisma.bankDeposit.delete({
        where: { id: Number(id), storeOwnerId }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE bank deposit error:', error);
      return res.status(500).json({ error: 'Failed to delete deposit' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
