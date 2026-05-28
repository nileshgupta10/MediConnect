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
import { Coins } from "lucide-react";
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
  const fetchSuppliers = async () => {
    const res = await khataFetch("/api/khata/supplier");
    const data = await res.json();
    setSuppliers(data);
    if (data.length > 0 && !selectedSupplier) {
      setSelectedSupplier(data[0].name);
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
      setBankAccounts(Array.isArray(data) ? data : data.accounts ?? []);
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
  const calculatedChequeAmount = unsettledPurchases.filter((p) => selectedPurchaseIds.includes(p.id)).reduce((sum, p) => sum + p.invoiceAmount, 0);
  const settlementAmount = useCustomAmount ? parseFloat(customAmount) || 0 : calculatedChequeAmount;
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
    if (useCustomAmount) {
      const amtVal = parseFloat(customAmount) || 0;
      const totalUnsettledAmount = unsettledPurchases.reduce((sum, p) => sum + p.invoiceAmount, 0);
      if (amtVal <= 0) {
        alert("Please enter a valid custom amount greater than \u20B90.");
        return;
      }
      if (amtVal > totalUnsettledAmount) {
        alert(`Custom amount cannot exceed total outstanding unsettled amount of \u20B9${totalUnsettledAmount.toLocaleString("en-IN")}.`);
        return;
      }
    } else {
      if (selectedPurchaseIds.length === 0) {
        alert("Please select at least one unsettled purchase invoice.");
        return;
      }
    }
    let payload = {
      supplierName: selectedSupplier,
      amount: settlementAmount,
      purchaseIds: useCustomAmount ? [] : selectedPurchaseIds,
      isFifo: useCustomAmount
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

      {
    /* ── Summary stat strip ─────────────────────────────────── */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-5">
        {
    /* Total Period Purchases */
  }
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-slate-700 rounded-xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/20 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">🧾 Period Purchases</div>
            <div className="text-2xl font-black text-white font-mono">₹{totalPurchases.toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-slate-450 font-semibold mt-1">Total value of all period invoices</div>
          </div>
        </div>

        {
    /* Outstanding Balance */
  }
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-650 rounded-xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-amber-100 uppercase tracking-widest mb-1">⏳ Outstanding Balance</div>
            <div className="text-2xl font-black text-white font-mono">₹{outstandingAmount.toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-amber-200 font-semibold mt-1">Unsettled credit amount pending</div>
          </div>
        </div>

        {
    /* Settled Payments */
  }
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">🟢 Settled Payments</div>
            <div className="text-2xl font-black text-white font-mono">₹{Math.max(0, totalPurchases - outstandingAmount).toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-emerald-250 font-semibold mt-1">Amount fully cleared/paid</div>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
              
              {
    /* Field 1: Party (Supplier) */
  }
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

              {
    /* Field 2: Select Unpaid Invoices Dropdown Checklist */
  }
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unpaid Vouchers</Label>
                <div className="relative">
                  <button
    type="button"
    onClick={() => setIsVoucherDropdownOpen(!isVoucherDropdownOpen)}
    className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold text-slate-850 dark:text-slate-200 cursor-pointer"
  >
                    <span className="truncate">
                      {selectedPurchaseIds.length === 0 ? "Auto-Settle (All Unpaid)" : `${selectedPurchaseIds.length} Voucher${selectedPurchaseIds.length > 1 ? "s" : ""} Selected`}
                    </span>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </button>

                  {isVoucherDropdownOpen && <div className="absolute left-0 mt-1 z-50 w-full md:w-[350px] max-h-80 overflow-y-auto space-y-1.5 p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-xl border-slate-150 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <span className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wider">Pending Credit Invoices</span>
                        <button
    type="button"
    onClick={() => setIsVoucherDropdownOpen(false)}
    className="text-[10px] text-brand-teal font-extrabold hover:underline cursor-pointer"
  >
                          Done
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {unsettledPurchases.map((p) => {
    const details = getVoucherDetails(p);
    return <div
      key={p.id}
      className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedPurchaseIds.includes(p.id) ? "border-brand-teal/30 bg-brand-soft-teal/20 dark:bg-brand-teal/10" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"}`}
    >
                              <input
      type="checkbox"
      id={`quick-unpaid-${p.id}`}
      checked={selectedPurchaseIds.includes(p.id)}
      onChange={() => handleQuickCheckboxChange(p)}
      className="h-4.5 w-4.5 rounded border-slate-300 text-brand-teal focus:ring-brand-teal cursor-pointer"
    />
                              <label
      htmlFor={`quick-unpaid-${p.id}`}
      className="flex-1 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none"
    >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold font-mono">#{p.invoiceNumber}</span>
                                  <span className="font-extrabold text-brand-teal">₹{p.invoiceAmount.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex flex-col text-[9px] text-slate-400 dark:text-slate-550 mt-1">
                                  <span>📅 {formatDate(p.date)}</span>
                                  {details.isPartPaid && <span className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                      Total: ₹{details.totalAmount} (Paid: ₹{details.paidAmount})
                                    </span>}
                                </div>
                              </label>
                            </div>;
  })}

                        {unsettledPurchases.length === 0 && <p className="text-center py-6 text-xs text-muted-foreground font-semibold">
                            ✓ All invoices are fully settled!
                          </p>}
                      </div>
                    </div>}
                </div>
              </div>

              {
    /* Field 3: Amount */
  }
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-extrabold text-slate-400">₹</span>
                  <Input
    type="number"
    placeholder="0.00"
    className="pl-7 h-9 font-extrabold text-sm rounded-lg bg-white dark:bg-slate-950 font-semibold px-4"
    value={customAmount}
    onChange={(e) => setCustomAmount(e.target.value)}
    required
  />
                </div>
              </div>

              {
    /* Field 4: Settle Mode */
  }
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

              {
    /* Field 5: Action Button */
  }
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

      {
    /* Dynamic Filter Panel with Confirmation Button */
  }
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <CardTitle className="text-sm font-bold text-brand-navy dark:text-slate-200 tracking-wide uppercase flex items-center gap-2">
            Statements &amp; Payments History Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Supplier</Label>
              <select
    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
    value={selectedSupplier}
    onChange={(e) => setSelectedSupplier(e.target.value)}
    required
  >
                {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
              <Input type="date" value={inputStartDate} onChange={(e) => setInputStartDate(e.target.value)} className="rounded-full bg-white dark:bg-slate-950 font-semibold px-4" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</Label>
              <Input type="date" value={inputEndDate} onChange={(e) => setInputEndDate(e.target.value)} className="rounded-full bg-white dark:bg-slate-950 font-semibold px-4" />
            </div>
            <div>
              <Button type="button" onClick={handleApplyFilters} className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-extrabold h-9 rounded-full border-0 shadow-xs transition-all duration-200 cursor-pointer">
                Apply Date Range Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {
    /* Full-width Purchase Ledgers List */
  }
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 py-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold text-brand-navy dark:text-slate-200 tracking-wide uppercase">Payments &amp; Purchases Ledger History</CardTitle>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide max-w-md">
                  ⚠️ Note: Use this Excel sheet to directly post or import entries in Tally for your CA's convenience.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 self-stretch lg:self-auto justify-between lg:justify-end">
                <Button
    onClick={handleTallyExport}
    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs px-4 h-9 gap-1.5 cursor-pointer flex items-center shadow-xs border-0"
  >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Convert to Excel (CA)
                </Button>
                <div className="flex gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-450 block uppercase font-bold tracking-wider">Period Purchases</span>
                    <span className="text-xl font-extrabold text-brand-navy dark:text-slate-200">₹{totalPurchases.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="text-right border-l pl-6 border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-rose-500 block uppercase font-bold tracking-wider">Total Outstanding</span>
                    <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">₹{outstandingAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="min-h-[500px] max-h-[750px] overflow-y-auto pr-1 border border-slate-100 dark:border-slate-800/40 rounded-xl scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-brand-soft-teal dark:bg-slate-950 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                    <TableRow>
                      <TableHead className="w-12 text-center bg-brand-soft-teal dark:bg-slate-950" />
                      <TableHead className="bg-brand-soft-teal dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold py-3">Date</TableHead>
                      <TableHead className="bg-brand-soft-teal dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold py-3">Invoice No.</TableHead>
                      <TableHead className="bg-brand-soft-teal dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold py-3">Payment Mode</TableHead>
                      <TableHead className="bg-brand-soft-teal dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold py-3">Settlement Status</TableHead>
                      <TableHead className="bg-brand-soft-teal dark:bg-slate-950 text-right text-slate-800 dark:text-slate-200 text-xs font-bold py-3">Amount</TableHead>
                      <TableHead className="bg-brand-soft-teal dark:bg-slate-950 text-right text-slate-800 dark:text-slate-200 text-xs font-bold py-3">Balance (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getGroupedLedgerPurchases().map((g) => <TableRow key={g.invoiceNumber || g.date} className="hover:bg-brand-soft-teal/50 dark:hover:bg-slate-850/50 transition-colors odd:bg-white even:bg-brand-soft-teal/20 dark:odd:bg-slate-950/40 dark:even:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/80">
                        <TableCell className="text-center py-2.5 px-1 align-middle">
                          <Button
    variant="ghost"
    size="icon"
    type="button"
    onClick={() => {
      setSelectedGroupForEdit(g);
      setIsEditSelectionDialogOpen(true);
    }}
    className="h-7 w-7 text-slate-400 hover:text-brand-teal hover:bg-brand-soft-teal dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer animate-in zoom-in-50 duration-150"
    title="Edit Invoice or Settlement"
  >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-slate-700 dark:text-slate-350">{formatDate(g.date)}</TableCell>
                        <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">{g.invoiceNumber || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.paymentType === "Cash" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                            {g.paymentType}
                          </span>
                        </TableCell>
                        <TableCell>
                          {g.paymentType === "Cash" ? <span className="text-xs text-green-600 dark:text-green-400 font-bold animate-in fade-in duration-200">Settled (Immediate Cash)</span> : g.paidAmount > 0 && g.unpaidAmount > 0 ? <span className="inline-flex flex-col text-xs font-medium text-amber-600 dark:text-amber-400 animate-in fade-in duration-200">
                              <span className="font-bold">Partially Paid</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-550 font-semibold">
                                Paid: ₹{g.paidAmount.toLocaleString("en-IN")} | Remaining: ₹{g.unpaidAmount.toLocaleString("en-IN")}
                              </span>
                              {g.cheques.map((c) => <span key={c.id} className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase block leading-tight mt-0.5">
                                  Mode: {c.bankName} (Ref: {c.chequeNumber}) | Amt: ₹{c.amount.toLocaleString("en-IN")} ({c.status === "Cleared" ? "Part Cleared" : c.status})
                                </span>)}
                            </span> : g.paidAmount > 0 && g.unpaidAmount === 0 ? <span className="inline-flex flex-col text-xs font-medium text-green-600 dark:text-green-400 animate-in fade-in duration-200">
                              <span className="font-bold">Fully Settled</span>
                              {g.cheques.map((c) => <span key={c.id} className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase block leading-tight mt-0.5">
                                  Mode: {c.bankName} (Ref: {c.chequeNumber}) | Amt: ₹{c.amount.toLocaleString("en-IN")} ({c.status})
                                </span>)}
                            </span> : <span className="text-xs text-rose-500 dark:text-rose-400 font-bold animate-in fade-in duration-200">Unpaid (Owed)</span>}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-xs text-slate-800 dark:text-slate-200 font-mono">
                          ₹{g.originalAmount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className={`text-right font-extrabold text-xs font-mono ${g.unpaidAmount === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          ₹{g.unpaidAmount.toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>)}
                    {ledgerPurchases.length === 0 && <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs font-semibold">
                          No purchases recorded for {selectedSupplier} during this period.
                        </TableCell>
                      </TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {
    /* Purchase Bill Edit Modal */
  }
      <Dialog open={isEditBillDialogOpen} onOpenChange={setIsEditBillDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Purchase Invoice</DialogTitle>
          </DialogHeader>
          {editingPurchase && <form onSubmit={handleEditBillSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
    type="date"
    value={editingPurchase.date}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, date: e.target.value })}
    required
  />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <select
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-semibold"
    value={editingPurchase.supplierName}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, supplierName: e.target.value })}
    required
  >
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
    value={editingPurchase.invoiceNumber}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, invoiceNumber: e.target.value })}
    required
  />
              </div>
              <div className="space-y-2">
                <Label>Invoice Amount (₹)</Label>
                <Input
    type="number"
    value={editingPurchase.invoiceAmount}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, invoiceAmount: e.target.value })}
    required
  />
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <select
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-semibold"
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
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-semibold"
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
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-semibold"
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
    value={editingPurchase.chequeDate || ""}
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
    id="editLinkPdc"
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
                    <Label htmlFor="editLinkPdc" className="text-xs font-bold text-slate-700 dark:text-slate-200">Link to Post-Dated Cheque (PDC)</Label>
                  </div>

                  {editingPurchase.paymentMode === "Cheque" && <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="space-y-2">
                        <Label>Select Bank Account</Label>
                        <select
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-semibold"
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
    value={editingPurchase.chequeDate || ""}
    onChange={(e) => setEditingPurchase({ ...editingPurchase, chequeDate: e.target.value })}
    required={editingPurchase.paymentMode === "Cheque"}
  />
                      </div>
                    </div>}
                </div>}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
    type="button"
    variant="destructive"
    onClick={() => handleDeleteBill(editingPurchase.id)}
    className="bg-rose-600 hover:bg-rose-700 text-white"
  >
                  Delete Bill
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditBillDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </div>
            </form>}
        </DialogContent>
      </Dialog>

      {
    /* Cheque / Settlement Edit Modal */
  }
      <Dialog open={isEditChequeDialogOpen} onOpenChange={setIsEditChequeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Settlement details</DialogTitle>
          </DialogHeader>
          {editingCheque && <form onSubmit={handleEditChequeSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Cheque/Receipt Number</Label>
                <Input
    value={editingCheque.chequeNumber}
    onChange={(e) => setEditingCheque({ ...editingCheque, chequeNumber: e.target.value })}
    required
  />
              </div>
              <div className="space-y-2">
                <Label>Payment Date / PDC Date</Label>
                <Input
    type="date"
    value={editingCheque.chequeDate}
    onChange={(e) => setEditingCheque({ ...editingCheque, chequeDate: e.target.value })}
    required
  />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <select
    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-slate-800 dark:text-slate-200"
    value={editingCheque.paymentMode || "Cheque"}
    onChange={(e) => {
      const mode = e.target.value;
      if (mode === "Cash") {
        setEditingCheque({
          ...editingCheque,
          paymentMode: mode,
          bankAccountId: "",
          bankName: "Cash Payment"
        });
      } else {
        const defaultAccId = bankAccounts[0]?.id ? String(bankAccounts[0].id) : "";
        const defaultAccName = bankAccounts[0]?.name || "Bank";
        setEditingCheque({
          ...editingCheque,
          paymentMode: mode,
          bankAccountId: editingCheque.bankAccountId || defaultAccId,
          bankName: editingCheque.bankAccountId ? editingCheque.bankName : defaultAccName
        });
      }
    }}
    required
  >
                  <option value="Cheque">Post-Dated Cheque (PDC)</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="NEFT">NEFT (Bank Transfer)</option>
                  <option value="IMPS">IMPS (Instant Bank Transfer)</option>
                </select>
              </div>

              {editingCheque.paymentMode !== "Cash" && <div className="space-y-2">
                  <Label>Select Bank Account</Label>
                  <select
    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-slate-800 dark:text-slate-200"
    value={editingCheque.bankAccountId || ""}
    onChange={(e) => {
      const bankId = e.target.value;
      const selectedBank = bankAccounts.find((b) => String(b.id) === bankId);
      setEditingCheque({
        ...editingCheque,
        bankAccountId: bankId,
        bankName: selectedBank ? selectedBank.name : ""
      });
    }}
    required={editingCheque.paymentMode !== "Cash"}
  >
                    <option value="">Select Bank Account</option>
                    {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>)}
                  </select>
                </div>}
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
    type="number"
    value={editingCheque.amount}
    onChange={(e) => setEditingCheque({ ...editingCheque, amount: e.target.value })}
    required
  />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
    type="button"
    variant="destructive"
    onClick={(e) => handleDeleteCheque(e, editingCheque.id)}
    className="bg-rose-600 hover:bg-rose-700 text-white"
  >
                  Delete Settlement
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditChequeDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </div>
            </form>}
        </DialogContent>
      </Dialog>

      {
    /* Unified Edit Selection Dialog */
  }
      <Dialog open={isEditSelectionDialogOpen} onOpenChange={setIsEditSelectionDialogOpen}>
        <DialogContent className="sm:max-w-7xl sm:w-[94vw] sm:h-[88vh] sm:max-h-[900px] w-full h-[95vh] flex flex-col bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 shadow-2xl rounded-xl p-6 md:p-10 transition-all duration-300 ease-out">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-5 shrink-0">
            <DialogTitle className="text-2xl font-black text-slate-850 dark:text-slate-100 flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 shadow-2xs">
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-3">
                  <span>Manage Invoice #{selectedGroupForEdit?.invoiceNumber || "N/A"}</span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200/30 dark:border-blue-900/30">
                    Statement Group Editor
                  </span>
                </div>
              </div>
            </DialogTitle>
            <p className="text-sm text-slate-450 dark:text-slate-500 mt-2.5 font-medium leading-relaxed">
              Below are the dynamic components for this purchase invoice group. You can edit individual purchase bills or make edits to the associated settlement payments.
            </p>
          </DialogHeader>

          {selectedGroupForEdit && <div className="flex-1 overflow-y-auto pr-1 py-6 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-stretch h-full">
                
                {
    /* Purchase Details Column */
  }
                <div className="flex flex-col p-6 md:p-8 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/10 shadow-xs">
                  <div className="space-y-6 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="p-2.5 bg-blue-500/8 dark:bg-blue-400/10 rounded-xl text-blue-600 dark:text-blue-400">
                        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="font-black text-lg text-slate-850 dark:text-slate-150">Purchase Bill Parts</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-white/80 dark:bg-slate-900/60 p-5 rounded-xl border border-slate-150/80 dark:border-slate-800 shadow-sm text-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Invoice No</span>
                        <span className="font-mono font-black text-slate-850 dark:text-slate-100 text-sm">#{selectedGroupForEdit.invoiceNumber || "N/A"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Amount</span>
                        <span className="font-black text-blue-600 dark:text-blue-400 font-mono text-lg">₹{selectedGroupForEdit.originalAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Invoice Date</span>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">{formatDate(selectedGroupForEdit.date)}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Payment Type</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">{selectedGroupForEdit.paymentType}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex-1 flex flex-col min-h-0 space-y-3">
                      <span className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block">Database Record Split Parts:</span>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin min-h-[300px] max-h-[580px]">
                        {selectedGroupForEdit.purchases.map((pur, idx) => <div
    key={pur.id}
    className={`flex items-center justify-between p-5 rounded-xl border shadow-xs transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${idx % 2 === 0 ? "bg-white dark:bg-slate-950 border-slate-150/70 dark:border-slate-800/80" : "bg-blue-50/20 dark:bg-blue-950/10 border-blue-100/50 dark:border-blue-900/30"}`}
  >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold font-mono text-slate-850 dark:text-slate-100 text-base">
                                  Part {idx + 1}: ₹{pur.invoiceAmount.toLocaleString("en-IN")}
                                </span>
                                {pur.chequeId ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-350 border border-emerald-200/50 dark:border-emerald-900/50">
                                    Linked
                                  </span> : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-350 border border-rose-200/50 dark:border-rose-900/50">
                                    Unsettled
                                  </span>}
                              </div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold uppercase tracking-wider">
                                Record ID: #{pur.id} {pur.chequeId ? `(Linked to Chq ID: #${pur.chequeId})` : "(Owed / Unpaid Credit)"}
                              </span>
                            </div>
                            <Button
    variant="ghost"
    size="default"
    type="button"
    onClick={() => {
      setIsEditSelectionDialogOpen(false);
      handleEditBillClick(pur);
    }}
    className="rounded-lg h-10 text-xs font-extrabold text-brand-teal hover:text-white bg-brand-soft-teal hover:bg-brand-teal dark:bg-brand-teal/20 dark:text-brand-mint dark:hover:bg-brand-teal border border-brand-teal/20 px-4 py-2 cursor-pointer transition-all shadow-xs"
  >
                              Edit Bill Details
                            </Button>
                          </div>)}
                      </div>
                    </div>
                  </div>
                </div>

                {
    /* Settlement/Payment Details Column */
  }
                <div className="flex flex-col p-6 md:p-8 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-brand-soft-teal/10 dark:bg-slate-900/10 shadow-xs">
                  <div className="space-y-6 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="p-2.5 bg-emerald-500/8 dark:bg-emerald-400/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="font-black text-lg text-slate-850 dark:text-slate-150">Settlements & Payments</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-white/80 dark:bg-slate-900/60 p-5 rounded-xl border border-slate-150/80 dark:border-slate-800 shadow-sm text-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Paid Amount</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-lg">₹{selectedGroupForEdit.paidAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Remaining Balance</span>
                        <span className={`font-black font-mono text-lg ${selectedGroupForEdit.unpaidAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          ₹{selectedGroupForEdit.unpaidAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex-1 flex flex-col min-h-0 space-y-3">
                      <span className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block">Linked Settlements / Cheques:</span>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin min-h-[300px] max-h-[580px]">
                        {selectedGroupForEdit.cheques.map((chq, idx) => <div
    key={chq.id}
    className={`flex flex-col gap-3.5 p-5 rounded-xl border shadow-xs transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${idx % 2 === 0 ? "bg-white dark:bg-slate-950 border-slate-150/70 dark:border-slate-800/80" : "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/30"}`}
  >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-emerald-600 dark:text-emerald-400 text-base font-mono flex items-center">
                                ₹{chq.amount.toLocaleString("en-IN")}
                              </span>
                              <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 font-mono">
                                Ref: #{chq.chequeNumber}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold border-t border-dashed border-slate-100 dark:border-slate-850/60 pt-3 mt-1">
                              <div>Mode: <span className="text-slate-800 dark:text-slate-200 font-extrabold">{chq.bankName}</span></div>
                              <div className="text-right">Date: <span className="text-slate-800 dark:text-slate-200 font-extrabold">{formatDate(chq.chequeDate)}</span></div>
                              <div>Status: <span className={`font-black ${chq.status === "Cleared" ? "text-emerald-600 dark:text-emerald-450" : "text-amber-500"}`}>
                                {selectedGroupForEdit.unpaidAmount > 0 && chq.status === "Cleared" ? "Part Cleared" : chq.status}
                              </span></div>
                              <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Record ID: #{chq.id}</div>
                            </div>

                            <Button
    variant="ghost"
    size="default"
    type="button"
    onClick={() => {
      setIsEditSelectionDialogOpen(false);
      handleEditChequeClick(chq);
    }}
    className="rounded-lg h-10 text-xs font-extrabold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-450 dark:hover:bg-emerald-600 border border-emerald-100/50 dark:border-emerald-900/50 px-4 py-2 w-full mt-1 cursor-pointer transition-all shadow-xs"
  >
                              Edit Settlement Details
                            </Button>
                          </div>)}
                        {selectedGroupForEdit.cheques.length === 0 && <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-900/20 text-center">
                            <svg className="w-10 h-10 text-slate-355 dark:text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-extrabold italic">
                              No payments/settlements are linked to this credit purchase yet.
                            </p>
                          </div>}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>}

          <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
            <Button
    variant="outline"
    type="button"
    onClick={() => setIsEditSelectionDialogOpen(false)}
    className="rounded-lg text-xs font-black px-5 py-2.5 border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition-all shadow-2xs cursor-pointer"
  >
              Close Editor Panel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}
