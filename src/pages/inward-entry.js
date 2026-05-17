import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import BarcodeScanner from '../components/BarcodeScanner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const emptyItem = {
  barcode: '', product_name: '', company: '', pack: '',
  qty: '', batch: '', expiry: '', ptr: '', mrp: '', gst: '',
};

export default function InwardEntry() {
  const [bill, setBill] = useState({ distributor_name: '', bill_number: '', bill_date: '' });
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState({ ...emptyItem });
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [productNotFound, setProductNotFound] = useState(false);

  // --- Barcode scanned ---
  aasync function handleScan(barcode) {
  setShowScanner(false);
  setCurrent(prev => ({ ...prev, barcode }));
  setProductNotFound(false);

  // 1. Local Supabase barcode_mappings
  const { data: mapping } = await supabase
    .from('barcode_mappings')
    .select('product_id, products(product_name, company, pack, gst)')
    .eq('barcode', barcode)
    .maybeSingle();
  if (mapping?.products) {
    const p = mapping.products;
    setCurrent(prev => ({ ...prev, barcode, product_name: p.product_name || '', company: p.company || '', pack: p.pack || '', gst: p.gst || '' }));
    return;
  }

  // 2. Local Supabase products table
  const { data: product } = await supabase
    .from('products')
    .select('*').eq('barcode', barcode).maybeSingle();
  if (product) {
    setCurrent(prev => ({ ...prev, barcode, product_name: product.product_name || '', company: product.company || '', pack: product.pack || '', gst: product.gst || '' }));
    return;
  }

  // 3. Open Food Facts — largest free FMCG database
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product) {
      const p = d.product;
      const name = p.product_name_en || p.product_name || p.generic_name_en || p.generic_name || '';
      if (name) {
        setCurrent(prev => ({ ...prev, barcode, product_name: name, company: p.brands || '', pack: p.quantity || '', gst: '' }));
        return;
      }
    }
  } catch {}

  // 4. UPC Item DB — strong FMCG + pharma coverage
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    const d = await r.json();
    if (d.code === 'OK' && d.items?.length > 0) {
      const p = d.items[0];
      setCurrent(prev => ({ ...prev, barcode, product_name: p.title || '', company: p.brand || '', pack: p.size || '', gst: '' }));
      return;
    }
  } catch {}

  // 5. Datakick — open product database
  try {
    const r = await fetch(`https://www.datakick.org/api/items/${barcode}`);
    const d = await r.json();
    if (d.name) {
      setCurrent(prev => ({ ...prev, barcode, product_name: d.name || '', company: d.brand_name || '', pack: d.size || '', gst: '' }));
      return;
    }
  } catch {}

  // 6. Open Beauty Facts — covers cosmetics/pharma OTC
  try {
    const r = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product?.product_name) {
      const p = d.product;
      setCurrent(prev => ({ ...prev, barcode, product_name: p.product_name || '', company: p.brands || '', pack: p.quantity || '', gst: '' }));
      return;
    }
  } catch {}

  // Nothing found
  setProductNotFound(true);
}

  // --- Add item to list ---
  function addItem() {
    if (!current.product_name || !current.qty) {
      setError('Product name and quantity are required.');
      return;
    }
    setError(null);
    setItems(prev => [...prev, { ...current }]);
    setCurrent({ ...emptyItem });
    setProductNotFound(false);
    // Auto-focus barcode field for next scan
    document.getElementById('barcode-input')?.focus();
  }

  // --- Handle Enter key on any field ---
  function handleKeyDown(e, nextId) {
    if (e.key === 'Enter' && nextId) {
      e.preventDefault();
      document.getElementById(nextId)?.focus();
    }
  }

  // --- Save full bill ---
  async function saveBill() {
    if (!bill.distributor_name || !bill.bill_number || !bill.bill_date) {
      setError('Fill in distributor name, bill number and bill date.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one item before saving.');
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch('/api/inward-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill, items }),
    });

    const data = await res.json();
    setSaving(false);

    if (data.error) {
      setError(data.error);
    } else {
      setSaved(true);
    }
  }

  // --- Export CSV ---
  function exportCSV() {
    const headers = ['Barcode','Product Name','Company','Pack','Qty','Batch','Expiry','PTR','MRP','GST'];
    const rows = items.map(i => [
      i.barcode, i.product_name, i.company, i.pack,
      i.qty, i.batch, i.expiry, i.ptr, i.mrp, i.gst
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inward_${bill.bill_number || 'bill'}.csv`;
    a.click();
  }

  // --- Remove item ---
  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  if (saved) {
    return (
      <div style={styles.centered}>
        <div style={styles.successBox}>
          <p style={styles.successIcon}>✅</p>
          <p style={styles.successTitle}>Bill Saved!</p>
          <p style={styles.successSub}>
            {items.length} items saved for {bill.distributor_name}
          </p>
          <div style={styles.successBtns}>
            <button onClick={exportCSV} style={styles.csvBtn}>⬇ Export CSV</button>
            <button onClick={() => {
              setBill({ distributor_name: '', bill_number: '', bill_date: '' });
              setItems([]);
              setCurrent({ ...emptyItem });
              setSaved(false);
            }} style={styles.newBtn}>+ New Bill</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <h2 style={styles.heading}>📦 Inward Entry</h2>

      {/* Bill Header */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>Bill Details</p>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Distributor Name</label>
            <input
              style={styles.input}
              placeholder="e.g. Patwari Agencies"
              value={bill.distributor_name}
              onChange={e => setBill(p => ({ ...p, distributor_name: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'bill-number')}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Bill Number</label>
            <input
              id="bill-number"
              style={styles.input}
              placeholder="e.g. INV-1234"
              value={bill.bill_number}
              onChange={e => setBill(p => ({ ...p, bill_number: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'bill-date')}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Bill Date</label>
            <input
              id="bill-date"
              type="date"
              style={styles.input}
              value={bill.bill_date}
              onChange={e => setBill(p => ({ ...p, bill_date: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Product Entry */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>Add Product</p>

        {/* Barcode Row */}
        <div style={styles.barcodeRow}>
          <input
            id="barcode-input"
            style={{ ...styles.input, flex: 1 }}
            placeholder="Barcode (scan or type)"
            value={current.barcode}
            onChange={e => setCurrent(p => ({ ...p, barcode: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') handleScan(current.barcode);
            }}
          />
          <button onClick={() => setShowScanner(true)} style={styles.scanBtn}>
            📷 Scan
          </button>
        </div>

        {productNotFound && (
          <p style={styles.notFound}>⚠ Product not found — enter details manually below</p>
        )}

        {/* Autofilled fields */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Product Name *</label>
            <input
              id="product-name"
              style={styles.input}
              placeholder="Product name"
              value={current.product_name}
              onChange={e => setCurrent(p => ({ ...p, product_name: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'company')}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Company</label>
            <input
              id="company"
              style={styles.input}
              placeholder="Company"
              value={current.company}
              onChange={e => setCurrent(p => ({ ...p, company: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'pack')}
            />
          </div>
          <div style={styles.fieldSmall}>
            <label style={styles.label}>Pack</label>
            <input
              id="pack"
              style={styles.input}
              placeholder="e.g. 10x10"
              value={current.pack}
              onChange={e => setCurrent(p => ({ ...p, pack: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'qty')}
            />
          </div>
          <div style={styles.fieldSmall}>
            <label style={styles.label}>GST %</label>
            <input
              id="gst"
              style={styles.input}
              placeholder="12"
              value={current.gst}
              onChange={e => setCurrent(p => ({ ...p, gst: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'qty')}
            />
          </div>
        </div>

        {/* Manual entry fields */}
        <div style={styles.row}>
          <div style={styles.fieldSmall}>
            <label style={styles.label}>Qty *</label>
            <input
              id="qty"
              style={styles.inputHighlight}
              placeholder="Qty"
              type="number"
              value={current.qty}
              onChange={e => setCurrent(p => ({ ...p, qty: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'batch')}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Batch</label>
            <input
              id="batch"
              style={styles.inputHighlight}
              placeholder="Batch no."
              value={current.batch}
              onChange={e => setCurrent(p => ({ ...p, batch: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'expiry')}
            />
          </div>
          <div style={styles.fieldSmall}>
            <label style={styles.label}>Expiry (MM/YY)</label>
            <input
              id="expiry"
              style={styles.inputHighlight}
              placeholder="MM/YY"
              value={current.expiry}
              onChange={e => setCurrent(p => ({ ...p, expiry: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'ptr')}
            />
          </div>
          <div style={styles.fieldSmall}>
            <label style={styles.label}>PTR</label>
            <input
              id="ptr"
              style={styles.inputHighlight}
              placeholder="PTR"
              type="number"
              value={current.ptr}
              onChange={e => setCurrent(p => ({ ...p, ptr: e.target.value }))}
              onKeyDown={e => handleKeyDown(e, 'mrp')}
            />
          </div>
          <div style={styles.fieldSmall}>
            <label style={styles.label}>MRP</label>
            <input
              id="mrp"
              style={styles.inputHighlight}
              placeholder="MRP"
              type="number"
              value={current.mrp}
              onChange={e => setCurrent(p => ({ ...p, mrp: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
            />
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button onClick={addItem} style={styles.addBtn}>
          + Add Next Product
        </button>
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div style={styles.card}>
          <p style={styles.cardTitle}>Added Items ({items.length})</p>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['#','Product','Company','Pack','Qty','Batch','Expiry','PTR','MRP','GST',''].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{item.product_name}</td>
                    <td style={styles.td}>{item.company}</td>
                    <td style={styles.td}>{item.pack}</td>
                    <td style={styles.td}>{item.qty}</td>
                    <td style={styles.td}>{item.batch}</td>
                    <td style={styles.td}>{item.expiry}</td>
                    <td style={styles.td}>{item.ptr}</td>
                    <td style={styles.td}>{item.mrp}</td>
                    <td style={styles.td}>{item.gst}%</td>
                    <td style={styles.td}>
                      <button onClick={() => removeItem(i)} style={styles.removeBtn}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.saveBtnRow}>
            <button onClick={exportCSV} style={styles.csvBtn}>⬇ Export CSV</button>
            <button onClick={saveBill} style={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Bill'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '16px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' },
  heading: { fontSize: '22px', fontWeight: '700', marginBottom: '16px', color: '#111827' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '16px' },
  cardTitle: { fontWeight: '600', fontSize: '15px', marginBottom: '12px', color: '#374151' },
  row: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' },
  field: { flex: '1 1 180px' },
  fieldSmall: { flex: '1 1 100px' },
  label: { display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
  inputHighlight: { width: '100%', padding: '8px 10px', border: '2px solid #10b981', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: '#f0fdf4' },
  barcodeRow: { display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' },
  scanBtn: { padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' },
  addBtn: { marginTop: '12px', width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { padding: '11px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  csvBtn: { padding: '11px 20px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
  saveBtnRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { background: '#f3f4f6', padding: '8px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '7px 8px', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff' },
  trOdd: { background: '#f9fafb' },
  removeBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' },
  notFound: { color: '#d97706', fontSize: '13px', marginBottom: '10px' },
  error: { color: '#ef4444', fontSize: '13px', marginTop: '8px' },
  centered: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  successBox: { textAlign: 'center', background: '#fff', padding: '40px', borderRadius: '12px', border: '1px solid #e5e7eb' },
  successIcon: { fontSize: '48px', margin: '0' },
  successTitle: { fontSize: '24px', fontWeight: '700', margin: '12px 0 6px' },
  successSub: { color: '#6b7280', marginBottom: '24px' },
  successBtns: { display: 'flex', gap: '12px', justifyContent: 'center' },
  newBtn: { padding: '11px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};