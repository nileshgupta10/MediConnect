import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { formatDate, khataFetch } from '../../lib/khata-utils';

export function PurchasesUI() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [hasCheque, setHasCheque] = useState(false);

  // Edit dialog state
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    supplierName: '',
    invoiceNumber: '',
    invoiceAmount: '',
    paymentType: 'Cash', // default
    chequeNumber: '',
    chequeDate: '',
    chequeBank: '',
  });

  const fetchPurchases = async () => {
    try {
      const res = await khataFetch('/api/khata/purchase');
      const data = await res.json();
      setPurchases(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await khataFetch('/api/khata/supplier');
      const data = await res.json();
      setSuppliers(data || []);
      if (data.length > 0 && !formData.supplierName) {
        setFormData(prev => ({ ...prev, supplierName: data[0].name }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await khataFetch('/api/khata/bank-account');
      const data = await res.json();
      setBankAccounts(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchBankAccounts();
  }, []);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    try {
      const res = await khataFetch('/api/khata/supplier', {
        method: 'POST',
        body: JSON.stringify({ name: newSupplierName }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchSuppliers();
        setFormData(prev => ({ ...prev, supplierName: data.name }));
        setNewSupplierName('');
        setIsSupplierDialogOpen(false);
      } else {
        alert(data.error || 'Failed to add supplier');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      chequeNumber: hasCheque ? formData.chequeNumber : '',
      chequeDate: hasCheque ? formData.chequeDate : '',
      chequeBank: hasCheque ? formData.chequeBank : '',
    };

    try {
      const res = await khataFetch('/api/khata/purchase', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchPurchases();
        
        // Reset form except supplier dropdown
        setFormData(prev => ({
          ...prev,
          invoiceNumber: '',
          invoiceAmount: '',
          paymentType: 'Cash',
          chequeNumber: '',
          chequeDate: '',
          chequeBank: '',
        }));
        setHasCheque(false);
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        alert(err.error || 'Failed to save purchase invoice');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred while saving the purchase invoice.');
    }
  };

  const handleEditClick = (purchase) => {
    setEditingPurchase({
      id: purchase.id,
      date: new Date(purchase.date).toISOString().split('T')[0],
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber,
      invoiceAmount: purchase.invoiceAmount.toString(),
      paymentType: purchase.paymentType,
      paymentMode: purchase.cheque?.paymentMode || 'Cash',
      bankAccountId: purchase.cheque?.bankAccountId ? String(purchase.cheque.bankAccountId) : '',
      chequeNumber: purchase.cheque?.chequeNumber || '',
      chequeDate: purchase.cheque?.chequeDate ? new Date(purchase.cheque.chequeDate).toISOString().split('T')[0] : '',
      bankCharge: purchase.cheque?.bankCharge ? String(purchase.cheque.bankCharge) : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPurchase) return;

    try {
      const res = await khataFetch('/api/khata/purchase', {
        method: 'PUT',
        body: JSON.stringify(editingPurchase),
      });
      if (res.ok) {
        setIsEditDialogOpen(false);
        setEditingPurchase(null);
        fetchPurchases();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update invoice');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this purchase invoice? This will also remove any automatic Cash Out ledger logs associated with it.")) {
      return;
    }

    try {
      const res = await khataFetch(`/api/khata/purchase?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsEditDialogOpen(false);
        setEditingPurchase(null);
        fetchPurchases();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete invoice');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Log Purchase Invoice Card */}
      <Card className="border-slate-200/80 bg-white/70 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 border-b border-slate-100 bg-slate-50/40">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-brand-navy tracking-wide uppercase flex items-center gap-2">
              <span>🧾</span> Log New Purchase Invoice
            </CardTitle>
            <p className="text-xs text-slate-400 font-semibold">Log official raw supply bills and inventory expenses</p>
          </div>
          
          <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
            <DialogTrigger render={
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-full border-brand-teal/50 text-brand-teal hover:bg-brand-soft-teal font-bold px-4 h-9 cursor-pointer"
              >
                + Add New Supplier
              </Button>
            } />
            <DialogContent className="max-w-md rounded-2xl bg-white border border-slate-150 p-5 shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-brand-navy font-bold">Register Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSupplier} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-650">Supplier Name</Label>
                  <Input 
                    value={newSupplierName} 
                    onChange={e => setNewSupplierName(e.target.value)} 
                    placeholder="Enter supplier name..." 
                    className="rounded-full bg-white font-semibold"
                    required 
                  />
                </div>
                <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-10 rounded-full border-0 shadow-xs cursor-pointer">
                  Save Supplier
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Date</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="rounded-full bg-white font-semibold" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-555 uppercase tracking-wider">Supplier</Label>
                <select 
                  className="flex h-9 w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                  value={formData.supplierName} 
                  onChange={e => setFormData({...formData, supplierName: e.target.value})}
                  required
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  {suppliers.length === 0 && (
                    <option value="" disabled>No suppliers registered</option>
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Invoice Number</Label>
                <Input value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} placeholder="e.g. INV-1004" className="rounded-full bg-white font-semibold" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Invoice Amount (₹)</Label>
                <Input type="number" value={formData.invoiceAmount} onChange={e => setFormData({...formData, invoiceAmount: e.target.value})} placeholder="0.00" className="rounded-full bg-white font-semibold" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Payment Type</Label>
                <select 
                  className="flex h-9 w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                  value={formData.paymentType} 
                  onChange={e => setFormData({...formData, paymentType: e.target.value})}
                  required
                >
                  <option value="Cash">Cash (Paid Today)</option>
                  <option value="Credit">Credit (Pay Later)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <input 
                type="checkbox" 
                id="hasCheque" 
                checked={hasCheque}
                onChange={e => setHasCheque(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-350 text-brand-teal focus:ring-brand-teal cursor-pointer"
              />
              <Label htmlFor="hasCheque" className="cursor-pointer font-bold text-sm text-slate-700">
                Cheque Details (in case Cheque / PDC is issued)
              </Label>
            </div>

            {hasCheque && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-brand-light-teal/50 bg-brand-soft-teal/30 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">Cheque Number</Label>
                  <Input value={formData.chequeNumber} onChange={e => setFormData({...formData, chequeNumber: e.target.value})} placeholder="e.g. 100405" className="rounded-full bg-white font-semibold" required={hasCheque} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">Cheque Date / PDC Date</Label>
                  <Input type="date" value={formData.chequeDate} onChange={e => setFormData({...formData, chequeDate: e.target.value})} className="rounded-full bg-white font-semibold" required={hasCheque} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">Bank Name</Label>
                  <Input value={formData.chequeBank} onChange={e => setFormData({...formData, chequeBank: e.target.value})} placeholder="e.g. HDFC Bank" className="rounded-full bg-white font-semibold" required={hasCheque} />
                </div>
              </div>
            )}

            <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-extrabold h-10 w-full md:w-auto px-6 rounded-full shadow-xs border-0 cursor-pointer">
              Save Purchase Invoice
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invoices Log Card */}
      <Card className="border-slate-200/80 bg-white/70 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/40 flex justify-between items-center flex-row">
          <CardTitle className="text-sm font-bold text-brand-navy tracking-wide uppercase flex items-center gap-2">
            <span>📅</span> Purchase Invoices Log
          </CardTitle>
          <span className="text-[10px] bg-brand-soft-teal text-brand-teal px-2.5 py-1 rounded-full font-bold">
            {purchases.length} total invoices
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-brand-soft-teal">
                <TableRow className="border-b border-slate-150 hover:bg-transparent">
                  <TableHead className="font-extrabold text-brand-navy text-xs py-3.5 pl-5">Date</TableHead>
                  <TableHead className="font-extrabold text-brand-navy text-xs py-3.5">Invoice No.</TableHead>
                  <TableHead className="font-extrabold text-brand-navy text-xs py-3.5">Supplier</TableHead>
                  <TableHead className="font-extrabold text-brand-navy text-xs py-3.5">Payment Mode</TableHead>
                  <TableHead className="font-extrabold text-brand-navy text-xs py-3.5">Cheque Details</TableHead>
                  <TableHead className="font-extrabold text-brand-navy text-xs py-3.5 text-right pr-5">Invoice Amount</TableHead>
                  <TableHead className="font-extrabold text-brand-navy text-xs py-3.5 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p, index) => (
                  <TableRow 
                    key={p.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                      index % 2 === 1 ? 'bg-brand-soft-teal/30' : 'bg-white'
                    }`}
                  >
                    <TableCell className="font-bold text-slate-850 py-3.5 pl-5">{formatDate(p.date)}</TableCell>
                    <TableCell className="font-black text-slate-800 font-mono py-3.5">#{p.invoiceNumber}</TableCell>
                    <TableCell className="font-extrabold text-slate-750 py-3.5">🏢 {p.supplierName}</TableCell>
                    <TableCell className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        p.paymentType === 'Cash' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                      }`}>
                        {p.paymentType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate text-slate-500 font-semibold py-3.5">
                      {p.cheque ? (
                        <span className="inline-flex flex-col">
                          <span className="font-bold text-slate-650">No. {p.cheque.chequeNumber} ({p.cheque.bankName})</span>
                          <span className="text-[10px] text-slate-400">Date: {formatDate(p.cheque.chequeDate)} ({p.cheque.status})</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-brand-navy font-mono py-3.5 pr-5">₹{p.invoiceAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-center py-3.5">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditClick(p)}
                        className="h-8 px-3 rounded-full hover:bg-slate-100 border-slate-200 font-bold text-xs text-slate-600 cursor-pointer"
                      >
                        <svg className="w-3 h-3 text-slate-450 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-semibold">No purchases logged yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modern Dialog for editing purchase */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white border border-slate-150 p-5 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-navy font-bold">Edit Purchase Invoice</DialogTitle>
          </DialogHeader>
          {editingPurchase && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Date</Label>
                <Input 
                  type="date" 
                  value={editingPurchase.date} 
                  onChange={e => setEditingPurchase({...editingPurchase, date: e.target.value})} 
                  className="rounded-full bg-white font-semibold"
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Supplier</Label>
                <select 
                  className="flex h-9 w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                  value={editingPurchase.supplierName} 
                  onChange={e => setEditingPurchase({...editingPurchase, supplierName: e.target.value})}
                  required
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Invoice Number</Label>
                <Input 
                  value={editingPurchase.invoiceNumber} 
                  onChange={e => setEditingPurchase({...editingPurchase, invoiceNumber: e.target.value})} 
                  className="rounded-full bg-white font-semibold"
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Invoice Amount (₹)</Label>
                <Input 
                  type="number" 
                  value={editingPurchase.invoiceAmount} 
                  onChange={e => setEditingPurchase({...editingPurchase, invoiceAmount: e.target.value})} 
                  className="rounded-full bg-white font-semibold"
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-550 uppercase tracking-wider">Payment Type</Label>
                <select 
                  className="flex h-9 w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                  value={editingPurchase.paymentType} 
                  onChange={e => setEditingPurchase({...editingPurchase, paymentType: e.target.value})}
                  required
                >
                  <option value="Cash">Cash (Paid Today)</option>
                  <option value="Credit">Credit (Pay Later)</option>
                </select>
              </div>

              {editingPurchase.paymentType === 'Cash' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-550 uppercase tracking-wider">Payment Mode</Label>
                    <select 
                      className="flex h-9 w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                      value={editingPurchase.paymentMode || 'Cash'} 
                      onChange={e => setEditingPurchase({ ...editingPurchase, paymentMode: e.target.value })}
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI Transfer</option>
                      <option value="NEFT">NEFT (Bank Transfer)</option>
                      <option value="IMPS">IMPS (Instant Bank Transfer)</option>
                      <option value="Cheque">Cheque Payment</option>
                    </select>
                  </div>

                  {editingPurchase.paymentMode !== 'Cash' && editingPurchase.paymentMode && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Bank Account</Label>
                        <select 
                          className="flex h-9 w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                          value={editingPurchase.bankAccountId || ''} 
                          onChange={e => setEditingPurchase({ ...editingPurchase, bankAccountId: e.target.value })}
                          required={editingPurchase.paymentMode !== 'Cash'}
                        >
                          <option value="">Select Bank Account</option>
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>{b.name}{b.isDefault ? ' (Default)' : ''}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{editingPurchase.paymentMode === 'Cheque' ? 'Cheque Number' : 'Transaction Ref No.'}</Label>
                        <Input 
                          value={editingPurchase.chequeNumber || ''} 
                          onChange={e => setEditingPurchase({ ...editingPurchase, chequeNumber: e.target.value })} 
                          placeholder={editingPurchase.paymentMode === 'Cheque' ? 'e.g. 123456' : 'e.g. TXN9876543'} 
                          className="rounded-full bg-white font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{editingPurchase.paymentMode === 'Cheque' ? 'Cheque Date' : 'Transfer Date'}</Label>
                        <Input 
                          type="date" 
                          value={editingPurchase.chequeDate ? new Date(editingPurchase.chequeDate).toISOString().split('T')[0] : ''} 
                          onChange={e => setEditingPurchase({ ...editingPurchase, chequeDate: e.target.value })} 
                          className="rounded-full bg-white font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Charges / Fees (₹, if any)</Label>
                        <Input 
                          type="number" 
                          value={editingPurchase.bankCharge || ''} 
                          onChange={e => setEditingPurchase({ ...editingPurchase, bankCharge: e.target.value })} 
                          placeholder="0.00" 
                          className="rounded-full bg-white font-semibold"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {editingPurchase.paymentType === 'Credit' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="editLinkPdcPurchasesUI" 
                      checked={editingPurchase.paymentMode === 'Cheque'} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setEditingPurchase({
                          ...editingPurchase,
                          paymentMode: checked ? 'Cheque' : 'Cash',
                          chequeNumber: checked ? (editingPurchase.chequeNumber || '') : '',
                          bankAccountId: checked ? (editingPurchase.bankAccountId || '') : '',
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-350 text-brand-teal focus:ring-brand-teal cursor-pointer"
                    />
                    <Label htmlFor="editLinkPdcPurchasesUI" className="cursor-pointer text-xs font-bold text-slate-700">Link to Post-Dated Cheque (PDC)</Label>
                  </div>

                  {editingPurchase.paymentMode === 'Cheque' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Bank Account</Label>
                        <select 
                          className="flex h-9 w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                          value={editingPurchase.bankAccountId || ''} 
                          onChange={e => setEditingPurchase({ ...editingPurchase, bankAccountId: e.target.value })}
                          required={editingPurchase.paymentMode === 'Cheque'}
                        >
                          <option value="">Select Bank Account</option>
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>{b.name}{b.isDefault ? ' (Default)' : ''}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cheque Number</Label>
                        <Input 
                          value={editingPurchase.chequeNumber || ''} 
                          onChange={e => setEditingPurchase({ ...editingPurchase, chequeNumber: e.target.value })} 
                          placeholder="e.g. 504932" 
                          className="rounded-full bg-white font-semibold"
                          required={editingPurchase.paymentMode === 'Cheque'}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cheque Date</Label>
                        <Input 
                          type="date" 
                          value={editingPurchase.chequeDate ? new Date(editingPurchase.chequeDate).toISOString().split('T')[0] : ''} 
                          onChange={e => setEditingPurchase({ ...editingPurchase, chequeDate: e.target.value })} 
                          className="rounded-full bg-white font-semibold"
                          required={editingPurchase.paymentMode === 'Cheque'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => handleDelete(editingPurchase.id)}
                  className="bg-rose-650 hover:bg-rose-700 text-white font-bold rounded-full px-5 cursor-pointer"
                >
                  Delete Invoice
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-full px-5 border-0 cursor-pointer">Save Changes</Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
