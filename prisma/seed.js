// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("   MEDICLAN KHAATA SYSTEM: GENERATING 1000+ ENTRY STRESS TEST");
  console.log("==================================================================");

  // 1. DETERMINE THE TARGET STORE OWNER ID FOR SEEDING
  let storeOwnerId = '00000000-0000-0000-0000-000000000000'; // Default mock UUID fallback

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      console.log("Connecting to Supabase to find a registered store owner...");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: stores, error } = await supabase
        .from('store_profiles')
        .select('user_id, store_name')
        .limit(1);

      if (error) {
        console.log("Supabase fetch warning:", error.message);
      } else if (stores && stores.length > 0) {
        storeOwnerId = stores[0].user_id;
        console.log(`Found registered store owner: "${stores[0].store_name}" (ID: ${storeOwnerId})`);
      }
    }
  } catch (err) {
    console.log("Could not auto-fetch store owner ID from Supabase. Falling back to default mock UUID.", err.message);
  }

  console.log(`Seeding database for Store Owner ID: "${storeOwnerId}"`);

  // 2. CLEAR PREVIOUS KHAATA DATA IN INTEGRITY ORDER
  console.log("Clearing all previous Khaata records...");
  await prisma.customerTransaction.deleteMany({ where: { storeOwnerId } });
  await prisma.rDRedemption.deleteMany({ where: { storeOwnerId } });
  await prisma.bankCharge.deleteMany({ where: { storeOwnerId } });
  await prisma.cardSettlement.deleteMany({ where: { storeOwnerId } });
  await prisma.payment.deleteMany({ where: { storeOwnerId } });
  await prisma.expense.deleteMany({ where: { storeOwnerId } });
  await prisma.bankDeposit.deleteMany({ where: { storeOwnerId } });
  await prisma.purchase.deleteMany({ where: { storeOwnerId } });
  await prisma.cheque.deleteMany({ where: { storeOwnerId } });
  await prisma.dailySales.deleteMany({ where: { storeOwnerId } });
  await prisma.dailyLedger.deleteMany({ where: { storeOwnerId } });
  await prisma.customer.deleteMany({ where: { storeOwnerId } });
  await prisma.supplier.deleteMany({ where: { storeOwnerId } });
  await prisma.bankAccount.deleteMany({ where: { storeOwnerId } });
  await prisma.appSettings.deleteMany({ where: { storeOwnerId } });
  console.log("Cleared existing Khaata data successfully.");

  // 3. SEED BRAND SETTINGS
  console.log("Creating App Settings...");
  await prisma.appSettings.create({
    data: {
      storeOwnerId,
      companyName: "MediCLan Pharmacy",
      gstin: "27AAAAA1111A1Z1",
      address: "Shop No. 5, Crystal Plaza, Andheri West, Mumbai",
      state: "Maharashtra",
    }
  });

  // 4. SEED BANK ACCOUNTS
  console.log("Seeding Bank Accounts...");
  const bankAccs = [
    { storeOwnerId, name: "HDFC Bank Main", accountNo: "50100012345678", ifscCode: "HDFC0000060", accountType: "Current", openingBalance: 150000.00, openingBalanceDate: new Date("2025-05-01"), isDefault: true, isActive: true },
    { storeOwnerId, name: "SBI Business A/c", accountNo: "30999988887", ifscCode: "SBIN0001234", accountType: "Current", openingBalance: 75000.00, openingBalanceDate: new Date("2025-05-01"), isDefault: false, isActive: true },
    { storeOwnerId, name: "ICICI Store A/c", accountNo: "000405060708", ifscCode: "ICIC0000004", accountType: "Current", openingBalance: 50000.00, openingBalanceDate: new Date("2025-05-01"), isDefault: false, isActive: true },
  ];
  
  const dbBankAccs = [];
  for (const acc of bankAccs) {
    const dbAcc = await prisma.bankAccount.create({ data: acc });
    dbBankAccs.push(dbAcc);
  }
  const hdfc = dbBankAccs[0];
  const sbi = dbBankAccs[1];
  const icici = dbBankAccs[2];

  // 5. SEED SUPPLIERS
  console.log("Seeding Suppliers...");
  const suppliers = [
    { storeOwnerId, name: "Global Pharma Distributors", area: "Andheri, Mumbai", phone: "9820012345", dealsIn: "Allopathy Medicines", gstNumber: "27GSTSUP1111A1Z1" },
    { storeOwnerId, name: "Metro Wholesale Drug House", area: "Sadashiv Peth, Pune", phone: "9820023456", dealsIn: "Generic Drugs", gstNumber: "27GSTSUP2222B1Z2" },
    { storeOwnerId, name: "Apex Medical Agencies", area: "Naupada, Thane", phone: "9820034567", dealsIn: "Surgical Equipment", gstNumber: "27GSTSUP3333C1Z3" },
    { storeOwnerId, name: "Zenith Healthcare Services", area: "Dwarka, Nashik", phone: "9820045678", dealsIn: "Vaccines & Serums", gstNumber: "27GSTSUP4444D1Z4" },
    { storeOwnerId, name: "National Pharma Trading", area: "Dharampeth, Nagpur", phone: "9820056789", dealsIn: "Ayurvedic Products", gstNumber: "27GSTSUP5555E1Z5" },
    { storeOwnerId, name: "Medisource Inc", area: "Bandra, Mumbai", phone: "9820067890", dealsIn: "Nutritional Supplements", gstNumber: "27GSTSUP6666F1Z6" },
  ];
  for (const sup of suppliers) {
    await prisma.supplier.create({ data: sup });
  }

  // 6. SEED CUSTOMERS (CREDIT CUSTOMERS)
  console.log("Seeding Customers...");
  const customers = [
    { storeOwnerId, customerId: "CUST-1001", name: "Dr. Rahul Sharma", phone: "9876543210", address: "Sharma Clinic, Andheri, Mumbai" },
    { storeOwnerId, customerId: "CUST-1002", name: "Dr. Amit Patel", phone: "9876543211", address: "Patel Hospital, Shivaji Nagar, Pune" },
    { storeOwnerId, customerId: "CUST-1003", name: "Dr. Priya Sen", phone: "9876543212", address: "Sen Nursing Home, Thane" },
    { storeOwnerId, customerId: "CUST-1004", name: "Suresh Verma", phone: "9876543213", address: "Flat 402, Sea Breeze, Bandra, Mumbai" },
    { storeOwnerId, customerId: "CUST-1005", name: "Meera Nair", phone: "9876543214", address: "Plot 12, Orchid Avenue, Pune" },
  ];
  
  const dbCustomers = [];
  for (const cust of customers) {
    const dbCust = await prisma.customer.create({ data: cust });
    dbCustomers.push(dbCust);
  }
  const sharma = dbCustomers[0];
  const patel = dbCustomers[1];
  const sen = dbCustomers[2];
  const verma = dbCustomers[3];
  const nair = dbCustomers[4];

  // 7. SEED HISTORIC CREDIT SALES
  console.log("Seeding Customer historic outstanding credit sales...");
  await prisma.customerTransaction.create({
    data: { storeOwnerId, customerId: patel.id, type: "Sale", date: new Date("2025-05-08T12:00:00Z"), amount: 12000.00, narration: "Opening Outstanding Credit Balance", invoiceNumber: "ML-HIST-01" }
  });
  await prisma.customerTransaction.create({
    data: { storeOwnerId, customerId: verma.id, type: "Sale", date: new Date("2025-05-09T12:00:00Z"), amount: 19500.00, narration: "Opening Outstanding Credit Balance", invoiceNumber: "ML-HIST-02" }
  });
  await prisma.customerTransaction.create({
    data: { storeOwnerId, customerId: nair.id, type: "Sale", date: new Date("2025-05-10T12:00:00Z"), amount: 4000.00, narration: "Opening Outstanding Credit Balance", invoiceNumber: "ML-HIST-03" }
  });

  const custBalances = {
    [sharma.id]: 0,
    [patel.id]: 12000.00,
    [sen.id]: 0,
    [verma.id]: 19500.00,
    [nair.id]: 4000.00,
  };

  // 8. PREPARE 365-DAY FINANCIAL TIMELINE (May 27, 2025 - May 26, 2026)
  console.log("Preparing 365-day financial timeline simulation...");
  const today = new Date("2026-05-26T12:00:00Z");
  const dateList = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(12, 0, 0, 0);
    dateList.push(d);
  }

  const shopExpTypes = [
    { text: "Shop cleaning & tea expenses", range: [120, 260] },
    { text: "Printing of prescription books", range: [400, 800] },
    { text: "Internet & WiFi monthly pack", range: [600, 1000] },
    { text: "Drinking water bottle supply", range: [150, 300] },
    { text: "Shop electrical maintenance & bulbs", range: [200, 500] },
    { text: "Delivery boy daily allowance", range: [250, 450] },
    { text: "Stationery - pens, calculators, pads", range: [200, 400] },
  ];

  const homeExpTypes = [
    { text: "Milk & daily groceries", range: [200, 450] },
    { text: "Home vegetables & fruits buy", range: [300, 600] },
    { text: "Fuel allowance for family vehicle", range: [600, 1500] },
    { text: "Home medicine refilling", range: [400, 1000] },
    { text: "Family dinner weekend take-away", range: [800, 1800] },
    { text: "Laundry & dry cleaning bills", range: [300, 700] },
  ];

  let cashBalance = 100000.00;
  let invoiceCounter = 2001;
  let chequeCounter = 604001;
  let outstandingSupplierBills = [];
  let activeRDs = [];
  let rdCounter = 1;

  console.log("Beginning execution of 1500+ database records inside a single transaction...");

  await prisma.$transaction(async (tx) => {
    
    for (let dayIndex = 0; dayIndex < dateList.length; dayIndex++) {
      const targetDate = dateList[dayIndex];
      const dayOfWeek = targetDate.getDay();
      const dateStr = targetDate.toISOString().split('T')[0];
      const isTodayDate = dayIndex === dateList.length - 1;

      let dayCashInflow = 0;
      let dayCashOutflow = 0;

      // A. Daily Sales
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
      let cashSales = Math.round(isWeekend ? (9000 + Math.random() * 10000) : (5000 + Math.random() * 5000));
      let upiSales = Math.round(isWeekend ? (14000 + Math.random() * 12000) : (8000 + Math.random() * 6000));
      let swipeSales = Math.round(isWeekend ? (16000 + Math.random() * 15000) : (9000 + Math.random() * 7000));

      if (isTodayDate) {
        cashSales = 22400;
        upiSales = 28500;
        swipeSales = 32800;
      }

      await tx.dailySales.create({
        data: {
          storeOwnerId,
          date: targetDate,
          cashSales,
          upiSales,
          swipeSales,
          upiAccountId: hdfc.id,
          swipeAccountId: hdfc.id,
        }
      });
      dayCashInflow += cashSales;

      // B. Card Swipe Settlements (T+1 Settlement)
      if (dayIndex > 0) {
        const yesterdayDate = dateList[dayIndex - 1];
        const yesterdaySales = await tx.dailySales.findUnique({
          where: { date_storeOwnerId: { date: yesterdayDate, storeOwnerId } }
        });
        if (yesterdaySales && yesterdaySales.swipeSales > 0) {
          const settlementAmount = Math.round(yesterdaySales.swipeSales * 98.5) / 100;
          await tx.cardSettlement.create({
            data: {
              storeOwnerId,
              date: targetDate,
              amount: settlementAmount,
              bankAccountId: hdfc.id,
              salesDate: yesterdayDate,
              narration: `Card swipe settlement (Fee 1.5% deducted: ₹${Math.round(yesterdaySales.swipeSales * 1.5) / 100})`
            }
          });
        }
      }

      // C. Daily Expenses
      if (dayIndex % 2 === 0 || isTodayDate) {
        const isShop = Math.random() > 0.4;
        const type = isShop 
          ? shopExpTypes[dayIndex % shopExpTypes.length]
          : homeExpTypes[dayIndex % homeExpTypes.length];
        
        const amount = Math.round(type.range[0] + Math.random() * (type.range[1] - type.range[0]));
        const paymentMode = Math.random() > 0.4 ? "Cash" : (Math.random() > 0.5 ? "UPI" : "Bank");

        await tx.expense.create({
          data: {
            storeOwnerId,
            date: targetDate,
            amount,
            category: isShop ? "Shop" : "Home",
            narration: type.text + (isTodayDate ? " (Today's Entry)" : ""),
            paymentMode,
            bankAccountId: paymentMode !== "Cash" ? hdfc.id : null,
          }
        });

        if (paymentMode === "Cash") {
          dayCashOutflow += amount;
        }
      }

      // D. Purchases
      if (dayIndex % 3 === 0 || isTodayDate) {
        const isCash = Math.random() > 0.5 && !isTodayDate;
        const supplier = suppliers[dayIndex % suppliers.length];
        const amount = Math.round(2500 + Math.random() * 12000);
        const invNum = `INV-${invoiceCounter++}`;

        if (isCash) {
          const p = await tx.purchase.create({
            data: {
              storeOwnerId,
              date: targetDate,
              supplierName: supplier.name,
              invoiceNumber: invNum,
              invoiceAmount: amount,
              paymentType: "Cash",
            }
          });
          
          await tx.payment.create({
            data: {
              storeOwnerId,
              date: targetDate,
              amount,
              payee: supplier.name,
              type: "Cash",
              description: `Invoice #${invNum}`,
            }
          });
          dayCashOutflow += amount;
        } else {
          const p = await tx.purchase.create({
            data: {
              storeOwnerId,
              date: targetDate,
              supplierName: supplier.name,
              invoiceNumber: invNum,
              invoiceAmount: amount,
              paymentType: "Credit",
            }
          });
          
          outstandingSupplierBills.push({
            id: p.id,
            supplierName: p.supplierName,
            invoiceNumber: p.invoiceNumber,
            invoiceAmount: p.invoiceAmount,
            date: targetDate,
          });
        }

        if (isTodayDate) {
          const pToday = await tx.purchase.create({
            data: {
              storeOwnerId,
              date: targetDate,
              supplierName: "Metro Wholesale Drug House",
              invoiceNumber: `INV-TODAY-CREDIT`,
              invoiceAmount: 8500,
              paymentType: "Credit",
            }
          });
          outstandingSupplierBills.push({
            id: pToday.id,
            supplierName: pToday.supplierName,
            invoiceNumber: pToday.invoiceNumber,
            invoiceAmount: pToday.invoiceAmount,
            date: targetDate,
          });
        }
      }

      // E. Drawer Cash Deposits into Bank
      if (dayIndex % 4 === 0 && cashBalance > 60000) {
        const depositAmount = Math.round(cashBalance * 0.5);
        const bankAcc = dayIndex % 2 === 0 ? hdfc : sbi;
        await tx.bankDeposit.create({
          data: {
            storeOwnerId,
            date: targetDate,
            amount: depositAmount,
            bankName: bankAcc.name,
            reference: `DEP-TXN-${100000 + dayIndex}`,
            narration: "Excess Cash drawer deposit",
            isRD: false,
            bankAccountId: bankAcc.id,
          }
        });
        dayCashOutflow += depositAmount;
      }

      // H. Customer Credit Transactions
      if (dayIndex % 5 === 0 || isTodayDate) {
        const custIndex = Math.floor(Math.random() * dbCustomers.length);
        const cust = dbCustomers[custIndex];
        const amount = Math.round(1200 + Math.random() * 8000);
        await tx.customerTransaction.create({
          data: {
            storeOwnerId,
            customerId: cust.id,
            type: "Sale",
            date: targetDate,
            amount,
            narration: `Credit Sales Invoice #ML-${1000 + dayIndex}`,
            invoiceNumber: `ML-${1000 + dayIndex}`
          }
        });
        custBalances[cust.id] += amount;
      }

      if (dayIndex % 6 === 0) {
        const candidates = dbCustomers.filter(c => custBalances[c.id] > 0);
        if (candidates.length > 0) {
          const cust = candidates[Math.floor(Math.random() * candidates.length)];
          const outstandingDue = custBalances[cust.id];
          const payAmount = Math.round(outstandingDue * 0.6);
          const isCash = Math.random() > 0.4;

          if (isCash) {
            await tx.customerTransaction.create({
              data: {
                storeOwnerId,
                customerId: cust.id,
                type: "Payment",
                date: targetDate,
                amount: payAmount,
                narration: "Credit repayment cash received"
              }
            });
            dayCashInflow += payAmount;
          } else {
            const clearDate = new Date(targetDate);
            clearDate.setDate(targetDate.getDate() + 4);
            const willClear = clearDate < today;
            const chequeStatus = willClear ? "Cleared" : "Pending";

            await tx.cheque.create({
              data: {
                storeOwnerId,
                chequeNumber: String(800000 + dayIndex),
                chequeDate: clearDate,
                bankName: sbi.name,
                amount: payAmount,
                status: chequeStatus,
                supplierName: cust.name,
                paymentMode: "Cheque",
                bankAccountId: sbi.id,
                partyType: "Customer",
                customerId: cust.id
              }
            });

            await tx.customerTransaction.create({
              data: {
                storeOwnerId,
                customerId: cust.id,
                type: "Payment",
                date: targetDate,
                amount: payAmount,
                narration: `Credit repayment Cheque #${800000 + dayIndex} received`,
                invoiceNumber: `CHQ-${800000 + dayIndex}`
              }
            });
          }

          custBalances[cust.id] -= payAmount;
        }
      }

      // I. Bank Charges (Every 30 days)
      if (dayIndex % 30 === 0) {
        await tx.bankCharge.create({
          data: {
            storeOwnerId,
            date: targetDate,
            amount: 150.00,
            bankAccountId: hdfc.id,
            chargeType: "Account Maintenance",
            narration: "HDFC monthly account maintenance charges"
          }
        });
      }

      // J. Record Cashbook Ledger
      const openingBalance = cashBalance;
      const closingBalance = openingBalance + dayCashInflow - dayCashOutflow;

      await tx.dailyLedger.create({
        data: {
          storeOwnerId,
          date: targetDate,
          openingBalance,
          closingBalance,
          totalIn: dayCashInflow,
          totalOut: dayCashOutflow,
        }
      });

      cashBalance = closingBalance;
    }
  });

  console.log("Timeline seeding complete! All entries committed successfully inside transaction.");
  console.log(`Final Running Drawer Cash is: ₹${cashBalance.toLocaleString('en-IN')}`);
}

main()
  .catch((e) => {
    console.error("Error during database seed execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
