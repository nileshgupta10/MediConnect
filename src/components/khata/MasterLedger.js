import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDate, khataFetch } from '../../lib/khata-utils';
import {
  Calendar, ShoppingBag, TrendingUp, AlertTriangle, Building2, Settings,
  ArrowRight, FileText, Filter, ChevronDown, X
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

  useEffect(() => { fetchData(); }, []);

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

  // ── Sub-tab sidebar items ────────────────────────────────────────
  const subTabs = [
    { value: 'purchases', label: 'Purchase Ledger', icon: <ShoppingBag className="w-4.5 h-4.5" />, badge: filteredPurchases.length, color: 'brand-teal' },
    { value: 'sales', label: 'Consolidated Sales', icon: <TrendingUp className="w-4.5 h-4.5" />, badge: salesDates.length, color: 'violet' },
    { value: 'credit-health', label: 'Credit Health', icon: <AlertTriangle className="w-4.5 h-4.5" />, badge: openCreditPurchases.length + pendingOutwardCheques.length, color: 'amber' },
    { value: 'bank-ledger', label: 'Bank Ledger', icon: <Building2 className="w-4.5 h-4.5" />, color: 'slate' },
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
    </div>
  );
}
