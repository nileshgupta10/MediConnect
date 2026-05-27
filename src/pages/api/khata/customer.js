import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const customers = await prisma.customer.findMany({
        where: { storeOwnerId },
        include: {
          transactions: true,
        },
        orderBy: { customerId: 'asc' },
      });

      const result = customers.map((c) => {
        const totalSales = c.transactions
          .filter((t) => t.type === 'Sale')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalPayments = c.transactions
          .filter((t) => t.type === 'Payment')
          .reduce((sum, t) => sum + t.amount, 0);
        const outstandingBalance = totalSales - totalPayments;

        return {
          ...c,
          outstandingBalance,
        };
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('GET customer error:', error);
      return res.status(550).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, phone, address } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required' });
      }

      // Auto-generate sequential customerId unique to this storeOwnerId
      const count = await prisma.customer.count({
        where: { storeOwnerId }
      });
      const nextNum = 1001 + count;
      const customerId = `CUST-${nextNum}`;

      const newCustomer = await prisma.customer.create({
        data: {
          storeOwnerId,
          customerId,
          name: name.trim(),
          phone: phone.trim(),
          address: address?.trim() || '',
        },
      });

      return res.status(201).json(newCustomer);
    } catch (error) {
      console.error('POST customer error:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, name, phone, address } = req.body;

      if (!id || !name || !phone) {
        return res.status(400).json({ error: 'ID, Name and Phone are required' });
      }

      const updated = await prisma.customer.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          name: name.trim(),
          phone: phone.trim(),
          address: address?.trim() || '',
        },
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error('PUT customer error:', error);
      return res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Customer ID required' });
      }

      await prisma.customer.delete({
        where: { id: Number(id), storeOwnerId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE customer error:', error);
      return res.status(500).json({ error: 'Failed to delete customer' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
