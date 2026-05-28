import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  Move 
} from 'lucide-react';
import { khataFetch } from '../../lib/khata-utils';

const INPUT_STYLE = "flex h-10 w-full rounded-full border border-brand-light-teal bg-white dark:bg-slate-900/50 dark:border-slate-800 px-4 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal disabled:cursor-not-allowed disabled:opacity-50 font-semibold text-brand-navy dark:text-slate-200";

const isPDC = (c) => {
  if (!c) return false;
  const bank = (c.bankName || '').toLowerCase();
  const chqNum = (c.chequeNumber || '').toLowerCase();
  if (bank.includes('cash') || chqNum.includes('cash')) return false;
  const upiKeywords = ['upi', 'gpay', 'g-pay', 'google pay', 'googlepay', 'phonepe', 'phone pe', 'paytm', 'pay tm', 'netbanking', 'imps', 'neft', 'rtgs', 'transfer', 'online'];
  if (upiKeywords.some(kw => bank.includes(kw) || chqNum.includes(kw))) return false;
  return true;
};

export function PDCChequeLedger() {
  const todayLocal = new Date().toLocaleDateString('en-CA');
  
  // Date configuration
  const [startDate, setStartDate] = useState(todayLocal);
  const [numDays, setNumDays] = useState(7); // View range (default 7 days)
  
  // Password protection
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Data lists
  const [cheques, setCheques] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Additional data lists for credit/debit horizontal split
  const [expenses, setExpenses] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [cardSettlements, setCardSettlements] = useState([]);
  const [bankDeposits, setBankDeposits] = useState([]);
  
  // Dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [targetAddDate, setTargetAddDate] = useState(todayLocal);
  
  // Form states
  const [customChequeForm, setCustomChequeForm] = useState({
    supplierName: '',
    chequeNumber: '',
    bankName: '',
    amount: '',
  });

  // Customer Credit Integration States
  const [customers, setCustomers] = useState([]);
  const [isCustomerChqDialogOpen, setIsCustomerChqDialogOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerChqForm, setCustomerChqForm] = useState({
    customerId: '', // empty means typed custom name
    amount: '',
    bankAccountId: '',
    chequeNumber: '', // Optional ref
    chequeDate: todayLocal,
  });

  // Drag over states (key = dateStr, value = boolean)
  const [dragOverColumn, setDragOverColumn] = useState({});

  const fetchBankAccounts = async () => {
    try {
      const res = await khataFetch('/api/khata/bank-account');
      const data = await res.json();
      setBankAccounts(data || []);
      const defaultAccount = data?.find((a) => a.isDefault);
      if (defaultAccount) {
        setSelectedBankAccountId(String(defaultAccount.id));
        setCustomChequeForm(prev => ({ ...prev, bankName: defaultAccount.name }));
      } else if (data && data.length > 0) {
        setSelectedBankAccountId(String(data[0].id));
        setCustomChequeForm(prev => ({ ...prev, bankName: data[0].name }));
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    }
  };

  const fetchCheques = async () => {
    setIsLoading(true);
    try {
      const res = await khataFetch('/api/khata/cheque');
      const data = await res.json();
      setCheques(data || []);
    } catch (err) {
      console.error('Error fetching cheques:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await khataFetch('/api/khata/supplier');
      const data = await res.json();
      setSuppliers(data || []);
      if (data && data.length > 0) {
        setCustomChequeForm(prev => ({ ...prev, supplierName: data[0].name }));
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await khataFetch('/api/khata/customer');
      const data = await res.json();
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const [projectionAccounts, setProjectionAccounts] = useState([]);

  const fetchProjections = async () => {
    if (!startDate || numDays <= 0) return;
    try {
      const dEnd = new Date(startDate);
      dEnd.setDate(dEnd.getDate() + numDays - 1);
      const toDateStr = dEnd.toLocaleDateString('en-CA');
      const res = await khataFetch(`/api/khata/pdc-projection?from=${startDate}&to=${toDateStr}`);
      if (res.ok) {
        const data = await res.json();
        setProjectionAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching projections:', err);
    }
  };

  const fetchAdditionalData = async () => {
    try {
      const [expRes, salesRes, cardRes, depRes] = await Promise.all([
        khataFetch('/api/khata/expense'),
        khataFetch('/api/khata/daily-sales'),
        khataFetch('/api/khata/card-settlement'),
        khataFetch('/api/khata/bank-deposit')
      ]);
      const expData = await expRes.json();
      const salesData = await salesRes.json();
      const cardData = await cardRes.json();
      const depData = await depRes.json();
      setExpenses(expData || []);
      setDailySales(salesData || []);
      setCardSettlements(cardData || []);
      setBankDeposits(depData || []);
    } catch (err) {
      console.error('Error fetching additional data for PDC:', err);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === '1234') {
      setIsUnlocked(true);
      setPasswordInput('');
    } else {
      alert('Incorrect password!');
    }
  };

  useEffect(() => {
    fetchCheques();
    fetchSuppliers();
    fetchCustomers();
    fetchBankAccounts();
    fetchAdditionalData();
  }, []);

  useEffect(() => {
    fetchProjections();
  }, [startDate, numDays, cheques]);

  // PDC Cheque calculations for summary stat strip
  const inwardPending = cheques.filter(c => c.partyType === 'Customer' && c.status === 'Pending');
  const totalInwardPending = inwardPending.reduce((sum, c) => sum + c.amount, 0);

  const outwardPending = cheques.filter(c => c.partyType === 'Supplier' && c.status === 'Pending');
  const totalOutwardPending = outwardPending.reduce((sum, c) => sum + c.amount, 0);

  const totalClearedCheques = cheques.filter(c => c.status === 'Cleared').reduce((sum, c) => sum + c.amount, 0);

  // Compute column array starting at startDate
  const columns = Array.from({ length: numDays }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const formattedHeader = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const isSunday = d.getDay() === 0;
    const isToday = dateStr === todayLocal;
    return { dateStr, dayName, formattedHeader, isSunday, isToday };
  });

  // Shift start dates
  const handleShiftDate = (days) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setStartDate(d.toLocaleDateString('en-CA'));
  };

  const handleJumpToToday = () => {
    setStartDate(todayLocal);
  };

  // Reschedule cheque date on Drop
  const handleMoveCheque = async (chequeId, newDateStr) => {
    const cheque = cheques.find(c => c.id === Number(chequeId));
    if (!cheque) return;

    try {
      const res = await khataFetch('/api/khata/cheque', {
        method: 'PUT',
        body: JSON.stringify({
          id: cheque.id,
          action: 'edit',
          chequeNumber: cheque.chequeNumber,
          bankName: cheque.bankName,
          amount: cheque.amount,
          chequeDate: newDateStr, // Target column date
        }),
      });

      if (res.ok) {
        fetchCheques();
      } else {
        alert('Failed to reschedule cheque.');
      }
    } catch (err) {
      console.error('Error moving cheque:', err);
    }
  };

  // Clear single cheque
  const handleClearCheque = async (id) => {
    try {
      const res = await khataFetch('/api/khata/cheque', {
        method: 'PUT',
        body: JSON.stringify({ id, action: 'clear' }),
      });
      if (res.ok) {
        fetchCheques();
      } else {
        alert('Failed to clear cheque.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Return single cheque
  const handleReturnCheque = async (id) => {
    if (!confirm('Mark this cheque as returned? This will unlink it from its bills.')) return;
    try {
      const res = await khataFetch('/api/khata/cheque', {
        method: 'PUT',
        body: JSON.stringify({ id, action: 'return' }),
      });
      if (res.ok) {
        fetchCheques();
      } else {
        alert('Failed to return cheque.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete single cheque
  const handleDeleteCheque = async (id) => {
    if (!confirm('Are you sure you want to completely delete this cheque? Linked payments will be reverted.')) return;
    try {
      const res = await khataFetch(`/api/khata/cheque?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCheques();
      } else {
        alert('Failed to delete cheque.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear all pending cheques in a column (Bulk confirm)
  const handleClearAllInColumn = async (dateStr, colCheques) => {
    const pending = colCheques.filter(c => c.status === 'Pending');
    if (pending.length === 0) return;
    
    if (!confirm(`Clear all ${pending.length} pending cheques for this date?`)) return;

    setIsLoading(true);
    try {
      await Promise.all(
        pending.map(c => 
          khataFetch('/api/khata/cheque', {
            method: 'PUT',
            body: JSON.stringify({ id: c.id, action: 'clear' }),
          })
        )
      );
      fetchCheques();
    } catch (err) {
      console.error('Error in bulk clearing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open dialogue to add custom cheque to specific date
  const triggerAddCustomCheque = (dateStr) => {
    setTargetAddDate(dateStr);
    setIsAddDialogOpen(true);
  };

  // Submit custom cheque
  const handleAddCustomChequeSubmit = async (e) => {
    e.preventDefault();
    if (!customChequeForm.supplierName || !customChequeForm.chequeNumber || !customChequeForm.bankName || !customChequeForm.amount) {
      alert('Please fill all fields');
      return;
    }

    try {
      const res = await khataFetch('/api/khata/cheque', {
        method: 'POST',
        body: JSON.stringify({
          supplierName: customChequeForm.supplierName,
          chequeNumber: customChequeForm.chequeNumber,
          bankName: customChequeForm.bankName,
          amount: Number(customChequeForm.amount),
          chequeDate: targetAddDate,
          purchaseIds: [], // Custom cheque not linked to existing unpaid credit purchase records
          status: 'Pending',
          bankAccountId: selectedBankAccountId ? Number(selectedBankAccountId) : null
        }),
      });

      if (res.ok) {
        setIsAddDialogOpen(false);
        setCustomChequeForm(prev => ({ ...prev, chequeNumber: '', amount: '' }));
        fetchCheques();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to register custom cheque');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open dialogue to add customer cheque
  const triggerAddCustomerCheque = (dateStr) => {
    setCustomerSearchQuery('');
    setShowCustomerSuggestions(false);
    const activeBank = bankAccounts.find(a => String(a.id) === selectedBankAccountId) || bankAccounts[0];
    setCustomerChqForm({
      customerId: '',
      amount: '',
      bankAccountId: activeBank ? String(activeBank.id) : '',
      chequeNumber: '',
      chequeDate: dateStr,
    });
    setIsCustomerChqDialogOpen(true);
  };

  // Submit customer cheque
  const handleAddCustomerChequeSubmit = async (e) => {
    e.preventDefault();
    if (!customerSearchQuery.trim() || !customerChqForm.amount || !customerChqForm.bankAccountId || !customerChqForm.chequeDate) {
      alert('Please fill all required fields');
      return;
    }

    const typedName = customerSearchQuery.trim();
    const finalAmount = Number(customerChqForm.amount);
    const bankAccountId = Number(customerChqForm.bankAccountId);
    const chequeNumber = customerChqForm.chequeNumber.trim() || `CHQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const bankAcc = bankAccounts.find(a => a.id === bankAccountId);
    const bankName = bankAcc ? bankAcc.name : 'Unknown Bank';

    setIsLoading(true);
    try {
      if (customerChqForm.customerId) {
        // A registered customer was selected -> Tally in their ledger!
        const res = await khataFetch('/api/khata/customer-transaction', {
          method: 'POST',
          body: JSON.stringify({
            customerId: Number(customerChqForm.customerId),
            type: 'Payment',
            date: customerChqForm.chequeDate,
            amount: finalAmount,
            narration: `Cheque Payment Recd - Ref: ${customerChqForm.chequeNumber.trim() || 'N/A'}`,
            mode: 'Cheque',
            chequeNumber,
            chequeDate: customerChqForm.chequeDate,
            bankAccountId,
          }),
        });

        if (res.ok) {
          setIsCustomerChqDialogOpen(false);
          setCustomerSearchQuery('');
          fetchCheques();
          fetchAdditionalData();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to register customer transaction cheque');
        }
      } else {
        // Simple unregistered customer cheque -> Create cheque directly!
        const res = await khataFetch('/api/khata/cheque', {
          method: 'POST',
          body: JSON.stringify({
            supplierName: typedName,
            chequeNumber,
            chequeDate: customerChqForm.chequeDate,
            bankName,
            amount: finalAmount,
            purchaseIds: [],
            status: 'Pending',
            bankAccountId,
            partyType: 'Customer',
          }),
        });

        if (res.ok) {
          setIsCustomerChqDialogOpen(false);
          setCustomerSearchQuery('');
          fetchCheques();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to register customer cheque');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper checker to match dates
  const isDateMatch = (chequeDate, colDateStr) => {
    try {
      return new Date(chequeDate).toLocaleDateString('en-CA') === colDateStr;
    } catch { return false; }
  };

  const renderChequeCard = (c) => {
    const isPending = c.status === 'Pending';
    const isCleared = c.status === 'Cleared';
    const isReturned = c.status === 'Returned';
    const isCustomer = c.partyType === 'Customer';
    
    return (
      <div 
        key={c.id} 
        draggable={isPending}
        onDragStart={(e) => {
          e.dataTransfer.setData("chequeId", c.id.toString());
        }}
        className={`group relative p-2 rounded-lg border shadow-xs bg-white cursor-pointer flex flex-col justify-between transition-all duration-205 select-none ${
          isCustomer
            ? isPending
              ? 'bg-indigo-50/10 border-indigo-500/20 hover:border-indigo-500/40'
              : isCleared
                ? 'bg-sky-50/10 border-sky-500/20 hover:border-sky-500/40'
                : 'bg-rose-50/10 border-rose-500/10 hover:border-rose-500/25'
            : isPending 
              ? 'bg-amber-50/10 border-amber-500/10 hover:border-amber-500/30'
              : isCleared 
                ? 'bg-emerald-50/10 border-emerald-500/15 hover:border-emerald-500/30'
                : 'bg-rose-50/10 border-rose-500/10'
        }`}
      >
        {isPending && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-slate-400">
            <Move className="w-3.5 h-3.5" />
          </div>
        )}

        <div className="flex items-center gap-1 h-[18px]">
          <span className={`h-1.5 w-1.5 rounded-full ${
            isPending 
              ? isCustomer ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500 animate-pulse' 
              : isCleared 
                ? isCustomer ? 'bg-sky-500' : 'bg-emerald-500' 
                : 'bg-rose-500'
          }`} />
          <span className="text-[10px] font-black font-mono text-slate-800">
            ₹{c.amount.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 pt-1 border-t border-dashed mt-1 border-slate-200/40">
          <p className="text-[9.5px] font-extrabold text-brand-navy truncate leading-tight">
            {isCustomer ? '👤' : '🏢'} {c.supplierName}
          </p>
          <span className="text-[8.5px] text-slate-500 truncate font-semibold">
            🏦 {c.bankName}
          </span>
          <span className="text-[8px] text-slate-450 font-mono">
            Ref: #{c.chequeNumber}
          </span>
          
          {isPending && (
            <div className="flex gap-1 mt-1 justify-end">
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={(e) => { e.stopPropagation(); handleClearCheque(c.id); }}
                className="h-4.5 w-4.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                title="Confirm Clear"
              >
                <Check className="w-2.5 h-2.5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={(e) => { e.stopPropagation(); handleReturnCheque(c.id); }}
                className="h-4.5 w-4.5 rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                title="Mark Returned"
              >
                <X className="w-2.5 h-2.5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={(e) => { e.stopPropagation(); handleDeleteCheque(c.id); }}
                className="h-4.5 w-4.5 rounded bg-slate-500/10 text-slate-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                title="Delete Cheque"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-200/20">
              <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                isCleared 
                  ? 'bg-emerald-100/50 text-emerald-800'
                  : 'bg-rose-100/50 text-rose-800'
              }`}>
                {c.status}
              </span>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={(e) => { e.stopPropagation(); handleDeleteCheque(c.id); }}
                className="h-4 w-4 rounded text-slate-350 hover:text-rose-600 cursor-pointer"
                title="Delete Record"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isUnlocked) {
    return (
      <Card className="border-slate-200/80 bg-white/70 shadow-md rounded-2xl overflow-hidden max-w-sm mx-auto my-12">
        <CardHeader className="py-4 px-5 border-b border-slate-100 bg-gradient-to-r from-brand-navy to-slate-800 text-center">
          <CardTitle className="text-sm font-black text-white tracking-wide uppercase flex items-center justify-center gap-2">
            🔒 PDC Cheque Flow Lock
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="py-4 text-center space-y-4">
            <div className="mx-auto flex justify-center mb-2 h-14 w-20 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <span className="text-3xl flex items-center justify-center">💼</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-brand-navy">Access Password Required</h3>
              <p className="text-xs text-slate-400 font-semibold">Enter passcode (1234) to view and manage PDC cheque flow</p>
            </div>
            <form onSubmit={handleUnlock} className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  value={passwordInput} 
                  onChange={e => setPasswordInput(e.target.value)} 
                  placeholder="Enter passcode..." 
                  className={`${INPUT_STYLE} rounded-full`} 
                  required
                />
                <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-9 rounded-full px-6 shadow-xs border-0 cursor-pointer">
                  Unlock
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      
      {/* Top Controller Panel - Premium Dark Gradient Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy via-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-16 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-2.5 bg-brand-teal/20 border border-brand-teal/30 rounded-xl">
            <Calendar className="w-5 h-5 text-brand-mint" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2.5">
              Cheque Flow Planner
              <span className="text-[8px] bg-brand-teal text-white font-extrabold px-2.5 py-0.5 rounded-full tracking-wider uppercase animate-pulse">
                Drag-and-Drop Active
              </span>
            </h2>
            <p className="text-xs text-slate-450 font-medium">
              Reschedule by dragging. Hover to expand details. High density layout.
            </p>
          </div>
        </div>

        {/* Date Window Settings & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm border border-white/20 p-1 rounded-full">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleShiftDate(-7)} 
              className="h-7 w-7 rounded-full hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="border-0 bg-transparent h-7 shadow-none focus-visible:ring-0 text-[11px] font-black tracking-tight text-white cursor-pointer w-28 py-0 px-1 text-center"
            />
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleShiftDate(7)} 
              className="h-7 w-7 rounded-full hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleJumpToToday}
            className="h-9 text-xs font-black bg-white/10 hover:bg-white/20 border-0 text-white cursor-pointer rounded-full px-4"
          >
            Today
          </Button>

          {/* Bank Account Selector filter */}
          <div className="flex items-center">
            <select
              value={selectedBankAccountId}
              onChange={e => setSelectedBankAccountId(e.target.value)}
              className="flex h-9 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-1 text-xs font-black text-white focus:outline-none cursor-pointer [&>option]:text-slate-800"
            >
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Column range filter */}
          <div className="flex items-center">
            <select
              value={numDays}
              onChange={e => setNumDays(Number(e.target.value))}
              className="flex h-9 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-1 text-xs font-black text-white focus:outline-none cursor-pointer [&>option]:text-slate-800"
            >
              <option value={5}>5 Days</option>
              <option value={7}>7 Days (Weekly)</option>
              <option value={10}>10 Days</option>
              <option value={14}>14 Days (Bi-weekly)</option>
            </select>
          </div>

          <Button 
            onClick={fetchCheques} 
            disabled={isLoading}
            variant="ghost"
            size="icon" 
            className="h-9 w-9 bg-white/10 hover:bg-white/20 border border-white/20 text-white cursor-pointer rounded-full"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

      </div>

      {/* ── Summary stat strip ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Total Inward Pending Cheques */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">📥 Inward Pending Cheques</div>
            <div className="text-2xl font-black text-white font-mono">₹{totalInwardPending.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-emerald-250 font-semibold mt-1">{inwardPending.length} cheque{inwardPending.length !== 1 ? 's' : ''} from customers</div>
          </div>
        </div>

        {/* Total Outward Pending Cheques */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-amber-100 uppercase tracking-widest mb-1">📤 Outward Issued Cheques</div>
            <div className="text-2xl font-black text-white font-mono">₹{totalOutwardPending.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-amber-200 font-semibold mt-1">{outwardPending.length} cheque{outwardPending.length !== 1 ? 's' : ''} to suppliers</div>
          </div>
        </div>

        {/* Total Cleared Cheques */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-slate-700 rounded-2xl p-6 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/20 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">✅ Total Cleared Cheques</div>
            <div className="text-2xl font-black text-white font-mono">₹{totalClearedCheques.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">Cleared cheque ledger history</div>
          </div>
        </div>
      </div>

      {/* Grid Sheet Board */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100/60 shadow-sm bg-slate-50/20">
        
        {/* Main Grid Wrapper */}
        <div 
          className="grid gap-2 p-2 min-w-[1050px]"
          style={{ gridTemplateColumns: `repeat(${numDays}, minmax(140px, 1fr))` }}
        >
          
          {columns.map(col => {
            const isOver = dragOverColumn[col.dateStr] || false;

            // 1. Identify selected bank account details
            const activeBank = bankAccounts.find(a => String(a.id) === selectedBankAccountId) || bankAccounts[0];
            const activeBankId = activeBank?.id;
            const activeBankName = activeBank?.name;

            // 2. Fetch the starting balance (derived opening balance) for this bank account and date
            const proj = projectionAccounts.find(p => p.id === activeBankId);
            const startBal = proj?.dailyBalances[col.dateStr] ?? activeBank?.openingBalance ?? 0;

            // 3. Inflows (Credit) for this bank account
            // UPI received
            const daySales = dailySales.find(s => {
              try {
                return new Date(s.date).toLocaleDateString('en-CA') === col.dateStr;
              } catch {
                return false;
              }
            });
            // Check if UPI sales are routed to this bank account
            const dayUpiSales = (daySales?.upiAccountId === activeBankId) ? (daySales?.upiSales ?? 0) : 0;

            // Card Settlements received
            const dayCardSettlements = cardSettlements.filter(cs => {
              try {
                return new Date(cs.date).toLocaleDateString('en-CA') === col.dateStr && cs.bankAccountId === activeBankId;
              } catch {
                return false;
              }
            });
            const totalCardSettlements = dayCardSettlements.reduce((sum, cs) => sum + cs.amount, 0);

            // Cash Deposits received
            const dayDeposits = bankDeposits.filter(d => {
              try {
                return new Date(d.date).toLocaleDateString('en-CA') === col.dateStr && d.bankAccountId === activeBankId && !d.isRD;
              } catch {
                return false;
              }
            });
            const totalDeposits = dayDeposits.reduce((sum, d) => sum + d.amount, 0);

            // Recurring Deposits logged today (debit outflow)
            const dayRDs = bankDeposits.filter(d => {
              try {
                return new Date(d.date).toLocaleDateString('en-CA') === col.dateStr && d.bankAccountId === activeBankId && d.isRD;
              } catch {
                return false;
              }
            });
            const totalRDs = dayRDs.reduce((sum, d) => sum + d.amount, 0);

            // Customer Cheques (Expected Inward Cheques)
            const colCheques = cheques.filter(c => isPDC(c) && isDateMatch(c.chequeDate, col.dateStr));
            const dayCustomerCheques = colCheques.filter(c => c.partyType === 'Customer' && (c.bankAccountId === activeBankId || c.bankName === activeBankName));
            
            const pendingCustomerCheques = dayCustomerCheques.filter(c => c.status === 'Pending');
            const clearedCustomerCheques = dayCustomerCheques.filter(c => c.status === 'Cleared');
            const clearedCustomerSum = clearedCustomerCheques.reduce((sum, c) => sum + c.amount, 0);

            // 4. Outflows (Debit) for this bank account
            // Expenses (paid via this bank account)
            const dayExpenses = expenses.filter(e => {
              try {
                return new Date(e.date).toLocaleDateString('en-CA') === col.dateStr && e.bankAccountId === activeBankId && (e.paymentMode === 'Bank' || e.paymentMode === 'UPI');
              } catch {
                return false;
              }
            });
            const dayShopExpenses = dayExpenses.filter(e => e.category === 'Shop').reduce((sum, e) => sum + e.amount, 0);
            const dayHomeExpenses = dayExpenses.filter(e => e.category === 'Home').reduce((sum, e) => sum + e.amount, 0);
            const totalExpenses = dayShopExpenses + dayHomeExpenses;

            // Supplier Cheques (Expected Outward Cheques)
            const daySupplierCheques = colCheques.filter(c => c.partyType !== 'Customer' && (c.bankAccountId === activeBankId || c.bankName === activeBankName));
            const expectedSupplierSum = daySupplierCheques.reduce((sum, c) => sum + c.amount, 0);

            // 5. Consolidated Credit & Debit calculations
            const totalCreditInflow = startBal + dayUpiSales + totalCardSettlements + totalDeposits + clearedCustomerSum;
            const totalDebitOutflow = totalExpenses + expectedSupplierSum + totalRDs;

            // Shortfall calculation
            const expectedShortfall = totalDebitOutflow > totalCreditInflow ? (totalDebitOutflow - totalCreditInflow) : 0;

            return (
              <div 
                key={col.dateStr} 
                className={`flex flex-col rounded-2xl border transition-all duration-200 ${
                  isOver 
                    ? 'border-brand-teal bg-brand-teal/[0.04] ring-1 ring-brand-teal/10' 
                    : col.isToday 
                      ? 'border-brand-teal/20 bg-gradient-to-b from-brand-teal/[0.03] to-transparent'
                      : col.isSunday
                        ? 'border-rose-500/10 bg-gradient-to-b from-rose-500/[0.02] to-transparent'
                        : 'border-slate-100 bg-white/30'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isOver) {
                    setDragOverColumn(prev => ({ ...prev, [col.dateStr]: true }));
                  }
                }}
                onDragLeave={() => {
                  setDragOverColumn(prev => ({ ...prev, [col.dateStr]: false }));
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverColumn(prev => ({ ...prev, [col.dateStr]: false }));
                  const chequeId = e.dataTransfer.getData("chequeId");
                  if (chequeId) {
                    await handleMoveCheque(chequeId, col.dateStr);
                  }
                }}
              >
                
                {/* Column Date Header */}
                <div className={`p-2 text-center border-b select-none transition-colors rounded-t-xl ${
                  col.isToday 
                    ? 'bg-brand-teal/10 text-brand-teal border-b-brand-teal/25'
                    : col.isSunday
                      ? 'bg-rose-50/5 text-rose-600 border-b-rose-500/10'
                      : 'bg-brand-soft-teal/30 text-brand-navy border-b-brand-light-teal/50'
                }`}>
                  <div className="text-[9px] uppercase font-bold tracking-wider opacity-75">{col.dayName}</div>
                  <div className="text-xs font-bold mt-0.5 tracking-tight">{col.formattedHeader}</div>
                  {col.isToday && (
                    <span className="inline-block text-[7px] bg-brand-teal/10 text-brand-teal font-bold px-1.5 py-0.2 rounded mt-1 uppercase tracking-widest border border-brand-teal/20">
                      Today
                    </span>
                  )}
                </div>

                {/* HORIZONTAL SECTION A: CREDIT INFLOW (Top Part) */}
                <div className="flex flex-col border-b border-slate-200">
                  <div className="p-2 bg-emerald-500/[0.08] border-b border-slate-200 flex justify-between items-center text-[10px] font-black uppercase text-emerald-800">
                    <span>Inflow</span>
                    <span className="font-mono font-bold">₹{totalCreditInflow.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {/* Detailed breakdown items */}
                  <div className="p-2 space-y-1 bg-emerald-500/[0.01] text-[10px] font-semibold text-slate-500 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <span>Prev Bal:</span>
                      <span className="font-mono font-bold text-slate-800">₹{startBal.toLocaleString('en-IN')}</span>
                    </div>
                    {dayUpiSales > 0 && (
                      <div className="flex justify-between items-center">
                        <span>UPI Sales:</span>
                        <span className="font-mono font-bold text-slate-800">₹{dayUpiSales.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {totalCardSettlements > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Card Settled:</span>
                        <span className="font-mono font-bold text-slate-800">₹{totalCardSettlements.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {totalDeposits > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Deposited:</span>
                        <span className="font-mono font-bold text-slate-800">₹{totalDeposits.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {clearedCustomerSum > 0 && (
                      <div className="flex justify-between items-center text-sky-655 font-bold">
                        <span>Cleared Chqs:</span>
                        <span className="font-mono font-bold">+₹{clearedCustomerSum.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Cheques Scroll lane */}
                  <div className="p-1.5 space-y-1.5">
                    <div className="flex justify-between items-center text-[8px] uppercase font-bold tracking-wider text-slate-400 mb-1 select-none">
                      <span>Inward Cheques ({dayCustomerCheques.length})</span>
                      <button 
                        type="button"
                        onClick={() => triggerAddCustomerCheque(col.dateStr)}
                        className="p-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors border-0"
                        title="Add Customer Cheque"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {dayCustomerCheques.map(c => renderChequeCard(c))}
                    {dayCustomerCheques.length === 0 && (
                      <div className="h-16 border border-dashed border-emerald-500/20 rounded-lg flex items-center justify-center text-[8px] font-bold text-slate-350 uppercase tracking-widest bg-white/20 select-none">
                        No Inward
                      </div>
                    )}
                  </div>
                </div>

                {/* HORIZONTAL SECTION B: DEBIT OUTFLOW (Bottom Part) */}
                <div className="flex-1 flex flex-col">
                  <div className="p-2 bg-rose-500/[0.08] border-b border-slate-200 flex justify-between items-center text-[10px] font-black uppercase text-rose-800">
                    <span>Outflow</span>
                    <span className="font-mono font-bold">₹{totalDebitOutflow.toLocaleString('en-IN')}</span>
                  </div>

                  {/* SHORTFALL STATUS BLOCK */}
                  <div className="p-2 border-b border-slate-100 bg-slate-500/[0.01]">
                    {expectedShortfall > 0 ? (
                      <div className="p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[9px] font-black text-rose-600 text-center leading-tight uppercase tracking-wider animate-pulse flex items-center justify-center gap-1">
                        <span>⚠️ SHORTFALL:</span>
                        <span className="font-mono">₹{expectedShortfall.toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[9px] font-black text-emerald-600 text-center leading-tight uppercase tracking-wider flex items-center justify-center gap-1">
                        <span>✅ SURPLUS:</span>
                        <span className="font-mono">₹{(totalCreditInflow - totalDebitOutflow).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Expenses and RD breakdown */}
                  {(totalExpenses > 0 || totalRDs > 0) && (
                    <div className="p-2 space-y-1 bg-rose-500/[0.01] text-[10px] font-semibold text-slate-500 border-b border-slate-100">
                      {dayShopExpenses > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Shop Exp:</span>
                          <span className="font-mono font-bold text-slate-800">₹{dayShopExpenses.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {dayHomeExpenses > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Home Exp:</span>
                          <span className="font-mono font-bold text-slate-800">₹{dayHomeExpenses.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {totalRDs > 0 && (
                        <div className="flex justify-between items-center text-amber-600">
                          <span>RD Deposits:</span>
                          <span className="font-mono font-bold text-amber-700">₹{totalRDs.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Supplier Cheques Scroll lane */}
                  <div className="p-1.5 space-y-1.5">
                    <div className="text-[8px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                      Outward Cheques ({daySupplierCheques.length}):
                    </div>
                    {daySupplierCheques.map(c => renderChequeCard(c))}
                    {daySupplierCheques.length === 0 && (
                      <div className="h-16 border border-dashed border-rose-500/20 rounded-lg flex items-center justify-center text-[8px] font-bold text-slate-350 uppercase tracking-widest bg-white/20 select-none">
                        No Outward
                      </div>
                    )}
                  </div>

                  {/* Bulk clearing inside column if pending cheques exist */}
                  {daySupplierCheques.filter(c => c.status === 'Pending').length > 0 && (
                    <div className="p-1.5 bg-slate-50 border-t border-slate-150">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleClearAllInColumn(col.dateStr, daySupplierCheques)}
                        className="w-full h-6.5 text-[8px] font-bold tracking-wider uppercase text-brand-teal hover:text-brand-teal/90 border-brand-teal/20 bg-brand-soft-teal hover:bg-brand-light-teal rounded-full transition-all cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5 mr-0.5" /> Clear All ({daySupplierCheques.filter(c => c.status === 'Pending').length})
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Add Customer Cheque Dialog ────────────────────────── */}
      <Dialog open={isCustomerChqDialogOpen} onOpenChange={setIsCustomerChqDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200/85 bg-white p-6 shadow-xl border">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-sm font-black text-brand-navy uppercase tracking-wide flex items-center gap-2">
              📥 Add Customer Cheque Payment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCustomerChequeSubmit} className="space-y-4 pt-3">
            {/* Date input */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cheque Clearing Date</Label>
              <Input
                type="date"
                value={customerChqForm.chequeDate}
                onChange={e => setCustomerChqForm(prev => ({ ...prev, chequeDate: e.target.value }))}
                className={INPUT_STYLE}
                required
              />
            </div>

            {/* Received From Autocomplete input */}
            <div className="space-y-1 relative">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Received From (Customer Name)</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={customerSearchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setCustomerSearchQuery(val);
                    setCustomerChqForm(prev => ({ ...prev, customerId: '' })); // clear selected customer ID if they type new name
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  placeholder="Type customer name..."
                  className={INPUT_STYLE}
                  required
                  autoComplete="off"
                />
                
                {/* Suggestions List Overlay Click Catcher */}
                {showCustomerSuggestions && customerSearchQuery.trim() !== '' && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowCustomerSuggestions(false)} 
                    />
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                      {(() => {
                        const filtered = customers.filter(c =>
                          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-xs text-slate-400 italic select-none">
                              New Customer (Will save typed name)
                            </div>
                          );
                        }
                        return filtered.map(cust => (
                          <div
                            key={cust.id}
                            onClick={() => {
                              setCustomerSearchQuery(cust.name);
                              setCustomerChqForm(prev => ({ ...prev, customerId: String(cust.id) }));
                              setShowCustomerSuggestions(false);
                            }}
                            className="px-3.5 py-2 text-xs text-slate-700 hover:bg-brand-soft-teal/30 cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-bold">{cust.name}</span>
                            <span className="text-[10px] text-brand-teal font-mono">Outstanding: ₹{cust.outstandingBalance?.toLocaleString('en-IN') || 0}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cheque Amount (₹)</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 font-bold text-xs">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter cheque amount..."
                  value={customerChqForm.amount}
                  onChange={e => setCustomerChqForm(prev => ({ ...prev, amount: e.target.value }))}
                  className={`${INPUT_STYLE} pl-7`}
                  required
                />
              </div>
            </div>

            {/* Deposited in Account Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deposited In Account</Label>
              <select
                value={customerChqForm.bankAccountId}
                onChange={e => setCustomerChqForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                className="flex h-10 w-full rounded-full border border-brand-light-teal bg-white px-4 py-1 text-sm font-semibold text-brand-navy focus:outline-none"
                required
              >
                <option value="" disabled>Select bank account...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Reference input (Optional) */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cheque Reference / Number (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. 524106 (Auto-generated if left blank)"
                value={customerChqForm.chequeNumber}
                onChange={e => setCustomerChqForm(prev => ({ ...prev, chequeNumber: e.target.value }))}
                className={INPUT_STYLE}
              />
            </div>

            {/* Submit button */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomerChqDialogOpen(false)}
                className="flex-1 rounded-full h-10 text-xs font-bold text-slate-500 hover:bg-slate-50 border-slate-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 text-xs rounded-full shadow-xs border-0 cursor-pointer"
              >
                {isLoading ? 'Registering...' : 'Add Cheque'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
