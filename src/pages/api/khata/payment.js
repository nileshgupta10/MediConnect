import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const payments = await prisma.payment.findMany({
        where: { storeOwnerId },
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(payments);
    } catch (error) {
      console.error("GET payment error:", error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const payment = await prisma.payment.create({
        data: {
          storeOwnerId,
          date: new Date(body.date),
          amount: Number(body.amount),
          payee: body.payee,
          type: body.type,
          description: body.description || null,
        },
      });
      return res.status(201).json(payment);
    } catch (error) {
      console.error("POST payment error:", error);
      return res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body;
      const { id, date, amount, payee, type, description } = body;

      if (!id) {
        return res.status(400).json({ error: 'Payment ID is required' });
      }

      const updated = await prisma.payment.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          date: new Date(date),
          amount: Number(amount),
          payee,
          type,
          description: description || null,
        },
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error("PUT payment error:", error);
      return res.status(500).json({ error: 'Failed to update payment' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Payment ID is required' });
      }

      await prisma.payment.delete({
        where: { id: Number(id), storeOwnerId },
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE payment error:", error);
      return res.status(500).json({ error: 'Failed to delete payment' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
