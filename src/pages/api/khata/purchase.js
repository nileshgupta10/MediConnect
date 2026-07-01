import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  try {
    const storeOwnerId = await getStoreOwnerId(req, res);
    if (!storeOwnerId) return;

    if (req.method === 'GET') {
      try {
        const purchases = await prisma.purchase.findMany({
          where: { storeOwnerId },
          include: {
            cheque: true,
          },
          orderBy: { date: 'desc' },
        });
        return res.status(200).json(purchases);
      } catch (error) {
        console.error("GET purchase error:", error);
        return res.status(500).json([]);
      }
    }

    if (req.method === 'POST') {
      try {
        const body = req.body;
        const { supplierName, invoiceNumber, invoiceAmount, paymentType, date, chequeDate, chequeNumber, bankAccountId, paymentMode, bankCharge } = body;

        // Check for duplicate invoice number for the same supplier (case-insensitive check)
        if (invoiceNumber && invoiceNumber.trim().length > 0) {
          const trimmedInvoice = invoiceNumber.trim();
          const purchases = await prisma.purchase.findMany({
            where: { supplierName, storeOwnerId },
            select: { invoiceNumber: true }
          });
          const duplicate = purchases.find(p => p.invoiceNumber.trim().toLowerCase() === trimmedInvoice.toLowerCase());
          if (duplicate) {
            return res.status(400).json({
              error: `Invoice number "${trimmedInvoice}" already exists for supplier "${supplierName}"`
            });
          }
        }
        
        let chequeId = null;
        let finalPaymentType = paymentType;
        let chequeStatus = 'Pending';

        const purchaseDate = new Date(date);
        const finalChequeDate = chequeDate ? new Date(chequeDate) : purchaseDate;

        // If cheque/bank payment details are provided
        const hasChequeDetails = chequeNumber || bankAccountId || paymentMode === 'Cheque' || paymentMode === 'NEFT' || paymentMode === 'IMPS' || paymentMode === 'UPI';

        if (hasChequeDetails) {
          let resolvedBankName = body.chequeBank || 'Bank';
          if (bankAccountId) {
            const bankAcc = await prisma.bankAccount.findFirst({
              where: { id: Number(bankAccountId), storeOwnerId }
            });
            if (bankAcc) {
              resolvedBankName = bankAcc.name;
            }
          }
          
          const isOnline = paymentMode === 'NEFT' || paymentMode === 'IMPS' || paymentMode === 'UPI';
          if (isOnline) {
            chequeStatus = 'Cleared';
          } else {
            // Cheque / Transaction
            const sameDay = purchaseDate.getFullYear() === finalChequeDate.getFullYear() &&
                             purchaseDate.getMonth() === finalChequeDate.getMonth() &&
                             purchaseDate.getDate() === finalChequeDate.getDate();
            if (finalPaymentType === 'Cash') {
              if (sameDay) {
                chequeStatus = 'Cleared';
              } else {
                // Future or past dated cheque under "Cash" -> Automatically force to Credit / PDC
                finalPaymentType = 'Credit';
                chequeStatus = 'Pending';
              }
            } else {
              chequeStatus = 'Pending';
            }
          }

          const cheque = await prisma.cheque.create({
            data: {
              storeOwnerId,
              chequeNumber: chequeNumber || 'TXN',
              chequeDate: finalChequeDate,
              bankName: resolvedBankName,
              amount: Number(invoiceAmount),
              status: chequeStatus,
              supplierName,
              paymentMode: paymentMode || 'Cheque',
              bankCharge: bankCharge ? Number(bankCharge) : null,
              bankAccountId: bankAccountId ? Number(bankAccountId) : null,
            },
          });
          chequeId = cheque.id;
        }

        // Create the purchase record linked to the cheque (if applicable)
        const purchase = await prisma.purchase.create({
          data: {
            storeOwnerId,
            date: purchaseDate,
            supplierName,
            invoiceNumber,
            invoiceAmount: Number(invoiceAmount),
            paymentType: finalPaymentType,
            chequeId,
          },
        });

        // If it is a Cash purchase (and NOT a bank cheque)
        if (finalPaymentType === 'Cash' && !chequeId) {
          await prisma.payment.create({
            data: {
              storeOwnerId,
              date: purchaseDate,
              amount: Number(invoiceAmount),
              payee: supplierName,
              type: 'Cash',
              description: `Invoice #${invoiceNumber}`,
            },
          });
        }

        return res.status(201).json(purchase);
      } catch (error) {
        console.error("POST purchase error:", error);
        return res.status(500).json({ error: error.message || 'Failed to create purchase', stack: error.stack });
      }
    }

    if (req.method === 'PUT') {
      try {
        const body = req.body;
        const { id, date, supplierName, invoiceNumber, invoiceAmount, paymentType, paymentMode, bankAccountId, chequeNumber, chequeDate, bankCharge } = body;

        if (!id) {
          return res.status(400).json({ error: 'Purchase ID is required' });
        }

        const oldPurchase = await prisma.purchase.findFirst({
          where: { id: Number(id), storeOwnerId },
        });

        if (!oldPurchase) {
          return res.status(404).json({ error: 'Purchase not found' });
        }

        // Check if the invoice number is being changed, and check for duplicates on the new number (case-insensitive)
        if (invoiceNumber && invoiceNumber.trim().length > 0) {
          const trimmedInvoice = invoiceNumber.trim();
          if (trimmedInvoice.toLowerCase() !== oldPurchase.invoiceNumber.trim().toLowerCase() || supplierName !== oldPurchase.supplierName) {
            const purchases = await prisma.purchase.findMany({
              where: { supplierName, storeOwnerId },
              select: { invoiceNumber: true }
            });
            const duplicate = purchases.find(p => p.invoiceNumber.trim().toLowerCase() === trimmedInvoice.toLowerCase());
            if (duplicate) {
              return res.status(400).json({
                error: `Invoice number "${trimmedInvoice}" already exists for supplier "${supplierName}"`
              });
            }
          }
        }

        // If invoiceNumber or supplierName changed, rename ALL other parts belonging to the same invoice group first
        if (oldPurchase.invoiceNumber && (invoiceNumber !== oldPurchase.invoiceNumber || supplierName !== oldPurchase.supplierName)) {
          await prisma.purchase.updateMany({
            where: {
              storeOwnerId,
              supplierName: oldPurchase.supplierName,
              invoiceNumber: oldPurchase.invoiceNumber,
              id: { not: Number(id) }
            },
            data: {
              supplierName,
              invoiceNumber,
            }
          });
        }

        const purchaseDate = new Date(date);
        const resolvedChequeDate = chequeDate ? new Date(chequeDate) : purchaseDate;

        // Check if cheque/bank payment details are provided
        const hasChequeDetails = chequeNumber || bankAccountId || paymentMode === 'Cheque' || paymentMode === 'NEFT' || paymentMode === 'IMPS' || paymentMode === 'UPI';

        let resolvedChequeId = oldPurchase.chequeId;

        if (hasChequeDetails) {
          let resolvedBankName = 'Bank';
          if (bankAccountId) {
            const bankAcc = await prisma.bankAccount.findFirst({
              where: { id: Number(bankAccountId), storeOwnerId }
            });
            if (bankAcc) {
              resolvedBankName = bankAcc.name;
            }
          }

          let chequeStatus = 'Pending';
          if (paymentType === 'Cash') {
            const isOnline = paymentMode === 'NEFT' || paymentMode === 'IMPS' || paymentMode === 'UPI' || paymentMode === 'Bank Transfer';
            const sameDay = purchaseDate.getFullYear() === resolvedChequeDate.getFullYear() &&
                             purchaseDate.getMonth() === resolvedChequeDate.getMonth() &&
                             purchaseDate.getDate() === resolvedChequeDate.getDate();
            if (isOnline || sameDay) {
              chequeStatus = 'Cleared';
            }
          }

          if (resolvedChequeId) {
            // Update existing Cheque
            await prisma.cheque.update({
              where: { id: resolvedChequeId, storeOwnerId },
              data: {
                chequeNumber: chequeNumber || 'TXN',
                chequeDate: resolvedChequeDate,
                bankName: resolvedBankName,
                amount: Number(invoiceAmount),
                status: chequeStatus,
                supplierName,
                paymentMode: paymentMode || 'Cheque',
                bankCharge: bankCharge ? Number(bankCharge) : null,
                bankAccountId: bankAccountId ? Number(bankAccountId) : null,
              }
            });
          } else {
            // Create new Cheque
            const cheque = await prisma.cheque.create({
              data: {
                storeOwnerId,
                chequeNumber: chequeNumber || 'TXN',
                chequeDate: resolvedChequeDate,
                bankName: resolvedBankName,
                amount: Number(invoiceAmount),
                status: chequeStatus,
                supplierName,
                paymentMode: paymentMode || 'Cheque',
                bankCharge: bankCharge ? Number(bankCharge) : null,
                bankAccountId: bankAccountId ? Number(bankAccountId) : null,
              }
            });
            resolvedChequeId = cheque.id;
          }
        } else {
          // No cheque details
          if (resolvedChequeId) {
            // Delete linked cheque
            await prisma.cheque.delete({
              where: { id: resolvedChequeId, storeOwnerId }
            });
            resolvedChequeId = null;
          }
        }

        // Update purchase
        const updatedPurchase = await prisma.purchase.update({
          where: { id: Number(id), storeOwnerId },
          data: {
            date: purchaseDate,
            supplierName,
            invoiceNumber,
            invoiceAmount: Number(invoiceAmount),
            paymentType,
            chequeId: resolvedChequeId,
          },
        });

        // Handle Payment synchronization if it was Cash and is still Cash
        const isCashOnly = paymentType === 'Cash' && !resolvedChequeId;
        const wasCashOnly = oldPurchase.paymentType === 'Cash' && !oldPurchase.chequeId;

        if (wasCashOnly) {
          const oldDesc = `Invoice #${oldPurchase.invoiceNumber}`;
          const linkedPayment = await prisma.payment.findFirst({
            where: {
              storeOwnerId,
              payee: oldPurchase.supplierName,
              amount: oldPurchase.invoiceAmount,
              description: oldDesc,
            },
          });

          if (linkedPayment) {
            if (isCashOnly) {
              await prisma.payment.update({
                where: { id: linkedPayment.id, storeOwnerId },
                data: {
                  date: purchaseDate,
                  amount: Number(invoiceAmount),
                  payee: supplierName,
                  description: `Invoice #${invoiceNumber}`,
                },
              });
            } else {
              // Changed to bank or credit -> Delete automated cash payment
              await prisma.payment.delete({
                where: { id: linkedPayment.id, storeOwnerId },
              });
            }
          }
        } else if (isCashOnly) {
          // Changed from bank/credit to Cash Drawer -> Create automated cash payment
          await prisma.payment.create({
            data: {
              storeOwnerId,
              date: purchaseDate,
              amount: Number(invoiceAmount),
              payee: supplierName,
              type: 'Cash',
              description: `Invoice #${invoiceNumber}`,
            },
          });
        }

        return res.status(200).json(updatedPurchase);
      } catch (error) {
        console.error("PUT purchase error:", error);
        return res.status(500).json({ error: error.message || 'Failed to update purchase', stack: error.stack });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({ error: 'Purchase ID is required' });
        }

        const purchase = await prisma.purchase.findFirst({
          where: { id: Number(id), storeOwnerId },
        });

        if (!purchase) {
          return res.status(404).json({ error: 'Purchase not found' });
        }

        // Delete purchase
        await prisma.purchase.delete({
          where: { id: Number(id), storeOwnerId },
        });

        // If it was Cash, clean up the automated cash out payment
        if (purchase.paymentType === 'Cash') {
          const desc = `Invoice #${purchase.invoiceNumber}`;
          const payment = await prisma.payment.findFirst({
            where: {
              storeOwnerId,
              payee: purchase.supplierName,
              amount: purchase.invoiceAmount,
              description: desc,
            },
          });
          if (payment) {
            await prisma.payment.delete({
              where: { id: payment.id, storeOwnerId },
            });
          }
        }

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("DELETE purchase error:", error);
        return res.status(500).json({ error: error.message || 'Failed to delete purchase', stack: error.stack });
      }
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (globalError) {
    console.error("GLOBAL PURCHASE HANDLER ERROR:", globalError);
    return res.status(500).json({ error: globalError.message || 'Global purchase handler error', stack: globalError.stack });
  }
}
}
