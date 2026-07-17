-- Migration: add_store_owner_indexes
-- Adds a storeOwnerId index to every Khata model that was missing one.
-- This makes all multi-tenant WHERE storeOwnerId = $1 queries index-scannable.

CREATE INDEX IF NOT EXISTS "DailyLedger_storeOwnerId_idx" ON "DailyLedger"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "Purchase_storeOwnerId_idx" ON "Purchase"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "Cheque_storeOwnerId_idx" ON "Cheque"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "KhataSupplier_storeOwnerId_idx" ON "KhataSupplier"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "Payment_storeOwnerId_idx" ON "Payment"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "Expense_storeOwnerId_idx" ON "Expense"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "BankDeposit_storeOwnerId_idx" ON "BankDeposit"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "RDRedemption_storeOwnerId_idx" ON "RDRedemption"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "BankCharge_storeOwnerId_idx" ON "BankCharge"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "CardSettlement_storeOwnerId_idx" ON "CardSettlement"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "DailySales_storeOwnerId_idx" ON "DailySales"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "Customer_storeOwnerId_idx" ON "Customer"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "CustomerTransaction_storeOwnerId_idx" ON "CustomerTransaction"("storeOwnerId");
CREATE INDEX IF NOT EXISTS "SimpleLedgerEntry_storeOwnerId_idx" ON "SimpleLedgerEntry"("storeOwnerId");
