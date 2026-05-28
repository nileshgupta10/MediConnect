import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatDate, khataFetch } from '../../lib/khata-utils';
import { 
  User, 
  Phone, 
  MapPin, 
  Search, 
  Plus, 
  Trash2, 
  X,
  FileText, 
  Send, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';

const INPUT_STYLE = "flex h-10 w-full rounded-full border border-brand-light-teal bg-white dark:bg-slate-900/50 dark:border-slate-800 px-4 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal disabled:cursor-not-allowed disabled:opacity-50 font-semibold text-brand-navy dark:text-slate-200";

export function CustomerCreditManager() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialogs
  const [isAddCustOpen, setIsAddCustOpen] = useState(false);
  const [isEditCustOpen, setIsEditCustOpen] = useState(false);
  const [isLogSaleOpen, setIsLogSaleOpen] = useState(false);
  const [isLogPayOpen, setIsLogPayOpen] = useState(false);

  // Forms
  const [custForm, setCustForm] = useState({ name: '', phone: '', address: '' });
  const [editCustForm, setEditCustForm] = useState({ id: 0, name: '', phone: '', address: '' });
  const [saleForm, setSaleForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', narration: '', invoiceNumber: '' });
  const [payForm, setPayForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    amount: '', 
    narration: '',
    mode: 'Cash',
    chequeNumber: '',
    chequeDate: new Date().toISOString().split('T')[0],
    bankAccountId: '',
  });

  const [bankAccounts, setBankAccounts] = useState([]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await khataFetch('/api/khata/customer');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data || []);
        if (data && data.length > 0 && selectedCustomerId === null) {
          setSelectedCustomerId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await khataFetch('/api/khata/bank-account');
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data || []);
        if (data && data.length > 0) {
          setPayForm(prev => ({ ...prev, bankAccountId: String(data[0].id) }));
        }
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    }
  };

  const fetchTransactions = async (cId) => {
    setIsLedgerLoading(true);
    try {
      const res = await khataFetch(`/api/khata/customer-transaction?customerId=${cId}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data || []);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (selectedCustomerId !== null) {
      fetchTransactions(selectedCustomerId);
    } else {
      setTransactions([]);
    }
  }, [selectedCustomerId]);

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  // Action Submissions
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!custForm.name || !custForm.phone) {
      alert('Name and phone number are required');
      return;
    }
    try {
      const res = await khataFetch('/api/khata/customer', {
        method: 'POST',
        body: JSON.stringify(custForm),
      });
      if (res.ok) {
        const created = await res.json();
        setCustForm({ name: '', phone: '', address: '' });
        setIsAddCustOpen(false);
        // Select newly created customer
        setSelectedCustomerId(created.id);
        fetchCustomers();
      } else {
        alert('Failed to register customer.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!editCustForm.name || !editCustForm.phone) {
      alert('Name and phone are required');
      return;
    }
    try {
      const res = await khataFetch('/api/khata/customer', {
        method: 'PUT',
        body: JSON.stringify(editCustForm),
      });
      if (res.ok) {
        setIsEditCustOpen(false);
        fetchCustomers();
      } else {
        alert('Failed to update customer details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (cId) => {
    if (!confirm('Are you sure you want to permanently delete this customer? All their transactions and outstanding balance history will be cleared.')) return;
    try {
      const res = await khataFetch(`/api/khata/customer?id=${cId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedCustomerId === cId) {
          setSelectedCustomerId(null);
        }
        fetchCustomers();
      } else {
        alert('Failed to delete customer.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogSaleSubmit = async (e) => {
    e.preventDefault();
    if (!saleForm.amount || isNaN(Number(saleForm.amount))) {
      alert('Please enter a valid sale amount');
      return;
    }
    try {
      const res = await khataFetch('/api/khata/customer-transaction', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          type: 'Sale',
          date: saleForm.date,
          amount: Number(saleForm.amount),
          narration: saleForm.narration,
          invoiceNumber: saleForm.invoiceNumber,
        }),
      });
      if (res.ok) {
        setSaleForm({ date: new Date().toISOString().split('T')[0], amount: '', narration: '', invoiceNumber: '' });
        setIsLogSaleOpen(false);
        if (selectedCustomerId) fetchTransactions(selectedCustomerId);
        fetchCustomers();
      } else {
        alert('Failed to record credit sale.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogPaySubmit = async (e) => {
    e.preventDefault();
    if (!payForm.amount || isNaN(Number(payForm.amount))) {
      alert('Please enter a valid payment amount');
      return;
    }
    if (payForm.mode === 'Cheque') {
      if (!payForm.chequeNumber.trim()) {
        alert('Please enter the cheque number');
        return;
      }
      if (!payForm.chequeDate) {
        alert('Please enter the cheque date');
        return;
      }
      if (!payForm.bankAccountId) {
        alert('Please select a bank account to deposit the cheque');
        return;
      }
    }
    try {
      const res = await khataFetch('/api/khata/customer-transaction', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          type: 'Payment',
          date: payForm.date,
          amount: Number(payForm.amount),
          narration: payForm.narration,
          mode: payForm.mode,
          chequeNumber: payForm.chequeNumber,
          chequeDate: payForm.chequeDate,
          bankAccountId: payForm.bankAccountId,
        }),
      });

      if (res.ok) {
        setPayForm({ 
          date: new Date().toISOString().split('T')[0], 
          amount: '', 
          narration: '', 
          mode: 'Cash', 
          chequeNumber: '', 
          chequeDate: new Date().toISOString().split('T')[0], 
          bankAccountId: bankAccounts.length > 0 ? String(bankAccounts[0].id) : '' 
        });
        setIsLogPayOpen(false);
        if (selectedCustomerId) fetchTransactions(selectedCustomerId);
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record payment received.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      const res = await khataFetch(`/api/khata/customer-transaction?id=${txId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedCustomerId) fetchTransactions(selectedCustomerId);
        fetchCustomers();
      } else {
        alert('Failed to delete transaction.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp Sender (100% Free wa.me redirection)
  const handleWhatsAppDispatch = () => {
    if (!activeCustomer) return;
    
    // Add default country code '91' if the number is exactly 10 digits
    let cleanPhone = activeCustomer.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    // Sort chronologically for WhatsApp dispatch readability
    const chronologicalFiltered = [...filteredTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const ledgerLines = chronologicalFiltered.map((t) => {
      const isSale = t.type === 'Sale';
      const dStr = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (isSale) {
        return `• ${dStr} | Credit Sale: ₹${t.amount.toLocaleString('en-IN')}${t.invoiceNumber ? ` (Inv: #${t.invoiceNumber})` : ''}${t.narration ? ` - ${t.narration}` : ''}`;
      } else {
        return `• ${dStr} | Payment Recd: ₹${t.amount.toLocaleString('en-IN')}${t.narration ? ` - ${t.narration}` : ''}`;
      }
    });

    const header = `*CUSTOMER CREDIT STATEMENT*\n*-------------------------*\nCustomer: *${activeCustomer.name}* (${activeCustomer.customerId})\nPhone: ${activeCustomer.phone}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\n*TRANSACTION HISTORY:*\n`;
    const ledgerJoined = ledgerLines.length > 0 ? ledgerLines.join('\n') : '• No transaction history logged yet.';
    const footer = `\n\n*TOTAL OUTSTANDING CREDIT BALANCE: ₹${(activeCustomer.outstandingBalance || 0).toLocaleString('en-IN')}*\n*-------------------------*\nPlease clear the outstanding dues. Thank you for your business!`;

    const fullMessage = header + ledgerJoined + footer;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;
    window.open(waUrl, 'WhatsAppTab');
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  // Compute running balances chronologically (oldest to newest)
  let currentSum = 0;
  const computedTransactions = transactions.map(t => {
    currentSum += t.type === 'Sale' ? t.amount : -t.amount;
    return {
      ...t,
      runningBalance: currentSum,
    };
  });

  // Filter transactions by date range
  const filteredTransactions = computedTransactions.filter(t => {
    const txDate = new Date(t.date).toLocaleDateString('en-CA');
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  // Sort transactions descending (latest at top) for display
  const displayTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalOutstandingCredit = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
  const activeDebtorsCount = customers.filter(c => c.outstandingBalance > 0).length;

  return (
    <div className="space-y-6">
      
      {/* Sleek Gradient Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy via-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-16 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-2.5 bg-brand-teal/20 border border-brand-teal/30 rounded-xl">
            <User className="w-5 h-5 text-brand-mint" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Customer Credit &amp; Trust Manager</h2>
            <p className="text-xs text-slate-400 font-medium">Track debtor balances, record payments received, and manage accounts</p>
          </div>
        </div>
      </div>

      {/* ── Summary stat strip ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Total Outstanding Dues */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-amber-100 uppercase tracking-widest mb-1">⏳ Total Customer Dues</div>
            <div className="text-2xl font-black text-white font-mono">₹{totalOutstandingCredit.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-amber-200 font-semibold mt-1">Pending unpaid credit payments</div>
          </div>
        </div>

        {/* Active Debtors Count */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-slate-700 rounded-2xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/20 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">👤 Active Debtors</div>
            <div className="text-2xl font-black text-white font-mono">{activeDebtorsCount} Accounts</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">Customers with outstanding dues</div>
          </div>
        </div>

        {/* Registered Customers */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">👥 Registered Registry</div>
            <div className="text-2xl font-black text-white font-mono">{customers.length} Customers</div>
            <div className="text-[10px] text-emerald-250 font-semibold mt-1">Total credit accounts registered</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      
        {/* LEFT COLUMN: Customer Directory */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="rounded-3xl border border-brand-light-teal/30 bg-white shadow-sm overflow-hidden flex flex-col h-[700px]">
            
            <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/40 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-brand-navy tracking-wide uppercase flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-brand-teal" />
                  Credit Customers
                </CardTitle>
                <Button
                  onClick={() => setIsAddCustOpen(true)}
                  className="h-8 rounded-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold text-xs gap-1 cursor-pointer border-0 shadow-xs px-3.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Customer
                </Button>
              </div>
              
              {/* Search customer */}
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name, ID, or phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="rounded-full pl-9 pr-4 h-9 bg-white font-semibold border-brand-light-teal text-xs"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-semibold gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-teal" />
                  Loading customer registry...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <User className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Customers Found</p>
                  <p className="text-[10px] mt-1 font-semibold">Try another search or register a new customer.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCustomers.map(c => {
                    const isSelected = c.id === selectedCustomerId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`p-4 transition-all duration-150 flex items-center justify-between cursor-pointer border-l-4 ${
                          isSelected 
                            ? 'bg-brand-soft-teal border-brand-teal' 
                            : 'border-transparent hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="space-y-1 max-w-[75%]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-brand-navy truncate">
                              {c.name}
                            </span>
                            <span className="text-[9px] bg-brand-soft-teal text-brand-teal font-mono font-bold px-1.5 py-0.2 rounded border border-brand-light-teal/50">
                              {c.customerId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
                            c.outstandingBalance > 0 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            ₹{c.outstandingBalance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Outstanding Ledger and Transactions */}
        <div className="lg:col-span-2 space-y-4">
          {activeCustomer ? (
            <Card className="rounded-3xl border border-brand-light-teal/30 bg-white shadow-sm overflow-hidden flex flex-col h-[700px]">
              
              {/* Customer Header Details Card */}
              <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/40 space-y-3.5 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Contact Card */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-black text-brand-navy">{activeCustomer.name}</h2>
                      <span className="text-[10px] bg-brand-teal text-white font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                        {activeCustomer.customerId}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeCustomer.phone}</span>
                      </div>
                      {activeCustomer.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]">{activeCustomer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => {
                        setEditCustForm({
                          id: activeCustomer.id,
                          name: activeCustomer.name,
                          phone: activeCustomer.phone,
                          address: activeCustomer.address || ''
                        });
                        setIsEditCustOpen(true);
                      }}
                      variant="outline"
                      className="h-8.5 rounded-full text-xs font-bold border-brand-light-teal hover:bg-brand-soft-teal/50 hover:text-brand-teal text-slate-650 cursor-pointer"
                    >
                      Edit Details
                    </Button>
                    <Button
                      onClick={() => handleDeleteCustomer(activeCustomer.id)}
                      variant="ghost"
                      className="h-8.5 w-8.5 p-0 rounded-full hover:bg-rose-50 hover:text-rose-600 text-slate-400 cursor-pointer"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                </div>

                {/* Balances & Add Transactions Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-white p-3 rounded-2xl border border-brand-light-teal/50 shadow-2xs">
                  
                  {/* Outstanding Box */}
                  <div className="md:col-span-1 border-r-0 md:border-r border-slate-100 pr-0 md:pr-4 flex items-center justify-between md:justify-start gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-extrabold tracking-wider leading-none mb-1">Dues Outstanding</span>
                      <span className={`text-xl font-black font-mono leading-none ${
                        activeCustomer.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-650'
                      }`}>
                        ₹{activeCustomer.outstandingBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Operations Buttons */}
                  <div className="md:col-span-2 flex flex-wrap items-center gap-2 justify-end">
                    
                    <Button
                      onClick={handleWhatsAppDispatch}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs h-8.5 gap-1.5 cursor-pointer border-0 shadow-xs px-4"
                    >
                      <Send className="w-3.5 h-3.5" />
                      WhatsApp Ledger
                    </Button>
                    
                    <Button
                      onClick={() => setIsLogSaleOpen(true)}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold text-xs h-8.5 gap-1.5 cursor-pointer border-0 shadow-xs px-4"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      + Credit Sale
                    </Button>

                    <Button
                      onClick={() => setIsLogPayOpen(true)}
                      className="bg-brand-teal hover:bg-brand-teal/90 text-white rounded-full font-bold text-xs h-8.5 gap-1.5 cursor-pointer border-0 shadow-xs px-4"
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      + Log Payment
                    </Button>

                  </div>

                </div>

                {/* Date Filters Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white/45 p-2.5 px-4 rounded-xl border border-brand-light-teal/20 mt-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-brand-navy uppercase tracking-wider">📅 Filter Ledger By Date:</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">From:</span>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-7 text-[10px] font-extrabold rounded-full w-28 px-2.5 border-slate-200 focus-visible:ring-brand-teal bg-white shadow-2xs text-brand-navy"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">To:</span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-7 text-[10px] font-extrabold rounded-full w-28 px-2.5 border-slate-200 focus-visible:ring-brand-teal bg-white shadow-2xs text-brand-navy"
                      />
                    </div>
                    {(startDate || endDate) && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="h-7 rounded-full px-3 text-[9px] font-extrabold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Chronological Ledger list */}
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                {isLedgerLoading ? (
                  <div className="flex items-center justify-center flex-1 text-slate-500 text-xs font-semibold gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-teal" />
                    Loading customer credit statement...
                  </div>
                ) : displayTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-16 text-center px-4">
                    <FileText className="w-12 h-12 mb-3 opacity-20 mx-auto" />
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">No Transactions Found</p>
                    <p className="text-xs mt-1 font-semibold text-slate-450">
                      {startDate || endDate ? 'Adjust or clear your date filters to view history.' : 'Start by registering a credit sale or payment received.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-150">
                        <TableRow>
                          <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 w-28">Date</TableHead>
                          <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 w-24">Type</TableHead>
                          <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 w-24">Invoice No.</TableHead>
                          <TableHead className="text-brand-navy font-bold text-xs py-3 px-4">Details / Narration</TableHead>
                          <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 text-right w-24">Debit (₹)</TableHead>
                          <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 text-right w-24">Credit (₹)</TableHead>
                          <TableHead className="text-brand-navy font-bold text-xs py-3 px-4 text-right w-28">Running (₹)</TableHead>
                          <TableHead className="w-12 text-center bg-slate-50"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayTransactions.map((t, idx) => {
                          const isSale = t.type === 'Sale';
                          
                          return (
                            <TableRow 
                              key={t.id}
                              className={
                                idx % 2 === 0
                                  ? 'bg-white hover:bg-slate-50/50'
                                  : 'bg-brand-soft-teal/20 hover:bg-brand-soft-teal/30'
                              }
                            >
                              <TableCell className="text-xs text-slate-700 px-4 py-3 whitespace-nowrap">
                                {formatDate(t.date)}
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                                  isSale 
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {isSale ? 'Sale' : 'Payment'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-slate-700 font-mono px-4 py-3">
                                {t.invoiceNumber || '—'}
                              </TableCell>
                              <TableCell className="text-xs text-slate-650 px-4 py-3 max-w-[200px] truncate" title={t.narration}>
                                {t.narration || '—'}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right font-semibold font-mono text-xs">
                                {isSale ? (
                                  <span className="text-rose-600 font-bold">₹{t.amount.toLocaleString('en-IN')}</span>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right font-semibold font-mono text-xs">
                                {!isSale ? (
                                  <span className="text-emerald-650 font-bold">₹{t.amount.toLocaleString('en-IN')}</span>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right font-black font-mono text-xs text-brand-teal">
                                ₹{t.runningBalance.toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell className="text-center py-2 px-1">
                                <Button
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  variant="ghost"
                                  className="h-7 w-7 rounded-full text-slate-350 hover:text-rose-600 hover:bg-rose-50 cursor-pointer p-0"
                                  title="Delete Transaction"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>

            </Card>
          ) : (
            <Card className="rounded-3xl border border-brand-light-teal/30 bg-white shadow-sm overflow-hidden flex items-center justify-center h-[700px]">
              <div className="text-center text-slate-400 space-y-2">
                <User className="w-12 h-12 mx-auto opacity-20" />
                <p className="text-sm font-bold uppercase tracking-wider">Select a Customer</p>
                <p className="text-xs font-medium">Select a customer from the directory to review their statement ledger.</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* --- REGISTER CUSTOMER MODAL --- */}
      <Dialog open={isAddCustOpen} onOpenChange={setIsAddCustOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-150 p-5 bg-white shadow-lg">
          <DialogHeader><DialogTitle className="text-brand-navy font-bold text-lg">Register Credit Customer</DialogTitle></DialogHeader>
          <form onSubmit={handleAddCustomerSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Customer Full Name</Label>
              <Input 
                value={custForm.name} 
                onChange={e => setCustForm({ ...custForm, name: e.target.value })} 
                placeholder="e.g. Ramesh Kumar" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">WhatsApp / Phone Number</Label>
              <Input 
                value={custForm.phone} 
                onChange={e => setCustForm({ ...custForm, phone: e.target.value })} 
                placeholder="e.g. 9876543210" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Billing Address (Optional)</Label>
              <Input 
                value={custForm.address} 
                onChange={e => setCustForm({ ...custForm, address: e.target.value })} 
                placeholder="e.g. Flat 302, Green Avenue, Mumbai" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
              />
            </div>
            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-11 mt-2 rounded-full shadow-sm cursor-pointer border-0">
              Register Customer & ID
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT CUSTOMER MODAL --- */}
      <Dialog open={isEditCustOpen} onOpenChange={setIsEditCustOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-150 p-5 bg-white shadow-lg">
          <DialogHeader><DialogTitle className="text-brand-navy font-bold text-lg">Edit Customer Registry</DialogTitle></DialogHeader>
          <form onSubmit={handleEditCustomerSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Customer Full Name</Label>
              <Input 
                value={editCustForm.name} 
                onChange={e => setEditCustForm({ ...editCustForm, name: e.target.value })} 
                placeholder="Name" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">WhatsApp / Phone Number</Label>
              <Input 
                value={editCustForm.phone} 
                onChange={e => setEditCustForm({ ...editCustForm, phone: e.target.value })} 
                placeholder="Phone" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Billing Address</Label>
              <Input 
                value={editCustForm.address} 
                onChange={e => setEditCustForm({ ...editCustForm, address: e.target.value })} 
                placeholder="Address" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
              />
            </div>
            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-11 mt-2 rounded-full shadow-sm cursor-pointer border-0">
              Save Customer Details
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- LOG CREDIT SALE MODAL --- */}
      <Dialog open={isLogSaleOpen} onOpenChange={setIsLogSaleOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-150 p-5 bg-white shadow-lg">
          <DialogHeader><DialogTitle className="text-brand-navy font-bold text-lg flex items-center gap-2 text-rose-600"><TrendingUp className="w-5 h-5" /> Record Credit Purchase (Sale)</DialogTitle></DialogHeader>
          <form onSubmit={handleLogSaleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Transaction Date</Label>
              <Input 
                type="date"
                value={saleForm.date} 
                onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Sale Amount (₹)</Label>
              <Input 
                type="number"
                value={saleForm.amount} 
                onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })} 
                placeholder="0.00" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs font-mono"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Invoice Number (Optional)</Label>
              <Input 
                value={saleForm.invoiceNumber} 
                onChange={e => setSaleForm({ ...saleForm, invoiceNumber: e.target.value })} 
                placeholder="e.g. INV-1002" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Sale Details / Narration</Label>
              <Input 
                value={saleForm.narration} 
                onChange={e => setSaleForm({ ...saleForm, narration: e.target.value })} 
                placeholder="e.g. 5x Tablets, 10x Injections" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
              />
            </div>
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 mt-2 rounded-full shadow-sm cursor-pointer border-0">
              Record Credit Sale (Debit)
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- LOG PAYMENT MODAL --- */}
      <Dialog open={isLogPayOpen} onOpenChange={setIsLogPayOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-150 p-5 bg-white shadow-lg">
          <DialogHeader><DialogTitle className="text-brand-navy font-bold text-lg flex items-center gap-2 text-emerald-650"><TrendingDown className="w-5 h-5" /> Record Payment Received</DialogTitle></DialogHeader>
          <form onSubmit={handleLogPaySubmit} className="space-y-4 pt-2">
            
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Receipt Date</Label>
              <Input 
                type="date"
                value={payForm.date} 
                onChange={e => setPayForm({ ...payForm, date: e.target.value })} 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Payment Mode</Label>
              <select
                className={INPUT_STYLE}
                value={payForm.mode}
                onChange={e => setPayForm({ ...payForm, mode: e.target.value })}
                required
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {payForm.mode === 'Cheque' && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Cheque Reference / Number</Label>
                  <Input 
                    value={payForm.chequeNumber} 
                    onChange={e => setPayForm({ ...payForm, chequeNumber: e.target.value })} 
                    placeholder="e.g. CHQ-55694" 
                    className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs font-mono"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Cheque Date (Clearing Date)</Label>
                  <Input 
                    type="date"
                    value={payForm.chequeDate} 
                    onChange={e => setPayForm({ ...payForm, chequeDate: e.target.value })} 
                    className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Deposit Bank Account</Label>
                  <select 
                    className={INPUT_STYLE}
                    value={payForm.bankAccountId} 
                    onChange={e => setPayForm({ ...payForm, bankAccountId: e.target.value })}
                    required
                  >
                    <option value="">-- Select Bank Account --</option>
                    {bankAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} {a.accountNo ? `(A/c: ${a.accountNo})` : ''}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Payment Amount (₹)</Label>
              <Input 
                type="number"
                value={payForm.amount} 
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })} 
                placeholder="0.00" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs font-mono"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Payment Narration / Reference</Label>
              <Input 
                value={payForm.narration} 
                onChange={e => setPayForm({ ...payForm, narration: e.target.value })} 
                placeholder="e.g. GPay, cash drawer collection, part collection" 
                className="rounded-full h-10 border-brand-light-teal px-4 font-semibold text-brand-navy focus-visible:ring-brand-teal shadow-xs"
              />
            </div>

            <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-11 mt-2 rounded-full shadow-sm cursor-pointer border-0">
              Record Payment Receipt (Credit)
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
