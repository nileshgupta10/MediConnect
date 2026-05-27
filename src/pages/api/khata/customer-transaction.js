import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const { customerId } = req.query;

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID required' });
      }

      const txs = await prisma.customerTransaction.findMany({
        where: { customerId: Number(customerId), storeOwnerId },
        orderBy: { date: 'asc' },
      });

      return res.status(200).json(txs);
    } catch (error) {
      console.error('GET customer-transaction error:', error);
      return res.status(500).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const { customerId, type, date, amount, narration, invoiceNumber, mode, chequeNumber, chequeDate, bankAccountId } = req.body;

      if (!customerId || !type || !date || amount === undefined || isNaN(Number(amount))) {
        return res.status(400).json({ error: 'Missing required transaction fields' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create the customer transaction record
        const newTx = await tx.customerTransaction.create({
          data: {
            storeOwnerId,
            customerId: Number(customerId),
            type, // "Sale" or "Payment"
            date: new Date(date),
            amount: Math.abs(Number(amount)),
            narration: narration?.trim() || (mode ? `${mode} Collection` : ''),
            invoiceNumber: type === 'Sale' ? (invoiceNumber?.trim() || '') : null,
          },
        });

        // 2. Create the Customer PDC Cheque record if mode is Cheque
        if (type === 'Payment' && mode === 'Cheque') {
          if (!chequeNumber || !chequeDate || !bankAccountId) {
            throw new Error('Cheque details (number, date, bank account) are required');
          }

          const bankAcc = await tx.bankAccount.findFirst({
            where: { id: Number(bankAccountId), storeOwnerId },
          });

          if (!bankAcc) {
            throw new Error('Selected bank account does not exist');
          }

          const customer = await tx.customer.findFirst({
            where: { id: Number(customerId), storeOwnerId },
          });

          if (!customer) {
            throw new Error('Customer does not exist');
          }

          await tx.cheque.create({
            data: {
              storeOwnerId,
              chequeNumber,
              chequeDate: new Date(chequeDate),
              bankName: bankAcc.name,
              amount: Math.abs(Number(amount)),
              status: 'Pending',
              supplierName: customer.name,
              partyType: 'Customer',
              customerId: customer.id,
              bankAccountId: bankAcc.id,
              paymentMode: 'Cheque',
            },
          });
        }

        return newTx;
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error('POST customer-transaction error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create transaction' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Transaction ID required' });
      }

      await prisma.customerTransaction.delete({
        where: { id: Number(id), storeOwnerId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE customer-transaction error:', error);
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
