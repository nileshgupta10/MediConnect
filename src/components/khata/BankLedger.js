import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDate, khataFetch } from '../../lib/khata-utils';
import { Download, FileText, RefreshCw } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function toYMD(date) {
  return date.toISOString().split('T')[0];
}

function getDefaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toYMD(d);
}

function getDefaultEndDate() {
  return toYMD(new Date());
}

function formatAmount(value) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function getTypeBadgeClass(type) {
  switch (type) {
    case 'Cash Deposit':
      return 'bg-green-100 text-green-700 border border-green-200';
    case 'RD Deposit':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'RD Redemption':
      return 'bg-teal-100 text-teal-700 border border-teal-200';
    case 'Cheque Payment':
    case 'NEFT Payment':
    case 'IMPS Payment':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'Bank Charge':
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    case 'Card Settlement':
      return 'bg-purple-100 text-purple-700 border border-purple-200';
    case 'UPI Sales':
      return 'bg-cyan-100 text-cyan-700 border border-cyan-200';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BankLedger() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Pending filter values (applied only on button click) ──────────────────
  const [pendingAccountId, setPendingAccountId] = useState('');
  const [pendingStart, setPendingStart] = useState(getDefaultStartDate());
  const [pendingEnd, setPendingEnd] = useState(getDefaultEndDate());

  // ── Fetch accounts on mount ───────────────────────────────────────────────
  async function fetchAccounts() {
    try {
      const res = await khataFetch('/api/khata/bank-account');
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : data.accounts ?? []);
    } catch (err) {
      console.error('fetchAccounts error:', err);
    }
  }

  // ── Fetch ledger data ─────────────────────────────────────────────────────
  async function fetchLedger() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: startDate, to: endDate });
      if (selectedAccountId) params.set('accountId', selectedAccountId);
      const res = await khataFetch(`/api/khata/bank-ledger?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch ledger');
      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error('fetchLedger error:', err);
      setLedgerData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [startDate, endDate, selectedAccountId]);

  // ── Apply filters ─────────────────────────────────────────────────────────
  function handleApplyFilters() {
    setSelectedAccountId(pendingAccountId);
    setStartDate(pendingStart);
    setEndDate(pendingEnd);
  }

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExcelDownload = async () => {
    try {
      const params = new URLSearchParams({ from: startDate, to: endDate, type: 'bank-ledger' });
      if (selectedAccountId) params.set('accountId', selectedAccountId);
      const res = await khataFetch(`/api/khata/export/excel?${params.toString()}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MediCLan_Ledger_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download Excel file');
    }
  };

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

  // ── Derived values ────────────────────────────────────────────────────────
  const rows = ledgerData?.rows ?? [];
  const totalCredit = ledgerData?.totalCredit ?? 0;
  const totalDebit = ledgerData?.totalDebit ?? 0;
  const netBalance = ledgerData?.netBalance ?? 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-brand-light-teal/30 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Bank Account Selector */}
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <Label className="text-xs font-semibold text-slate-600">Bank Account</Label>
            <select
              value={pendingAccountId}
              onChange={(e) => setPendingAccountId(e.target.value)}
              className="rounded-lg px-3 h-9 border border-slate-200 font-semibold text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name ?? acc.accountNo ?? acc.id}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-slate-600">Start Date</Label>
            <Input
              type="date"
              value={pendingStart}
              onChange={(e) => setPendingStart(e.target.value)}
              className="rounded-lg px-3 h-9 border-slate-200 font-semibold text-sm w-[160px]"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-slate-600">End Date</Label>
            <Input
              type="date"
              value={pendingEnd}
              onChange={(e) => setPendingEnd(e.target.value)}
              className="rounded-lg px-3 h-9 border-slate-200 font-semibold text-sm w-[160px]"
            />
          </div>

          {/* Apply Button */}
          <Button
            onClick={handleApplyFilters}
            className="h-9 px-6 rounded-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold text-sm gap-2 self-end"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Apply Filters
          </Button>
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Credits */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Credits</p>
          <p className="text-2xl font-extrabold text-emerald-600">₹{formatAmount(totalCredit)}</p>
          <div className="mt-2 h-1 w-10 rounded-full bg-emerald-400 opacity-60" />
        </div>

        {/* Total Debits */}
        <div className="bg-white rounded-xl border border-rose-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Debits</p>
          <p className="text-2xl font-extrabold text-rose-600">₹{formatAmount(totalDebit)}</p>
          <div className="mt-2 h-1 w-10 rounded-full bg-rose-400 opacity-60" />
        </div>

        {/* Net Balance */}
        <div className="bg-white rounded-xl border border-teal-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Net Balance</p>
          <p
            className={`text-2xl font-extrabold ${
              netBalance >= 0 ? 'text-brand-teal' : 'text-rose-600'
            }`}
          >
            ₹{formatAmount(netBalance)}
          </p>
          <div
            className={`mt-2 h-1 w-10 rounded-full opacity-60 ${
              netBalance >= 0 ? 'bg-teal-400' : 'bg-rose-400'
            }`}
          />
        </div>

        {/* Transactions Count */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Transactions</p>
          <p className="text-2xl font-extrabold text-slate-700">{rows.length}</p>
          <div className="mt-2 h-1 w-10 rounded-full bg-slate-400 opacity-60" />
        </div>
      </div>

      {/* ── Main Ledger Table Card ───────────────────────────────────────── */}
      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100 bg-slate-50/40">
          <CardTitle className="text-brand-navy font-extrabold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal" />
            Bank Account Ledger
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExcelDownload}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs px-4 h-9 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Excel
            </Button>
            <Button
              onClick={handleTallyExport}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs px-4 h-9 gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Convert to Excel (CA)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm font-semibold">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin animate-infinite" />
              Loading ledger...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-semibold">No transactions found for the selected filters.</p>
              <p className="text-xs mt-1">Try adjusting the date range or account selection.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 font-bold border-b border-slate-150">
                  <TableRow>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4">Date</TableHead>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4">Type</TableHead>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4">Narration</TableHead>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4">Reference</TableHead>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 text-right">Debit (₹)</TableHead>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 text-right">Credit (₹)</TableHead>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 text-right">Balance (₹)</TableHead>
                    <TableHead className="text-brand-navy font-bold text-xs py-3 px-4">Bank Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow
                      key={row.id ?? idx}
                      className={
                        idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-brand-soft-teal/20 hover:bg-brand-soft-teal/30'
                      }
                    >
                      <TableCell className="text-xs text-slate-700 px-4 py-3 whitespace-nowrap">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${getTypeBadgeClass(
                            row.type
                          )}`}
                        >
                          {row.type ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 px-4 py-3 max-w-[200px] truncate">
                        {row.narration ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 px-4 py-3 font-mono">
                        {row.reference ?? '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {row.debit > 0 ? (
                          <span className="text-rose-600 font-bold text-xs">
                            {formatAmount(row.debit)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {row.credit > 0 ? (
                          <span className="text-emerald-600 font-bold text-xs">
                            {formatAmount(row.credit)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <span className="text-brand-teal font-bold text-xs">
                          {formatAmount(row.balance ?? 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 px-4 py-3 whitespace-nowrap">
                        {row.bankAccount ?? row.accountName ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ── Sticky Totals Footer ───────────────────────────────── */}
              <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Debits:
                  </span>
                  <span className="text-sm font-extrabold text-rose-600">
                    ₹{formatAmount(totalDebit)}
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Credits:
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    ₹{formatAmount(totalCredit)}
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Net Balance:
                  </span>
                  <span
                    className={`text-sm font-extrabold ${
                      netBalance >= 0 ? 'text-brand-teal' : 'text-rose-600'
                    }`}
                  >
                    ₹{formatAmount(netBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
