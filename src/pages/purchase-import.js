import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import StoreLayout from '../components/StoreLayout'

// ─── IMAGE COMPRESSOR (optimised for OCR — sharp text, smaller size) ─────────
async function compressForOCR(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = e => { img.src = e.target.result }
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1000
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        const f = new File([blob], 'bill.jpg', { type: 'image/jpeg' })
        resolve(f)
      }, 'image/jpeg', 0.85) // 0.85 = sharp enough for text, small enough for API
    }
    reader.readAsDataURL(file)
  })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── DBF BINARY GENERATOR (same as before) ───────────────────────────────────
const FIELDS = [
  { name: 'PARTYCODE',  type: 'C', len: 3,  dec: 0 },
  { name: 'NAME',       type: 'C', len: 40, dec: 0 },
  { name: 'ADD1',       type: 'C', len: 40, dec: 0 },
  { name: 'VOU_NO',     type: 'N', len: 6,  dec: 0 },
  { name: 'VOU_TYPE',   type: 'C', len: 3,  dec: 0 },
  { name: 'TR_DATE',    type: 'D', len: 8,  dec: 0 },
  { name: 'DUE_DATE',   type: 'D', len: 8,  dec: 0 },
  { name: 'PROD_CODE',  type: 'C', len: 10, dec: 0 },
  { name: 'PROD_NAME',  type: 'C', len: 30, dec: 0 },
  { name: 'COMP_NAME',  type: 'C', len: 30, dec: 0, nullable: true },
  { name: 'PAK',        type: 'C', len: 6,  dec: 0 },
  { name: 'UOM',        type: 'N', len: 5,  dec: 0 },
  { name: 'COMP',       type: 'C', len: 3,  dec: 0 },
  { name: 'QTY',        type: 'N', len: 7,  dec: 0 },
  { name: 'QTY_SCM',    type: 'N', len: 7,  dec: 0 },
  { name: 'DISC_SCM',   type: 'N', len: 6,  dec: 2 },
  { name: 'PR_BATCHNO', type: 'C', len: 15, dec: 0 },
  { name: 'EXPIRY',     type: 'C', len: 5,  dec: 0 },
  { name: 'RATE',       type: 'N', len: 12, dec: 3 },
  { name: 'MRP',        type: 'N', len: 12, dec: 2 },
  { name: 'DISCOUNT',   type: 'N', len: 6,  dec: 2 },
  { name: 'DISC_AMT',   type: 'N', len: 12, dec: 2 },
  { name: 'PR_PTR',     type: 'N', len: 11, dec: 3 },
  { name: 'SPL_DISC',   type: 'N', len: 8,  dec: 2 },
  { name: 'SURCHARGE',  type: 'N', len: 8,  dec: 2 },
  { name: 'DISC_PER',   type: 'N', len: 6,  dec: 2 },
  { name: 'CASH_DISC',  type: 'N', len: 8,  dec: 2 },
  { name: 'CR_AMT',     type: 'N', len: 10, dec: 2 },
  { name: 'PTS_PER',    type: 'N', len: 5,  dec: 2 },
  { name: 'PTS_AMT',    type: 'N', len: 10, dec: 2 },
  { name: 'DEBIT',      type: 'N', len: 12, dec: 2 },
  { name: 'GROS_AMT',   type: 'N', len: 12, dec: 2 },
  { name: 'CAT_CODE',   type: 'C', len: 3,  dec: 0 },
  { name: 'FREIGHT',    type: 'N', len: 10, dec: 2 },
  { name: 'BAR_CODE',   type: 'C', len: 50, dec: 0 },
  { name: 'HSNCODE',    type: 'C', len: 15, dec: 0 },
  { name: 'SGST',       type: 'N', len: 5,  dec: 2 },
  { name: 'CGST',       type: 'N', len: 5,  dec: 2 },
  { name: 'IGST',       type: 'N', len: 5,  dec: 2 },
  { name: 'SGSTAMT',    type: 'N', len: 10, dec: 3 },
  { name: 'CGSTAMT',    type: 'N', len: 10, dec: 3 },
  { name: 'IGSTAMT',    type: 'N', len: 10, dec: 3 },
  { name: 'SHELF_NO',   type: 'C', len: 10, dec: 0 },
  { name: '_NullFlags', type: '0', len: 1,  dec: 0, flag: 0x05 },
]
const HEADER_SIZE = 1704
const RECORD_SIZE = 499

