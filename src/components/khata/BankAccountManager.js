import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { khataFetch } from '../../lib/khata-utils';

const PRIMARY_BTN =
  'bg-brand-teal hover:bg-brand-teal/90 text-white rounded-full font-bold border-0';

const CARD_CLASS = 'rounded-2xl border-slate-200/80 shadow-sm';
const CARD_HEADER_CLASS = 'bg-slate-50/40 border-b border-slate-100 py-4 px-5';
const CARD_TITLE_CLASS = 'text-sm font-bold text-brand-navy uppercase tracking-wide';
const LABEL_CLASS = 'text-xs font-bold text-slate-500 uppercase tracking-wider';
const INPUT_CLASS = 'rounded-full px-4';

const EMPTY_ADD_FORM = {
  name: '',
  accountNo: '',
  ifscCode: '',
  isDefault: false,
  accountType: 'Savings',
  openingBalance: 0,
  openingBalanceDate: '',
};

const EMPTY_SETTINGS_FORM = {
  companyName: '',
  gstin: '',
  address: '',
  state: '',
};

export function BankAccountManager({ onlySettings = false } = {}) {
  const [accounts, setAccounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [editingAccount, setEditingAccount] = useState(null);
  const [settingsForm, setSettingsForm] = useState(EMPTY_SETTINGS_FORM);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function fetchAccounts() {
    try {
      const res = await khataFetch('/api/khata/bank-account');
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : data.accounts ?? []);
    } catch {
      setAccounts([]);
    }
  }

  async function fetchSettings() {
    try {
      const res = await khataFetch('/api/khata/app-settings');
      const data = await res.json();
      setSettings(data);
      setSettingsForm({
        companyName: data.companyName ?? '',
        gstin: data.gstin ?? '',
        address: data.address ?? '',
        state: data.state ?? '',
      });
    } catch {
      setSettings(null);
    }
  }

  useEffect(() => {
    fetchAccounts();
    fetchSettings();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleAdd(e) {
    e.preventDefault();
    try {
      const res = await khataFetch('/api/khata/bank-account', {
        method: 'POST',
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddOpen(false);
        setAddForm(EMPTY_ADD_FORM);
        await fetchAccounts();
      } else {
        alert(data.error || 'Failed to add bank account');
      }
    } catch (err) {
      console.error(err);
      alert('Network or server error while adding bank account');
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      const res = await khataFetch('/api/khata/bank-account', {
        method: 'PUT',
        body: JSON.stringify(editingAccount),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditOpen(false);
        setEditingAccount(null);
        await fetchAccounts();
      } else {
        alert(data.error || 'Failed to update bank account');
      }
    } catch (err) {
      console.error(err);
      alert('Network or server error while updating bank account');
    }
  }

  async function handleSetDefault(id) {
    try {
      const res = await khataFetch('/api/khata/bank-account', {
        method: 'PUT',
        body: JSON.stringify({ id, action: 'set-default' }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAccounts();
      } else {
        alert(data.error || 'Failed to set default bank account');
      }
    } catch (err) {
      console.error(err);
      alert('Network or server error setting default bank account');
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Are you sure you want to deactivate/remove this bank account?')) return;
    try {
      const res = await khataFetch(`/api/khata/bank-account?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await fetchAccounts();
      } else {
        alert(data.error || 'Failed to deactivate bank account');
      }
    } catch (err) {
      console.error(err);
      alert('Network or server error deactivating bank account');
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    await khataFetch('/api/khata/app-settings', {
      method: 'PUT',
      body: JSON.stringify(settingsForm),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function maskAccountNo(accountNo) {
    if (!accountNo) return '—';
    const last4 = accountNo.slice(-4);
    return `${'•'.repeat(Math.max(0, accountNo.length - 4))}${last4}`;
  }

  function openEdit(account) {
    setEditingAccount({
      ...account,
      accountType: account.accountType ?? 'Savings',
      openingBalance: account.openingBalance ?? 0,
    });
    setIsEditOpen(true);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── SECTION 1: Company & App Settings ──────────────────────────── */}
      <Card className={CARD_CLASS}>
        <CardHeader className={CARD_HEADER_CLASS}>
          <CardTitle className={CARD_TITLE_CLASS}>Company &amp; Tally Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Company Name */}
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className={LABEL_CLASS}>
                  Company Name (for Tally export)
                </Label>
                <Input
                  id="companyName"
                  className={INPUT_CLASS}
                  value={settingsForm.companyName}
                  onChange={(e) =>
                    setSettingsForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                  placeholder="e.g. Acme Pvt. Ltd."
                />
              </div>

              {/* GSTIN */}
              <div className="space-y-1.5">
                <Label htmlFor="gstin" className={LABEL_CLASS}>
                  GSTIN
                </Label>
                <Input
                  id="gstin"
                  className={INPUT_CLASS}
                  value={settingsForm.gstin}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, gstin: e.target.value }))}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                />
              </div>

              {/* Business Address */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address" className={LABEL_CLASS}>
                  Business Address
                </Label>
                <Input
                  id="address"
                  className={INPUT_CLASS}
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 123 MG Road, Bengaluru"
                />
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <Label htmlFor="state" className={LABEL_CLASS}>
                  State
                </Label>
                <Input
                  id="state"
                  className={INPUT_CLASS}
                  value={settingsForm.state}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="e.g. Karnataka"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" className={PRIMARY_BTN}>
                Save Settings
              </Button>
              {settingsSaved && (
                <span className="text-sm font-medium text-brand-teal">✓ Saved successfully</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {!onlySettings && (
        <>
          {/* ── SECTION 2: Bank Accounts ────────────────────────────────────── */}
          <Card className={CARD_CLASS}>
            <CardHeader className={`${CARD_HEADER_CLASS} flex flex-row items-center justify-between`}>
              <CardTitle className={CARD_TITLE_CLASS}>Bank Accounts</CardTitle>
              <Button
                type="button"
                size="sm"
                className={PRIMARY_BTN}
                onClick={() => {
                  setAddForm(EMPTY_ADD_FORM);
                  setIsAddOpen(true);
                }}
              >
                + Add Bank Account
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                  <span className="text-5xl">🏦</span>
                  <p className="text-sm font-medium">No bank accounts added yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 font-semibold text-slate-500">
                        <th className="px-5 py-3 text-left">Account Name</th>
                        <th className="px-5 py-3 text-left">Account No.</th>
                        <th className="px-5 py-3 text-left">IFSC</th>
                        <th className="px-5 py-3 text-left">Type</th>
                        <th className="px-5 py-3 text-left">Opening Bal.</th>
                        <th className="px-5 py-3 text-left">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account, idx) => (
                        <tr
                          key={account.id}
                          className={`border-b border-slate-100 last:border-0 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-brand-soft-teal/20'
                          }`}
                        >
                          {/* Name + Default badge */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2 font-medium text-slate-800">
                              {account.isDefault && (
                                <span className="text-brand-teal">★</span>
                              )}
                              {account.name}
                              {account.isDefault && (
                                <span className="rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Masked account number */}
                          <td className="px-5 py-3 font-mono text-slate-600">
                            {maskAccountNo(account.accountNo)}
                          </td>

                          {/* IFSC */}
                          <td className="px-5 py-3 font-mono text-slate-600">
                            {account.ifscCode || '—'}
                          </td>

                          {/* Account Type */}
                          <td className="px-5 py-3 text-slate-600">
                            {account.accountType || 'Savings'}
                          </td>

                          {/* Opening Balance */}
                          <td className="px-5 py-3 font-bold text-slate-800">
                            <div>₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(account.openingBalance || 0)}</div>
                            {account.openingBalanceDate && (
                              <div className="text-[10px] text-slate-550 font-semibold mt-0.5 whitespace-nowrap">
                                as on {new Date(account.openingBalanceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </td>

                          {/* Active status */}
                          <td className="px-5 py-3">
                            {account.isActive !== false ? (
                              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {!account.isDefault && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-brand-teal hover:text-brand-teal"
                                  onClick={() => handleSetDefault(account.id)}
                                >
                                  Set as Default
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-full border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-brand-teal hover:text-brand-teal"
                                onClick={() => openEdit(account)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-full border-slate-200 px-3 text-xs font-semibold text-red-500 hover:border-red-450 hover:text-red-650"
                                onClick={() => handleDeactivate(account.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── ADD DIALOG ──────────────────────────────────────────────────── */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="max-w-md rounded-2xl bg-white p-5 border border-slate-150 shadow-lg">
              <DialogHeader>
                <DialogTitle className={CARD_TITLE_CLASS}>Add Bank Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="add-name" className={LABEL_CLASS}>
                    Account Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-name"
                    required
                    className={INPUT_CLASS}
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. SBI Current Account"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="add-accountNo" className={LABEL_CLASS}>
                    Account No.
                  </Label>
                  <Input
                    id="add-accountNo"
                    className={INPUT_CLASS}
                    value={addForm.accountNo}
                    onChange={(e) => setAddForm((f) => ({ ...f, accountNo: e.target.value }))}
                    placeholder="e.g. 0123456789"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="add-ifsc" className={LABEL_CLASS}>
                    IFSC Code
                  </Label>
                  <Input
                    id="add-ifsc"
                    className={INPUT_CLASS}
                    value={addForm.ifscCode}
                    onChange={(e) => setAddForm((f) => ({ ...f, ifscCode: e.target.value }))}
                    placeholder="e.g. SBIN0001234"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-type" className={LABEL_CLASS}>
                      Account Type
                    </Label>
                    <select
                      id="add-type"
                      className="flex h-9 w-full rounded-full border border-slate-200 dark:border-slate-800 bg-transparent px-4 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold text-slate-800 bg-white"
                      value={addForm.accountType}
                      onChange={(e) => setAddForm((f) => ({ ...f, accountType: e.target.value }))}
                    >
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-opening" className={LABEL_CLASS}>
                      Opening Balance (₹)
                    </Label>
                    <Input
                      id="add-opening"
                      type="number"
                      step="0.01"
                      className={INPUT_CLASS}
                      value={addForm.openingBalance}
                      onChange={(e) => setAddForm((f) => ({ ...f, openingBalance: Number(e.target.value) }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="add-opening-date" className={LABEL_CLASS}>
                      As on Date
                    </Label>
                    <Input
                      id="add-opening-date"
                      type="date"
                      className={INPUT_CLASS}
                      value={addForm.openingBalanceDate || ''}
                      onChange={(e) => setAddForm((f) => ({ ...f, openingBalanceDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="add-isDefault"
                    type="checkbox"
                    checked={addForm.isDefault}
                    onChange={(e) => setAddForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    className="h-4 w-4 rounded accent-brand-teal"
                  />
                  <Label htmlFor="add-isDefault" className={LABEL_CLASS}>
                    Set as default account
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className={PRIMARY_BTN}>
                    Add Account
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* ── EDIT DIALOG ─────────────────────────────────────────────────── */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-md rounded-2xl bg-white p-5 border border-slate-150 shadow-lg">
              <DialogHeader>
                <DialogTitle className={CARD_TITLE_CLASS}>Edit Bank Account</DialogTitle>
              </DialogHeader>
              {editingAccount && (
                <form onSubmit={handleEdit} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" className={LABEL_CLASS}>
                      Account Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-name"
                      required
                      className={INPUT_CLASS}
                      value={editingAccount.name}
                      onChange={(e) =>
                        setEditingAccount((a) => ({ ...a, name: e.target.value }))
                      }
                      placeholder="e.g. SBI Current Account"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-accountNo" className={LABEL_CLASS}>
                      Account No.
                    </Label>
                    <Input
                      id="edit-accountNo"
                      className={INPUT_CLASS}
                      value={editingAccount.accountNo ?? ''}
                      onChange={(e) =>
                        setEditingAccount((a) => ({ ...a, accountNo: e.target.value }))
                      }
                      placeholder="e.g. 0123456789"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-ifsc" className={LABEL_CLASS}>
                      IFSC Code
                    </Label>
                    <Input
                      id="edit-ifsc"
                      className={INPUT_CLASS}
                      value={editingAccount.ifscCode ?? ''}
                      onChange={(e) =>
                        setEditingAccount((a) => ({ ...a, ifscCode: e.target.value }))
                      }
                      placeholder="e.g. SBIN0001234"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-type" className={LABEL_CLASS}>
                        Account Type
                      </Label>
                      <select
                        id="edit-type"
                        className="flex h-9 w-full rounded-full border border-slate-200 dark:border-slate-800 bg-transparent px-4 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold text-slate-800 bg-white"
                        value={editingAccount.accountType ?? 'Savings'}
                        onChange={(e) =>
                          setEditingAccount((a) => ({ ...a, accountType: e.target.value }))
                        }
                      >
                        <option value="Savings">Savings</option>
                        <option value="Current">Current</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-opening" className={LABEL_CLASS}>
                        Opening Balance (₹)
                      </Label>
                      <Input
                        id="edit-opening"
                        type="number"
                        step="0.01"
                        className={INPUT_CLASS}
                        value={editingAccount.openingBalance ?? 0}
                        onChange={(e) =>
                          setEditingAccount((a) => ({ ...a, openingBalance: Number(e.target.value) }))
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="edit-opening-date" className={LABEL_CLASS}>
                        As on Date
                      </Label>
                      <Input
                        id="edit-opening-date"
                        type="date"
                        className={INPUT_CLASS}
                        value={editingAccount.openingBalanceDate || ''}
                        onChange={(e) =>
                          setEditingAccount((a) => ({ ...a, openingBalanceDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="edit-isDefault"
                      type="checkbox"
                      checked={editingAccount.isDefault ?? false}
                      onChange={(e) =>
                        setEditingAccount((a) => ({ ...a, isDefault: e.target.checked }))
                      }
                      className="h-4 w-4 rounded accent-brand-teal"
                    />
                    <Label htmlFor="edit-isDefault" className={LABEL_CLASS}>
                      Set as default account
                    </Label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setIsEditOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className={PRIMARY_BTN}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
