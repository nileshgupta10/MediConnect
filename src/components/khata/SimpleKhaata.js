import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { formatDate, khataFetch } from "../../lib/khata-utils";
import { Save, Calendar, ArrowRightLeft, TrendingUp } from "lucide-react";

export function SimpleKhaata() {
  const todayLocal = new Date().toLocaleDateString("en-CA");
  
  // Today's entry form state
  const [entryDate, setEntryDate] = useState(todayLocal);
  const [cashPurchase, setCashPurchase] = useState("0");
  const [creditPurchase, setCreditPurchase] = useState("0");
  const [cashSales, setCashSales] = useState("0");
  const [upiSales, setUpiSales] = useState("0");
  const [cardSales, setCardSales] = useState("0");

  // Date range filter state (default to last 30 days)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString("en-CA");
  });
  const [toDate, setToDate] = useState(todayLocal);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await khataFetch(`/api/khata/simple-ledger?from=${fromDate}&to=${toDate}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data || []);
      } else {
        console.error("Failed to fetch entries");
      }
    } catch (err) {
      console.error("Error fetching entries:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount or when filters change
  useEffect(() => {
    fetchEntries();
  }, [fromDate, toDate]);

  // Sync inputs with existing entry when entryDate or entries change
  useEffect(() => {
    const matched = entries.find(e => {
      try {
        return new Date(e.date).toLocaleDateString("en-CA") === entryDate;
      } catch {
        return false;
      }
    });

    if (matched) {
      setCashPurchase(String(matched.cashPurchase));
      setCreditPurchase(String(matched.creditPurchase));
      setCashSales(String(matched.cashSales));
      setUpiSales(String(matched.upiSales));
      setCardSales(String(matched.cardSales));
    } else {
      setCashPurchase("0");
      setCreditPurchase("0");
      setCashSales("0");
      setUpiSales("0");
      setCardSales("0");
    }
  }, [entryDate, entries]);

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await khataFetch("/api/khata/simple-ledger", {
        method: "POST",
        body: JSON.stringify({
          date: entryDate,
          cashPurchase: Number(cashPurchase) || 0,
          creditPurchase: Number(creditPurchase) || 0,
          cashSales: Number(cashSales) || 0,
          upiSales: Number(upiSales) || 0,
          cardSales: Number(cardSales) || 0,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Entry saved successfully!" });
        await fetchEntries();
      } else {
        const errData = await res.json();
        setMessage({ type: "error", text: errData.error || "Failed to save entry" });
      }
    } catch (err) {
      console.error("Error saving entry:", err);
      setMessage({ type: "error", text: "Network error. Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalCashPurchase = entries.reduce((sum, e) => sum + (e.cashPurchase || 0), 0);
  const totalCreditPurchase = entries.reduce((sum, e) => sum + (e.creditPurchase || 0), 0);
  const totalCashSales = entries.reduce((sum, e) => sum + (e.cashSales || 0), 0);
  const totalUpiSales = entries.reduce((sum, e) => sum + (e.upiSales || 0), 0);
  const totalCardSales = entries.reduce((sum, e) => sum + (e.cardSales || 0), 0);
  const netCashFlow = (totalCashSales + totalUpiSales + totalCardSales) - totalCashPurchase;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 min-h-screen text-slate-850 dark:text-slate-100">
      
      {/* Premium Header */}
      <div className="flex flex-col gap-1.5 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <h1 className="text-2xl font-black tracking-tight text-[#0f3460] dark:text-white leading-none">
          Simple Khaata Ledger
        </h1>
        <p className="text-xs text-[#0e9090] font-extrabold uppercase tracking-wider">
          Simplified Daily Ledger Entry &amp; Flow Analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Entry Panel (Left side / Column 1) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xs bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60 px-5 py-4">
              <CardTitle className="text-sm font-bold text-[#0f3460] dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0e9090]" />
                Daily Entry Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Entry Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="entryDate" className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Entry Date
                  </Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                <hr className="border-slate-100 dark:border-slate-800 my-2" />

                {/* Purchases Section Header */}
                <h4 className="text-[10px] font-black text-[#0e9090] uppercase tracking-widest mt-2 mb-1">
                  Outflows (Purchases)
                </h4>

                {/* Cash Purchase */}
                <div className="space-y-1.5">
                  <Label htmlFor="cashPurchase" className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    Cash Purchase (₹)
                  </Label>
                  <Input
                    id="cashPurchase"
                    type="number"
                    min="0"
                    step="any"
                    value={cashPurchase}
                    onChange={(e) => setCashPurchase(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                {/* Credit Purchase */}
                <div className="space-y-1.5">
                  <Label htmlFor="creditPurchase" className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    Credit Purchase (₹)
                  </Label>
                  <Input
                    id="creditPurchase"
                    type="number"
                    min="0"
                    step="any"
                    value={creditPurchase}
                    onChange={(e) => setCreditPurchase(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                <hr className="border-slate-100 dark:border-slate-800 my-2" />

                {/* Sales Section Header */}
                <h4 className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mt-2 mb-1">
                  Inflows (Sales)
                </h4>

                {/* Cash Sales */}
                <div className="space-y-1.5">
                  <Label htmlFor="cashSales" className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    Cash Sales (₹)
                  </Label>
                  <Input
                    id="cashSales"
                    type="number"
                    min="0"
                    step="any"
                    value={cashSales}
                    onChange={(e) => setCashSales(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                {/* UPI Sales */}
                <div className="space-y-1.5">
                  <Label htmlFor="upiSales" className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    UPI Sales (₹)
                  </Label>
                  <Input
                    id="upiSales"
                    type="number"
                    min="0"
                    step="any"
                    value={upiSales}
                    onChange={(e) => setUpiSales(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                {/* Card Sales */}
                <div className="space-y-1.5">
                  <Label htmlFor="cardSales" className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    Card Sales (₹)
                  </Label>
                  <Input
                    id="cardSales"
                    type="number"
                    min="0"
                    step="any"
                    value={cardSales}
                    onChange={(e) => setCardSales(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                {message && (
                  <div className={`p-3 rounded-lg text-xs font-bold ${
                    message.type === "success" 
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40" 
                      : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/40"
                  }`}>
                    {message.text}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#0e9090] hover:bg-[#0c7c7c] text-white font-bold h-9 mt-4 shadow-sm flex items-center justify-center gap-2 cursor-pointer border-0 rounded-lg outline-none"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Entry"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History & Table Panel (Right side / Column 2) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xs bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-sm font-bold text-[#0f3460] dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#0e9090]" />
                Transaction History Ledger
              </CardTitle>
              
              {/* Date Filters */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 font-semibold text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 font-semibold text-xs outline-none"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-150 dark:border-slate-800">
                    <TableRow>
                      <TableHead className="font-extrabold text-slate-500 text-xs px-5 py-3">Date</TableHead>
                      <TableHead className="font-extrabold text-[#0e9090] text-xs px-5 py-3 text-right">Cash Purchase</TableHead>
                      <TableHead className="font-extrabold text-slate-600 dark:text-slate-350 text-xs px-5 py-3 text-right">Credit Purchase</TableHead>
                      <TableHead className="font-extrabold text-purple-700 dark:text-purple-400 text-xs px-5 py-3 text-right">Cash Sales</TableHead>
                      <TableHead className="font-extrabold text-purple-700 dark:text-purple-400 text-xs px-5 py-3 text-right">UPI Sales</TableHead>
                      <TableHead className="font-extrabold text-purple-700 dark:text-purple-400 text-xs px-5 py-3 text-right">Card Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 font-semibold text-xs">
                          Loading entries...
                        </TableCell>
                      </TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 font-semibold text-xs">
                          No simple ledger entries found for this range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((e) => (
                        <TableRow key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <TableCell className="font-bold text-xs px-5 py-3 text-slate-600 dark:text-slate-400">
                            {formatDate(e.date)}
                          </TableCell>
                          <TableCell className="font-bold text-xs px-5 py-3 text-right text-[#0e9090]">
                            ₹{e.cashPurchase?.toLocaleString("en-IN") || 0}
                          </TableCell>
                          <TableCell className="font-bold text-xs px-5 py-3 text-right text-slate-500">
                            ₹{e.creditPurchase?.toLocaleString("en-IN") || 0}
                          </TableCell>
                          <TableCell className="font-bold text-xs px-5 py-3 text-right text-purple-700 dark:text-purple-400">
                            ₹{e.cashSales?.toLocaleString("en-IN") || 0}
                          </TableCell>
                          <TableCell className="font-bold text-xs px-5 py-3 text-right text-purple-700 dark:text-purple-400">
                            ₹{e.upiSales?.toLocaleString("en-IN") || 0}
                          </TableCell>
                          <TableCell className="font-bold text-xs px-5 py-3 text-right text-purple-700 dark:text-purple-400">
                            ₹{e.cardSales?.toLocaleString("en-IN") || 0}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Flow Summary Card */}
          <Card className="border-2 border-[#0e9090]/20 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            <CardHeader className="bg-teal-500/5 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-black text-[#0f3460] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0e9090]" />
                Ledger Flow Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                
                {/* Cash Purchases */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cash Purchase</p>
                  <p className="text-sm font-extrabold text-[#0e9090]">
                    ₹{totalCashPurchase.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Credit Purchases */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Credit Purchase</p>
                  <p className="text-sm font-extrabold text-slate-500">
                    ₹{totalCreditPurchase.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Cash Sales */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cash Sales</p>
                  <p className="text-sm font-extrabold text-purple-700 dark:text-purple-400">
                    ₹{totalCashSales.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* UPI Sales */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">UPI Sales</p>
                  <p className="text-sm font-extrabold text-purple-700 dark:text-purple-400">
                    ₹{totalUpiSales.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Card Sales */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Card Sales</p>
                  <p className="text-sm font-extrabold text-purple-700 dark:text-purple-400">
                    ₹{totalCardSales.toLocaleString("en-IN")}
                  </p>
                </div>

              </div>

              {/* Net Cash Flow Calculation Row */}
              <div className="bg-[#0e9090]/5 dark:bg-[#0e9090]/10 p-4 rounded-xl border border-[#0e9090]/20 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-450 uppercase tracking-wider font-extrabold block">
                    Net Cash Flow
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">
                    Formula: (Cash Sales + UPI Sales + Card Sales) - Cash Purchase
                  </span>
                </div>
                <span className={`text-xl font-black font-mono ${
                  netCashFlow >= 0 ? "text-[#0e9090]" : "text-rose-600 dark:text-rose-450"
                }`}>
                  {netCashFlow >= 0 ? "+" : ""}₹{netCashFlow.toLocaleString("en-IN")}
                </span>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
