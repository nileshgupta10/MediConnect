import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      const cheques = await prisma.cheque.findMany({
        where: { storeOwnerId },
        orderBy: { chequeDate: 'asc' },
      });
      return res.status(200).json(cheques);
    } catch (error) {
      console.error('GET cheque error:', error);
      return res.status(550).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const { chequeNumber, chequeDate, bankName, amount, status, supplierName, paymentMode, bankCharge, bankAccountId, partyType, customerId } = body;

      if (!chequeNumber || !chequeDate || !amount || !bankName) {
        return res.status(400).json({ error: 'Missing required cheque fields' });
      }

      const cheque = await prisma.cheque.create({
        data: {
          storeOwnerId,
          chequeNumber,
          chequeDate: new Date(chequeDate),
          bankName,
          amount: Number(amount),
          status: status || 'Pending',
          supplierName: supplierName || '',
          paymentMode: paymentMode || 'Cheque',
          bankCharge: bankCharge ? Number(bankCharge) : null,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          partyType: partyType || 'Supplier',
          customerId: customerId ? Number(customerId) : null,
        },
      });

      return res.status(201).json(cheque);
    } catch (error) {
      console.error('POST cheque error:', error);
      return res.status(500).json({ error: 'Failed to create cheque' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body;
      const { id, action, chequeNumber, chequeDate, bankName, amount, status, supplierName, paymentMode, bankCharge, bankAccountId } = body;

      if (!id) {
        return res.status(400).json({ error: 'Cheque ID is required' });
      }

      const oldCheque = await prisma.cheque.findFirst({
        where: { id: Number(id), storeOwnerId },
      });

      if (!oldCheque) {
        return res.status(404).json({ error: 'Cheque not found' });
      }

      if (action === 'clear') {
        const updated = await prisma.cheque.update({
          where: { id: Number(id), storeOwnerId },
          data: { status: 'Cleared' },
        });

        // Sync with payments if it was a cleared Supplier cheque
        if (oldCheque.partyType === 'Supplier') {
          // Verify if payment entry already exists
          const existingPayment = await prisma.payment.findFirst({
            where: {
              storeOwnerId,
              payee: oldCheque.supplierName,
              amount: oldCheque.amount,
              description: `HDFC Bank Settlement (Ref No: ${oldCheque.chequeNumber})`
            }
          });

          if (!existingPayment) {
            await prisma.payment.create({
              data: {
                storeOwnerId,
                date: oldCheque.chequeDate, // Settlement cleared date
                amount: oldCheque.amount,
                payee: oldCheque.supplierName,
                type: 'Credit',
                description: `HDFC Bank Settlement (Ref No: ${oldCheque.chequeNumber})`
              }
            });
          }
        }

        return res.status(200).json(updated);
      }

      if (action === 'return') {
        const updated = await prisma.cheque.update({
          where: { id: Number(id), storeOwnerId },
          data: { status: 'Returned' },
        });

        // Reversal logic for customer returned inward cheques
        if (oldCheque.partyType === 'Customer' && oldCheque.customerId) {
          console.log(`Reversing returned customer cheque #${oldCheque.chequeNumber} for customer id ${oldCheque.customerId}...`);
          
          // Find the customer credit transaction that represented this payment
          const linkedTx = await prisma.customerTransaction.findFirst({
            where: {
              storeOwnerId,
              customerId: oldCheque.customerId,
              amount: oldCheque.amount,
              type: 'Payment',
              invoiceNumber: `CHQ-${oldCheque.chequeNumber}`
            }
          });

          if (linkedTx) {
            console.log(`Deleting customer transaction ID ${linkedTx.id} to reverse the credit payment.`);
            await prisma.customerTransaction.delete({
              where: { id: linkedTx.id, storeOwnerId }
            });
          }
        }

        return res.status(200).json(updated);
      }

      // Standard edit
      const updated = await prisma.cheque.update({
        where: { id: Number(id), storeOwnerId },
        data: {
          ...(chequeNumber !== undefined && { chequeNumber }),
          ...(chequeDate !== undefined && { chequeDate: new Date(chequeDate) }),
          ...(bankName !== undefined && { bankName }),
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(status !== undefined && { status }),
          ...(supplierName !== undefined && { supplierName }),
          ...(paymentMode !== undefined && { paymentMode }),
          ...(bankCharge !== undefined && { bankCharge: bankCharge ? Number(bankCharge) : null }),
          ...(bankAccountId !== undefined && { bankAccountId: bankAccountId ? Number(bankAccountId) : null }),
        },
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error('PUT cheque error:', error);
      return res.status(500).json({ error: 'Failed to update cheque' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Cheque ID is required' });
      }

      const oldCheque = await prisma.cheque.findFirst({
        where: { id: Number(id), storeOwnerId },
      });

      if (!oldCheque) {
        return res.status(404).json({ error: 'Cheque not found' });
      }

      // Delete the cheque record
      await prisma.cheque.delete({
        where: { id: Number(id), storeOwnerId },
      });

      // Automated reversal cleanup for customer deleted inward cheques
      if (oldCheque.partyType === 'Customer' && oldCheque.customerId) {
        console.log(`Reversing customer payment for deleted cheque #${oldCheque.chequeNumber}...`);
        const linkedTx = await prisma.customerTransaction.findFirst({
          where: {
            storeOwnerId,
            customerId: oldCheque.customerId,
            amount: oldCheque.amount,
            type: 'Payment',
            invoiceNumber: `CHQ-${oldCheque.chequeNumber}`
          }
        });

        if (linkedTx) {
          console.log(`Deleting linked transaction ID ${linkedTx.id} due to cheque deletion.`);
          await prisma.customerTransaction.delete({
            where: { id: linkedTx.id, storeOwnerId }
          });
        }
      }

      // Automated clean up for supplier cleared cheque bank logs
      if (oldCheque.partyType === 'Supplier' && oldCheque.status === 'Cleared') {
        const desc = `HDFC Bank Settlement (Ref No: ${oldCheque.chequeNumber})`;
        const payment = await prisma.payment.findFirst({
          where: {
            storeOwnerId,
            payee: oldCheque.supplierName,
            amount: oldCheque.amount,
            description: desc,
          }
        });

        if (payment) {
          await prisma.payment.delete({
            where: { id: payment.id, storeOwnerId }
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE cheque error:', error);
      return res.status(500).json({ error: 'Failed to delete cheque' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