function writeString(view, offset, str, len) {
  const b = new TextEncoder().encode(str || '')
  for (let i = 0; i < len; i++) view.setUint8(offset + i, i < b.length ? b[i] : 0x20)
}
function writeDate(view, offset, dateStr) {
  const d = (dateStr || '20250101').replace(/-/g, '').padEnd(8, '0').slice(0, 8)
  new TextEncoder().encode(d).forEach((b, i) => view.setUint8(offset + i, b))
}
function writeNumeric(view, offset, value, len, dec) {
  let str = dec > 0 ? Number(value || 0).toFixed(dec) : String(Math.round(Number(value || 0)))
  str = str.padStart(len, ' ').slice(-len)
  const b = new TextEncoder().encode(str)
  for (let i = 0; i < len; i++) view.setUint8(offset + i, i < b.length ? b[i] : 0x20)
}
function generateDBF(records) {
  const buf  = new ArrayBuffer(HEADER_SIZE + records.length * RECORD_SIZE + 1)
  const view = new DataView(buf)
  const u8   = new Uint8Array(buf)
  const now  = new Date()
  view.setUint8(0, 0x30)
  view.setUint8(1, now.getFullYear() - 1900)
  view.setUint8(2, now.getMonth() + 1)
  view.setUint8(3, now.getDate())
  view.setUint32(4, records.length, true)
  view.setUint16(8, HEADER_SIZE, true)
  view.setUint16(10, RECORD_SIZE, true)
  view.setUint8(29, 0x03)
  let fo = 32, ro = 1
  const enc = new TextEncoder()
  for (const f of FIELDS) {
    const nb = enc.encode(f.name)
    for (let i = 0; i < 11; i++) view.setUint8(fo + i, i < nb.length ? nb[i] : 0x00)
    view.setUint8(fo + 11, f.type.charCodeAt(0))
    view.setUint32(fo + 12, ro, true)
    view.setUint8(fo + 16, f.len)
    view.setUint8(fo + 17, f.dec)
    if (f.nullable) view.setUint8(fo + 18, 0x02)
    if (f.flag)     view.setUint8(fo + 18, f.flag)
    fo += 32; ro += f.len
  }
  view.setUint8(fo, 0x0D)
  records.forEach((rec, ri) => {
    const base = HEADER_SIZE + ri * RECORD_SIZE
    view.setUint8(base, 0x20)
    let off = base + 1
    for (const f of FIELDS) {
      const val = rec[f.name]
      if (f.type === 'C') writeString(view, off, val, f.len)
      else if (f.type === 'D') writeDate(view, off, val)
      else if (f.type === 'N') writeNumeric(view, off, val, f.len, f.dec)
      else if (f.type === '0') view.setUint8(off, 0x00)
      off += f.len
    }
  })
  u8[HEADER_SIZE + records.length * RECORD_SIZE] = 0x1A
  return buf
}
function buildRecords(header, items) {
  return items.map((item, idx) => {
    const qty = Number(item.qty || 0), rate = Number(item.rate || 0)
    const disc = Number(item.disc || 0), gst = Number(item.gst || 5)
    const sgst = gst / 2, cgst = gst / 2
    const gross = qty * rate, discAmt = gross * disc / 100
    const net = gross - discAmt
    const sgstAmt = net * sgst / 100, cgstAmt = net * cgst / 100
    return {
      PARTYCODE: (header.partyCode || '').slice(0, 3).toUpperCase(),
      NAME: header.distName || '', ADD1: header.address || '',
      VOU_NO: Number(header.billNo || 0), VOU_TYPE: header.vouType || 'PCC',
      TR_DATE: header.billDate || '', DUE_DATE: header.dueDate || header.billDate || '',
      PROD_CODE: item.prodCode || '', PROD_NAME: item.prodName || '',
      COMP_NAME: item.company || '', PAK: item.pack || '1*10', UOM: 1,
      COMP: (item.company || '').slice(0, 3).toUpperCase(),
      QTY: qty, QTY_SCM: 0, DISC_SCM: 0,
      PR_BATCHNO: item.batch || `AUTO${String(idx + 1).padStart(2, '0')}`,
      EXPIRY: item.expiry || '12/27',
      RATE: rate, MRP: Number(item.mrp || 0), DISCOUNT: disc,
      DISC_AMT: discAmt, PR_PTR: rate, SPL_DISC: 0, SURCHARGE: 0,
      DISC_PER: disc, CASH_DISC: 0, CR_AMT: 0, PTS_PER: 0, PTS_AMT: 0,
      DEBIT: net + sgstAmt + cgstAmt, GROS_AMT: gross,
      CAT_CODE: '', FREIGHT: 0, BAR_CODE: '',
      HSNCODE: item.hsn || '', SGST: sgst, CGST: cgst, IGST: 0,
      SGSTAMT: sgstAmt, CGSTAMT: cgstAmt, IGSTAMT: 0, SHELF_NO: '', _NullFlags: 0,
    }
  })
}
function downloadSMS(buf, filename) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' })),
    download: filename,
  })
  a.click(); URL.revokeObjectURL(a.href)
}

