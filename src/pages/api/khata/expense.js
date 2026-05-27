import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const { category } = req.query; // "Home" | "Shop" | null for all
      
      const where = { storeOwnerId };
      if (category) {
        where.category = category;
      }

      const expenses = await prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(expenses);
    } catch (error) {
      console.error('GET expense error:', error);
      return res.status(500).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const { date, amount, category, narration, paymentMode, bankAccountId } = body;

      if (!date || !amount || !category || !narration) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const expense = await prisma.expense.create({
        data: {
          storeOwnerId,
          date: new Date(date),
          amount: Number(amount),
          category,
          narration,
          paymentMode: paymentMode || 'Cash',
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
        },
      });
      return res.status(201).json(expense);
    } catch (error) {
      console.error('POST expense error:', error);
      return res.status(500).json({ error: 'Failed to create expense' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body;
      const { id, date, amount, category, narration, paymentMode, bankAccountId } = body;

      if (!id) return res.status(400).json({ error: 'ID required' });

      const updated = await prisma.expense.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          date: new Date(date),
          amount: Number(amount),
          category,
          narration,
          paymentMode: paymentMode || 'Cash',
          bankAccountId: bankAccountId !== undefined ? (bankAccountId ? Number(bankAccountId) : null) : undefined,
        },
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error('PUT expense error:', error);
      return res.status(500).json({ error: 'Failed to update expense' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID required' });

      await prisma.expense.delete({
        where: { id: Number(id), storeOwnerId }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE expense error:', error);
      return res.status(500).json({ error: 'Failed to delete expense' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
