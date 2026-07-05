"use strict";
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { formatDate, khataFetch } from "../../lib/khata-utils";
import { Coins, ShoppingBag, Home, Edit, Trash2, Plus, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
const INPUT_STYLE = "flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-semibold";
export function SupplierLedger() {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const defaultStartDate = () => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  };
  const defaultEndDate = () => (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [inputStartDate, setInputStartDate] = useState(defaultStartDate());
  const [inputEndDate, setInputEndDate] = useState(defaultEndDate());
  const [confirmedStartDate, setConfirmedStartDate] = useState(defaultStartDate());
  const [confirmedEndDate, setConfirmedEndDate] = useState(defaultEndDate());
  const handleTallyExport = async () => {
    if (!selectedSupplier) {
      alert("Please select a supplier first.");
      return;
    }
    try {
      const res = await khataFetch(
        `/api/khata/export/tally?from=${confirmedStartDate}&to=${confirmedEndDate}&supplierName=${encodeURIComponent(
          selectedSupplier
        )}`
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MediCLan_CA_Tally_Entries_${selectedSupplier}_${confirmedStartDate}_to_${confirmedEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download Tally CA Excel file");
    }
  };
  const [ledgerPurchases, setLedgerPurchases] = useState([]);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);
  const [unsettledPurchases, setUnsettledPurchases] = useState([]);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState([]);
  const [unsettledStartDate, setUnsettledStartDate] = useState("");
  const [unsettledEndDate, setUnsettledEndDate] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const useCustomAmount = selectedPurchaseIds.length === 0;
  const [settlementMode, setSettlementMode] = useState("Cheque");
  const [neftBankCharge, setNeftBankCharge] = useState("");
  const [unsettledSortBy, setUnsettledSortBy] = useState("oldest");
  const [chequeForm, setChequeForm] = useState({
    chequeNumber: "",
    chequeDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    bankName: "",
    reference: "",
    bankAccountId: ""
  });
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [isEditBillDialogOpen, setIsEditBillDialogOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState(null);
  const [isEditChequeDialogOpen, setIsEditChequeDialogOpen] = useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState(null);
  const [isEditSelectionDialogOpen, setIsEditSelectionDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => (new Date()).toLocaleDateString("en-CA"));
  const [isExpenseAddOpen, setIsExpenseAddOpen] = useState(false);
  const [isExpenseEditOpen, setIsExpenseEditOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "Shop",
    narration: "",
    paymentMode: "Cash",
    bankAccountId: ""
  });
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

  const fetchExpenses = async () => {
    try {
      const res = await khataFetch("/api/khata/expense");
      const data = await res.json();
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
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
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add expense");
      }
    } catch (err) {
      console.error(err);
    }
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
        fetchExpenses();
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
        fetchExpenses();
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
        await fetchBankAccounts();
        const newBankId = String(data.id);
        setExpenseForm((prev) => ({ ...prev, bankAccountId: newBankId }));
      } else {
        alert(data.error || "Failed to add bank account");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const fetchSuppliers = async () => {
    try {
      const res = await khataFetch("/api/khata/supplier");
      const data = await res.json();
      setSuppliers(data || []);
      if (data && data.length > 0 && !selectedSupplier) {
        setSelectedSupplier(data[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const fetchLedger = async () => {
    if (!selectedSupplier) return;
    try {
      const res = await fetch(
        `/api/supplier/ledger?supplierName=${encodeURIComponent(
          selectedSupplier
        )}&startDate=${confirmedStartDate}&endDate=${confirmedEndDate}`
      );
      const data = await res.json();
      setLedgerPurchases(data.purchases || []);
      setTotalPurchases(data.totalAmount || 0);
      setOutstandingAmount(data.outstandingAmount || 0);
    } catch (err) {
      console.error(err);
    }
  };
  const [allPurchases, setAllPurchases] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isVoucherDropdownOpen, setIsVoucherDropdownOpen] = useState(false);
  const fetchBankAccounts = async () => {
    try {
      const res = await khataFetch("/api/khata/bank-account");
      const data = await res.json();
      const accounts = Array.isArray(data) ? data : data.accounts ?? [];
      setBankAccounts(accounts);
      const defaultAcc = accounts.find((b) => b.isDefault) || accounts[0];
      const defaultAccId = defaultAcc ? String(defaultAcc.id) : "";
      setExpenseForm((prev) => ({ ...prev, bankAccountId: prev.bankAccountId || defaultAccId }));
    } catch {
      setBankAccounts([]);
    }
  };
  const getVoucherDetails = (p) => {
    const invoiceParts = allPurchases.filter(
      (item) => item.supplierName === p.supplierName && item.invoiceNumber === p.invoiceNumber
    );
    const totalAmount = invoiceParts.reduce((sum, item) => sum + item.invoiceAmount, 0);
    const paidAmount = invoiceParts.filter((item) => item.chequeId !== null).reduce((sum, item) => sum + item.invoiceAmount, 0);
    const remainingAmount = p.invoiceAmount;
    return {
      totalAmount,
      paidAmount,
      remainingAmount,
      isPartPaid: paidAmount > 0
    };
  };
  const handleQuickCheckboxChange = (purchase) => {
    setSelectedPurchaseIds((prev) => {
      const next = prev.includes(purchase.id) ? prev.filter((id) => id !== purchase.id) : [...prev, purchase.id];
      const sum = unsettledPurchases.filter((p) => next.includes(p.id)).reduce((s, p) => s + p.invoiceAmount, 0);
      setCustomAmount(sum > 0 ? String(sum) : "");
      return next;
    });
  };
  const handleAmountInputChange = (val) => {
    setCustomAmount(val);
    const amtVal = parseFloat(val) || 0;
    if (amtVal <= 0) {
      setSelectedPurchaseIds([]);
      return;
    }
    const sorted = [...unsettledPurchases].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let remaining = amtVal;
    const selectedIds = [];
    for (const p of sorted) {
      if (remaining <= 0) break;
      selectedIds.push(p.id);
      remaining -= p.invoiceAmount;
    }
    setSelectedPurchaseIds(selectedIds);
  };
  const fetchUnsettled = async () => {
    if (!selectedSupplier) return;
    try {
      const res = await khataFetch("/api/khata/purchase");
      const data = await res.json();
      setAllPurchases(data);
      const creditUnsettled = data.filter(
        (p) => p.supplierName === selectedSupplier && p.paymentType === "Credit" && !p.chequeId
      );
      setUnsettledPurchases(creditUnsettled);
      setSelectedPurchaseIds([]);
      setCustomAmount("");
      setUnsettledStartDate("");
      setUnsettledEndDate("");
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchSuppliers();
    fetchBankAccounts();
    fetchExpenses();
  }, []);
  useEffect(() => {
    if (selectedSupplier) {
      fetchLedger();
      fetchUnsettled();
    }
  }, [selectedSupplier, confirmedStartDate, confirmedEndDate]);
  const handleApplyFilters = () => {
    setConfirmedStartDate(inputStartDate);
    setConfirmedEndDate(inputEndDate);
  };
  const handleCheckboxChange = (id) => {
    setSelectedPurchaseIds(
      (prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const filteredUnsettled = unsettledPurchases.filter((p) => {
    const pDate = new Date(p.date);
    pDate.setHours(0, 0, 0, 0);
    if (unsettledStartDate) {
      const sDate = new Date(unsettledStartDate);
      sDate.setHours(0, 0, 0, 0);
      if (pDate < sDate) return false;
    }
    if (unsettledEndDate) {
      const eDate = new Date(unsettledEndDate);
      eDate.setHours(23, 59, 59, 999);
      if (pDate > eDate) return false;
    }
    return true;
  });
  const sortedUnsettled = [...filteredUnsettled].sort((a, b) => {
    if (unsettledSortBy === "oldest") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (unsettledSortBy === "newest") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (unsettledSortBy === "highest") {
      return b.invoiceAmount - a.invoiceAmount;
    }
    if (unsettledSortBy === "lowest") {
      return a.invoiceAmount - b.invoiceAmount;
    }
    return 0;
  });
  const allVisibleSelected = sortedUnsettled.length > 0 && sortedUnsettled.every((p) => selectedPurchaseIds.includes(p.id));
  const handleSelectAllToggle = () => {
    if (allVisibleSelected) {
      const visibleIds = sortedUnsettled.map((p) => p.id);
      setSelectedPurchaseIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      const visibleIds = sortedUnsettled.map((p) => p.id);
      setSelectedPurchaseIds((prev) => {
        const newSelection = [...prev];
        visibleIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };
  const settlementAmount = parseFloat(customAmount) || 0;
  const getFifoAllocationPreview = () => {
    const amountVal = parseFloat(customAmount) || 0;
    let remaining = amountVal;
    const allocation = [];
    const sortedForFifo = [...unsettledPurchases].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const p of sortedForFifo) {
      if (remaining <= 0) {
        allocation.push({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          date: p.date,
          originalAmount: p.invoiceAmount,
          allocatedAmount: 0,
          remainingAmount: p.invoiceAmount,
          status: "unpaid"
        });
      } else if (remaining >= p.invoiceAmount) {
        allocation.push({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          date: p.date,
          originalAmount: p.invoiceAmount,
          allocatedAmount: p.invoiceAmount,
          remainingAmount: 0,
          status: "fully_settled"
        });
        remaining -= p.invoiceAmount;
      } else {
        allocation.push({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          date: p.date,
          originalAmount: p.invoiceAmount,
          allocatedAmount: remaining,
          remainingAmount: p.invoiceAmount - remaining,
          status: "partially_settled"
        });
        remaining = 0;
      }
    }
    return { allocation, excess: remaining };
  };
  const { allocation: fifoAllocationPreview, excess: fifoExcess } = getFifoAllocationPreview();
  const handleIssueSettlement = async (e) => {
    e.preventDefault();
    const amtVal = parseFloat(customAmount) || 0;
    if (amtVal <= 0) {
      alert("Please enter a valid amount greater than \u20B90.");
      return;
    }
    const totalUnsettledAmount = unsettledPurchases.reduce((sum, p) => sum + p.invoiceAmount, 0);
    if (amtVal > totalUnsettledAmount) {
      alert(`Amount cannot exceed total outstanding unsettled amount of \u20B9${totalUnsettledAmount.toLocaleString("en-IN")}.`);
      return;
    }
    let payload = {
      supplierName: selectedSupplier,
      amount: amtVal,
      purchaseIds: selectedPurchaseIds,
      isFifo: selectedPurchaseIds.length === 0
    };
    if (settlementMode === "Cheque") {
      payload = {
        ...payload,
        chequeNumber: chequeForm.chequeNumber,
        chequeDate: chequeForm.chequeDate,
        bankName: chequeForm.bankName,
        bankAccountId: chequeForm.bankAccountId ? Number(chequeForm.bankAccountId) : void 0,
        status: "Pending"
      };
    } else if (settlementMode === "Cash") {
      payload = {
        ...payload,
        chequeNumber: chequeForm.reference.trim() || "CASH-PAY",
        chequeDate: chequeForm.chequeDate,
        bankName: "Cash Payment",
        status: "Cleared"
      };
    } else if (settlementMode === "UPI") {
      payload = {
        ...payload,
        chequeNumber: chequeForm.reference.trim() || "UPI-PAY",
        chequeDate: chequeForm.chequeDate,
        bankName: chequeForm.bankName.trim() || "UPI",
        bankAccountId: chequeForm.bankAccountId ? Number(chequeForm.bankAccountId) : void 0,
        paymentMode: "UPI",
        status: "Cleared"
      };
    } else if (settlementMode === "NEFT" || settlementMode === "IMPS") {
      payload = {
        ...payload,
        chequeNumber: chequeForm.reference.trim() || `${settlementMode}-PAY`,
        chequeDate: chequeForm.chequeDate,
        bankName: chequeForm.bankName.trim() || settlementMode,
        bankAccountId: chequeForm.bankAccountId ? Number(chequeForm.bankAccountId) : void 0,
        paymentMode: settlementMode,
        bankCharge: parseFloat(neftBankCharge) || 0,
        status: "Cleared"
      };
    }
    try {
      const res = await khataFetch("/api/khata/cheque", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setChequeForm({
          chequeNumber: "",
          chequeDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          bankName: "",
          reference: "",
          bankAccountId: ""
        });
        setNeftBankCharge("");
        setSelectedPurchaseIds([]);
        setCustomAmount("");
        setUnsettledStartDate("");
        setUnsettledEndDate("");
        await fetchLedger();
        await fetchUnsettled();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to issue settlement");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleEditBillClick = (p) => {
    setEditingPurchase({
      id: p.id,
      date: new Date(p.date).toISOString().split("T")[0],
      supplierName: p.supplierName,
      invoiceNumber: p.invoiceNumber,
      invoiceAmount: p.invoiceAmount.toString(),
      paymentType: p.paymentType,
      paymentMode: p.cheque?.paymentMode || "Cash",
      bankAccountId: p.cheque?.bankAccountId ? String(p.cheque.bankAccountId) : "",
      chequeNumber: p.cheque?.chequeNumber || "",
      chequeDate: p.cheque?.chequeDate ? new Date(p.cheque.chequeDate).toISOString().split("T")[0] : new Date(p.date).toISOString().split("T")[0],
      bankCharge: p.cheque?.bankCharge ? String(p.cheque.bankCharge) : ""
    });
    setIsEditBillDialogOpen(true);
  };
  const handleEditBillSubmit = async (e) => {
    e.preventDefault();
    if (!editingPurchase) return;
    try {
      const res = await khataFetch("/api/khata/purchase", {
        method: "PUT",
        body: JSON.stringify({
          id: editingPurchase.id,
          date: editingPurchase.date,
          supplierName: editingPurchase.supplierName,
          invoiceNumber: editingPurchase.invoiceNumber,
          invoiceAmount: Number(editingPurchase.invoiceAmount),
          paymentType: editingPurchase.paymentType,
          paymentMode: editingPurchase.paymentMode,
          bankAccountId: editingPurchase.bankAccountId ? Number(editingPurchase.bankAccountId) : null,
          chequeNumber: editingPurchase.chequeNumber,
          chequeDate: editingPurchase.chequeDate,
          bankCharge: editingPurchase.bankCharge ? Number(editingPurchase.bankCharge) : null
        }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setIsEditBillDialogOpen(false);
        setEditingPurchase(null);
        await fetchLedger();
        await fetchUnsettled();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to edit purchase bill");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleDeleteBill = async (id) => {
    if (!confirm("Are you sure you want to delete this purchase bill? All associated payment details will also be deleted.")) {
      return;
    }
    try {
      const res = await khataFetch(`/api/khata/purchase?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setIsEditBillDialogOpen(false);
        setEditingPurchase(null);
        await fetchLedger();
        await fetchUnsettled();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete purchase bill");
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleEditChequeClick = (cheque) => {
    if (!cheque || cheque.id === void 0) {
      alert("Settlement data not available. Please refresh and try again.");
      return;
    }
    setEditingCheque({
      id: cheque.id,
      chequeNumber: cheque.chequeNumber ?? "",
      chequeDate: cheque.chequeDate ? new Date(cheque.chequeDate).toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      bankName: cheque.bankName ?? "",
      amount: cheque.amount != null ? String(cheque.amount) : "0",
      paymentMode: cheque.paymentMode ?? "Cheque",
      bankAccountId: cheque.bankAccountId ? String(cheque.bankAccountId) : ""
    });
    setIsEditChequeDialogOpen(true);
  };
  const handleEditChequeSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingCheque) return;
    try {
      const res = await khataFetch(`/api/khata/cheque/${Number(editingCheque.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          chequeNumber: editingCheque.chequeNumber,
          chequeDate: editingCheque.chequeDate,
          bankName: editingCheque.bankName,
          amount: Number(editingCheque.amount),
          paymentMode: editingCheque.paymentMode,
          bankAccountId: editingCheque.bankAccountId ? Number(editingCheque.bankAccountId) : null
        }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setIsEditChequeDialogOpen(false);
        setEditingCheque(null);
        await fetchLedger();
        await fetchUnsettled();
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        alert("Save failed: " + (err.error || res.statusText));
      }
    } catch (err) {
      console.error("Edit cheque error:", err);
      alert("Network error \u2014 check console.");
    }
  };
  const handleDeleteCheque = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this settlement? Linked invoices will revert to unpaid.")) return;
    try {
      const res = await khataFetch(`/api/khata/cheque/${id}`, { method: "DELETE" });
      if (res.ok) {
        setIsEditChequeDialogOpen(false);
        setEditingCheque(null);
        await fetchLedger();
        await fetchUnsettled();
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        alert("Delete failed: " + (err.error || res.statusText));
      }
    } catch (err) {
      console.error("Delete cheque error:", err);
      alert("Network error \u2014 check console.");
    }
  };
  const getGroupedLedgerPurchases = () => {
    const groups = {};
    ledgerPurchases.forEach((p) => {
      const key = p.invoiceNumber ? p.invoiceNumber.trim() : `unnamed-${p.id}`;
      if (!groups[key]) {
        groups[key] = {
          invoiceNumber: p.invoiceNumber || "",
          date: p.date,
          paymentType: p.paymentType,
          originalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          purchases: [],
          cheques: []
        };
      }
      const g = groups[key];
      if (new Date(p.date).getTime() < new Date(g.date).getTime()) {
        g.date = p.date;
      }
      g.originalAmount += p.invoiceAmount;
      if (p.cheque) {
        g.paidAmount += p.invoiceAmount;
        if (!g.cheques.some((c) => c.id === p.cheque.id)) {
          g.cheques.push(p.cheque);
        }
      } else {
        if (p.paymentType === "Cash") {
          g.paidAmount += p.invoiceAmount;
        } else {
          g.unpaidAmount += p.invoiceAmount;
        }
      }
      g.purchases.push(p);
    });
    return Object.values(groups).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  const isDateMatch = (d1) => {
    try {
      return new Date(d1).toLocaleDateString("en-CA") === selectedDate;
    } catch {
      return false;
    }
  };
  const dateExpenses = expenses.filter((e) => isDateMatch(e.date));
  const shopExpenses = dateExpenses.filter((e) => e.category === "Shop");
  const homeExpenses = dateExpenses.filter((e) => e.category === "Home");
  const totalShopExpenses = shopExpenses.reduce((s, e) => s + e.amount, 0);
  const totalHomeExpenses = homeExpenses.reduce((s, e) => s + e.amount, 0);

  return <div className="space-y-6">
      
      {
    /* Sleek Gradient Header Banner */
  }
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy via-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700/50 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {
    /* Decorative blobs */
  }
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-16 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-2.5 bg-brand-teal/20 border border-brand-teal/30 rounded-xl">
            <Coins className="w-5 h-5 text-brand-mint" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Supplier Ledger &amp; Payments</h2>
            <p className="text-xs text-slate-400 font-medium">Record settlements, manage outstanding credit, and track issued cheques</p>
          </div>
        </div>
      </div>

      {/* Daily Expenses Section Moved from DailyDashboard.js */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
        <CardHeader className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">💸</span>
              <CardTitle className="text-sm font-black text-brand-navy dark:text-slate-200 tracking-wide uppercase">
                Daily Expenses
              </CardTitle>
            </div>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/85 p-1 rounded-lg border border-slate-250 dark:border-slate-700/50">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded cursor-pointer"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toLocaleDateString("en-CA"));
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono px-1">
                {selectedDate}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded cursor-pointer"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toLocaleDateString("en-CA"));
                }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const defaultAcc = bankAccounts.find((b) => b.isDefault) || bankAccounts[0];
              const defaultAccId = defaultAcc ? String(defaultAcc.id) : "";
              setExpenseForm({
                amount: "",
                category: "Shop",
                narration: "",
                paymentMode: "Cash",
                bankAccountId: defaultAccId
              });
              setIsExpenseAddOpen(true);
            }}
            className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-8 text-xs gap-1 rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Shop Expenses Column */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900/60 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
              <div>
                <div className="bg-blue-500/15 dark:bg-blue-900/40 border-b-2 border-blue-200 dark:border-blue-900/60 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
                      <ShoppingBag className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-blue-800 dark:text-blue-200 uppercase tracking-wide">Shop Expenses</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Store operational costs</div>
                    </div>
                  </div>
                  <span className="text-xs bg-blue-500 text-white px-2.5 py-1 rounded-full font-black shadow-sm">
                    {shopExpenses.length} entries
                  </span>
                </div>

                <div className="p-4 space-y-2.5 min-h-36 max-h-80 overflow-y-auto">
                  {shopExpenses.map((e, idx) => (
                    <div key={e.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40 shadow-xs transition-all hover:shadow-sm hover:-translate-y-px ${idx % 2 === 0 ? "bg-white dark:bg-blue-950/30" : "bg-blue-50/80 dark:bg-blue-950/20"}`}>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{e.narration}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Voucher ID: #{e.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-black text-red-650 dark:text-red-400">₹{e.amount.toLocaleString("en-IN")}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-450 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer" onClick={() => triggerEditExpense(e)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {shopExpenses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-450 text-lg">💵</div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">No Shop expenses logged today</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 bg-blue-500/10 dark:bg-blue-900/30 border-t-2 border-blue-200 dark:border-blue-900/60 flex items-center justify-between mt-auto">
                <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">Shop Total</span>
                <span className="text-base font-black text-blue-700 dark:text-blue-300 font-mono">₹{totalShopExpenses.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Home Expenses Column */}
            <div className="bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-900/60 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
              <div>
                <div className="bg-purple-500/15 dark:bg-purple-900/40 border-b-2 border-purple-200 dark:border-purple-900/60 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm">
                      <Home className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-purple-800 dark:text-purple-200 uppercase tracking-wide">Home Expenses</div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Personal drawing costs</div>
                    </div>
                  </div>
                  <span className="text-xs bg-purple-500 text-white px-2.5 py-1 rounded-full font-black shadow-sm">
                    {homeExpenses.length} entries
                  </span>
                </div>

                <div className="p-4 space-y-2.5 min-h-36 max-h-80 overflow-y-auto">
                  {homeExpenses.map((e, idx) => (
                    <div key={e.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border border-purple-200/60 dark:border-purple-800/40 shadow-xs transition-all hover:shadow-sm hover:-translate-y-px ${idx % 2 === 0 ? "bg-white dark:bg-purple-950/30" : "bg-purple-50/80 dark:bg-purple-950/20"}`}>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{e.narration}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Voucher ID: #{e.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-black text-red-650 dark:text-red-400">₹{e.amount.toLocaleString("en-IN")}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-450 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg cursor-pointer" onClick={() => triggerEditExpense(e)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {homeExpenses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-450 text-lg">🏠</div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">No Home expenses logged today</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 bg-purple-500/10 dark:bg-purple-900/30 border-t-2 border-purple-200 dark:border-purple-900/60 flex items-center justify-between mt-auto">
                <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">Home Total</span>
                <span className="text-base font-black text-purple-700 dark:text-purple-300 font-mono">₹{totalHomeExpenses.toLocaleString("en-IN")}</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {
    /* Sleek, Premium Quick Payment Entry Card */
  }
      <Card className="border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <CardTitle className="text-sm font-bold text-brand-navy dark:text-slate-200 tracking-wide uppercase flex items-center gap-2">
            💸 Quick Payments Entry Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleIssueSettlement} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              
              {/* Field 1: Party (Supplier) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Party (Supplier)</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-slate-800 dark:text-slate-200"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {/* Field 2: Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-extrabold text-slate-400">₹</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-7 h-9 font-extrabold text-sm rounded-lg bg-white dark:bg-slate-950 px-4"
                    value={customAmount}
                    onChange={(e) => handleAmountInputChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Field 3: Payment Mode */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Mode</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-slate-800 dark:text-slate-200"
                  value={settlementMode}
                  onChange={(e) => setSettlementMode(e.target.value)}
                  required
                >
                  <option value="Cheque">Post-Dated Cheque (PDC)</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="NEFT">NEFT (Bank Transfer)</option>
                  <option value="IMPS">IMPS (Instant Bank Transfer)</option>
                </select>
              </div>

              {/* Field 4: Action Button */}
              <div>
                <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-extrabold h-9 rounded-full border-0 shadow-xs cursor-pointer">
                  Record Payment
                </Button>
              </div>

            </div>

            {
    /* Inline dynamic fields for Cheque / Bank / UPI details */
  }
            {(settlementMode !== "Cash" || selectedPurchaseIds.length > 0 || parseFloat(customAmount) > 0) && <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-250/60 dark:border-slate-800/80 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {
    /* Payment/PDCheque Date */
  }
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment / PDC Date</Label>
                    <Input type="date" value={chequeForm.chequeDate} onChange={(e) => setChequeForm({ ...chequeForm, chequeDate: e.target.value })} className="rounded-lg px-3 h-9 font-semibold text-xs" required />
                  </div>

                  {
    /* Bank Account Dropdown for Online modes (Cheque, UPI, NEFT, IMPS) */
  }
                  {settlementMode !== "Cash" && <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Bank Account</Label>
                      <select
    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-slate-800 dark:text-slate-200"
    value={chequeForm.bankAccountId || ""}
    onChange={(e) => {
      const bankId = e.target.value;
      const selectedBank = bankAccounts.find((b) => String(b.id) === bankId);
      setChequeForm({
        ...chequeForm,
        bankAccountId: bankId,
        bankName: selectedBank ? selectedBank.name : ""
      });
    }}
    required={settlementMode !== "Cash"}
  >
                        <option value="">Select Bank Account</option>
                        {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                      </select>
                    </div>}

                  {
    /* Dynamic inputs based on settlement mode */
  }
                  {settlementMode === "Cheque" && <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cheque Number</Label>
                      <Input value={chequeForm.chequeNumber} onChange={(e) => setChequeForm({ ...chequeForm, chequeNumber: e.target.value })} placeholder="e.g. 504932" className="rounded-lg px-3 h-9 font-semibold text-xs animate-in fade-in duration-250" required />
                    </div>}

                  {settlementMode === "UPI" && <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">UPI Ref Number (Optional)</Label>
                      <Input value={chequeForm.reference} onChange={(e) => setChequeForm({ ...chequeForm, reference: e.target.value })} placeholder="e.g. UTR-123456" className="rounded-lg px-3 h-9 font-semibold text-xs animate-in fade-in duration-250" />
                    </div>}

                  {(settlementMode === "NEFT" || settlementMode === "IMPS") && <>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transfer Ref UTR</Label>
                        <Input value={chequeForm.reference} onChange={(e) => setChequeForm({ ...chequeForm, reference: e.target.value })} placeholder="e.g. UTR-987654" className="rounded-lg px-3 h-9 font-semibold text-xs animate-in fade-in duration-250" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bank Transfer Charges (₹)</Label>
                        <Input type="number" step="0.01" value={neftBankCharge} onChange={(e) => setNeftBankCharge(e.target.value)} placeholder="0.00" className="rounded-lg px-3 h-9 font-semibold text-xs animate-in fade-in duration-250" />
                      </div>
                    </>}

                  {settlementMode === "Cash" && <div className="space-y-1.5 col-span-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Voucher / Receipt Ref (Optional)</Label>
                      <Input value={chequeForm.reference} onChange={(e) => setChequeForm({ ...chequeForm, reference: e.target.value })} placeholder="e.g. Receipt-102" className="rounded-lg px-3 h-9 font-semibold text-xs animate-in fade-in duration-250" />
                    </div>}

                </div>

                {
    /* Status/FIFO allocation note */
  }
                <div className="flex items-center justify-between text-[11px] font-bold border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                  <span className="text-slate-500">
                    {selectedPurchaseIds.length > 0 ? `\u2713 Paying exactly ${selectedPurchaseIds.length} selected voucher(s).` : `\u26A1 Auto-settling oldest pending invoices first (Oldest First).`}
                  </span>
                  <span className="text-brand-teal">
                    Net Amount: ₹{settlementAmount.toLocaleString("en-IN")}
                  </span>
                </div>

              </div>}
          </form>
        </CardContent>
      </Card>

      {/* Pending Unpaid Vouchers Table */}
      {selectedSupplier && (
        <Card className="border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-xl overflow-hidden mt-6 animate-in fade-in duration-300">
          <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <CardTitle className="text-sm font-bold text-brand-navy dark:text-slate-200 tracking-wide uppercase flex items-center justify-between">
              <span>📋 Unpaid Vouchers for {selectedSupplier}</span>
              <span className="text-xs bg-brand-soft-teal text-brand-teal px-2.5 py-0.5 rounded-full font-black border border-brand-teal/20">
                {unsettledPurchases.length} Pending
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="border border-slate-150 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={unsettledPurchases.length > 0 && unsettledPurchases.every(p => selectedPurchaseIds.includes(p.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPurchaseIds(unsettledPurchases.map(p => p.id));
                            const totalVal = unsettledPurchases.reduce((sum, p) => sum + p.invoiceAmount, 0);
                            setCustomAmount(String(totalVal));
                          } else {
                            setSelectedPurchaseIds([]);
                            setCustomAmount("");
                          }
                        }}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-brand-teal focus:ring-brand-teal cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-bold py-3 text-slate-700 dark:text-slate-300">Date</TableHead>
                    <TableHead className="text-xs font-bold py-3 text-slate-700 dark:text-slate-300">Invoice No.</TableHead>
                    <TableHead className="text-xs font-bold py-3 text-slate-700 dark:text-slate-300">Original Amount</TableHead>
                    <TableHead className="text-xs font-bold py-3 text-slate-700 dark:text-slate-300">Paid Amount</TableHead>
                    <TableHead className="text-xs font-bold py-3 text-slate-700 dark:text-slate-300 text-right pr-4">Balance Owed</TableHead>
                    <TableHead className="text-xs font-bold py-3 text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unsettledPurchases.map((p) => {
                    const details = getVoucherDetails(p);
                    const isChecked = selectedPurchaseIds.includes(p.id);
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors border-b border-slate-100 dark:border-slate-800/80">
                        <TableCell className="text-center py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleQuickCheckboxChange(p)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-brand-teal focus:ring-brand-teal cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-slate-700 dark:text-slate-350">{formatDate(p.date)}</TableCell>
                        <TableCell className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">#{p.invoiceNumber}</TableCell>
                        <TableCell className="font-semibold text-xs text-slate-700 dark:text-slate-350">₹{details.totalAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="font-semibold text-xs text-slate-700 dark:text-slate-350">₹{details.paidAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right font-extrabold text-xs text-rose-600 dark:text-rose-400 font-mono pr-4">₹{p.invoiceAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-center">
                          {details.isPartPaid ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                              Partially Paid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                              Unpaid
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {unsettledPurchases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-emerald-600 font-bold text-sm">
                        ✅ All invoices are fully settled! No unpaid vouchers.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statements & Payments History Filters, and Payments & Purchases Ledger History moved to MasterLedger.js */}

      {/* --- ADD EXPENSE DIALOG --- */}
      <Dialog open={isExpenseAddOpen} onOpenChange={setIsExpenseAddOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Log Daily Expense</DialogTitle></DialogHeader>
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

            {expenseForm.paymentMode !== "Cash" && (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
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
              </div>
            )}

            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0 cursor-pointer">
              Save Expense
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT EXPENSE DIALOG --- */}
      <Dialog open={isExpenseEditOpen} onOpenChange={setIsExpenseEditOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-brand-navy dark:text-slate-100 font-bold">Edit Expense Details</DialogTitle></DialogHeader>
          {editingExpense && (
            <form onSubmit={handleEditExpenseSubmit} className="space-y-4 pt-2">
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

              {editingExpense.paymentMode !== "Cash" && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
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
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteExpense(editingExpense.id)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="outline" className="rounded-full cursor-pointer" onClick={() => setIsExpenseEditOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-full border-0 cursor-pointer">Save Changes</Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- QUICK BANK REGISTER DIALOG --- */}
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
                onChange={(e) => setQuickBankForm({ ...quickBankForm, ifscCode: e.target.value })}
                placeholder="e.g. HDFC0001203"
              />
            </div>
            <div className="flex items-center space-x-2 p-1">
              <input
                type="checkbox"
                id="isDefaultBank"
                checked={quickBankForm.isDefault}
                onChange={(e) => setQuickBankForm({ ...quickBankForm, isDefault: e.target.checked })}
                className="h-4.5 w-4.5 rounded border-slate-350 text-brand-teal focus:ring-brand-teal cursor-pointer"
              />
              <Label htmlFor="isDefaultBank" className="cursor-pointer text-xs font-semibold text-slate-700">Set as Default Account</Label>
            </div>
            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0 cursor-pointer">
              Save Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
}
