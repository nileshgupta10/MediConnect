import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const accounts = await prisma.bankAccount.findMany({
        where: { storeOwnerId, isActive: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json(accounts);
    } catch (error) {
      console.error('GET /api/khata/bank-account error:', error);
      return res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, accountNo, ifscCode, accountType, openingBalance, openingBalanceDate, isDefault } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Bank account name is required' });
      }

      // If this is default, remove default flag from other accounts for this user
      if (isDefault) {
        await prisma.bankAccount.updateMany({
          where: { storeOwnerId },
          data: { isDefault: false },
        });
      }

      const account = await prisma.bankAccount.create({
        data: {
          storeOwnerId,
          name,
          accountNo: accountNo || '',
          ifscCode: ifscCode || '',
          accountType: accountType || 'Savings',
          openingBalance: Number(openingBalance || 0),
          openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null,
          isDefault: !!isDefault,
          isActive: true,
        },
      });

      return res.status(200).json(account);
    } catch (error) {
      console.error('POST /api/khata/bank-account error:', error);
      return res.status(500).json({ error: 'Failed to create bank account' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, action, name, accountNo, ifscCode, accountType, openingBalance, openingBalanceDate, isDefault } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Bank account ID is required' });
      }

      // Action: set-default
      if (action === 'set-default') {
        await prisma.bankAccount.updateMany({
          where: { storeOwnerId },
          data: { isDefault: false },
        });

        const updated = await prisma.bankAccount.update({
          where: { id: Number(id), storeOwnerId },
          data: { isDefault: true },
        });

        return res.status(200).json(updated);
      }

      // Standard edit
      if (isDefault) {
        await prisma.bankAccount.updateMany({
          where: { storeOwnerId },
          data: { isDefault: false },
        });
      }

      const updated = await prisma.bankAccount.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          ...(name !== undefined && { name }),
          ...(accountNo !== undefined && { accountNo }),
          ...(ifscCode !== undefined && { ifscCode }),
          ...(accountType !== undefined && { accountType }),
          ...(openingBalance !== undefined && { openingBalance: Number(openingBalance) }),
          ...(openingBalanceDate !== undefined && { openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null }),
          ...(isDefault !== undefined && { isDefault: !!isDefault }),
        },
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error('PUT /api/khata/bank-account error:', error);
      return res.status(500).json({ error: 'Failed to update bank account' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Bank account ID is required' });
      }

      // Soft delete: set isActive to false
      const deactivated = await prisma.bankAccount.update({
        where: { id: Number(id), storeOwnerId },
        data: { isActive: false, isDefault: false },
      });

      return res.status(200).json(deactivated);
    } catch (error) {
      console.error('DELETE /api/khata/bank-account error:', error);
      return res.status(500).json({ error: 'Failed to deactivate bank account' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
