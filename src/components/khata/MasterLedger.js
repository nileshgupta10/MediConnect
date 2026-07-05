import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatDate, khataFetch } from '../../lib/khata-utils';
import {
  Calendar, ShoppingBag, TrendingUp, AlertTriangle, Building2, Settings,
  ArrowRight, FileText, Filter, ChevronDown, X, Plus, Trash2, Edit
} from 'lucide-react';
import { BankLedger } from './BankLedger';
import { BankAccountManager } from './BankAccountManager';

export function MasterLedger() {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString('en-CA');

  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeSubTab, setActiveSubTab] = useState('purchases');

  const [purchases, setPurchases] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [cardSettlements, setCardSettlements] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);

  // supplier filter state for purchase ledger
  const [supplierFilter, setSupplierFilter] = useState('');
  const [isSupplierFilterOpen, setIsSupplierFilterOpen] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);

  // For Payment History Sub-tab
  const [suppliers, setSuppliers] = useState([]);
  const [selectedStatementSupplier, setSelectedStatementSupplier] = useState('');
  const [statementInputStartDate, setStatementInputStartDate] = useState(thirtyDaysAgoStr);
  const [statementInputEndDate, setStatementInputEndDate] = useState(todayStr);
  const [statementConfirmedStartDate, setStatementConfirmedStartDate] = useState(thirtyDaysAgoStr);
  const [statementConfirmedEndDate, setStatementConfirmedEndDate] = useState(todayStr);
  
  const [ledgerPurchases, setLedgerPurchases] = useState([]);
  const [statementTotalPurchases, setStatementTotalPurchases] = useState(0);
  const [statementOutstandingAmount, setStatementOutstandingAmount] = useState(0);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Edit states for Ledger History
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState(null);
  const [isEditSelectionDialogOpen, setIsEditSelectionDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [isEditBillDialogOpen, setIsEditBillDialogOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState(null);
  const [isEditChequeDialogOpen, setIsEditChequeDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purRes, salesRes, cardRes, cheqRes] = await Promise.all([
        khataFetch('/api/khata/purchase'),
        khataFetch('/api/khata/daily-sales'),
        khataFetch('/api/khata/card-settlement'),
        khataFetch('/api/khata/cheque'),
      ]);
      const [purData, salesData, cardData, cheqData] = await Promise.all([
        purRes.json(),
        salesRes.json(),
        cardRes.json(),
        cheqRes.json(),
      ]);
      setPurchases(purData || []);
      setAllSales(salesData || []);
      setCardSettlements(cardData || []);
      setCheques(cheqData || []);
    } catch (err) {
      console.error('Error fetching Master Ledger data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await khataFetch('/api/khata/supplier');
      const data = await res.json();
      setSuppliers(data || []);
      if (data && data.length > 0 && !selectedStatementSupplier) {
        setSelectedStatementSupplier(data[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await khataFetch('/api/khata/bank-account');
      const data = await res.json();
      setBankAccounts(Array.isArray(data) ? data : data.accounts ?? []);
    } catch {
      setBankAccounts([]);
    }
  };

  const fetchLedger = async () => {
    if (!selectedStatementSupplier) return;
    try {
      const res = await khataFetch(
        `/api/supplier/ledger?supplierName=${encodeURIComponent(
          selectedStatementSupplier
        )}&startDate=${statementConfirmedStartDate}&endDate=${statementConfirmedEndDate}`
      );
      const data = await res.json();
      setLedgerPurchases(data.purchases || []);
      setStatementTotalPurchases(data.totalAmount || 0);
      setStatementOutstandingAmount(data.outstandingAmount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSuppliers();
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (selectedStatementSupplier) {
      fetchLedger();
    }
  }, [selectedStatementSupplier, statementConfirmedStartDate, statementConfirmedEndDate]);

  const isWithinRange = (dateInput) => {
    try {
      const dateStr = new Date(dateInput).toLocaleDateString('en-CA');
      return dateStr >= startDate && dateStr <= endDate;
    } catch { return false; }
  };

  // ── Purchase Ledger ──────────────────────────────────────────────
  const filteredPurchases = purchases.filter(p => isWithinRange(p.date));
  const uniqueSuppliers = Array.from(new Set(filteredPurchases.map(p => p.supplierName))).sort();
  const displayedPurchases = selectedSuppliers.length > 0
    ? filteredPurchases.filter(p => selectedSuppliers.includes(p.supplierName))
    : filteredPurchases;

  const totalCashPurchases = displayedPurchases.filter(p => p.paymentType === 'Cash').reduce((s, p) => s + p.invoiceAmount, 0);
  const totalCreditPurchases = displayedPurchases.filter(p => p.paymentType === 'Credit').reduce((s, p) => s + p.invoiceAmount, 0);

  // ── Consolidated Sales Ledger ────────────────────────────────────
  const filteredSales = allSales.filter(s => isWithinRange(s.date));
  const filteredCards = cardSettlements.filter(c => isWithinRange(c.date));
  // inward cheques cleared (Customer cheques = inward collection cheques cleared by the bank)
  const clearedInwardCheques = cheques.filter(c =>
    isWithinRange(c.chequeDate || c.date) &&
    c.status === 'Cleared' &&
    c.partyType === 'Customer' // customer collection cheques = inward
  );

  // Build date-wise sales map
  const salesByDate = useMemo(() => {
    const map = {};

    filteredSales.forEach(s => {
      const d = new Date(s.date).toLocaleDateString('en-CA');
      if (!map[d]) map[d] = { cashSales: 0, upiSales: 0, swipeSales: 0, cardSettled: 0, chequesCleared: 0 };
      map[d].cashSales += s.cashSales || 0;
      map[d].upiSales += s.upiSales || 0;
      map[d].swipeSales += s.swipeSales || 0;
    });

    filteredCards.forEach(c => {
      const d = new Date(c.date).toLocaleDateString('en-CA');
      if (!map[d]) map[d] = { cashSales: 0, upiSales: 0, swipeSales: 0, cardSettled: 0, chequesCleared: 0 };
      map[d].cardSettled += c.amount || 0;
    });

    clearedInwardCheques.forEach(c => {
      const d = new Date(c.chequeDate || c.date).toLocaleDateString('en-CA');
      if (!map[d]) map[d] = { cashSales: 0, upiSales: 0, swipeSales: 0, cardSettled: 0, chequesCleared: 0 };
      map[d].chequesCleared += c.amount || 0;
    });

    return map;
  }, [filteredSales, filteredCards, clearedInwardCheques]);

  const salesDates = Object.keys(salesByDate).sort().reverse();
  const grandTotalCash = salesDates.reduce((s, d) => s + salesByDate[d].cashSales, 0);
  const grandTotalUpi = salesDates.reduce((s, d) => s + salesByDate[d].upiSales, 0);
  const grandTotalSwipe = salesDates.reduce((s, d) => s + (salesByDate[d].swipeSales + salesByDate[d].cardSettled), 0);
  const grandTotalCheques = salesDates.reduce((s, d) => s + salesByDate[d].chequesCleared, 0);
  const grandTotalAll = grandTotalCash + grandTotalUpi + grandTotalSwipe + grandTotalCheques;

  // ── Credit Health Ledger ─────────────────────────────────────────
  // Open credit purchases (no cleared cheque yet)
  const openCreditPurchases = purchases.filter(p =>
    p.paymentType === 'Credit' &&
    (!p.cheque || p.cheque.status !== 'Cleared')
  );
  const totalCreditExposure = openCreditPurchases.reduce((s, p) => s + p.invoiceAmount, 0);

  // Pending (uncleared) outward supplier cheques (partyType = 'Supplier')
  const pendingOutwardCheques = cheques.filter(c =>
    c.status === 'Pending' &&
    (c.partyType === 'Supplier' || !c.partyType)
  );
  const totalPendingCheques = pendingOutwardCheques.reduce((s, c) => s + (c.amount || 0), 0);
  const totalCombinedExposure = totalCreditExposure + totalPendingCheques;

  // ── Secure Tally Export Handler ──────────────────────────────────
  const handleTallyExport = async () => {
    try {
      const res = await khataFetch(`/api/khata/export/tally?from=${startDate}&to=${endDate}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MediCLan_CA_Tally_Entries_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download Tally CA Excel file');
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

  const handleApplyFilters = () => {
    setStatementConfirmedStartDate(statementInputStartDate);
    setStatementConfirmedEndDate(statementInputEndDate);
  };

  const handleStatementTallyExport = async () => {
    try {
      const res = await khataFetch(`/api/khata/export/tally?from=${statementConfirmedStartDate}&to=${statementConfirmedEndDate}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MediCLan_CA_Tally_Entries_${statementConfirmedStartDate}_to_${statementConfirmedEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download Tally CA Excel file");
    }
  };

  const handleEditBillClick = (p) => {
    setEditingPurchase({
      id: p.id,
      date: new Date(p.date).toISOString().split('T')[0],
      supplierName: p.supplierName,
      invoiceNumber: p.invoiceNumber,
      invoiceAmount: p.invoiceAmount.toString(),
      paymentType: p.paymentType,
      paymentMode: p.cheque?.paymentMode || 'Cash',
      bankAccountId: p.cheque?.bankAccountId ? String(p.cheque.bankAccountId) : '',
      chequeNumber: p.cheque?.chequeNumber || '',
      chequeDate: p.cheque?.chequeDate ? new Date(p.cheque.chequeDate).toISOString().split('T')[0] : new Date(p.date).toISOString().split('T')[0],
      bankCharge: p.cheque?.bankCharge ? String(p.cheque.bankCharge) : ''
    });
    setIsEditBillDialogOpen(true);
  };

  const handleEditBillSubmit = async (e) => {
    e.preventDefault();
    if (!editingPurchase) return;
    try {
      const payload = {
        id: editingPurchase.id,
        date: editingPurchase.date,
        supplierName: editingPurchase.supplierName,
        invoiceNumber: editingPurchase.invoiceNumber,
        invoiceAmount: Number(editingPurchase.invoiceAmount),
        paymentType: editingPurchase.paymentType,
        paymentMode: editingPurchase.paymentMode,
        bankAccountId: editingPurchase.paymentMode !== 'Cash' && editingPurchase.bankAccountId ? Number(editingPurchase.bankAccountId) : null,
        chequeNumber: editingPurchase.paymentMode === 'Cheque' ? editingPurchase.chequeNumber : null,
        chequeDate: editingPurchase.paymentMode === 'Cheque' ? editingPurchase.chequeDate : null,
        bankCharge: editingPurchase.paymentMode !== 'Cash' && editingPurchase.bankCharge ? Number(editingPurchase.bankCharge) : null
      };
      const res = await khataFetch('/api/khata/purchase', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsEditBillDialogOpen(false);
        setEditingPurchase(null);
        await fetchLedger();
        await fetchData(); // Refresh MasterLedger stats
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to edit purchase bill');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBill = async (id) => {
    if (!confirm('Are you sure you want to delete this purchase bill? All associated payment details will also be deleted.')) {
      return;
    }
    try {
      const res = await khataFetch(`/api/khata/purchase?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setIsEditBillDialogOpen(false);
        setEditingPurchase(null);
        await fetchLedger();
        await fetchData(); // Refresh MasterLedger stats
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete purchase bill');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditChequeClick = (cheque) => {
    if (!cheque || cheque.id === undefined) {
      alert('Settlement data not available. Please refresh and try again.');
      return;
    }
    setEditingCheque({
      id: cheque.id,
      chequeNumber: cheque.chequeNumber ?? '',
      chequeDate: cheque.chequeDate ? new Date(cheque.chequeDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      bankName: cheque.bankName ?? '',
      amount: cheque.amount != null ? String(cheque.amount) : '0',
      paymentMode: cheque.paymentMode ?? 'Cheque',
      bankAccountId: cheque.bankAccountId ? String(cheque.bankAccountId) : ''
    });
    setIsEditChequeDialogOpen(true);
  };

  const handleEditChequeSubmit = async (e) => {
    e.preventDefault();
    if (!editingCheque) return;
    try {
      const res = await khataFetch('/api/khata/cheque', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCheque.id,
          chequeNumber: editingCheque.chequeNumber,
          chequeDate: editingCheque.chequeDate,
          bankName: editingCheque.bankName,
          amount: Number(editingCheque.amount),
          paymentMode: editingCheque.paymentMode,
          bankAccountId: editingCheque.paymentMode !== 'Cash' && editingCheque.bankAccountId ? Number(editingCheque.bankAccountId) : null
        })
      });
      if (res.ok) {
        setIsEditChequeDialogOpen(false);
        setEditingCheque(null);
        await fetchLedger();
        await fetchData(); // Refresh MasterLedger stats
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to edit cheque');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCheque = async (e, id) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this payment settlement?')) return;
    try {
      const res = await khataFetch(`/api/khata/cheque?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setIsEditChequeDialogOpen(false);
        setEditingCheque(null);
        await fetchLedger();
        await fetchData(); // Refresh MasterLedger stats
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete payment settlement');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Sub-tab sidebar items ────────────────────────────────────────
  const subTabs = [
    { value: 'purchases', label: 'Purchase Ledger', icon: <ShoppingBag className="w-4.5 h-4.5" />, badge: filteredPurchases.length, color: 'brand-teal' },
    { value: 'sales', label: 'Consolidated Sales', icon: <TrendingUp className="w-4.5 h-4.5" />, badge: salesDates.length, color: 'violet' },
    { value: 'credit-health', label: 'Credit Health', icon: <AlertTriangle className="w-4.5 h-4.5" />, badge: openCreditPurchases.length + pendingOutwardCheques.length, color: 'amber' },
    { value: 'bank-ledger', label: 'Bank Ledger', icon: <Building2 className="w-4.5 h-4.5" />, color: 'slate' },
    { value: 'statements', label: 'Payment History', icon: <FileText className="w-4.5 h-4.5" />, color: 'slate' },
    { value: 'settings', label: 'Settings & Banks', icon: <Settings className="w-4.5 h-4.5" />, color: 'slate' },
  ];

  const badgeCls = (active, color) => {
    if (active) return 'bg-white/20 text-white';
    const map = {
      'brand-teal': 'bg-brand-soft-teal text-brand-teal border border-brand-light-teal',
      'violet': 'bg-violet-50 text-violet-700 border border-violet-200',
      'amber': 'bg-amber-50 text-amber-700 border border-amber-200',
      'slate': 'bg-slate-100 text-slate-500 border border-slate-200',
    };
    return map[color] || map['slate'];
  };

  return (
    <div className="space-y-6">

      {/* Sleek Gradient Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy via-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700/50 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-16 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-2.5 bg-brand-teal/20 border border-brand-teal/30 rounded-xl">
            <Calendar className="w-5 h-5 text-brand-mint" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">MediCLan Consolidated Master Ledger</h2>
            <p className="text-xs text-slate-400 font-medium">Consolidated audit log summaries, credit payable estimates, and financial health</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 p-2 px-4 rounded-full">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-brand-mint uppercase tracking-wider px-1">From</span>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border-0 bg-transparent h-8 w-32 shadow-none focus-visible:ring-0 text-xs font-bold text-white cursor-pointer py-0 px-1"
              />
            </div>
            <ArrowRight className="w-4 h-4 text-white/50" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-brand-mint uppercase tracking-wider px-1">To</span>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border-0 bg-transparent h-8 w-32 shadow-none focus-visible:ring-0 text-xs font-bold text-white cursor-pointer py-0 px-1"
              />
            </div>
          </div>

          <button
            onClick={handleTallyExport}
            className="bg-white/15 hover:bg-white/25 text-white rounded-lg font-black text-xs px-5 h-9 gap-1.5 cursor-pointer flex items-center shadow-xs border-0 transition-all duration-155 active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5 text-brand-mint" />
            <span>Export to Excel (CA)</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {subTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveSubTab(tab.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                activeSubTab === tab.value
                  ? 'bg-brand-teal border-brand-teal text-white font-bold shadow-sm'
                  : 'bg-white border-slate-200/50 hover:bg-brand-soft-teal hover:text-brand-teal text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {tab.icon}
                <span className="text-sm font-semibold">{tab.label}</span>
              </div>
              {tab.badge !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badgeCls(activeSubTab === tab.value, tab.color)}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card className="border-brand-light-teal/30 shadow-xs bg-white rounded-xl overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-brand-light-teal/50 bg-slate-50/60">
              <CardTitle className="text-base font-bold text-brand-navy tracking-wide uppercase">
                {activeSubTab === 'purchases' && '📋 Purchase Ledger'}
                {activeSubTab === 'sales' && '📈 Consolidated Sales Ledger'}
                {activeSubTab === 'credit-health' && '⚠️ Credit Health Overview'}
                {activeSubTab === 'bank-ledger' && '🏦 Bank Account Ledger'}
                {activeSubTab === 'statements' && '🧾 Statements & Payment History'}
                {activeSubTab === 'settings' && '⚙️ Settings & Bank Account Manager'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-20 text-center text-sm font-medium text-slate-400">Loading ledger data...</div>
              ) : (
                <>

                  {/* ─── PURCHASE LEDGER ─────────────────────────────── */}
                  {activeSubTab === 'purchases' && (
                    <div className="animate-in fade-in duration-200">
                      {/* Summary stat band */}
                      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                        <div className="px-5 py-4 bg-emerald-50/60 flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Cash Purchases</div>
                            <div className="text-lg font-black text-emerald-700 font-mono">₹{totalCashPurchases.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                        <div className="px-5 py-4 bg-amber-50/60 flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Credit Purchases</div>
                            <div className="text-lg font-black text-amber-700 font-mono">₹{totalCreditPurchases.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                        <div className="px-5 py-4 bg-brand-soft-teal/40 flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-teal flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-brand-teal uppercase tracking-wider">Grand Total</div>
                            <div className="text-lg font-black text-brand-navy font-mono">₹{(totalCashPurchases + totalCreditPurchases).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      </div>

                      {/* Supplier filter toolbar */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/30">
                        <span className="text-xs font-semibold text-slate-500">{displayedPurchases.length} invoice{displayedPurchases.length !== 1 ? 's' : ''} shown</span>
                        <div className="relative">
                          <button
                            onClick={() => setIsSupplierFilterOpen(!isSupplierFilterOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-brand-teal bg-brand-soft-teal hover:bg-brand-soft-teal/80 border border-brand-light-teal rounded-full cursor-pointer transition-all duration-200"
                          >
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filter Suppliers ({selectedSuppliers.length ? `${selectedSuppliers.length} active` : 'All'})</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {isSupplierFilterOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-brand-navy uppercase">Filter Suppliers</span>
                                <button onClick={() => setIsSupplierFilterOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <Input
                                placeholder="Search suppliers..."
                                value={supplierFilter}
                                onChange={e => setSupplierFilter(e.target.value)}
                                className="h-8 rounded-lg px-3 text-xs bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-brand-teal"
                              />
                              <div className="flex gap-2 justify-between">
                                <button onClick={() => setSelectedSuppliers(uniqueSuppliers)} className="text-[10px] font-extrabold text-brand-teal hover:underline cursor-pointer bg-transparent border-0">Select All</button>
                                <button onClick={() => setSelectedSuppliers([])} className="text-[10px] font-extrabold text-slate-400 hover:underline cursor-pointer bg-transparent border-0">Clear All</button>
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {uniqueSuppliers.filter(s => (s || '').toLowerCase().includes(supplierFilter.toLowerCase())).map(sup => {
                                  const isChecked = selectedSuppliers.includes(sup);
                                  const count = filteredPurchases.filter(p => p.supplierName === sup).length;
                                  return (
                                    <label key={sup} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                      <input type="checkbox" checked={isChecked} onChange={() => {
                                        setSelectedSuppliers(isChecked ? selectedSuppliers.filter(x => x !== sup) : [...selectedSuppliers, sup]);
                                      }} className="accent-brand-teal rounded w-3.5 h-3.5 cursor-pointer" />
                                      <span className="text-xs font-semibold text-slate-700 truncate flex-1">{sup}</span>
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Purchase table */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-transparent">
                              <TableHead className="text-[11px] font-black text-slate-500 uppercase tracking-wider pl-5 py-3">Date</TableHead>
                              <TableHead className="text-[11px] font-black text-slate-500 uppercase tracking-wider py-3">Invoice No.</TableHead>
                              <TableHead className="text-[11px] font-black text-slate-500 uppercase tracking-wider py-3">Supplier</TableHead>
                              <TableHead className="text-[11px] font-black text-slate-500 uppercase tracking-wider py-3">Type</TableHead>
                              <TableHead className="text-[11px] font-black text-slate-500 uppercase tracking-wider py-3">Cheque Ref</TableHead>
                              <TableHead className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right pr-5 py-3">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayedPurchases.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-semibold">No purchases in selected date range.</TableCell>
                              </TableRow>
                            )}
                            {displayedPurchases.map((p, idx) => {
                              const isCash = p.paymentType === 'Cash';
                              return (
                                <TableRow key={p.id} className={`border-b transition-colors ${
                                  isCash
                                    ? (idx % 2 === 0 ? 'bg-emerald-50/80 border-emerald-100' : 'bg-emerald-50/40 border-emerald-100')
                                    : (idx % 2 === 0 ? 'bg-amber-50/80 border-amber-100' : 'bg-amber-50/40 border-amber-100')
                                }`}>
                                  <TableCell className="font-semibold text-slate-700 pl-5 py-3">{formatDate(p.date)}</TableCell>
                                  <TableCell className="font-mono font-bold text-slate-600 py-3 text-xs">#{p.invoiceNumber}</TableCell>
                                  <TableCell className="font-bold text-slate-800 py-3">🏢 {p.supplierName}</TableCell>
                                  <TableCell className="py-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                                      isCash
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                    }`}>{p.paymentType}</span>
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-400 font-mono py-3">
                                    {p.cheque ? `#${p.cheque.chequeNumber} (${p.cheque.status})` : '—'}
                                  </TableCell>
                                  <TableCell className={`text-right font-black font-mono py-3 pr-5 ${isCash ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    ₹{p.invoiceAmount.toLocaleString('en-IN')}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* ─── CONSOLIDATED SALES LEDGER ───────────────────── */}
                  {activeSubTab === 'sales' && (
                    <div className="animate-in fade-in duration-200">
                      {/* Summary band */}
                      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                        <div className="px-4 py-4 bg-emerald-50/60">
                          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Cash Collection</div>
                          <div className="text-base font-black text-emerald-700 font-mono mt-0.5">₹{grandTotalCash.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="px-4 py-4 bg-violet-50/60">
                          <div className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">UPI Collection</div>
                          <div className="text-base font-black text-violet-700 font-mono mt-0.5">₹{grandTotalUpi.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="px-4 py-4 bg-blue-50/60">
                          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Card / Swipe</div>
                          <div className="text-base font-black text-blue-700 font-mono mt-0.5">₹{grandTotalSwipe.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="px-4 py-4 bg-sky-50/60">
                          <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Cheques Cleared</div>
                          <div className="text-base font-black text-sky-700 font-mono mt-0.5">₹{grandTotalCheques.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      {/* Grand total strip */}
                      <div className="px-5 py-3 bg-brand-soft-teal/40 border-b border-brand-light-teal/30 flex items-center justify-between">
                        <span className="text-xs font-black text-brand-teal uppercase tracking-wider">Total Inward Collection ({salesDates.length} days)</span>
                        <span className="text-base font-black text-brand-navy font-mono">₹{grandTotalAll.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Date-wise table */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-transparent">
                              <TableHead className="text-[11px] font-black text-slate-500 uppercase tracking-wider pl-5 py-3">Date</TableHead>
                              <TableHead className="text-[11px] font-black text-emerald-600 uppercase tracking-wider text-right py-3">Cash</TableHead>
                              <TableHead className="text-[11px] font-black text-violet-600 uppercase tracking-wider text-right py-3">UPI</TableHead>
                              <TableHead className="text-[11px] font-black text-blue-600 uppercase tracking-wider text-right py-3">Card/Swipe</TableHead>
                              <TableHead className="text-[11px] font-black text-sky-600 uppercase tracking-wider text-right py-3">Cheques</TableHead>
                              <TableHead className="text-[11px] font-black text-brand-teal uppercase tracking-wider text-right pr-5 py-3">Day Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salesDates.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-semibold">No sales data in selected date range.</TableCell>
                              </TableRow>
                            )}
                            {salesDates.map((d, idx) => {
                              const row = salesByDate[d];
                              const dayTotal = row.cashSales + row.upiSales + row.swipeSales + row.cardSettled + row.chequesCleared;
                              return (
                                <TableRow key={d} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                  <TableCell className="font-bold text-slate-800 pl-5 py-3">{formatDate(d)}</TableCell>
                                  <TableCell className="text-right font-semibold text-emerald-700 py-3">
                                    {row.cashSales > 0 ? `₹${row.cashSales.toLocaleString('en-IN')}` : <span className="text-slate-350">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-violet-700 py-3">
                                    {row.upiSales > 0 ? `₹${row.upiSales.toLocaleString('en-IN')}` : <span className="text-slate-350">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-blue-700 py-3">
                                    {(row.swipeSales + row.cardSettled) > 0 ? `₹${(row.swipeSales + row.cardSettled).toLocaleString('en-IN')}` : <span className="text-slate-350">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-sky-700 py-3">
                                    {row.chequesCleared > 0 ? `₹${row.chequesCleared.toLocaleString('en-IN')}` : <span className="text-slate-350">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right font-black text-brand-navy font-mono py-3 pr-5">₹{dayTotal.toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* ─── CREDIT HEALTH LEDGER ────────────────────────── */}
                  {activeSubTab === 'credit-health' && (
                    <div className="animate-in fade-in duration-200 space-y-0">
                      {/* Overview stat cards */}
                      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                        <div className="px-5 py-4 bg-amber-50/70">
                          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Open Credit Invoices</div>
                          <div className="text-lg font-black text-amber-700 font-mono mt-0.5">₹{totalCreditExposure.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-amber-550 font-semibold mt-0.5">{openCreditPurchases.length} pending bill{openCreditPurchases.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="px-5 py-4 bg-rose-50/70">
                          <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Pending Cheques Issued</div>
                          <div className="text-lg font-black text-rose-700 font-mono mt-0.5">₹{totalPendingCheques.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-rose-550 font-semibold mt-0.5">{pendingOutwardCheques.length} uncleared cheque{pendingOutwardCheques.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="px-5 py-4 bg-red-50/70">
                          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Total Credit Exposure</div>
                          <div className="text-lg font-black text-red-700 font-mono mt-0.5">₹{totalCombinedExposure.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-red-550 font-semibold mt-0.5">Invoices + Uncleared Cheques</div>
                        </div>
                      </div>

                      {/* Section A: Open Credit Purchases */}
                      <div className="px-5 pt-5 pb-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest">Open Credit Invoices (Unpaid)</h3>
                          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">{openCreditPurchases.length}</span>
                        </div>
                        <div className="border border-amber-100 rounded-xl overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-amber-50/80 hover:bg-transparent border-b border-amber-100">
                                <TableHead className="text-[11px] font-black text-amber-600 uppercase tracking-wider pl-4 py-3">Date</TableHead>
                                <TableHead className="text-[11px] font-black text-amber-600 uppercase tracking-wider py-3">Invoice No.</TableHead>
                                <TableHead className="text-[11px] font-black text-amber-600 uppercase tracking-wider py-3">Supplier</TableHead>
                                <TableHead className="text-[11px] font-black text-amber-600 uppercase tracking-wider py-3">Cheque Status</TableHead>
                                <TableHead className="text-[11px] font-black text-amber-600 uppercase tracking-wider text-right pr-4 py-3">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {openCreditPurchases.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-emerald-600 font-bold text-sm">✅ No open credit invoices — all clear!</TableCell>
                                </TableRow>
                              )}
                              {openCreditPurchases.map((p, idx) => (
                                <TableRow key={p.id} className={idx % 2 === 0 ? 'bg-amber-50/40' : 'bg-white'}>
                                  <TableCell className="font-semibold text-slate-700 pl-4 py-3">{formatDate(p.date)}</TableCell>
                                  <TableCell className="font-mono font-bold text-slate-600 py-3 text-xs">#{p.invoiceNumber}</TableCell>
                                  <TableCell className="font-bold text-slate-800 py-3">🏢 {p.supplierName}</TableCell>
                                  <TableCell className="py-3">
                                    {p.cheque ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                                        PDC Pending ({p.cheque.status})
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                                        No Cheque — Open Due
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-black text-amber-700 font-mono py-3 pr-4">₹{p.invoiceAmount.toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Section B: Uncleared Issued Cheques */}
                      <div className="px-5 pt-4 pb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                          <h3 className="text-sm font-black text-rose-700 uppercase tracking-widest">Uncleared Issued Cheques</h3>
                          <span className="text-xs bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">{pendingOutwardCheques.length}</span>
                        </div>
                        <div className="border border-rose-100 rounded-xl overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-rose-50/80 hover:bg-transparent border-b border-rose-100">
                                <TableHead className="text-[11px] font-black text-rose-600 uppercase tracking-wider pl-4 py-3">Cheque Date</TableHead>
                                <TableHead className="text-[11px] font-black text-rose-600 uppercase tracking-wider py-3">Cheque No.</TableHead>
                                <TableHead className="text-[11px] font-black text-rose-600 uppercase tracking-wider py-3">Bank</TableHead>
                                <TableHead className="text-[11px] font-black text-rose-600 uppercase tracking-wider py-3">Supplier / Ref</TableHead>
                                <TableHead className="text-[11px] font-black text-rose-600 uppercase tracking-wider text-right pr-4 py-3">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingOutwardCheques.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-emerald-600 font-bold text-sm">✅ No pending cheques issued — all cleared!</TableCell>
                                </TableRow>
                              )}
                              {pendingOutwardCheques.map((c, idx) => (
                                <TableRow key={c.id} className={idx % 2 === 0 ? 'bg-rose-50/40' : 'bg-white'}>
                                  <TableCell className="font-semibold text-slate-700 pl-4 py-3">{formatDate(c.chequeDate || c.date)}</TableCell>
                                  <TableCell className="font-mono font-bold text-slate-600 py-3 text-xs">#{c.chequeNumber}</TableCell>
                                  <TableCell className="font-semibold text-slate-700 py-3 text-xs">{c.bankName || '—'}</TableCell>
                                  <TableCell className="font-bold text-slate-800 py-3 text-xs">{c.supplierName || c.narration || '—'}</TableCell>
                                  <TableCell className="text-right font-black text-rose-700 font-mono py-3 pr-4">₹{(c.amount || 0).toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── BANK LEDGER ─────────────────────────────────── */}
                  {activeSubTab === 'bank-ledger' && (
                    <div className="p-4">
                      <BankLedger />
                    </div>
                  )}

                  {/* ─── STATEMENTS / PAYMENT HISTORY ────────────────── */}
                  {activeSubTab === 'statements' && (
                    <div className="p-5 space-y-6 animate-in fade-in duration-200">
                      
                      {/* Statements Filters Card */}
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
                                value={selectedStatementSupplier}
                                onChange={(e) => setSelectedStatementSupplier(e.target.value)}
                                required
                              >
                                {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
                              <Input type="date" value={statementInputStartDate} onChange={(e) => setStatementInputStartDate(e.target.value)} className="rounded-full bg-white dark:bg-slate-950 font-semibold px-4" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</Label>
                              <Input type="date" value={statementInputEndDate} onChange={(e) => setStatementInputEndDate(e.target.value)} className="rounded-full bg-white dark:bg-slate-950 font-semibold px-4" />
                            </div>
                            <div>
                              <Button type="button" onClick={handleApplyFilters} className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-extrabold h-9 rounded-full border-0 shadow-xs transition-all duration-200 cursor-pointer">
                                Apply Date Range Filters
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Statements Table Card */}
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
                              onClick={handleStatementTallyExport}
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs px-4 h-9 gap-1.5 cursor-pointer flex items-center shadow-xs border-0"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Convert to Excel (CA)
                            </Button>
                            <div className="flex gap-6">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-455 block uppercase font-bold tracking-wider">Period Purchases</span>
                                <span className="text-xl font-extrabold text-brand-navy dark:text-slate-200 font-mono">₹{statementTotalPurchases.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="text-right border-l pl-6 border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] text-rose-500 block uppercase font-bold tracking-wider">Total Outstanding</span>
                                <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">₹{statementOutstandingAmount.toLocaleString("en-IN")}</span>
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
                                {getGroupedLedgerPurchases().map((g) => (
                                  <TableRow key={g.invoiceNumber || g.date} className="hover:bg-brand-soft-teal/50 dark:hover:bg-slate-850/50 transition-colors odd:bg-white even:bg-brand-soft-teal/20 dark:odd:bg-slate-950/40 dark:even:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/80">
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
                                        <Edit className="w-4 h-4" />
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
                                  </TableRow>
                                ))}
                                {ledgerPurchases.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs font-semibold">
                                      No purchases recorded for {selectedStatementSupplier} during this period.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                    </div>
                  )}

                  {/* ─── SETTINGS ────────────────────────────────────── */}
                  {activeSubTab === 'settings' && (
                    <div className="p-4">
                      <BankAccountManager />
                    </div>
                  )}

                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
        {/* Purchase Bill Edit Modal */}
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
      className="h-4 w-4 rounded border-slate-350 text-brand-teal focus:ring-brand-teal"
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

        {/* Cheque / Settlement Edit Modal */}
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

        {/* Unified Edit Selection Dialog */}
        <Dialog open={isEditSelectionDialogOpen} onOpenChange={setIsEditSelectionDialogOpen}>
          <DialogContent className="sm:max-w-7xl sm:w-[94vw] sm:h-[88vh] sm:max-h-[900px] w-full h-[95vh] flex flex-col bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 shadow-2xl rounded-xl p-6 md:p-10 transition-all duration-300 ease-out">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-5 shrink-0">
              <DialogTitle className="text-2xl font-black text-slate-855 dark:text-slate-100 flex items-center gap-3">
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
              <p className="text-sm text-slate-455 dark:text-slate-550 mt-2.5 font-medium leading-relaxed">
                Below are the dynamic components for this purchase invoice group. You can edit individual purchase bills or make edits to the associated settlement payments.
              </p>
            </DialogHeader>

            {selectedGroupForEdit && <div className="flex-1 overflow-y-auto pr-1 py-6 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-stretch h-full">
                  
                  {/* Purchase Details Column */}
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
                          <span className="font-mono font-black text-slate-855 dark:text-slate-100 text-sm">#{selectedGroupForEdit.invoiceNumber || "N/A"}</span>
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
                        <span className="text-xs font-black text-slate-455 dark:text-slate-400 uppercase tracking-widest block">Database Record Split Parts:</span>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin min-h-[300px] max-h-[580px]">
                          {selectedGroupForEdit.purchases.map((pur, idx) => <div
      key={pur.id}
      className={`flex items-center justify-between p-5 rounded-xl border shadow-xs transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${idx % 2 === 0 ? "bg-white dark:bg-slate-950 border-slate-150/70 dark:border-slate-800/80" : "bg-blue-50/20 dark:bg-blue-950/10 border-blue-100/50 dark:border-blue-900/30"}`}
    >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold font-mono text-slate-855 dark:text-slate-100 text-base">
                                    Part {idx + 1}: ₹{pur.invoiceAmount.toLocaleString("en-IN")}
                                  </span>
                                  {pur.chequeId ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-350 border border-emerald-200/50 dark:border-emerald-900/50">
                                      Linked
                                    </span> : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-350 border border-rose-200/50 dark:border-rose-900/50">
                                      Unsettled
                                    </span>}
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-550 block font-semibold uppercase tracking-wider">
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

                  {/* Settlement/Payment Details Column */}
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
                        <span className="text-xs font-black text-slate-455 dark:text-slate-400 uppercase tracking-widest block">Linked Settlements / Cheques:</span>
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
                                <div className="text-right text-[10px] text-slate-400 dark:text-slate-550 font-semibold">Record ID: #{chq.id}</div>
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
                              <p className="text-xs text-slate-400 dark:text-slate-550 font-extrabold italic">
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
      </div>
  );
}