const blankItem = () => ({
  prodCode: '', prodName: '', company: '', pack: '1*10',
  qty: '', rate: '', mrp: '', disc: '', gst: '5',
  batch: '', expiry: '', hsn: '',
})

// ─── SCAN TICKER COMPONENT ────────────────────────────────────────────────────
function ScanTicker({ scansUsed, scanLimit }) {
  const pct    = scanLimit > 0 ? (scansUsed / scanLimit) * 100 : 0
  const left   = scanLimit - scansUsed
  const color  = pct >= 90 ? '#dc2626' : pct >= 67 ? '#f59e0b' : '#0e9090'
  const now    = new Date()
  const reset  = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div style={t.box}>
      <div style={t.top}>
        <span style={t.label}>📊 Monthly Scans</span>
        <span style={{ ...t.count, color }}>{scansUsed} / {scanLimit} used</span>
      </div>
      <div style={t.track}>
        <div style={{ ...t.fill, width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <div style={t.bottom}>
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>
          {left > 0 ? `${left} scan${left !== 1 ? 's' : ''} remaining` : '⚠️ Limit reached'}
        </span>
        <span style={t.reset}>Resets {reset}</span>
      </div>
    </div>
  )
}
const t = {
  box:    { background: 'white', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', marginBottom: 20 },
  top:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:  { fontSize: 13, fontWeight: 700, color: '#0f3460' },
  count:  { fontSize: 13, fontWeight: 800 },
  track:  { height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  fill:   { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  bottom: { display: 'flex', justifyContent: 'space-between' },
  reset:  { fontSize: 12, color: '#94a3b8' },
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PurchaseImport() {
  const today = new Date().toISOString().slice(0, 10)
  const [user,       setUser]       = useState(null)
  const [scansUsed,  setScansUsed]  = useState(0)
  const [scanLimit,  setScanLimit]  = useState(30)
  const [step,       setStep]       = useState('upload') // upload | review | done
  const [uploading,  setUploading]  = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pages,      setPages]      = useState([])      // [{ previewUrl, base64 }, ...]
  const [message,    setMessage]    = useState('')
  const [usedModel,  setUsedModel]  = useState('')
  const [header, setHeader] = useState({
    partyCode: '', distName: '', address: '',
    billNo: '', billDate: today, dueDate: today, vouType: 'PCC',
  })
  const [items, setItems] = useState([blankItem()])
  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)
  const multiRef   = useRef(null)

  useEffect(() => { loadUser() }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)
    const monthYear = new Date().toISOString().slice(0, 7)
    const { data } = await supabase
      .from('bill_scans')
      .select('scans_used, scan_limit')
      .eq('store_owner_id', user.id)
      .eq('month_year', monthYear)
      .maybeSingle()
    if (data) { setScansUsed(data.scans_used); setScanLimit(data.scan_limit) }
  }

  // Add one or more pages from file input
  const addPages = async (files) => {
    if (!files?.length) return
    setMessage('📸 Compressing images…')
    const newPages = []
    for (const file of Array.from(files)) {
      const compressed = await compressForOCR(file)
      const base64     = await fileToBase64(compressed)
      newPages.push({ previewUrl: URL.createObjectURL(file), base64 })
    }
    setPages(prev => [...prev, ...newPages])
    setMessage(`✓ ${newPages.length} page${newPages.length > 1 ? 's' : ''} added. Total: ${pages.length + newPages.length} page${pages.length + newPages.length > 1 ? 's' : ''}.`)
  }

  const removePage = (i) => setPages(prev => prev.filter((_, idx) => idx !== i))

  const handleScan = async () => {
    if (!pages.length) { setMessage('Please add at least one photo first.'); return }
    if (scansUsed >= scanLimit) {
      setMessage(`⚠️ Monthly scan limit reached. Resets next month.`)
      return
    }
    setUploading(true)
    setMessage(pages.length > 1
      ? '🔍 Reading multi-page bill with AI (Sonnet)… this may take 10-15 seconds…'
      : '🔍 Reading bill with AI… this takes a few seconds…'
    )
    try {
      const res = await fetch('/api/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: pages.map(p => ({ base64: p.base64, mimeType: 'image/jpeg' })),
          storeOwnerId: user.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage(json.error || 'Could not read bill. Try a clearer photo.')
        setUploading(false)
        return
      }
      const h = json.data.header || {}
      setHeader(prev => ({
        partyCode: h.partyCode || '',
        distName:  h.distName  || '',
        address:   h.address   || '',
        billNo:    h.billNo    || '',
        billDate:  h.billDate  || today,
        dueDate:   h.dueDate   || today,
        vouType:   prev.vouType || 'PCC',
      }))
      const extractedItems = (json.data.items || []).map(it => ({
        prodCode: it.prodCode || '',
        prodName: it.prodName || '',
        company:  it.company  || '',
        pack:     it.pack     || '1*10',
        qty:      String(it.qty   || ''),
        rate:     String(it.rate  || ''),
        mrp:      String(it.mrp   || ''),
        disc:     String(it.disc  || '0'),
        gst:      String(it.gst   || '5'),
        batch:    it.batch  || '',
        expiry:   it.expiry || '',
        hsn:      it.hsn    || '',
      }))
      setItems(extractedItems.length > 0 ? extractedItems : [blankItem()])
      setScansUsed(json.scansUsed)
      setScanLimit(json.scanLimit)
      setUsedModel(json.model)
      setMessage(`✓ Bill read successfully using ${json.model === 'sonnet' ? 'Sonnet (high accuracy)' : 'Haiku'}! Review and correct below.`)
      setStep('review')
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
    setUploading(false)
  }

  const setH = (k, v) => setHeader(h => ({ ...h, [k]: v }))
  const setItem = (i, k, v) => setItems(its => { const n = [...its]; n[i] = { ...n[i], [k]: v }; return n })
  const addItem    = () => setItems(its => [...its, blankItem()])
  const removeItem = (i) => setItems(its => its.filter((_, idx) => idx !== i))

  const generate = () => {
    if (!header.partyCode.trim()) { setMessage('Please enter Party Code.'); return }
    if (!header.distName.trim())  { setMessage('Please enter Distributor Name.'); return }
    if (!header.billNo.trim())    { setMessage('Please enter Bill Number.'); return }
    const validItems = items.filter(it => it.prodName.trim() && Number(it.qty) > 0)
    if (!validItems.length)       { setMessage('Please add at least one item.'); return }
    setGenerating(true)
    try {
      const records = buildRecords(header, validItems)
      const buf     = generateDBF(records)
      const fname   = `${header.partyCode.toUpperCase()}_${header.billNo}.SMS`
      downloadSMS(buf, fname)
      setMessage(`✓ ${fname} downloaded! Copy to C:\\download\\ on CARE PC, then click DwnLd Purch.`)
      setStep('done')
    } catch (e) { setMessage('Error: ' + e.message) }
    setGenerating(false)
  }

  const reset = () => {
    setStep('upload'); setPages([]); setMessage(''); setUsedModel('')
    setItems([blankItem()])
    setHeader({ partyCode: '', distName: '', address: '', billNo: '', billDate: today, dueDate: today, vouType: 'PCC' })
  }

  const totals = items.reduce((acc, it) => {
    const qty = Number(it.qty || 0), rate = Number(it.rate || 0)
    const disc = Number(it.disc || 0), gst = Number(it.gst || 5)
    const gross = qty * rate, discAmt = gross * disc / 100
    const net = gross - discAmt
    return { gross: acc.gross + gross, disc: acc.disc + discAmt, tax: acc.tax + net * gst / 100, net: acc.net + net + net * gst / 100 }
  }, { gross: 0, disc: 0, tax: 0, net: 0 })

  return (
    <StoreLayout>
      <div style={s.page}>

        {/* BANNER */}
        <div style={s.banner}>
          <div style={s.bannerOverlay} />
          <div style={s.bannerContent}>
            <div style={s.bannerIcon}>🧾</div>
            <div>
              <h2 style={s.bannerTitle}>Purchase Import</h2>
              <p style={s.bannerSub}>Photo → .SMS file for CARE software</p>
            </div>
          </div>
        </div>

        <div style={s.body}>

          {/* SCAN TICKER */}
          <ScanTicker scansUsed={scansUsed} scanLimit={scanLimit} />

          {/* INSTRUCTIONS */}
          <div style={s.infoBox}>
            <b>📋 How it works:</b> Take a photo of the bill → AI reads it → review & correct → download .SMS → copy to <code style={s.code}>C:\download\</code> on CARE PC → click DwnLd Purch
          </div>

          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <div style={s.card}>
              <h3 style={s.cardTitle}>📸 Photograph the Bill</h3>
              <p style={s.cardSub}>Add one photo per page. Multiple pages supported.</p>

              <input ref={cameraRef}  type="file" accept="image/*" capture="environment" hidden onChange={e => addPages(e.target.files)} />
              <input ref={galleryRef} type="file" accept="image/*" hidden multiple onChange={e => addPages(e.target.files)} />

              <div style={s.uploadBtns}>
                <button style={s.camBtn} onClick={() => cameraRef.current.click()} disabled={uploading}>
                  📷 Take Photo
                </button>
                <button style={s.galBtn} onClick={() => galleryRef.current.click()} disabled={uploading}>
                  🖼️ Add from Gallery
                </button>
              </div>

              {/* Page previews */}
              {pages.length > 0 && (
                <div style={s.pagesWrap}>
                  {pages.map((pg, i) => (
                    <div key={i} style={s.pageThumb}>
                      <img src={pg.previewUrl} alt={`Page ${i+1}`} style={s.thumbImg} />
                      <div style={s.thumbLabel}>Page {i + 1}</div>
                      <button style={s.thumbRemove} onClick={() => removePage(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {pages.length > 0 && (
                <button style={s.scanBtn} onClick={handleScan} disabled={uploading || scansUsed >= scanLimit}>
                  {uploading ? '⏳ Reading bill…' : `🔍 Scan ${pages.length} Page${pages.length > 1 ? 's' : ''} Now`}
                </button>
              )}

              {message && (
                <div style={message.startsWith('✓') ? s.successMsg : message.startsWith('⚠️') || message.startsWith('Error') ? s.errorMsg : s.infoMsg}>
                  {message}
                </div>
              )}

              <button style={s.manualBtn} onClick={() => setStep('review')}>
                ✏️ Enter bill manually instead
              </button>
            </div>
          )}

          {/* ── STEP 2: REVIEW ── */}
          {step === 'review' && (
            <>
              {/* Header */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>📄 Bill Header</h3>
                  <button style={s.backBtn} onClick={() => setStep('upload')}>← Rescan</button>
                </div>
                <div style={s.formGrid}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Party Code * <span style={s.hint2}>(3 chars)</span></label>
                    <input style={s.input} maxLength={3} value={header.partyCode} onChange={e => setH('partyCode', e.target.value.toUpperCase())} placeholder="TAP" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Bill Type *</label>
                    <select style={s.input} value={header.vouType} onChange={e => setH('vouType', e.target.value)}>
                      <option value="PCC">PCC — Credit Purchase</option>
                      <option value="PCS">PCS — Cash Purchase</option>
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Bill Number *</label>
                    <input style={s.input} value={header.billNo} onChange={e => setH('billNo', e.target.value)} placeholder="12345" />
                  </div>
                  <div style={{ ...s.formGroup, gridColumn: 'span 2' }}>
                    <label style={s.label}>Distributor Name *</label>
                    <input style={s.input} value={header.distName} onChange={e => setH('distName', e.target.value)} placeholder="Distributor name" />
                  </div>
                  <div style={{ ...s.formGroup, gridColumn: 'span 2' }}>
                    <label style={s.label}>Address</label>
                    <input style={s.input} value={header.address} onChange={e => setH('address', e.target.value)} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Bill Date</label>
                    <input style={s.input} type="date" value={header.billDate} onChange={e => setH('billDate', e.target.value)} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Due Date</label>
                    <input style={s.input} type="date" value={header.dueDate} onChange={e => setH('dueDate', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>💊 Line Items ({items.length})</h3>
                  <button style={s.addBtn} onClick={addItem}>+ Add Row</button>
                </div>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr style={s.thead}>
                        {['#','Product Name','Company','Qty','Rate','MRP','Disc%','GST%','Batch','Expiry','HSN',''].map((h,i) => (
                          <th key={i} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                          <td style={s.td}>{i + 1}</td>
                          <td style={s.td}><input style={{ ...s.tInput, width: 140 }} value={item.prodName} onChange={e => setItem(i, 'prodName', e.target.value)} placeholder="Product name" /></td>
                          <td style={s.td}><input style={s.tInput} value={item.company} onChange={e => setItem(i, 'company', e.target.value)} placeholder="Company" /></td>
                          <td style={s.td}><input style={{ ...s.tInput, width: 55 }} type="number" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} /></td>
                          <td style={s.td}><input style={{ ...s.tInput, width: 75 }} type="number" step="0.001" value={item.rate} onChange={e => setItem(i, 'rate', e.target.value)} /></td>
                          <td style={s.td}><input style={{ ...s.tInput, width: 75 }} type="number" step="0.01" value={item.mrp} onChange={e => setItem(i, 'mrp', e.target.value)} /></td>
                          <td style={s.td}><input style={{ ...s.tInput, width: 55 }} type="number" value={item.disc} onChange={e => setItem(i, 'disc', e.target.value)} /></td>
                          <td style={s.td}>
                            <select style={s.tSelect} value={item.gst} onChange={e => setItem(i, 'gst', e.target.value)}>
                              {['0','5','12','18','28'].map(g => <option key={g} value={g}>{g}%</option>)}
                            </select>
                          </td>
                          <td style={s.td}><input style={s.tInput} value={item.batch} onChange={e => setItem(i, 'batch', e.target.value)} placeholder="AUTO" /></td>
                          <td style={s.td}><input style={{ ...s.tInput, width: 65 }} value={item.expiry} onChange={e => setItem(i, 'expiry', e.target.value)} placeholder="MM/YY" /></td>
                          <td style={s.td}><input style={s.tInput} value={item.hsn} onChange={e => setItem(i, 'hsn', e.target.value)} placeholder="HSN" /></td>
                          <td style={s.td}>
                            {items.length > 1 && <button style={s.removeBtn} onClick={() => removeItem(i)}>✕</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div style={s.summary}>
                  <div style={s.sumRow}><span style={s.sumL}>Gross</span><span style={s.sumV}>₹{totals.gross.toFixed(2)}</span></div>
                  <div style={s.sumRow}><span style={s.sumL}>Discount</span><span style={{ ...s.sumV, color: '#dc2626' }}>-₹{totals.disc.toFixed(2)}</span></div>
                  <div style={s.sumRow}><span style={s.sumL}>GST</span><span style={s.sumV}>₹{totals.tax.toFixed(2)}</span></div>
                  <div style={{ ...s.sumRow, borderTop: '2px solid #0e9090', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ ...s.sumL, fontWeight: 900, color: '#0f3460', fontSize: 15 }}>Net Payable</span>
                    <span style={{ ...s.sumV, fontWeight: 900, color: '#0e9090', fontSize: 17 }}>₹{totals.net.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={s.noteBox}>💡 Blank batch → AUTO01, AUTO02… | Blank expiry → 12/27 | GST defaults to 5%</div>

              {message && (
                <div style={message.startsWith('✓') ? s.successMsg : s.errorMsg}>{message}</div>
              )}

              <button style={s.generateBtn} onClick={generate} disabled={generating}>
                {generating ? '⏳ Generating…' : '⬇️ Generate & Download .SMS File'}
              </button>
            </>
          )}

          {/* ── STEP 3: DONE ── */}
          {step === 'done' && (
            <div style={s.doneCard}>
              <div style={s.doneIcon}>✅</div>
              <h3 style={s.doneTitle}>.SMS File Downloaded!</h3>
              <div style={s.doneSteps}>
                <div style={s.doneStep}>1. Copy the file to <code style={s.code}>C:\download\</code> on the CARE PC</div>
                <div style={s.doneStep}>2. Open CARE software</div>
                <div style={s.doneStep}>3. Click <b>DwnLd Purch</b></div>
                <div style={s.doneStep}>4. Bill imports automatically ✓</div>
              </div>
              <button style={s.generateBtn} onClick={reset}>📸 Scan Another Bill</button>
              {message && <div style={s.successMsg}>{message}</div>}
            </div>
          )}

        </div>
      </div>
    </StoreLayout>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0fdfd', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  banner: { position: 'relative', height: 130, background: 'linear-gradient(135deg, #0f3460 0%, #0e9090 100%)', overflow: 'hidden' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' },
  bannerContent: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px' },
  bannerIcon: { fontSize: 36 },
  bannerTitle: { color: 'white', fontSize: 20, fontWeight: 900, margin: 0 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  body: { maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px' },
  infoBox: { background: '#e0f7f7', border: '1px solid #99f6e4', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#0f3460', lineHeight: 1.7 },
  code: { background: '#0f3460', color: '#5eead4', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' },
  card: { background: 'white', borderRadius: 16, padding: 20, marginBottom: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 800, color: '#0f3460', margin: 0 },
  cardSub: { fontSize: 13, color: '#64748b', marginBottom: 16, marginTop: 4 },
  uploadBtns: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  camBtn: { flex: 1, padding: '14px 20px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', minWidth: 140 },
  galBtn: { flex: 1, padding: '14px 20px', background: '#f1f5f9', color: '#0f3460', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', minWidth: 140 },
  previewWrap: { marginBottom: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: 300 },
  previewImg: { width: '100%', objectFit: 'contain', maxHeight: 300 },
  pagesWrap: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, marginTop: 8 },
  pageThumb: { position: 'relative', width: 90, height: 120, borderRadius: 8, overflow: 'hidden', border: '2px solid #0e9090', flexShrink: 0 },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(14,144,144,0.85)', color: 'white', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '3px 0' },
  thumbRemove: { position: 'absolute', top: 3, right: 3, background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  scanBtn: { width: '100%', padding: 14, background: '#0f3460', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 12 },
  manualBtn: { width: '100%', padding: 11, background: 'transparent', color: '#64748b', border: '1.5px dashed #cbd5e1', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  backBtn: { padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  addBtn: { padding: '7px 14px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  removeBtn: { background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 700, color: '#475569' },
  hint2: { fontWeight: 400, color: '#94a3b8' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 },
  thead: { background: '#f1f5f9' },
  th: { padding: '9px 7px', textAlign: 'left', fontWeight: 800, color: '#0f3460', fontSize: 12, whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0' },
  td: { padding: '5px 4px', verticalAlign: 'middle' },
  trEven: { background: 'white' }, trOdd: { background: '#f8fafc' },
  tInput: { padding: '6px 7px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: 90, boxSizing: 'border-box' },
  tSelect: { padding: '6px 4px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 },
  summary: { marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' },
  sumRow: { display: 'flex', gap: 20, alignItems: 'center' },
  sumL: { fontSize: 13, color: '#64748b', fontWeight: 600, minWidth: 100, textAlign: 'right' },
  sumV: { fontSize: 14, color: '#0f172a', fontWeight: 700, minWidth: 90, textAlign: 'right' },
  noteBox: { background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 },
  generateBtn: { width: '100%', padding: 15, background: '#0e9090', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 900, cursor: 'pointer', marginBottom: 14 },
  successMsg: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#15803d', fontWeight: 600, marginBottom: 12 },
  errorMsg: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 12 },
  infoMsg: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#0369a1', fontWeight: 600, marginBottom: 12 },
  doneCard: { background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  doneIcon: { fontSize: 52, marginBottom: 12 },
  doneTitle: { fontSize: 20, fontWeight: 900, color: '#0f3460', marginBottom: 20 },
  doneSteps: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left', maxWidth: 360, margin: '0 auto 24px' },
  doneStep: { background: '#f0fdfd', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#0f3460', fontWeight: 600 },
}