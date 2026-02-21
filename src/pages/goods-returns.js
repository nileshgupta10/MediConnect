import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import StoreLayout from '../components/StoreLayout'

const BANNER_IMG = 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=1200&q=80'

export default function GoodsReturns() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('new')
  
  // Data states
  const [suppliers, setSuppliers] = useState([])
  const [pendingReturns, setPendingReturns] = useState([])
  const [completedReturns, setCompletedReturns] = useState([])
  
  // Form states - New Return
  const [returnDate, setReturnDate] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [givenThrough, setGivenThrough] = useState('')
  const [returnType, setReturnType] = useState('')
  const [details, setDetails] = useState('')
  const [amount, setAmount] = useState('')
  
  // Add supplier modal
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierAddress, setNewSupplierAddress] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [newSupplierContact, setNewSupplierContact] = useState('')
  
  // Receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [receiptDate, setReceiptDate] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [receiptBillNo, setReceiptBillNo] = useState('')
  const [receiptAmount, setReceiptAmount] = useState('')
  
  // Filter
  const [filterSupplier, setFilterSupplier] = useState('')
  
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/simple-login'); return }
    setUser(user)
    await loadData(user.id)
    setLoading(false)
  }

  const loadData = async (userId) => {
    const [suppliersRes, pendingRes, completedRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('store_owner_id', userId).order('name'),
      supabase.from('return_requests').select(`
        *, 
        suppliers(name)
      `).eq('store_owner_id', userId).eq('status', 'pending').order('return_date', { ascending: false }),
      supabase.from('return_requests').select(`
        *, 
        suppliers(name),
        return_receipts(*)
      `).eq('store_owner_id', userId).eq('status', 'completed').order('return_date', { ascending: false }),
    ])

    setSuppliers(suppliersRes.data || [])
    setPendingReturns(pendingRes.data || [])
    setCompletedReturns(completedRes.data || [])
  }

  const addSupplier = async () => {
    if (!newSupplierName.trim()) { setMessage('Please enter supplier name'); return }
    setSaving(true)
    const { error } = await supabase.from('suppliers').insert({
      store_owner_id: user.id,
      name: newSupplierName.trim(),
      address: newSupplierAddress.trim(),
      phone: newSupplierPhone.trim(),
      contact_person: newSupplierContact.trim(),
    })
    setSaving(false)
    if (error) { setMessage('Error: ' + error.message); return }
    setMessage('Supplier added successfully!')
    setShowAddSupplier(false)
    setNewSupplierName(''); setNewSupplierAddress(''); setNewSupplierPhone(''); setNewSupplierContact('')
    await loadData(user.id)
  }

  const submitReturn = async () => {
    if (!returnDate || !supplierId || !returnType || !details.trim()) {
      setMessage('Please fill all required fields')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('return_requests').insert({
      store_owner_id: user.id,
      supplier_id: supplierId,
      return_date: returnDate,
      invoice_date: invoiceDate || null,
      invoice_number: invoiceNumber.trim() || null,
      given_through: givenThrough.trim() || null,
      return_type: returnType,
      details: details.trim(),
      amount: amount ? parseFloat(amount) : null,
      status: 'pending',
    })
    setSaving(false)
    if (error) { setMessage('Error: ' + error.message); return }
    setMessage('Return request created successfully!')
    // Reset form
    setReturnDate(''); setSupplierId(''); setInvoiceDate(''); setInvoiceNumber('')
    setGivenThrough(''); setReturnType(''); setDetails(''); setAmount('')
    await loadData(user.id)
    setActiveTab('pending')
  }

  const openReceiptModal = (returnRequest) => {
    setSelectedReturn(returnRequest)
    setReceiptDate(new Date().toISOString().split('T')[0])
    setReceivedBy('')
    setReceiptBillNo('')
    setReceiptAmount(returnRequest.amount || '')
    setShowReceiptModal(true)
  }

  const submitReceipt = async () => {
    if (!receiptDate || !receivedBy.trim()) {
      setMessage('Please fill required fields')
      return
    }
    setSaving(true)

    // Insert receipt
    const { error: receiptError } = await supabase.from('return_receipts').insert({
      return_request_id: selectedReturn.id,
      store_owner_id: user.id,
      receipt_date: receiptDate,
      received_by: receivedBy.trim(),
      bill_number: receiptBillNo.trim() || null,
      amount: receiptAmount ? parseFloat(receiptAmount) : null,
    })

    if (receiptError) {
      setSaving(false)
      setMessage('Error: ' + receiptError.message)
      return
    }

    // Mark return as completed
    const { error: updateError } = await supabase
      .from('return_requests')
      .update({ status: 'completed' })
      .eq('id', selectedReturn.id)

    setSaving(false)
    if (updateError) { setMessage('Error: ' + updateError.message); return }

    setMessage('Receipt saved successfully!')
    setShowReceiptModal(false)
    setSelectedReturn(null)
    await loadData(user.id)
  }

  const deleteReturn = async (id) => {
    if (!confirm('Delete this return request?')) return
    const { error } = await supabase.from('return_requests').delete().eq('id', id)
    if (error) { alert(error.message); return }
    await loadData(user.id)
  }

  const getReturnTypeLabel = (type) => {
    const labels = {
      expiry: '📅 Expiry Return',
      goods_return: '📦 Goods Return',
      wrong_received_exchange: '🔄 Wrong Received - Exchange',
    }
    return labels[type] || type
  }

  const filteredPending = filterSupplier 
    ? pendingReturns.filter(r => r.supplier_id === filterSupplier)
    : pendingReturns

  const filteredCompleted = filterSupplier
    ? completedReturns.filter(r => r.supplier_id === filterSupplier)
    : completedReturns

  if (loading) return <p style={{ padding: 40, fontFamily: 'Nunito, sans-serif' }}>Loading…</p>

  return (
    <StoreLayout>
    <div style={s.page}>
      {/* Banner */}
      <div style={s.banner}>
        <img src={BANNER_IMG} alt="" style={s.bannerImg} />
        <div style={s.bannerOverlay} />
        <div style={s.bannerContent}>
          <div style={s.bannerIcon}>📦</div>
          <div>
            <h2 style={s.bannerTitle}>Goods Returns Management</h2>
            <p style={s.bannerSub}>
              {pendingReturns.length} pending · {completedReturns.length} completed
            </p>
          </div>
        </div>
      </div>

      <div style={s.body}>
        {/* Tabs */}
        <div style={s.tabs}>
          <button style={activeTab === 'new' ? s.activeTab : s.tab} onClick={() => setActiveTab('new')}>
            ➕ New Return
          </button>
          <button style={activeTab === 'pending' ? s.activeTab : s.tab} onClick={() => setActiveTab('pending')}>
            ⏳ Pending <span style={s.tabCount}>{pendingReturns.length}</span>
          </button>
          <button style={activeTab === 'completed' ? s.activeTab : s.tab} onClick={() => setActiveTab('completed')}>
            ✓ Completed <span style={s.tabCount}>{completedReturns.length}</span>
          </button>
        </div>

        {/* NEW RETURN TAB */}
        {activeTab === 'new' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Create New Return Request</h3>

            <label style={s.label}>Return Date *</label>
            <input type="date" style={s.input} value={returnDate} onChange={e => setReturnDate(e.target.value)} />

            <label style={s.label}>Supplier / Party *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ ...s.input, flex: 1 }} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
              <button style={s.addBtn} onClick={() => setShowAddSupplier(true)}>+ Add New</button>
            </div>

            <label style={s.label}>Invoice Date</label>
            <input type="date" style={s.input} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />

            <label style={s.label}>Invoice Number</label>
            <input style={s.input} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-12345" />

            <label style={s.label}>Given Through (Optional)</label>
            <input style={s.input} value={givenThrough} onChange={e => setGivenThrough(e.target.value)} placeholder="e.g. Person name, courier" />

            <label style={s.label}>Return Type *</label>
            <select style={s.input} value={returnType} onChange={e => setReturnType(e.target.value)}>
              <option value="">Select Type</option>
              <option value="expiry">📅 Expiry Return</option>
              <option value="goods_return">📦 Goods Return (Non-moving)</option>
              <option value="wrong_received_exchange">🔄 Wrong Received - Exchange</option>
            </select>

            <label style={s.label}>Details *</label>
            <textarea style={s.textarea} value={details} onChange={e => setDetails(e.target.value)} placeholder="Enter details in points:&#10;• Item 1: Description&#10;• Item 2: Description" />

            <label style={s.label}>Amount (Optional)</label>
            <input type="number" step="0.01" style={s.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="Leave empty for exchange" />

            <button style={s.primaryBtn} onClick={submitReturn} disabled={saving}>
              {saving ? 'Saving…' : 'Submit Return Request'}
            </button>

            {message && <p style={message.startsWith('Error') ? s.errorMsg : s.successMsg}>{message}</p>}
          </div>
        )}

        {/* PENDING TAB */}
        {activeTab === 'pending' && (
          <>
            <div style={s.filterBox}>
              <label style={s.filterLabel}>Filter by Supplier:</label>
              <select style={s.filterSelect} value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
                <option value="">All Suppliers</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>

            {filteredPending.length === 0 && <div style={s.empty}>No pending returns</div>}

            {filteredPending.map(ret => (
              <div key={ret.id} style={s.returnCard}>
                <div style={s.returnHeader}>
                  <div>
                    <h4 style={s.returnSupplier}>{ret.suppliers?.name}</h4>
                    <p style={s.returnDate}>Return Date: {new Date(ret.return_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span style={s.typeBadge}>{getReturnTypeLabel(ret.return_type)}</span>
                </div>

                {ret.invoice_number && <p style={s.detail}><b>Invoice:</b> {ret.invoice_number} ({ret.invoice_date ? new Date(ret.invoice_date).toLocaleDateString('en-IN') : 'No date'})</p>}
                {ret.given_through && <p style={s.detail}><b>Given Through:</b> {ret.given_through}</p>}
                
                <div style={s.detailsBox}>
                  <b style={s.detailsLabel}>Details:</b>
                  <p style={s.detailsText}>{ret.details}</p>
                </div>

                {ret.amount && <p style={s.amount}>Amount: ₹{parseFloat(ret.amount).toFixed(2)}</p>}

                <div style={s.actions}>
                  <button style={s.receiptBtn} onClick={() => openReceiptModal(ret)}>📝 Receipt / Inward</button>
                  <button style={s.deleteBtn} onClick={() => deleteReturn(ret.id)}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* COMPLETED TAB */}
        {activeTab === 'completed' && (
          <>
            <div style={s.filterBox}>
              <label style={s.filterLabel}>Filter by Supplier:</label>
              <select style={s.filterSelect} value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
                <option value="">All Suppliers</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>

            {filteredCompleted.length === 0 && <div style={s.empty}>No completed returns</div>}

            {filteredCompleted.map(ret => {
              const receipt = ret.return_receipts?.[0]
              return (
                <div key={ret.id} style={{ ...s.returnCard, background: '#f8fafc', opacity: 0.9 }}>
                  <div style={s.completedBanner}>✓ Completed</div>
                  <div style={s.returnHeader}>
                    <div>
                      <h4 style={s.returnSupplier}>{ret.suppliers?.name}</h4>
                      <p style={s.returnDate}>Return Date: {new Date(ret.return_date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span style={s.typeBadge}>{getReturnTypeLabel(ret.return_type)}</span>
                  </div>

                  {ret.invoice_number && <p style={s.detail}><b>Invoice:</b> {ret.invoice_number}</p>}
                  
                  <div style={s.detailsBox}>
                    <b style={s.detailsLabel}>Details:</b>
                    <p style={s.detailsText}>{ret.details}</p>
                  </div>

                  {ret.amount && <p style={s.amount}>Return Amount: ₹{parseFloat(ret.amount).toFixed(2)}</p>}

                  {receipt && (
                    <div style={s.receiptBox}>
                      <b>Receipt Details:</b>
                      <p style={s.detail}>Date: {new Date(receipt.receipt_date).toLocaleDateString('en-IN')}</p>
                      <p style={s.detail}>Received By: {receipt.received_by}</p>
                      {receipt.bill_number && <p style={s.detail}>Bill No: {receipt.bill_number}</p>}
                      {receipt.amount && <p style={s.detail}>Amount: ₹{parseFloat(receipt.amount).toFixed(2)}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div style={s.modalOverlay} onClick={() => setShowAddSupplier(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Add New Supplier</h3>
            
            <label style={s.label}>Supplier Name *</label>
            <input style={s.input} value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Supplier name" />
            
            <label style={s.label}>Address</label>
            <input style={s.input} value={newSupplierAddress} onChange={e => setNewSupplierAddress(e.target.value)} placeholder="Address" />
            
            <label style={s.label}>Phone</label>
            <input style={s.input} value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} placeholder="Phone number" />
            
            <label style={s.label}>Contact Person</label>
            <input style={s.input} value={newSupplierContact} onChange={e => setNewSupplierContact(e.target.value)} placeholder="Contact person name" />
            
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={s.primaryBtn} onClick={addSupplier} disabled={saving}>
                {saving ? 'Adding…' : 'Add Supplier'}
              </button>
              <button style={s.cancelBtn} onClick={() => setShowAddSupplier(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedReturn && (
        <div style={s.modalOverlay} onClick={() => setShowReceiptModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Record Receipt</h3>
            <p style={s.modalSub}>For: {suppliers.find(s => s.id === selectedReturn.supplier_id)?.name}</p>
            
            <label style={s.label}>Receipt Date *</label>
            <input type="date" style={s.input} value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            
            <label style={s.label}>Received By *</label>
            <input style={s.input} value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Person who received" />
            
            <label style={s.label}>Bill Number (Optional)</label>
            <input style={s.input} value={receiptBillNo} onChange={e => setReceiptBillNo(e.target.value)} placeholder="Credit note / bill number" />
            
            <label style={s.label}>Amount (Optional)</label>
            <input type="number" step="0.01" style={s.input} value={receiptAmount} onChange={e => setReceiptAmount(e.target.value)} placeholder="Amount received" />
            
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={s.primaryBtn} onClick={submitReceipt} disabled={saving}>
                {saving ? 'Saving…' : 'Record Receipt & Complete'}
              </button>
              <button style={s.cancelBtn} onClick={() => setShowReceiptModal(false)}>Cancel</button>
            </div>

            {message && <p style={message.startsWith('Error') ? s.errorMsg : s.successMsg}>{message}</p>}
          </div>
        </div>
      )}
    </div>
    </StoreLayout>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0fdfd', fontFamily: "'Nunito', 'Segoe UI', sans-serif", paddingBottom: 40 },
  banner: { position: 'relative', height: 160, overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%', objectFit: 'cover' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,52,96,0.88) 0%, rgba(14,144,144,0.72) 100%)' },
  bannerContent: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' },
  bannerIcon: { fontSize: 44 },
  bannerTitle: { color: 'white', fontSize: 22, fontWeight: 900, margin: 0 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  body: { maxWidth: 800, margin: '0 auto', padding: '20px 16px' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 },
  activeTab: { padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: '3px solid #0e9090', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#0e9090', display: 'flex', alignItems: 'center', gap: 6 },
  tabCount: { background: '#e2e8f0', color: '#475569', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  card: { background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  cardTitle: { fontSize: 18, fontWeight: 900, color: '#0f3460', marginBottom: 16 },
  label: { display: 'block', marginTop: 14, marginBottom: 6, fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  textarea: { width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
  addBtn: { padding: '10px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  primaryBtn: { marginTop: 16, width: '100%', padding: 13, background: '#0e9090', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', fontWeight: 800 },
  cancelBtn: { flex: 1, padding: 13, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', fontWeight: 700 },
  successMsg: { marginTop: 12, fontSize: 13, color: '#059669', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontWeight: 600 },
  errorMsg: { marginTop: 12, fontSize: 13, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontWeight: 600 },
  filterBox: { background: 'white', padding: 16, borderRadius: 14, marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  filterLabel: { fontSize: 14, fontWeight: 700, color: '#0f3460' },
  filterSelect: { flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit' },
  empty: { background: 'white', padding: 24, borderRadius: 14, fontSize: 15, color: '#64748b', textAlign: 'center', border: '1px solid #e2e8f0' },
  returnCard: { background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: 14, border: '1px solid #e2e8f0' },
  returnHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  returnSupplier: { fontSize: 17, fontWeight: 800, color: '#0f3460', margin: 0 },
  returnDate: { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  typeBadge: { background: '#e0f7f7', color: '#0e9090', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  detail: { fontSize: 14, color: '#475569', margin: '6px 0' },
  detailsBox: { background: '#f8fafc', padding: 12, borderRadius: 10, marginTop: 8, marginBottom: 8 },
  detailsLabel: { fontSize: 13, color: '#0f3460', display: 'block', marginBottom: 6 },
  detailsText: { fontSize: 14, color: '#475569', margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 },
  amount: { fontSize: 15, fontWeight: 800, color: '#0e9090', marginTop: 8 },
  actions: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  receiptBtn: { padding: '8px 14px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  deleteBtn: { padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  completedBanner: { background: '#d1fae5', color: '#065f46', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'inline-block' },
  receiptBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 10, marginTop: 12 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: 'white', padding: 28, borderRadius: 20, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalTitle: { fontSize: 20, fontWeight: 900, color: '#0f3460', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#64748b', marginBottom: 16 },
}