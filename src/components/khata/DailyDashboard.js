"use strict";
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { formatDate, khataFetch } from "../../lib/khata-utils";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Save,
  IndianRupee,
  Home,
  ShoppingBag,
  TrendingUp,
  TrendingDown
} from "lucide-react";
const INPUT_STYLE = "flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-semibold";
export function DailyDashboard({ mode = "dashboard" }) {
  const todayLocal = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
  const [selectedDate, setSelectedDate] = useState(todayLocal);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dailyLedgers, setDailyLedgers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [rdRedemptions, setRdRedemptions] = useState([]);
  const [cardSettlements, setCardSettlements] = useState([]);
  const [bankCharges, setBankCharges] = useState([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [unlockedTab, setUnlockedTab] = useState("daily");
  const [allSales, setAllSales] = useState([]);
  const [customSalesStartDate, setCustomSalesStartDate] = useState(() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString("en-CA");
  });
  const [customSalesEndDate, setCustomSalesEndDate] = useState(todayLocal);
  const [salesForm, setSalesForm] = useState({ cashSales: "0", upiSales: "0", swipeSales: "0" });
  const [openingBalanceInput, setOpeningBalanceInput] = useState("0");
  const [isPurchaseAddOpen, setIsPurchaseAddOpen] = useState(false);
  const [addPdcDetails, setAddPdcDetails] = useState(false);
  const [isExpenseAddOpen, setIsExpenseAddOpen] = useState(false);
  const [isRdRedeemOpen, setIsRdRedeemOpen] = useState(false);
  const [isCardSettlementOpen, setIsCardSettlementOpen] = useState(false);
  const [rdRedeemForm, setRdRedeemForm] = useState({ date: "", amount: "", redemptionType: "Cash", bankAccountId: "", narration: "", originalDepositId: null });
  const [cardSettlementForm, setCardSettlementForm] = useState({ date: "", amount: "", bankAccountId: "", salesDate: "", narration: "" });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isPurchaseEditOpen, setIsPurchaseEditOpen] = useState(false);
  const [isExpenseEditOpen, setIsExpenseEditOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplierName: "",
    invoiceNumber: "",
    invoiceAmount: "",
    paymentType: "Cash",
    registerNewSupplier: false,
    newSupplierName: "",
    newSupplierArea: "",
    newSupplierPhone: "",
    newSupplierDealsIn: "",
    newSupplierGst: "",
    paymentMode: "Cash",
    bankAccountId: "",
    chequeNumber: "",
    chequeDate: "",
    bankCharge: ""
  });
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "Shop",
    narration: "",
    paymentMode: "Cash",
    bankAccountId: ""
  });
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isQuickBankOpen, setIsQuickBankOpen] = useState(false);
  const [quickBankForm, setQuickBankForm] = useState({
    name: "",
    accountNo: "",
    ifscCode: "",
    accountType: "Savings",
    openingBalance: "0",
    isDefault: false
  });
  const [isManageBanksOpen, setIsManageBanksOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);
  const [bankEditForm, setBankEditForm] = useState({
    name: "",
    accountNo: "",
    ifscCode: "",
    accountType: "Savings",
    openingBalance: "0",
    isDefault: false
  });
  const getDerivedOpeningCashBalance = (targetDateStr, currentLedgers = dailyLedgers, currentPurchases = purchases, currentExpenses = expenses, currentDeposits = deposits, currentPayments = payments, currentSales = allSales) => {
    try {
      const d = new Date(targetDateStr);
      d.setDate(d.getDate() - 1);
      const yesterdayStr = d.toLocaleDateString("en-CA");
      const sortedLedgers = [...currentLedgers].sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch {
          return a.date.localeCompare(b.date);
        }
      });
      const yesterdayLedger = sortedLedgers.find((l) => {
        try {
          return new Date(l.date).toLocaleDateString("en-CA") === yesterdayStr;
        } catch {
          return false;
        }
      });
      if (yesterdayLedger) {
        return yesterdayLedger.closingBalance ?? 0;
      }
      const prevLedgers = sortedLedgers.filter((l) => {
        try {
          return new Date(l.date).toLocaleDateString("en-CA") < yesterdayStr;
        } catch {
          return false;
        }
      });
      let currentBalance = 0;
      let startDateStr = "";
      if (prevLedgers.length > 0) {
        const latestPrevLedger = prevLedgers[prevLedgers.length - 1];
        currentBalance = latestPrevLedger.closingBalance ?? 0;
        try {
          startDateStr = new Date(latestPrevLedger.date).toLocaleDateString("en-CA");
        } catch {
          startDateStr = "";
        }
      }
      if (!startDateStr) {
        const dates = [
          ...currentPurchases.map((p) => p.date),
          ...currentExpenses.map((e) => e.date),
          ...currentDeposits.map((dep) => dep.date),
          ...currentPayments.map((pay) => pay.date),
          ...currentSales.map((s) => s.date)
        ].filter(Boolean).map((date) => {
          try {
            return new Date(date).toLocaleDateString("en-CA");
          } catch {
            return "";
          }
        }).filter(Boolean);
        if (dates.length > 0) {
          dates.sort();
          startDateStr = dates[0];
        } else {
          startDateStr = yesterdayStr;
        }
      }
      let tempDate = new Date(startDateStr);
      if (prevLedgers.length > 0) {
        tempDate.setDate(tempDate.getDate() + 1);
      }
      const yesterdayDate = new Date(yesterdayStr);
      let safetyCounter = 0;
      while (tempDate <= yesterdayDate && safetyCounter < 1e3) {
        safetyCounter++;
        const currentLoopDateStr = tempDate.toLocaleDateString("en-CA");
        const dateSales = currentSales.find((s) => {
          try {
            return new Date(s.date).toLocaleDateString("en-CA") === currentLoopDateStr;
          } catch {
            return false;
          }
        });
        const loopCashSales = dateSales?.cashSales ?? 0;
        const loopPurchases = currentPurchases.filter((p) => {
          try {
            return new Date(p.date).toLocaleDateString("en-CA") === currentLoopDateStr;
          } catch {
            return false;
          }
        });
        const loopCashPurchases = loopPurchases.filter((p) => p.paymentType === "Cash" && !p.chequeId);
        const loopTotalPhysicalCashPurchases = loopCashPurchases.reduce((s, p) => s + p.invoiceAmount, 0);
        const loopExpenses = currentExpenses.filter((e) => {
          try {
            return new Date(e.date).toLocaleDateString("en-CA") === currentLoopDateStr;
          } catch {
            return false;
          }
        });
        const loopShopExpenses = loopExpenses.filter((e) => e.category === "Shop" && (!e.paymentMode || e.paymentMode === "Cash"));
        const loopTotalPhysicalShopExpenses = loopShopExpenses.reduce((s, e) => s + e.amount, 0);
        const loopHomeExpenses = loopExpenses.filter((e) => e.category === "Home" && (!e.paymentMode || e.paymentMode === "Cash"));
        const loopTotalPhysicalHomeExpenses = loopHomeExpenses.reduce((s, e) => s + e.amount, 0);
        const loopDeposits = currentDeposits.filter((dep) => {
          try {
            return new Date(dep.date).toLocaleDateString("en-CA") === currentLoopDateStr;
          } catch {
            return false;
          }
        });
        const loopRecurringDeposits = loopDeposits.filter(
          (dep) => (dep.reference ?? "").toLowerCase().includes("[rd]") || (dep.narration ?? "").toLowerCase().includes("[rd]")
        );
        const loopBankDeposits = loopDeposits.filter((dep) => !loopRecurringDeposits.includes(dep));
        const loopTotalBankDeposits = loopBankDeposits.reduce((s, dep) => s + dep.amount, 0);
        const loopTotalRDs = loopRecurringDeposits.reduce((s, dep) => s + dep.amount, 0);
        const loopPayments = currentPayments.filter((pay) => {
          try {
            return new Date(pay.date).toLocaleDateString("en-CA") === currentLoopDateStr;
          } catch {
            return false;
          }
        });
        const loopCreditCashPayments = loopPayments.filter((pay) => pay.type === "Cash" && !(pay.description ?? "").startsWith("Invoice #"));
        const loopTotalCreditPayments = loopCreditCashPayments.reduce((s, pay) => s + pay.amount, 0);
        const loopTotalOutflows = loopTotalPhysicalCashPurchases + loopTotalPhysicalShopExpenses + loopTotalPhysicalHomeExpenses + loopTotalBankDeposits + loopTotalCreditPayments;
        currentBalance = currentBalance + loopCashSales - loopTotalOutflows;
        tempDate.setDate(tempDate.getDate() + 1);
      }
      return currentBalance;
    } catch (e) {
      console.error("Error in getDerivedOpeningCashBalance:", e);
      return 0;
    }
  };
  const fetchAll = async () => {
    try {
      const purRes = await khataFetch("/api/khata/purchase");
      const purData = await purRes.json();
      setPurchases(purData || []);
      const expRes = await khataFetch("/api/khata/expense");
      const expData = await expRes.json();
      setExpenses(expData || []);
      const depRes = await khataFetch("/api/khata/bank-deposit");
      const depData = await depRes.json();
      setDeposits(depData || []);
      const payRes = await khataFetch("/api/khata/payment");
      const payData = await payRes.json();
      setPayments(payData || []);
      const ledgRes = await khataFetch("/api/khata/daily-ledger");
      const ledgData = await ledgRes.json();
      setDailyLedgers(ledgData || []);
      const supRes = await khataFetch("/api/khata/supplier");
      const supData = await supRes.json();
      setSuppliers(supData || []);
      const baRes = await khataFetch("/api/khata/bank-account");
      const baData = await baRes.json();
      setBankAccounts(baData || []);
      const chqRes = await khataFetch("/api/khata/cheque");
      const chqData = await chqRes.json();
      setCheques(chqData || []);
      const rdrRes = await khataFetch("/api/khata/rd-redemption");
      const rdrData = await rdrRes.json();
      setRdRedemptions(rdrData || []);
      const csRes = await khataFetch("/api/khata/card-settlement");
      const csData = await csRes.json();
      setCardSettlements(csData || []);
      const bcRes = await khataFetch("/api/khata/bank-charge");
      const bcData = await bcRes.json();
      setBankCharges(bcData || []);
      const defaultAcc = baData?.find((b) => b.isDefault) || baData?.[0];
      const defaultAccId = defaultAcc ? String(defaultAcc.id) : "";
      setDepositForm((prev) => ({ ...prev, bankAccountId: prev.bankAccountId || defaultAccId }));
      setPurchaseForm((prev) => ({ ...prev, bankAccountId: prev.bankAccountId || defaultAccId }));
      setExpenseForm((prev) => ({ ...prev, bankAccountId: prev.bankAccountId || defaultAccId }));
      if (supData && supData.length > 0) {
        setPurchaseForm((prev) => ({ ...prev, supplierName: prev.supplierName || supData[0].name }));
      }
      const salRes = await khataFetch(`/api/khata/daily-sales?date=${selectedDate}`);
      const salData = await salRes.json();
      if (salData) {
        setSalesForm({
          cashSales: String(salData.cashSales ?? 0),
          upiSales: String(salData.upiSales ?? 0),
          swipeSales: String(salData.swipeSales ?? 0)
        });
      } else {
        setSalesForm({ cashSales: "0", upiSales: "0", swipeSales: "0" });
      }
      const salAllRes = await khataFetch("/api/khata/daily-sales");
      const salAllData = await salAllRes.json();
      setAllSales(salAllData || []);
      const matchedLedger = ledgData?.find((l) => {
        try {
          return new Date(l.date).toLocaleDateString("en-CA") === selectedDate;
        } catch {
          return false;
        }
      });
      const derivedOpBal = getDerivedOpeningCashBalance(
        selectedDate,
        ledgData || [],
        purData || [],
        expData || [],
        depData || [],
        payData || [],
        salAllData || []
      );
      setOpeningBalanceInput(String(matchedLedger?.openingBalance ?? derivedOpBal));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };
  useEffect(() => {
    fetchAll();
  }, [selectedDate]);
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString("en-CA"));
  };
  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toLocaleDateString("en-CA"));
  };
  const isDateMatch = (d1) => {
    try {
      return new Date(d1).toLocaleDateString("en-CA") === selectedDate;
    } catch {
      return false;
    }
  };
  const datePurchases = purchases.filter((p) => isDateMatch(p.date));
  const cashPurchases = datePurchases.filter((p) => p.paymentType === "Cash");
  const creditPurchases = datePurchases.filter((p) => p.paymentType === "Credit");
  const dateExpenses = expenses.filter((e) => isDateMatch(e.date));
  const shopExpenses = dateExpenses.filter((e) => e.category === "Shop");
  const homeExpenses = dateExpenses.filter((e) => e.category === "Home");
  const dateDeposits = deposits.filter((d) => isDateMatch(d.date));
  const recurringDeposits = dateDeposits.filter(
    (d) => (d.reference ?? "").toLowerCase().includes("[rd]") || (d.narration ?? "").toLowerCase().includes("[rd]")
  );
  const bankDeposits = dateDeposits.filter((d) => !recurringDeposits.includes(d));
  const datePayments = payments.filter((p) => isDateMatch(p.date));
  const totalCashPurchases = cashPurchases.reduce((s, p) => s + p.invoiceAmount, 0);
  const totalCreditPurchases = creditPurchases.reduce((s, p) => s + p.invoiceAmount, 0);
  const totalShopExpenses = shopExpenses.reduce((s, e) => s + e.amount, 0);
  const totalHomeExpenses = homeExpenses.reduce((s, e) => s + e.amount, 0);
  const totalBankDeposits = bankDeposits.reduce((s, d) => s + d.amount, 0);
  const totalRDs = recurringDeposits.reduce((s, d) => s + d.amount, 0);
  const physicalCashPurchases = cashPurchases.filter((p) => !p.chequeId);
  const totalPhysicalCashPurchases = physicalCashPurchases.reduce((s, p) => s + p.invoiceAmount, 0);
  const physicalShopExpenses = shopExpenses.filter((e) => !e.paymentMode || e.paymentMode === "Cash");
  const totalPhysicalShopExpenses = physicalShopExpenses.reduce((s, e) => s + e.amount, 0);
  const physicalHomeExpenses = homeExpenses.filter((e) => !e.paymentMode || e.paymentMode === "Cash");
  const totalPhysicalHomeExpenses = physicalHomeExpenses.reduce((s, e) => s + e.amount, 0);
  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === "1234") {
      setIsUnlocked(true);
      setPasswordInput("");
    } else {
      alert("Invalid passcode. Access denied.");
    }
  };
  const handleAddPurchase = async (e) => {
    e.preventDefault();
    try {
      let activeSupplierName = purchaseForm.supplierName;
      if (purchaseForm.registerNewSupplier) {
        if (!purchaseForm.newSupplierName.trim() || !purchaseForm.newSupplierArea.trim()) {
          alert("Supplier name and area are compulsory.");
          return;
        }
        const supRes = await khataFetch("/api/khata/supplier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: purchaseForm.newSupplierName,
            area: purchaseForm.newSupplierArea,
            phone: purchaseForm.newSupplierPhone,
            dealsIn: purchaseForm.newSupplierDealsIn,
            gstNumber: purchaseForm.newSupplierGst
          })
        });
        if (!supRes.ok) {
          const err = await supRes.json();
          alert(err.error || "Failed to register supplier inline.");
          return;
        }
        const newSup = await supRes.json();
        activeSupplierName = newSup.name;
      }
      if (!activeSupplierName) {
        alert("Please select or register a supplier.");
        return;
      }
      const isPdc = purchaseForm.paymentType === "Credit" && addPdcDetails;
      const isOnline = purchaseForm.paymentType === "Cash" && purchaseForm.paymentMode !== "Cash" || isPdc;
      const payload = {
        date: selectedDate,
        supplierName: activeSupplierName,
        invoiceNumber: purchaseForm.invoiceNumber,
        invoiceAmount: Number(purchaseForm.invoiceAmount),
        paymentType: purchaseForm.paymentType,
        paymentMode: isPdc ? "Cheque" : isOnline ? purchaseForm.paymentMode : "Cash",
        bankAccountId: isOnline && purchaseForm.bankAccountId ? Number(purchaseForm.bankAccountId) : void 0,
        chequeNumber: isOnline ? purchaseForm.chequeNumber : void 0,
        chequeDate: isOnline ? purchaseForm.chequeDate || selectedDate : void 0,
        bankCharge: isOnline && purchaseForm.bankCharge ? Number(purchaseForm.bankCharge) : void 0
      };
      const res = await khataFetch("/api/khata/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsPurchaseAddOpen(false);
        setAddPdcDetails(false);
        setPurchaseForm({
          supplierName: "",
          invoiceNumber: "",
          invoiceAmount: "",
          paymentType: "Cash",
          registerNewSupplier: false,
          newSupplierName: "",
          newSupplierArea: "",
          newSupplierPhone: "",
          newSupplierDealsIn: "",
          newSupplierGst: "",
          paymentMode: "Cash",
          bankAccountId: "",
          chequeNumber: "",
          chequeDate: "",
          bankCharge: ""
        });
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add purchase");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save purchase: " + (err.message || err));
    }
  };
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await khataFetch("/api/khata/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          date: selectedDate,
          amount: Number(expenseForm.amount),
          bankAccountId: expenseForm.paymentMode !== "Cash" && expenseForm.bankAccountId ? Number(expenseForm.bankAccountId) : null
        })
      });
      if (res.ok) {
        setIsExpenseAddOpen(false);
        setExpenseForm((prev) => ({ ...prev, amount: "", narration: "" }));
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add expense");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerEditPurchase = (p) => {
    setEditingPurchase({
      id: p.id,
      date: new Date(p.date).toISOString().split("T")[0],
      supplierName: p.supplierName,
      invoiceNumber: p.invoiceNumber,
      invoiceAmount: String(p.invoiceAmount),
      paymentType: p.paymentType,
      paymentMode: p.cheque?.paymentMode || "Cash",
      bankAccountId: p.cheque?.bankAccountId ? String(p.cheque.bankAccountId) : "",
      chequeNumber: p.cheque?.chequeNumber || "",
      chequeDate: p.cheque?.chequeDate ? new Date(p.cheque.chequeDate).toISOString().split("T")[0] : "",
      bankCharge: p.cheque?.bankCharge ? String(p.cheque.bankCharge) : ""
    });
    setIsPurchaseEditOpen(true);
  };
  const triggerEditExpense = (e) => {
    setEditingExpense({
      id: e.id,
      date: new Date(e.date).toISOString().split("T")[0],
      amount: String(e.amount),
      category: e.category,
      narration: e.narration,
      paymentMode: e.paymentMode || "Cash",
      bankAccountId: e.bankAccountId ? String(e.bankAccountId) : ""
    });
    setIsExpenseEditOpen(true);
  };

  const handleEditPurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!editingPurchase) return;
    try {
      const res = await khataFetch("/api/khata/purchase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingPurchase,
          invoiceAmount: Number(editingPurchase.invoiceAmount)
        })
      });
      if (res.ok) {
        setIsPurchaseEditOpen(false);
        setEditingPurchase(null);
        fetchAll();
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to save purchase details." }));
        alert(err.error || "Failed to save purchase details.");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleDeletePurchase = async (id) => {
    if (!confirm("Are you sure you want to delete this purchase? All associated payments will also be cleaned.")) return;
    try {
      const res = await khataFetch(`/api/khata/purchase?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setIsPurchaseEditOpen(false);
        setEditingPurchase(null);
        fetchAll();
      } else {
        alert("Failed to delete purchase invoice.");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleEditExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      const res = await khataFetch("/api/khata/expense", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingExpense,
          amount: Number(editingExpense.amount),
          bankAccountId: editingExpense.paymentMode !== "Cash" && editingExpense.bankAccountId ? Number(editingExpense.bankAccountId) : null
        })
      });
      if (res.ok) {
        setIsExpenseEditOpen(false);
        setEditingExpense(null);
        fetchAll();
      } else {
        alert("Failed to save expense details.");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleDeleteExpense = async (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await khataFetch(`/api/khata/expense?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setIsExpenseEditOpen(false);
        setEditingExpense(null);
        fetchAll();
      } else {
        alert("Failed to delete expense.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickBankSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await khataFetch("/api/khata/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickBankForm.name,
          accountNo: quickBankForm.accountNo,
          ifscCode: quickBankForm.ifscCode,
          accountType: quickBankForm.accountType,
          openingBalance: Number(quickBankForm.openingBalance),
          isDefault: quickBankForm.isDefault
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsQuickBankOpen(false);
        setQuickBankForm({
          name: "",
          accountNo: "",
          ifscCode: "",
          accountType: "Savings",
          openingBalance: "0",
          isDefault: false
        });
        await fetchAll();
        const newBankId = String(data.id);
        setPurchaseForm((prev) => ({ ...prev, bankAccountId: newBankId }));
        setExpenseForm((prev) => ({ ...prev, bankAccountId: newBankId }));
      } else {
        alert(data.error || "Failed to add bank account");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleBankEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBankId) return;
    try {
      const res = await khataFetch("/api/khata/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBankId,
          name: bankEditForm.name,
          accountNo: bankEditForm.accountNo,
          ifscCode: bankEditForm.ifscCode,
          accountType: bankEditForm.accountType,
          openingBalance: Number(bankEditForm.openingBalance),
          isDefault: bankEditForm.isDefault
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingBankId(null);
        setBankEditForm({
          name: "",
          accountNo: "",
          ifscCode: "",
          accountType: "Savings",
          openingBalance: "0",
          isDefault: false
        });
        fetchAll();
      } else {
        alert(data.error || "Failed to update bank account");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleBankDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return;
    try {
      const res = await khataFetch(`/api/khata/bank-account?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAll();
      } else {
        alert("Failed to delete bank account.");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleSetDefaultBank = async (id) => {
    try {
      const res = await khataFetch("/api/khata/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "set-default" })
      });
      if (res.ok) {
        fetchAll();
      } else {
        alert("Failed to set bank account as default.");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleSaveLedgerAndSales = async () => {
    setLedgerSaving(true);
    try {
      await khataFetch("/api/khata/daily-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          cashSales: Number(salesForm.cashSales),
          upiSales: Number(salesForm.upiSales),
          swipeSales
        })
      });
      await khataFetch("/api/khata/daily-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          openingBalance: Number(openingBalanceInput),
          closingBalance: closingCashBalance,
          totalIn: Number(salesForm.cashSales),
          totalOut: totalOutflows
        })
      });
      alert("Daily Ledger balances & sales successfully recorded!");
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Failed to save records.");
    } finally {
      setLedgerSaving(false);
    }
  };
  const openingBalance = Number(openingBalanceInput) || 0;
  const cashSales = Number(salesForm.cashSales) || 0;
  const upiSales = Number(salesForm.upiSales) || 0;
  const dateCardSettlements = cardSettlements.filter((cs) => isDateMatch(cs.date));
  const swipeSales = dateCardSettlements.reduce((sum, cs) => sum + cs.amount, 0);
  const totalSalesVal = cashSales + upiSales + swipeSales;
  const creditCashPayments = datePayments.filter(
    (p) => p.type === "Cash" && !(p.description ?? "").startsWith("Invoice #")
  );
  const totalCreditPayments = creditCashPayments.reduce((s, p) => s + p.amount, 0);
  const totalOutflows = totalPhysicalCashPurchases + totalPhysicalShopExpenses + totalPhysicalHomeExpenses + totalBankDeposits + totalCreditPayments;
  const closingCashBalance = openingBalance + cashSales - totalOutflows;
  const upiPurchases = datePurchases.filter((p) => p.paymentType === "Cash" && p.cheque?.paymentMode === "UPI").reduce((s, p) => s + p.invoiceAmount, 0);
  const upiExpenses = dateExpenses.filter((e) => e.paymentMode === "UPI").reduce((s, e) => s + e.amount, 0);
  const upiSupplierPayments = datePayments.filter((p) => p.type === "UPI" || (p.description ?? "").toLowerCase().includes("upi")).reduce((s, p) => s + p.amount, 0);
  const totalUpiOutflow = upiPurchases + upiExpenses + upiSupplierPayments;
  const bankPurchases = datePurchases.filter((p) => p.paymentType === "Cash" && (p.cheque?.paymentMode === "Bank Transfer" || p.cheque?.paymentMode === "Cheque" || p.cheque?.paymentMode === "NEFT" || p.cheque?.paymentMode === "IMPS")).reduce((s, p) => s + p.invoiceAmount, 0);
  const bankExpenses = dateExpenses.filter((e) => e.paymentMode === "Bank").reduce((s, e) => s + e.amount, 0);
  const bankSupplierPayments = datePayments.filter((p) => p.type === "Cheque" || p.type === "NEFT" || p.type === "IMPS" || (p.description ?? "").toLowerCase().includes("cheque") || (p.description ?? "").toLowerCase().includes("neft") || (p.description ?? "").toLowerCase().includes("imps")).reduce((s, p) => s + p.amount, 0);
  const dateBankCharges = bankCharges.filter((b) => isDateMatch(b.date));
  const totalBankCharges = dateBankCharges.reduce((s, b) => s + b.amount, 0);
  const dateCheques = cheques.filter((c) => isDateMatch(c.chequeDate));
  const clearedSupplierCheques = dateCheques.filter((c) => c.partyType === "Supplier" && c.status === "Cleared");
  const totalOutwardChequesCleared = clearedSupplierCheques.reduce((s, c) => s + c.amount, 0);
  const totalBankOutflow = bankPurchases + bankExpenses + totalOutwardChequesCleared + totalBankCharges + bankSupplierPayments;
  const clearedCustomerCheques = dateCheques.filter((c) => c.partyType === "Customer" && c.status === "Cleared");
  const totalClearedCustomerCheques = clearedCustomerCheques.reduce((s, c) => s + c.amount, 0);
  const dateRdRedemptions = rdRedemptions.filter((r) => isDateMatch(r.date));
  const cashRdRedemptions = dateRdRedemptions.filter((r) => r.redemptionType === "Cash");
  const totalCashRdRedemptions = cashRdRedemptions.reduce((s, r) => s + r.amount, 0);
  const bankRdRedemptions = dateRdRedemptions.filter((r) => r.redemptionType === "Account");
  const totalBankRdRedemptions = bankRdRedemptions.reduce((s, r) => s + r.amount, 0);
  const totalBankInflow = totalClearedCustomerCheques;
  const netCashMovement = cashSales - totalOutflows;
  const netUpiMovement = upiSales - totalUpiOutflow;
  const netSwipeMovement = swipeSales;
  const netBankMovement = totalBankInflow - totalBankOutflow;
  const netFundFlow = netCashMovement + netUpiMovement + netSwipeMovement + netBankMovement;
  const prevDayFundBalance = getDerivedOpeningCashBalance(selectedDate);
  const consolidatedFundBalance = prevDayFundBalance + netFundFlow;
  return <div className="space-y-6">
      
      {
    /* Date Navigation Bar — rich gradient style */
  }
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy via-slate-800 to-slate-900 py-8 px-8 rounded-xl border border-slate-700/50 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        {
    /* Decorative blobs */
  }
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-16 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10 ml-4">
          <div className="p-3 bg-brand-teal/20 border border-brand-teal/30 rounded-xl">
            <Calendar className="w-7 h-7 text-brand-mint" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {mode === "purchases" ? "Purchase Ledger" : "Daily Accounting Dashboard"}
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1">
              {mode === "purchases" ? "Track daily cash & credit purchases by date" : "Consolidated dashboard for cash drawer flows, bank deposits, and daily sales"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full relative z-10">
          <Button
    variant="ghost"
    size="icon"
    onClick={handlePrevDay}
    className="h-7 w-7 hover:bg-white/10 text-slate-300 hover:text-white rounded-full"
  >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Input
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    className="border-0 bg-transparent h-8 shadow-none focus-visible:ring-0 text-sm font-extrabold text-white cursor-pointer w-36 py-0 px-1 text-center"
  />
          <Button
    variant="ghost"
    size="icon"
    onClick={handleNextDay}
    className="h-7 w-7 hover:bg-white/10 text-slate-300 hover:text-white rounded-full"
  >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {mode === "purchases" && <>

        {/* ── Summary stat strip ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Cash stat */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="relative z-10 flex items-center justify-between px-6 py-5">
              <div>
                <div className="text-xs font-extrabold text-emerald-100 uppercase tracking-widest mb-2">💵 Cash Purchases</div>
                <div className="text-[11px] text-emerald-200 font-semibold">{cashPurchases.length} bill{cashPurchases.length !== 1 ? "s" : ""} today</div>
              </div>
              <div className="text-3xl font-black text-white font-mono">₹{totalCashPurchases.toLocaleString("en-IN")}</div>
            </div>
          </div>

          {/* Credit stat */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="relative z-10 flex items-center justify-between px-6 py-5">
              <div>
                <div className="text-xs font-extrabold text-amber-100 uppercase tracking-widest mb-2">📋 Credit Purchases</div>
                <div className="text-[11px] text-amber-200 font-semibold">{creditPurchases.length} bill{creditPurchases.length !== 1 ? "s" : ""} today</div>
              </div>
              <div className="text-3xl font-black text-white font-mono">₹{totalCreditPurchases.toLocaleString("en-IN")}</div>
            </div>
          </div>

          {/* Grand Total stat */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-slate-700 rounded-xl shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/20 rounded-full -translate-y-6 translate-x-6" />
            <div className="relative z-10 flex items-center justify-between px-6 py-5">
              <div>
                <div className="text-xs font-extrabold text-slate-300 uppercase tracking-widest mb-2">🧾 Total Purchased</div>
                <div className="text-[11px] text-slate-400 font-semibold">{datePurchases.length} bill{datePurchases.length !== 1 ? "s" : ""} total</div>
              </div>
              <div className="text-3xl font-black text-white font-mono">₹{(totalCashPurchases + totalCreditPurchases).toLocaleString("en-IN")}</div>
            </div>
          </div>
        </div>

        {/* ── Add Purchase — centred above tables ── */}
        <div className="flex justify-center py-4">
          <Button
    size="sm"
    onClick={() => {
      const defaultAcc = bankAccounts.find((b) => b.isDefault) || bankAccounts[0];
      const defaultAccId = defaultAcc ? String(defaultAcc.id) : "";
      setPurchaseForm({
        supplierName: suppliers[0]?.name || "",
        invoiceNumber: "",
        invoiceAmount: "",
        paymentType: "Cash",
        registerNewSupplier: false,
        newSupplierName: "",
        newSupplierArea: "",
        newSupplierPhone: "",
        newSupplierDealsIn: "",
        newSupplierGst: "",
        paymentMode: "Cash",
        bankAccountId: defaultAccId,
        chequeNumber: "",
        chequeDate: "",
        bankCharge: ""
      });
      setAddPdcDetails(false);
      setIsPurchaseAddOpen(true);
    }}
    className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 px-10 text-sm gap-2 rounded-lg shadow-sm"
  >
            <Plus className="w-4 h-4" /> Add Purchase
          </Button>
        </div>


        {/* Two-column purchase lists */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">


          {
    /* Cash Purchases Column */
  }
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-900/60 rounded-xl overflow-hidden shadow-sm">
            {
    /* Column header */
  }
            <div className="bg-emerald-500/15 dark:bg-emerald-900/40 border-b-2 border-emerald-200 dark:border-emerald-900/60 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm">💵</span>
                </div>
                <div>
                  <div className="text-sm font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">Cash Purchases</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Paid immediately</div>
                </div>
              </div>
              <span className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-black shadow-sm">
                {cashPurchases.length} bill{cashPurchases.length !== 1 ? "s" : ""}
              </span>
            </div>

            {
    /* Items */
  }
            <div className="p-4 space-y-2.5 min-h-[480px]">
              {cashPurchases.map((p, idx) => <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs transition-all hover:shadow-sm hover:-translate-y-px ${idx % 2 === 0 ? "bg-white dark:bg-emerald-950/30" : "bg-emerald-50/80 dark:bg-emerald-950/20"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-sm">🏢</div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{p.supplierName}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">#{p.invoiceNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">₹{p.invoiceAmount.toLocaleString("en-IN")}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg" onClick={() => triggerEditPurchase(p)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>)}
              {cashPurchases.length === 0 && <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-400 text-lg">💵</div>
                  <p className="text-xs text-emerald-500/70 font-semibold">No cash purchases today</p>
                </div>}
            </div>

            {
    /* Footer total */
  }
            <div className="px-5 py-3 bg-emerald-500/10 dark:bg-emerald-900/30 border-t-2 border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Cash Total</span>
              <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">₹{totalCashPurchases.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {
    /* Credit Purchases Column */
  }
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 rounded-xl overflow-hidden shadow-sm">
            {
    /* Column header */
  }
            <div className="bg-amber-500/15 dark:bg-amber-900/40 border-b-2 border-amber-200 dark:border-amber-900/60 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm">📋</span>
                </div>
                <div>
                  <div className="text-sm font-black text-amber-800 dark:text-amber-200 uppercase tracking-wide">Credit Purchases</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Payment due later</div>
                </div>
              </div>
              <span className="text-xs bg-amber-500 text-white px-2.5 py-1 rounded-full font-black shadow-sm">
                {creditPurchases.length} bill{creditPurchases.length !== 1 ? "s" : ""}
              </span>
            </div>

            {
    /* Items */
  }
            <div className="p-4 space-y-2.5 min-h-[480px]">
              {creditPurchases.map((p, idx) => <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 shadow-xs transition-all hover:shadow-sm hover:-translate-y-px ${idx % 2 === 0 ? "bg-white dark:bg-amber-950/30" : "bg-amber-50/80 dark:bg-amber-950/20"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-sm">🏢</div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{p.supplierName}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">#{p.invoiceNumber}</p>
                      {p.cheque && <p className="text-[9px] text-amber-500 dark:text-amber-400 font-semibold mt-0.5">PDC: #{p.cheque.chequeNumber} · {p.cheque.status}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-amber-700 dark:text-amber-300 font-mono">₹{p.invoiceAmount.toLocaleString("en-IN")}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg" onClick={() => triggerEditPurchase(p)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>)}
              {creditPurchases.length === 0 && <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-400 text-lg">📋</div>
                  <p className="text-xs text-amber-500/70 font-semibold">No credit purchases today</p>
                </div>}
            </div>

            {
    /* Footer total */
  }
            <div className="px-5 py-3 bg-amber-500/10 dark:bg-amber-900/30 border-t-2 border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
              <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">Credit Total</span>
              <span className="text-base font-black text-amber-700 dark:text-amber-300 font-mono">₹{totalCreditPurchases.toLocaleString("en-IN")}</span>
            </div>
          </div>

        </div>

      </>}


      {mode === "dashboard" && (!isUnlocked ? <Card className="border-slate-200/80 dark:border-slate-850 bg-white/70 dark:bg-slate-900/70 shadow-md rounded-xl overflow-hidden max-w-sm mx-auto my-8">
            <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-850 bg-gradient-to-r from-brand-navy to-slate-800 text-center">
              <CardTitle className="text-sm font-black text-white tracking-wide uppercase flex items-center justify-center gap-2">
                🔒 Daily Dashboard Lock
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="py-4 text-center space-y-4">
                <div className="mx-auto flex justify-center mb-2 h-14 w-20 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                  <img src="/mediclan-logo-emblem.png" className="max-h-full max-w-full object-contain select-none" alt="MediCLan Logo" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-brand-navy dark:text-slate-200">Access Password Required</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Enter passcode (1234) to view and manage daily ledger</p>
                </div>
                <form onSubmit={handleUnlock} className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <Input
    type="password"
    value={passwordInput}
    onChange={(e) => setPasswordInput(e.target.value)}
    placeholder="Enter Password..."
    className={`${INPUT_STYLE} rounded-lg`}
    required
  />
                    <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-9 rounded-lg px-5 shadow-xs border-0 cursor-pointer">
                      Unlock
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card> : <>
            {
    /* --- Side-by-Side Deposits --- */
  }

      {
    /* --- Inward Collection Ledger Zone --- */
  }
      <Card className="border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <CardTitle className="text-sm font-bold text-brand-navy dark:text-slate-200 tracking-wide uppercase">
            Inward Collection Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
            <div className="space-y-6 animate-in fade-in duration-500">
              
              {
    /* Sub-tab Pill Switcher */
  }
              <div className="flex justify-center">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-850 rounded-lg border border-slate-200/50 dark:border-slate-800 max-w-md w-full">
                  <button
    onClick={() => setUnlockedTab("daily")}
    className={`flex-1 py-2 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer ${unlockedTab === "daily" ? "bg-brand-teal text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
  >
                    Daily Entry & Net Cash Flow
                  </button>
                  <button
    onClick={() => setUnlockedTab("custom-sales")}
    className={`flex-1 py-2 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer ${unlockedTab === "custom-sales" ? "bg-brand-teal text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
  >
                    Custom Sales Report
                  </button>
                </div>
              </div>

              {unlockedTab === "daily" ? <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 animate-in fade-in duration-300">
                  
                  {
    /* 1. Daily Sales Ledger */
  }
                  <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <span className="text-sm">💰</span>
                      <h3 className="text-sm font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wide">Daily Sales Ledger</h3>
                    </div>
                    
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-500 dark:text-slate-400">Cash Collection (₹)</Label>
                        <Input
    type="number"
    value={salesForm.cashSales}
    onChange={(e) => setSalesForm({ ...salesForm, cashSales: e.target.value })}
    className={INPUT_STYLE}
  />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-500 dark:text-slate-400">UPI Sales (₹)</Label>
                        <Input
    type="number"
    value={salesForm.upiSales}
    onChange={(e) => setSalesForm({ ...salesForm, upiSales: e.target.value })}
    className={INPUT_STYLE}
  />
                      </div>
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold text-slate-500 dark:text-slate-400">Card Settlements</Label>
                          <Button
    type="button"
    onClick={() => {
      const today = selectedDate;
      const yesterday = new Date(new Date(selectedDate).getTime() - 864e5).toISOString().split("T")[0];
      const defaultAccId = bankAccounts.find((b) => b.isDefault)?.id || bankAccounts[0]?.id || "";
      setCardSettlementForm({ date: today, amount: "", bankAccountId: String(defaultAccId), salesDate: yesterday, narration: "" });
      setIsCardSettlementOpen(true);
    }}
    className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-6 text-[10px] px-2 rounded-full cursor-pointer flex items-center gap-1"
  >
                            <Plus className="w-3 h-3" /> Log Settlement
                          </Button>
                        </div>
                        
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                          {dateCardSettlements.map((cs) => <div key={cs.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50">
                              <div className="truncate pr-1">
                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-350">🏢 {cs.bankAccount?.name || "Bank"}</p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate font-semibold">
                                  {cs.narration || "Card Settlement"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-black text-purple-700 dark:text-purple-400">₹{cs.amount.toLocaleString("en-IN")}</span>
                                <Button
    variant="ghost"
    size="icon"
    className="h-5 w-5 text-slate-400 hover:text-rose-500"
    onClick={async () => {
      if (confirm("Are you sure you want to delete this card settlement?")) {
        await khataFetch(`/api/khata/card-settlement?id=${cs.id}`, { method: "DELETE" });
        fetchAll();
      }
    }}
  >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>)}
                          {dateCardSettlements.length === 0 && <p className="text-center text-[10px] text-slate-450 dark:text-slate-500 py-3 font-semibold">No card settlements logged.</p>}
                        </div>
                      </div>
                    </div>

                    <div className="bg-brand-soft-teal dark:bg-brand-navy/10 p-3.5 rounded-xl border border-brand-light-teal/50 dark:border-slate-800 space-y-1 text-center">
                      <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold">Total Collection</span>
                      <span className="text-xl font-black text-brand-teal dark:text-brand-mint block">₹{totalSalesVal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {
    /* 2. Calculated Cash Ledger (Cashbook) */
  }
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📔</span>
                        <h3 className="text-sm font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wide">Net Cash Flow</h3>
                      </div>
                      <span className="text-[10px] bg-brand-soft-teal text-brand-teal dark:bg-slate-850 dark:text-brand-mint font-extrabold px-2.5 py-1 rounded-full border border-brand-light-teal/30 uppercase tracking-wider">
                        Auto Balance Sheet
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {
    /* Cash Inflow Column */
  }
                      <div className="space-y-3 bg-slate-50/40 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 border-b pb-1.5 border-slate-200/60 dark:border-slate-800">
                          <TrendingUp className="w-4 h-4 text-emerald-500" /> Cash Inflows
                        </span>
                        <div className="space-y-2 text-xs">
                          {
    /* Opening balance field inside inflows (Editable) */
  }
                          <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                            <Label className="text-xs font-bold text-slate-500 block mb-1">Opening Cash Balance (₹)
                              <span className="ml-1 text-[10px] font-semibold text-brand-teal/70 dark:text-brand-mint/60">(Prev. Day Closing)</span>
                            </Label>
                            <Input
    type="number"
    value={openingBalanceInput}
    onChange={(e) => setOpeningBalanceInput(e.target.value)}
    className="h-8 border-slate-200 dark:border-slate-800 text-xs font-black rounded-md"
  />
                          </div>
                          <div className="flex justify-between p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                            <span className="text-slate-500 font-bold">Daily Cash Collection:</span>
                            <span className="font-extrabold text-emerald-600 font-mono">+ ₹{cashSales.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350 font-black border border-emerald-100/50 dark:border-emerald-900/30">
                            <span>Total Cash Inflow:</span>
                            <span className="font-mono">₹{(openingBalance + cashSales).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>

                      {
    /* Cash Outflow Column */
  }
                      <div className="space-y-3 bg-slate-50/40 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5 border-b pb-1.5 border-slate-200/60 dark:border-slate-800">
                          <TrendingDown className="w-4 h-4 text-rose-500" /> Cash Outflows
                        </span>
                        <div className="space-y-2 text-xs max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                          <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                            <span className="text-slate-400 font-bold">Cash Purchases:</span>
                            <span className="font-bold text-rose-650 dark:text-rose-400 font-mono">- ₹{totalPhysicalCashPurchases.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                            <span className="text-slate-400 font-bold">Shop Expenses:</span>
                            <span className="font-bold text-rose-650 dark:text-rose-400 font-mono">- ₹{totalPhysicalShopExpenses.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                            <span className="text-slate-400 font-bold">Home Expenses:</span>
                            <span className="font-bold text-rose-650 dark:text-rose-400 font-mono">- ₹{totalPhysicalHomeExpenses.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                            <span className="text-slate-400 font-bold">Bank Deposits:</span>
                            <span className="font-bold text-rose-650 dark:text-rose-400 font-mono">- ₹{totalBankDeposits.toLocaleString("en-IN")}</span>
                          </div>

                          {totalCreditPayments > 0 && <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                              <span className="text-slate-400 font-bold">Credit Cash Payments:</span>
                              <span className="font-bold text-rose-650 dark:text-rose-400 font-mono">- ₹{totalCreditPayments.toLocaleString("en-IN")}</span>
                            </div>}
                          <div className="flex justify-between p-2 rounded bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-350 font-black border border-rose-100/50 dark:border-rose-900/30">
                            <span>Total Cash Outflow:</span>
                            <span className="font-mono">- ₹{totalOutflows.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {
    /* Net Closing Balance Display */
  }
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${closingCashBalance >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 border-emerald-100/50" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 border-rose-100/50"}`}>
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Net Cash Flow</span>
                          <span className={`text-xl font-black font-mono ${closingCashBalance >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                            ₹{closingCashBalance.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      
                      <Button
    onClick={handleSaveLedgerAndSales}
    disabled={ledgerSaving}
    className="bg-brand-teal hover:bg-brand-teal/90 text-white font-extrabold h-10 w-full md:w-auto px-6 rounded-full shadow-xs gap-2 border-0 cursor-pointer"
  >
                        <Save className="w-4.5 h-4.5" />
                        {ledgerSaving ? "Saving Ledger..." : "Save Daily Ledger Book"}
                      </Button>
                    </div>

                  </div>

                  {
    /* 3. Daily Fund Flow Widget */
  }
                  <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🔄</span>
                        <h3 className="text-sm font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wide">Daily Fund Flow Ledger</h3>
                      </div>
                      <span className="text-[10px] bg-brand-soft-teal text-brand-teal dark:bg-slate-850 dark:text-brand-mint font-extrabold px-2.5 py-1 rounded-full border border-brand-light-teal/30 uppercase tracking-wider">
                        All Channels Combined
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-950/40">
                          <TableRow className="border-b border-slate-150 dark:border-slate-800 hover:bg-transparent">
                            <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs py-2.5">Channel / Source</TableHead>
                            <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs text-right py-2.5">Inflow (₹)</TableHead>
                            <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs text-right py-2.5">Outflow (₹)</TableHead>
                            <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs text-right py-2.5">Net Movement (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {
    /* Row 1: Cash Drawer */
  }
                          <TableRow className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-3.5">
                              💵 Physical Cash Drawer
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold font-mono py-3.5">
                              ₹{(cashSales + totalCashRdRedemptions).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-rose-650 dark:text-rose-400 font-bold font-mono py-3.5">
                              ₹{totalOutflows.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className={`text-right font-black font-mono py-3.5 ${netCashMovement >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                              ₹{netCashMovement.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>

                          {
    /* Row 2: UPI Transfer */
  }
                          <TableRow className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 bg-brand-soft-teal/10 dark:bg-slate-950/20">
                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-3.5">
                              ⚡ UPI / Instant Transfers
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold font-mono py-3.5">
                              ₹{upiSales.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-rose-650 dark:text-rose-400 font-bold font-mono py-3.5">
                              ₹{totalUpiOutflow.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className={`text-right font-black font-mono py-3.5 ${netUpiMovement >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                              ₹{netUpiMovement.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>

                          {
    /* Row 3: Card Settlements */
  }
                          <TableRow className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-3.5">
                              💳 Card Settlements (Deposited)
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold font-mono py-3.5">
                              ₹{swipeSales.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-rose-650 dark:text-rose-400 font-bold font-mono py-3.5">
                              ₹0
                            </TableCell>
                            <TableCell className={`text-right font-black font-mono py-3.5 ${netSwipeMovement >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                              ₹{netSwipeMovement.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>

                          {
    /* Row 4: Bank accounts */
  }
                          <TableRow className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 bg-brand-soft-teal/10 dark:bg-slate-950/20">
                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-3.5">
                              🏛️ Bank Accounts & PDC
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold font-mono py-3.5">
                              ₹{totalBankInflow.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right text-rose-650 dark:text-rose-400 font-bold font-mono py-3.5">
                              ₹{totalBankOutflow.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className={`text-right font-black font-mono py-3.5 ${netBankMovement >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                              ₹{netBankMovement.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {
    /* Consolidated Fund Flow Summary Bar */
  }
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
                      {
    /* Today's daily net movement */
  }
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${netFundFlow >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 border-emerald-100/50" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 border-rose-100/50"}`}>
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Today's Net Fund Flow</span>
                            <span className={`text-lg font-black font-mono ${netFundFlow >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                              {netFundFlow >= 0 ? "+" : ""}₹{netFundFlow.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs font-black px-4 py-1.5 rounded-full border uppercase tracking-wider shadow-xs ${netFundFlow >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900"}`}>
                          {netFundFlow >= 0 ? "\u{1F44D} Net Positive Day" : "\u26A0\uFE0F Net Negative Day"}
                        </span>
                      </div>

                      {
    /* Consolidated running fund balance (prev day + today) */
  }
                      <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${consolidatedFundBalance >= 0 ? "bg-brand-soft-teal text-brand-teal dark:bg-teal-950/30 border-brand-light-teal/50" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 border-rose-100/50"}`}>
                            <IndianRupee className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Consolidated Fund Balance (Cumulative)</span>
                            <span className={`text-xl font-black font-mono ${consolidatedFundBalance >= 0 ? "text-brand-teal dark:text-brand-mint" : "text-rose-600"}`}>
                              ₹{consolidatedFundBalance.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Prev. day closing ₹{prevDayFundBalance.toLocaleString("en-IN")} + today's ₹{netFundFlow >= 0 ? "+" : ""}{netFundFlow.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                        <span className={`text-xs font-black px-4 py-1.5 rounded-full border uppercase tracking-wider shadow-xs ${consolidatedFundBalance >= 0 ? "bg-brand-soft-teal text-brand-teal border-brand-light-teal/50 dark:bg-teal-950/30 dark:text-brand-mint dark:border-teal-900" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900"}`}>
                          {consolidatedFundBalance >= 0 ? "\u2705 Positive Consolidated Balance" : "\u{1F534} Negative Consolidated Balance"}
                        </span>
                      </div>
                    </div>
                  </div>

                </div> : (
    /* Custom Dates Sales Report Tab View */
    <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {
      /* Date Filters Container */
    }
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Start Date</Label>
                      <div className="relative">
                        <Input
      type="date"
      value={customSalesStartDate}
      onChange={(e) => setCustomSalesStartDate(e.target.value)}
      className={`${INPUT_STYLE} pl-9 font-extrabold rounded-lg bg-white dark:bg-slate-950`}
    />
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider">End Date</Label>
                      <div className="relative">
                        <Input
      type="date"
      value={customSalesEndDate}
      onChange={(e) => setCustomSalesEndDate(e.target.value)}
      className={`${INPUT_STYLE} pl-9 font-extrabold rounded-lg bg-white dark:bg-slate-950`}
    />
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
                      </div>
                    </div>
                  </div>

                  {
      /* KPI Bifurcated Sales Grid */
    }
                  {(() => {
      const filteredSales = allSales.filter((sale) => {
        try {
          const saleDateStr = new Date(sale.date).toLocaleDateString("en-CA");
          return saleDateStr >= customSalesStartDate && saleDateStr <= customSalesEndDate;
        } catch {
          return false;
        }
      });
      const customTotalCashSales = filteredSales.reduce((sum, s) => sum + (s.cashSales ?? 0), 0);
      const customTotalUpiSales = filteredSales.reduce((sum, s) => sum + (s.upiSales ?? 0), 0);
      const customTotalSwipeSales = filteredSales.reduce((sum, s) => sum + (s.swipeSales ?? 0), 0);
      const customTotalGrandSales = customTotalCashSales + customTotalUpiSales + customTotalSwipeSales;
      const sortedFilteredSales = [...filteredSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          
                          {
        /* Cash Sales KPI */
      }
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Cash Collection</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                            </div>
                            <div>
                              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-450">
                                ₹{customTotalCashSales.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Physical currency collected</p>
                            </div>
                          </div>

                          {
        /* UPI Sales KPI */
      }
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider">UPI Sales</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-xs" />
                            </div>
                            <div>
                              <p className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                                ₹{customTotalUpiSales.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Online instant transfers</p>
                            </div>
                          </div>

                          {
        /* Swipe Card Sales KPI */
      }
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Card Settlements</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
                            </div>
                            <div>
                              <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                                ₹{customTotalSwipeSales.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Settlements deposited in bank</p>
                            </div>
                          </div>

                          {
        /* Grand Total Sales KPI */
      }
                          <div className="bg-brand-navy dark:bg-slate-850 text-white p-4 rounded-xl shadow-md space-y-2 flex flex-col justify-between border border-transparent dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-200/70 dark:text-slate-400 uppercase tracking-wider">Grand Total Collection</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-brand-mint shadow-xs" />
                            </div>
                            <div>
                              <p className="text-2xl font-black font-mono text-brand-mint">
                                ₹{customTotalGrandSales.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10px] text-slate-200/50 dark:text-slate-500 font-semibold mt-0.5">Consolidated collection revenue</p>
                            </div>
                          </div>

                        </div>

                        {
        /* Date-by-Date Detailed Sales Log */
      }
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
                          <div className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/20 dark:bg-slate-850/20">
                            <h4 className="text-xs font-extrabold text-slate-550 dark:text-slate-300 uppercase tracking-widest">
                              Date-Wise Sales Breakdown Log
                            </h4>
                            <span className="text-[10px] bg-brand-soft-teal text-brand-teal dark:bg-slate-800 dark:text-brand-mint px-2 py-0.5 rounded-full font-bold">
                              {sortedFilteredSales.length} days found
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-slate-50 dark:bg-slate-950/40">
                                <TableRow className="border-b border-slate-150 dark:border-slate-800 hover:bg-transparent">
                                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs py-3">Date</TableHead>
                                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs text-right py-3">Cash Collection</TableHead>
                                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs text-right py-3">UPI Sales</TableHead>
                                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs text-right py-3">Swipe Sales</TableHead>
                                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-350 text-xs text-right py-3">Total Collection</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedFilteredSales.map((s, index) => {
        const rowTotal = (s.cashSales ?? 0) + (s.upiSales ?? 0) + (s.swipeSales ?? 0);
        return <TableRow
          key={s.id || index}
          className={`border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors ${index % 2 === 1 ? "bg-brand-soft-teal/30 dark:bg-slate-950/20" : "bg-white dark:bg-slate-900"}`}
        >
                                      <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-3">
                                        📅 {formatDate(s.date)}
                                      </TableCell>
                                      <TableCell className="text-right text-slate-750 dark:text-slate-250 font-mono py-3">
                                        ₹{(s.cashSales ?? 0).toLocaleString("en-IN")}
                                      </TableCell>
                                      <TableCell className="text-right text-slate-750 dark:text-slate-250 font-mono py-3">
                                        ₹{(s.upiSales ?? 0).toLocaleString("en-IN")}
                                      </TableCell>
                                      <TableCell className="text-right text-slate-750 dark:text-slate-250 font-mono py-3">
                                        ₹{(s.swipeSales ?? 0).toLocaleString("en-IN")}
                                      </TableCell>
                                      <TableCell className="text-right font-black text-brand-teal dark:text-brand-mint font-mono py-3">
                                        ₹{rowTotal.toLocaleString("en-IN")}
                                      </TableCell>
                                    </TableRow>;
      })}
                                {sortedFilteredSales.length === 0 && <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 font-semibold">
                                      No sales records found inside this date range.
                                    </TableCell>
                                  </TableRow>}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </>;
    })()}

                </div>
  )}

            </div>
        </CardContent>
      </Card>
          </>)}

      {
    /* --- ADD PURCHASE DIALOG --- */
  }
      <Dialog open={isPurchaseAddOpen} onOpenChange={setIsPurchaseAddOpen}>
        <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Register New Purchase</DialogTitle></DialogHeader>
          <form onSubmit={handleAddPurchase} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Active Date</Label>
              <Input type="date" value={selectedDate} disabled className="bg-slate-100 cursor-not-allowed font-semibold dark:bg-slate-900" />
            </div>

            {
    /* Inline Supplier Registration Checkbox Toggle */
  }
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
              <input
    type="checkbox"
    id="registerNewSupplier"
    checked={purchaseForm.registerNewSupplier}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, registerNewSupplier: e.target.checked })}
    className="h-4.5 w-4.5 rounded border-slate-350 text-brand-teal focus:ring-brand-teal cursor-pointer"
  />
              <Label htmlFor="registerNewSupplier" className="cursor-pointer text-xs font-extrabold text-brand-navy dark:text-brand-mint">
                ➕ Register New Supplier Inline
              </Label>
            </div>

            {purchaseForm.registerNewSupplier ? <div className="bg-brand-soft-teal/30 dark:bg-slate-950/20 p-4 rounded-xl border border-brand-light-teal/30 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold text-brand-navy dark:text-slate-200">New Supplier Details</p>
                <div className="space-y-1">
                  <Label className="text-xs">Supplier Name <span className="text-rose-500 font-bold">*</span></Label>
                  <Input
    value={purchaseForm.newSupplierName}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, newSupplierName: e.target.value })}
    placeholder="e.g. Acme Pharmaceuticals"
    required={purchaseForm.registerNewSupplier}
  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Area / City <span className="text-rose-500 font-bold">*</span></Label>
                  <Input
    value={purchaseForm.newSupplierArea}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, newSupplierArea: e.target.value })}
    placeholder="e.g. Andheri, Mumbai"
    required={purchaseForm.registerNewSupplier}
  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number (Optional)</Label>
                  <Input
    value={purchaseForm.newSupplierPhone}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, newSupplierPhone: e.target.value })}
    placeholder="e.g. +91 9876543210"
  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Deals In / Products (Optional)</Label>
                  <Input
    value={purchaseForm.newSupplierDealsIn}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, newSupplierDealsIn: e.target.value })}
    placeholder="e.g. Tablets, Injections"
  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GST Number (Optional)</Label>
                  <Input
    value={purchaseForm.newSupplierGst}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, newSupplierGst: e.target.value })}
    placeholder="e.g. 27AAAAA0000A1Z5"
  />
                </div>
              </div> : <div className="space-y-2">
                <Label>Supplier / Party Name</Label>
                <select
    className={INPUT_STYLE}
    value={purchaseForm.supplierName}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
    required={!purchaseForm.registerNewSupplier}
  >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name} ({s.area || "No Area"})</option>)}
                </select>
              </div>}

            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={purchaseForm.invoiceNumber} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })} placeholder="e.g. INV-274" required />
            </div>
            <div className="space-y-2">
              <Label>Invoice Amount (₹)</Label>
              <Input type="number" value={purchaseForm.invoiceAmount} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceAmount: e.target.value })} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <select
    className={INPUT_STYLE}
    value={purchaseForm.paymentType}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentType: e.target.value })}
    required
  >
                <option value="Cash">Cash (Paid Today)</option>
                <option value="Credit">Credit (Pay Later)</option>
              </select>
            </div>

            {purchaseForm.paymentType === "Cash" && <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <select
    className={INPUT_STYLE}
    value={purchaseForm.paymentMode}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMode: e.target.value })}
    required
  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="NEFT">NEFT (Bank Transfer)</option>
                    <option value="IMPS">IMPS (Instant Bank Transfer)</option>
                    <option value="Cheque">Cheque Payment</option>
                  </select>
                </div>

                {purchaseForm.paymentMode !== "Cash" && <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Select Bank Account</Label>
                        <button
    type="button"
    onClick={() => setIsQuickBankOpen(true)}
    className="text-[10px] text-brand-teal hover:underline font-extrabold cursor-pointer"
  >
                          ➕ Add Bank Account
                        </button>
                      </div>
                      <select
    className={INPUT_STYLE}
    value={purchaseForm.bankAccountId}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, bankAccountId: e.target.value })}
    required={purchaseForm.paymentMode !== "Cash"}
  >
                        <option value="">Select Bank Account</option>
                        {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>{purchaseForm.paymentMode === "Cheque" ? "Cheque Number" : "Transaction Ref No."}</Label>
                      <Input
    value={purchaseForm.chequeNumber}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, chequeNumber: e.target.value })}
    placeholder={purchaseForm.paymentMode === "Cheque" ? "e.g. 123456" : "e.g. TXN9876543"}
  />
                    </div>

                    <div className="space-y-2">
                      <Label>{purchaseForm.paymentMode === "Cheque" ? "Cheque Date" : "Transfer Date"}</Label>
                      <Input
    type="date"
    value={purchaseForm.chequeDate}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, chequeDate: e.target.value })}
  />
                    </div>

                    <div className="space-y-2">
                      <Label>Bank Charges / Fees (₹, if any)</Label>
                      <Input
    type="number"
    value={purchaseForm.bankCharge}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, bankCharge: e.target.value })}
    placeholder="0.00"
  />
                    </div>
                  </>}
              </div>}

            {purchaseForm.paymentType === "Credit" && <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <input
    id="purchase-addPdcDetails"
    type="checkbox"
    checked={addPdcDetails}
    onChange={(e) => setAddPdcDetails(e.target.checked)}
    className="h-4 w-4 rounded accent-brand-teal"
  />
                  <Label htmlFor="purchase-addPdcDetails" className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">Add PDC (Post-Dated Cheque) Details</Label>
                </div>

                {addPdcDetails && <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Select Bank Account</Label>
                        <button
    type="button"
    onClick={() => setIsQuickBankOpen(true)}
    className="text-[10px] text-brand-teal hover:underline font-extrabold cursor-pointer"
  >
                          ➕ Add Bank Account
                        </button>
                      </div>
                      <select
    className={INPUT_STYLE}
    value={purchaseForm.bankAccountId}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, bankAccountId: e.target.value })}
    required={addPdcDetails}
  >
                        <option value="">Select Bank Account</option>
                        {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cheque Number</Label>
                      <Input
    value={purchaseForm.chequeNumber}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, chequeNumber: e.target.value })}
    placeholder="e.g. 123456"
    required={addPdcDetails}
  />
                    </div>

                    <div className="space-y-2">
                      <Label>Cheque Date</Label>
                      <Input
    type="date"
    value={purchaseForm.chequeDate}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, chequeDate: e.target.value })}
    required={addPdcDetails}
  />
                    </div>

                    <div className="space-y-2">
                      <Label>Bank Charges / Fees (₹, if any)</Label>
                      <Input
    type="number"
    value={purchaseForm.bankCharge}
    onChange={(e) => setPurchaseForm({ ...purchaseForm, bankCharge: e.target.value })}
    placeholder="0.00"
  />
                    </div>
                  </>}
              </div>}

            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0">
              Save Purchase
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {
    /* --- EDIT PURCHASE DIALOG --- */
  }
      <Dialog open={isPurchaseEditOpen} onOpenChange={setIsPurchaseEditOpen}>
        <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Edit Purchase Details</DialogTitle></DialogHeader>
          {editingPurchase && <form onSubmit={handleEditPurchaseSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Supplier / Party Name</Label>
                <select
    className={INPUT_STYLE}
    value={editingPurchase.supplierName}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, supplierName: e.target.value })}
    required
  >
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input value={editingPurchase.invoiceNumber} onChange={(e) => setEditingPurchase({ ...editingPurchase, invoiceNumber: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Invoice Amount (₹)</Label>
                <Input type="number" value={editingPurchase.invoiceAmount} onChange={(e) => setEditingPurchase({ ...editingPurchase, invoiceAmount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <select
    className={INPUT_STYLE}
    value={editingPurchase.paymentType}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, paymentType: e.target.value })}
    required
  >
                  <option value="Cash">Cash (Paid Today)</option>
                  <option value="Credit">Credit (Pay Later)</option>
                </select>
              </div>

              {editingPurchase.paymentType === "Cash" && <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <select
    className={INPUT_STYLE}
    value={editingPurchase.paymentMode || "Cash"}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, paymentMode: e.target.value })}
    required
  >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI Transfer</option>
                      <option value="NEFT">NEFT (Bank Transfer)</option>
                      <option value="IMPS">IMPS (Instant Bank Transfer)</option>
                      <option value="Cheque">Cheque Payment</option>
                    </select>
                  </div>

                  {editingPurchase.paymentMode !== "Cash" && editingPurchase.paymentMode && <>
                      <div className="space-y-2">
                        <Label>Select Bank Account</Label>
                        <select
    className={INPUT_STYLE}
    value={editingPurchase.bankAccountId || ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, bankAccountId: e.target.value })}
    required={editingPurchase.paymentMode !== "Cash"}
  >
                          <option value="">Select Bank Account</option>
                          {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>{editingPurchase.paymentMode === "Cheque" ? "Cheque Number" : "Transaction Ref No."}</Label>
                        <Input
    value={editingPurchase.chequeNumber || ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, chequeNumber: e.target.value })}
    placeholder={editingPurchase.paymentMode === "Cheque" ? "e.g. 123456" : "e.g. TXN9876543"}
  />
                      </div>

                      <div className="space-y-2">
                        <Label>{editingPurchase.paymentMode === "Cheque" ? "Cheque Date" : "Transfer Date"}</Label>
                        <Input
    type="date"
    value={editingPurchase.chequeDate ? new Date(editingPurchase.chequeDate).toLocaleDateString("en-CA") : ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, chequeDate: e.target.value })}
  />
                      </div>

                      <div className="space-y-2">
                        <Label>Bank Charges / Fees (₹, if any)</Label>
                        <Input
    type="number"
    value={editingPurchase.bankCharge || ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, bankCharge: e.target.value })}
    placeholder="0.00"
  />
                      </div>
                    </>}
                </div>}

              {editingPurchase.paymentType === "Credit" && <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
    type="checkbox"
    id="editLinkPdcDashboard"
    checked={editingPurchase.paymentMode === "Cheque"}
    onChange={(e) => {
      const checked = e.target.checked;
      setEditingPurchase({
        ...editingPurchase,
        paymentMode: checked ? "Cheque" : "Cash",
        chequeNumber: checked ? editingPurchase.chequeNumber || "" : "",
        bankAccountId: checked ? editingPurchase.bankAccountId || "" : ""
      });
    }}
    className="h-4 w-4 rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
  />
                    <Label htmlFor="editLinkPdcDashboard" className="text-xs font-bold text-slate-700 dark:text-slate-200">Link to Post-Dated Cheque (PDC)</Label>
                  </div>

                  {editingPurchase.paymentMode === "Cheque" && <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="space-y-2">
                        <Label>Select Bank Account</Label>
                        <select
    className={INPUT_STYLE}
    value={editingPurchase.bankAccountId || ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, bankAccountId: e.target.value })}
    required={editingPurchase.paymentMode === "Cheque"}
  >
                          <option value="">Select Bank Account</option>
                          {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cheque Number</Label>
                        <Input
    value={editingPurchase.chequeNumber || ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, chequeNumber: e.target.value })}
    placeholder="e.g. 504932"
    required={editingPurchase.paymentMode === "Cheque"}
  />
                      </div>

                      <div className="space-y-2">
                        <Label>Cheque Date</Label>
                        <Input
    type="date"
    value={editingPurchase.chequeDate ? new Date(editingPurchase.chequeDate).toISOString().split("T")[0] : ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, chequeDate: e.target.value })}
    required={editingPurchase.paymentMode === "Cheque"}
  />
                      </div>
                    </div>}
                </div>}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
    type="button"
    variant="destructive"
    onClick={() => handleDeletePurchase(editingPurchase.id)}
    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
  >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsPurchaseEditOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-full border-0">Save Changes</Button>
                </div>
              </div>
            </form>}
        </DialogContent>
      </Dialog>

      {
    /* --- ADD EXPENSE DIALOG --- */
  }
      <Dialog open={isExpenseAddOpen} onOpenChange={setIsExpenseAddOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Add Daily Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Active Date</Label>
              <Input type="date" value={selectedDate} disabled className="bg-slate-100 cursor-not-allowed font-semibold dark:bg-slate-900" />
            </div>
            <div className="space-y-2">
              <Label>Expense Category</Label>
              <select
    className={INPUT_STYLE}
    value={expenseForm.category}
    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
    required
  >
                <option value="Shop">🏪 Shop Expense</option>
                <option value="Home">🏠 Home Expense</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label>Expense Description / Narration</Label>
              <Input value={expenseForm.narration} onChange={(e) => setExpenseForm({ ...expenseForm, narration: e.target.value })} placeholder="e.g. Shop electric bill" required />
            </div>

            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <select
    className={INPUT_STYLE}
    value={expenseForm.paymentMode}
    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
    required
  >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank Account</option>
              </select>
            </div>

            {expenseForm.paymentMode !== "Cash" && <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label>Bank Account</Label>
                  <button
    type="button"
    onClick={() => setIsQuickBankOpen(true)}
    className="text-[10px] text-brand-teal hover:underline font-extrabold cursor-pointer"
  >
                    ➕ Add Bank
                  </button>
                </div>
                <select
    className={INPUT_STYLE}
    value={expenseForm.bankAccountId}
    onChange={(e) => setExpenseForm({ ...expenseForm, bankAccountId: e.target.value })}
    required={expenseForm.paymentMode !== "Cash"}
  >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                </select>
              </div>}

            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0">
              Save Expense
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {
    /* --- EDIT EXPENSE DIALOG --- */
  }
      <Dialog open={isExpenseEditOpen} onOpenChange={setIsExpenseEditOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Edit Expense Details</DialogTitle></DialogHeader>
          {editingExpense && <form onSubmit={handleEditExpenseSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Expense Category</Label>
                <select
    className={INPUT_STYLE}
    value={editingExpense.category}
    onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
    required
  >
                  <option value="Shop">🏪 Shop Expense</option>
                  <option value="Home">🏠 Home Expense</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" value={editingExpense.amount} onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Expense Description / Narration</Label>
                <Input value={editingExpense.narration} onChange={(e) => setEditingExpense({ ...editingExpense, narration: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <select
    className={INPUT_STYLE}
    value={editingExpense.paymentMode}
    onChange={(e) => setEditingExpense({ ...editingExpense, paymentMode: e.target.value })}
    required
  >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank Account</option>
                </select>
              </div>

              {editingExpense.paymentMode !== "Cash" && <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label>Bank Account</Label>
                    <button
    type="button"
    onClick={() => setIsQuickBankOpen(true)}
    className="text-[10px] text-brand-teal hover:underline font-extrabold cursor-pointer"
  >
                      ➕ Add Bank
                    </button>
                  </div>
                  <select
    className={INPUT_STYLE}
    value={editingExpense.bankAccountId}
    onChange={(e) => setEditingExpense({ ...editingExpense, bankAccountId: e.target.value })}
    required={editingExpense.paymentMode !== "Cash"}
  >
                    <option value="">Select Bank Account</option>
                    {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                  </select>
                </div>}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
    type="button"
    variant="destructive"
    onClick={() => handleDeleteExpense(editingExpense.id)}
    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
  >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsExpenseEditOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-full border-0">Save Changes</Button>
                </div>
              </div>
            </form>}
        </DialogContent>
      </Dialog>


      {
    /* --- RD REDEMPTION DIALOG --- */
  }
      <Dialog open={isRdRedeemOpen} onOpenChange={setIsRdRedeemOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Redeem RD Deposit</DialogTitle></DialogHeader>
          <form
    onSubmit={async (e) => {
      e.preventDefault();
      try {
        const res = await khataFetch("/api/khata/rd-redemption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: rdRedeemForm.date,
            amount: Number(rdRedeemForm.amount),
            redemptionType: rdRedeemForm.redemptionType,
            bankAccountId: rdRedeemForm.bankAccountId ? Number(rdRedeemForm.bankAccountId) : void 0,
            originalDepositId: rdRedeemForm.originalDepositId,
            narration: rdRedeemForm.narration
          })
        });
        if (res.ok) {
          setIsRdRedeemOpen(false);
          fetchAll();
        } else {
          const err = await res.json();
          alert(err.error || "Failed to record RD redemption");
        }
      } catch (err) {
        console.error(err);
      }
    }}
    className="space-y-4 pt-2"
  >
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Redemption Date</Label>
              <Input type="date" value={rdRedeemForm.date} onChange={(e) => setRdRedeemForm({ ...rdRedeemForm, date: e.target.value })} className="rounded-lg px-3" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Amount Redeemed (&#x20b9;)</Label>
              <Input type="number" value={rdRedeemForm.amount} onChange={(e) => setRdRedeemForm({ ...rdRedeemForm, amount: e.target.value })} className="rounded-lg px-3" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Redemption Mode</Label>
              <select
    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    value={rdRedeemForm.redemptionType}
    onChange={(e) => setRdRedeemForm({ ...rdRedeemForm, redemptionType: e.target.value })}
  >
                <option value="Cash">Cash (Received as Cash)</option>
                <option value="Account">Account Credit (To Bank A/c)</option>
              </select>
            </div>
            {rdRedeemForm.redemptionType === "Account" && <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Credit to Bank Account</Label>
                <select
    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    value={rdRedeemForm.bankAccountId}
    onChange={(e) => setRdRedeemForm({ ...rdRedeemForm, bankAccountId: e.target.value })}
  >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                </select>
              </div>}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Narration (Optional)</Label>
              <Input value={rdRedeemForm.narration} onChange={(e) => setRdRedeemForm({ ...rdRedeemForm, narration: e.target.value })} placeholder="e.g. RD matured after 12 months" className="rounded-lg px-3" />
            </div>
            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0">
              Confirm RD Redemption
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {
    /* --- CARD SETTLEMENT DIALOG --- */
  }
      <Dialog open={isCardSettlementOpen} onOpenChange={setIsCardSettlementOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Log Card Settlement (T+1)</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-400 font-medium -mt-2 pb-1">Enter the actual amount credited by the bank (net of any MDR charges).</p>
          <form
    onSubmit={async (e) => {
      e.preventDefault();
      try {
        const res = await khataFetch("/api/khata/card-settlement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: cardSettlementForm.date,
            amount: Number(cardSettlementForm.amount),
            bankAccountId: Number(cardSettlementForm.bankAccountId),
            salesDate: cardSettlementForm.salesDate || void 0,
            narration: cardSettlementForm.narration
          })
        });
        if (res.ok) {
          setIsCardSettlementOpen(false);
          setCardSettlementForm({ date: "", amount: "", bankAccountId: "", salesDate: "", narration: "" });
          fetchAll();
        } else {
          const err = await res.json();
          alert(err.error || "Failed to log card settlement");
        }
      } catch (err) {
        console.error(err);
      }
    }}
    className="space-y-4"
  >
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Settlement Received Date</Label>
              <Input type="date" value={cardSettlementForm.date} onChange={(e) => setCardSettlementForm({ ...cardSettlementForm, date: e.target.value })} className="rounded-lg px-3" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Original Card Sales Date</Label>
              <Input type="date" value={cardSettlementForm.salesDate} onChange={(e) => setCardSettlementForm({ ...cardSettlementForm, salesDate: e.target.value })} className="rounded-lg px-3" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Actual Amount Received (&#x20b9;)</Label>
              <Input type="number" value={cardSettlementForm.amount} onChange={(e) => setCardSettlementForm({ ...cardSettlementForm, amount: e.target.value })} placeholder="Net amount after MDR deduction" className="rounded-lg px-3" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Bank Account</Label>
              <select
    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    value={cardSettlementForm.bankAccountId}
    onChange={(e) => setCardSettlementForm({ ...cardSettlementForm, bankAccountId: e.target.value })}
    required
  >
                <option value="">Select Bank Account</option>
                {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Narration (Optional)</Label>
              <Input value={cardSettlementForm.narration} onChange={(e) => setCardSettlementForm({ ...cardSettlementForm, narration: e.target.value })} placeholder="e.g. POS settlement HDFC" className="rounded-lg px-3" />
            </div>
            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0">
              Log Card Settlement
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {
    /* --- QUICK BANK REGISTER DIALOG --- */
  }
      <Dialog open={isQuickBankOpen} onOpenChange={setIsQuickBankOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Quick Add Bank Account</DialogTitle></DialogHeader>
          <form onSubmit={handleQuickBankSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Bank / Account Name *</Label>
              <Input
    value={quickBankForm.name}
    onChange={(e) => setQuickBankForm({ ...quickBankForm, name: e.target.value })}
    placeholder="e.g. HDFC Main A/c"
    required
  />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <select
    className={INPUT_STYLE}
    value={quickBankForm.accountType}
    onChange={(e) => setQuickBankForm({ ...quickBankForm, accountType: e.target.value })}
    required
  >
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="OD">Overdraft (OD)</option>
                  <option value="CC">Cash Credit (CC)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Opening Balance (₹) *</Label>
                <Input
    type="number"
    value={quickBankForm.openingBalance}
    onChange={(e) => setQuickBankForm({ ...quickBankForm, openingBalance: e.target.value })}
    placeholder="0.00"
    required
  />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Number (Optional)</Label>
              <Input
    value={quickBankForm.accountNo}
    onChange={(e) => setQuickBankForm({ ...quickBankForm, accountNo: e.target.value })}
    placeholder="e.g. 501002938475"
  />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code (Optional)</Label>
              <Input
    value={quickBankForm.ifscCode}
    onChange={(e) => setQuickBankForm({ ...quickBankForm, ifscCode: e.target.value.toUpperCase() })}
    placeholder="e.g. HDFC0000123"
  />
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
              <input
    type="checkbox"
    id="quickIsDefault"
    checked={quickBankForm.isDefault}
    onChange={(e) => setQuickBankForm({ ...quickBankForm, isDefault: e.target.checked })}
    className="h-4.5 w-4.5 rounded border-slate-350 text-brand-teal focus:ring-brand-teal cursor-pointer"
  />
              <Label htmlFor="quickIsDefault" className="cursor-pointer text-xs font-extrabold text-brand-navy dark:text-brand-mint">
                Set as Default Bank Account
              </Label>
            </div>
            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0">
              Create Bank Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {
    /* --- MANAGE BANK ACCOUNTS DIALOG --- */
  }
      <Dialog open={isManageBanksOpen} onOpenChange={setIsManageBanksOpen}>
        <DialogContent className="max-w-lg rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">
              {editingBankId ? "Edit Bank Account Details" : "Manage Registered Bank Accounts"}
            </DialogTitle>
          </DialogHeader>

          {editingBankId ? (
    /* BANK ACCOUNT EDIT FORM */
    <form onSubmit={handleBankEditSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Bank / Account Name *</Label>
                <Input
      value={bankEditForm.name}
      onChange={(e) => setBankEditForm({ ...bankEditForm, name: e.target.value })}
      required
    />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <select
      className={INPUT_STYLE}
      value={bankEditForm.accountType}
      onChange={(e) => setBankEditForm({ ...bankEditForm, accountType: e.target.value })}
      required
    >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                    <option value="OD">Overdraft (OD)</option>
                    <option value="CC">Cash Credit (CC)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Opening Balance (₹) *</Label>
                  <Input
      type="number"
      value={bankEditForm.openingBalance}
      onChange={(e) => setBankEditForm({ ...bankEditForm, openingBalance: e.target.value })}
      required
    />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Account Number (Optional)</Label>
                <Input
      value={bankEditForm.accountNo}
      onChange={(e) => setBankEditForm({ ...bankEditForm, accountNo: e.target.value })}
    />
              </div>
              <div className="space-y-2">
                <Label>IFSC Code (Optional)</Label>
                <Input
      value={bankEditForm.ifscCode}
      onChange={(e) => setBankEditForm({ ...bankEditForm, ifscCode: e.target.value.toUpperCase() })}
    />
              </div>
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                <input
      type="checkbox"
      id="editBankIsDefault"
      checked={bankEditForm.isDefault}
      onChange={(e) => setBankEditForm({ ...bankEditForm, isDefault: e.target.checked })}
      className="h-4.5 w-4.5 rounded border-slate-350 text-brand-teal focus:ring-brand-teal cursor-pointer"
    />
                <Label htmlFor="editBankIsDefault" className="cursor-pointer text-xs font-extrabold text-brand-navy dark:text-brand-mint">
                  Set as Default Bank Account
                </Label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={() => setEditingBankId(null)}
    >
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-full border-0">
                  Save Account Changes
                </Button>
              </div>
            </form>
  ) : (
    /* REGISTERED ACCOUNTS LIST */
    <div className="space-y-4 pt-2">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {bankAccounts.map((b) => <div
      key={b.id}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/30 border-slate-150 dark:border-slate-850 gap-3"
    >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100">🏦 {b.name}</span>
                        {b.isDefault && <span className="text-[9px] bg-brand-teal text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Default
                          </span>}
                      </div>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium mt-0.5">
                        Type: {b.accountType || "Savings"} | Bal: ₹{b.openingBalance?.toLocaleString("en-IN") || 0}
                      </p>
                      {b.accountNo && <p className="text-[10px] text-slate-400 font-mono">A/c: ****{b.accountNo.slice(-4)}</p>}
                    </div>
                    
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {!b.isDefault && <Button
      size="xs"
      variant="outline"
      onClick={() => handleSetDefaultBank(b.id)}
      className="h-7 text-[10px] px-2.5 rounded-full hover:bg-brand-soft-teal border-slate-200 dark:border-slate-800"
    >
                          Make Default
                        </Button>}
                      <Button
      size="xs"
      variant="ghost"
      onClick={() => {
        setEditingBankId(b.id);
        setBankEditForm({
          name: b.name,
          accountNo: b.accountNo || "",
          ifscCode: b.ifscCode || "",
          accountType: b.accountType || "Savings",
          openingBalance: String(b.openingBalance ?? 0),
          isDefault: b.isDefault
        });
      }}
      className="h-7 w-7 text-slate-400 hover:text-slate-650 p-0"
    >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
      size="xs"
      variant="ghost"
      onClick={() => handleBankDelete(b.id)}
      className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-0"
    >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>)}

                {bankAccounts.length === 0 && <p className="text-center text-xs text-slate-400 py-10 font-semibold">No bank accounts registered.</p>}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
      type="button"
      onClick={() => setIsQuickBankOpen(true)}
      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4 text-xs rounded-full border-0"
    >
                  ➕ Add New Account
                </Button>
                <Button
      type="button"
      variant="outline"
      className="rounded-lg h-9 text-xs"
      onClick={() => setIsManageBanksOpen(false)}
    >
                  Close Manager
                </Button>
              </div>
            </div>
  )}
        </DialogContent>
      </Dialog>

    </div>;
}
