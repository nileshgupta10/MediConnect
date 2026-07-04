import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import StoreLayout from '../components/StoreLayout'

// ─── helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}` }
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PrescriptionVault() {
  const router = useRouter()

  // auth guard
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/simple-login')
      else setAuthReady(true)
    })
  }, [])

  // patients
  const [patients, setPatients]             = useState([])
  const [patientSearch, setPatientSearch]   = useState('')
  const [newName, setNewName]               = useState('')
  const [addingPatient, setAddingPatient]   = useState(false)
  const [patientMsg, setPatientMsg]         = useState('')

  // active patient + records
  const [active, setActive]                 = useState(null)   // { id, name }
  const [records, setRecords]               = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  // upload form
  const [file, setFile]                     = useState(null)
  const [filePreview, setFilePreview]       = useState(null)
  const [recordDate, setRecordDate]         = useState(today())
  const [uploading, setUploading]           = useState(false)
  const [uploadMsg, setUploadMsg]           = useState('')
  const [dragOver, setDragOver]             = useState(false)
  const fileInputRef                        = useRef(null)

  // zoom modal
  const [zoomUrl, setZoomUrl]               = useState(null)

  // ── load patients on mount ─────────────────────────────────────
  useEffect(() => {
    if (authReady) loadPatients()
  }, [authReady])

  const loadPatients = async () => {
    const headers = await authHeader()
    if (!headers) return
    const res  = await fetch('/api/vault/patients', { headers })
    const json = await res.json()
    if (res.ok) setPatients(json.patients || [])
  }

  // ── load records when active patient changes ───────────────────
  useEffect(() => {
    if (!active) { setRecords([]); return }
    loadRecords(active.id)
  }, [active])

  const loadRecords = async (patientId) => {
    setLoadingRecords(true)
    const headers = await authHeader()
    if (!headers) { setLoadingRecords(false); return }
    const res  = await fetch(`/api/vault/records?patient_id=${patientId}`, { headers })
    const json = await res.json()
    if (res.ok) setRecords(json.records || [])
    setLoadingRecords(false)
  }

  // ── add patient ────────────────────────────────────────────────
  const handleAddPatient = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAddingPatient(true)
    setPatientMsg('')
    const headers = await authHeader()
    if (!headers) { setAddingPatient(false); return }

    const res  = await fetch('/api/vault/patients', {
      method:  'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: newName.trim() }),
    })
    const json = await res.json()
    setAddingPatient(false)

    if (res.status === 409 && json.patient) {
      // duplicate — select the existing patient
      setPatientMsg(`"${json.patient.name}" already exists — selected.`)
      setActive(json.patient)
      setNewName('')
      return
    }
    if (!res.ok) {
      setPatientMsg(json.error || 'Failed to add patient.')
      return
    }

    setPatients(prev => [...prev, json.patient].sort((a, b) => a.name.localeCompare(b.name)))
    setActive(json.patient)
    setNewName('')
  }

  // ── file selection (click or drop) ────────────────────────────
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const MAX_MB  = 10

  const handleFileSelect = (f) => {
    if (!f) return
    if (!ALLOWED.includes(f.type)) {
      setUploadMsg('❌ Only JPG, PNG, WEBP, HEIC files are allowed.')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setUploadMsg(`❌ File is ${(f.size / 1024 / 1024).toFixed(1)} MB — max is ${MAX_MB} MB.`)
      return
    }
    setFile(f)
    setFilePreview(URL.createObjectURL(f))
    setUploadMsg('')
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }, [])

  // ── upload ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file || !active || !recordDate) return
    setUploading(true)
    setUploadMsg('')

    const headers = await authHeader()
    if (!headers) { setUploading(false); return }

    const form = new FormData()
    form.append('file',        file)
    form.append('patient_id',  active.id)
    form.append('record_date', recordDate)

    const res  = await fetch('/api/vault/upload', { method: 'POST', headers, body: form })
    const json = await res.json()
    setUploading(false)

    if (!res.ok) {
      setUploadMsg(json.error || 'Upload failed.')
      return
    }

    setUploadMsg('✅ Prescription saved.')
    setFile(null)
    setFilePreview(null)
    setRecordDate(today())
    if (fileInputRef.current) fileInputRef.current.value = ''
    // Reload records to get fresh signed URL
    loadRecords(active.id)
  }

  // ── filtered patients ──────────────────────────────────────────
  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  )

  if (!authReady) return null

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <StoreLayout>
      <div style={s.page}>

        {/* ── LEFT PANEL ──────────────────────────────────────── */}
        <aside style={s.sidebar}>
          <h2 style={s.sideTitle}>Patients</h2>

          {/* Add patient */}
          <form onSubmit={handleAddPatient} style={s.addForm}>
            <input
              style={s.input}
              type="text"
              placeholder="Patient name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              disabled={addingPatient}
            />
            <button type="submit" style={s.addBtn} disabled={addingPatient || !newName.trim()}>
              {addingPatient ? '…' : '+'}
            </button>
          </form>
          {patientMsg && <p style={s.infoMsg}>{patientMsg}</p>}

          {/* Search */}
          {patients.length > 5 && (
            <input
              style={{ ...s.input, marginBottom: 8 }}
              type="search"
              placeholder="Search patients…"
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
            />
          )}

          {/* Patient list */}
          <div style={s.patientList}>
            {filteredPatients.length === 0 && (
              <p style={s.emptyHint}>
                {patients.length === 0
                  ? 'No patients yet. Add one above.'
                  : 'No match.'}
              </p>
            )}
            {filteredPatients.map(p => (
              <button
                key={p.id}
                style={active?.id === p.id ? { ...s.patientRow, ...s.patientRowActive } : s.patientRow}
                onClick={() => { setActive(p); setPatientMsg(''); setUploadMsg('') }}
              >
                <span style={s.patientAvatar}>{p.name[0].toUpperCase()}</span>
                <span style={s.patientName}>{p.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── RIGHT PANEL ─────────────────────────────────────── */}
        <main style={s.main}>
          {!active ? (
            <div style={s.placeholder}>
              <div style={s.placeholderIcon}>🗂️</div>
              <p style={s.placeholderTitle}>Select or add a patient</p>
              <p style={s.placeholderSub}>Their prescription history will appear here.</p>
            </div>
          ) : (
            <>
              {/* Patient header */}
              <div style={s.patientHeader}>
                <div style={s.patientHeaderAvatar}>{active.name[0].toUpperCase()}</div>
                <h1 style={s.patientHeaderName}>{active.name}</h1>
              </div>

              {/* Upload form */}
              <div style={s.card}>
                <h3 style={s.cardTitle}>Upload Prescription</h3>

                {/* Dropzone */}
                <div
                  style={dragOver ? { ...s.dropzone, ...s.dropzoneActive } : s.dropzone}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {filePreview ? (
                    <img src={filePreview} alt="preview" style={s.preview} />
                  ) : (
                    <>
                      <span style={s.dropIcon}>📷</span>
                      <span style={s.dropText}>Drag & drop or click to select</span>
                      <span style={s.dropSub}>JPG · PNG · WEBP · HEIC · max 10 MB</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  style={{ display: 'none' }}
                  onChange={e => handleFileSelect(e.target.files?.[0])}
                />

                {/* Date + save row */}
                <div style={s.uploadRow}>
                  <div style={s.dateWrap}>
                    <label style={s.dateLabel}>Prescription Date</label>
                    <input
                      type="date"
                      style={s.dateInput}
                      value={recordDate}
                      onChange={e => setRecordDate(e.target.value)}
                      max={today()}
                    />
                  </div>
                  <button
                    style={file && !uploading ? s.saveBtn : { ...s.saveBtn, ...s.saveBtnDisabled }}
                    onClick={handleUpload}
                    disabled={!file || uploading}
                  >
                    {uploading ? 'Uploading…' : 'Save Prescription'}
                  </button>
                </div>

                {uploadMsg && (
                  <p style={uploadMsg.startsWith('✅') ? s.successMsg : s.errorMsg}>{uploadMsg}</p>
                )}
              </div>

              {/* Timeline */}
              <div style={s.card}>
                <h3 style={s.cardTitle}>Prescription History</h3>
                {loadingRecords && <p style={s.infoMsg}>Loading…</p>}
                {!loadingRecords && records.length === 0 && (
                  <p style={s.emptyHint}>No prescriptions uploaded yet.</p>
                )}
                <div style={s.timeline}>
                  {records.map(rec => (
                    <div key={rec.id} style={s.timelineItem}>
                      <div style={s.timelineDot} />
                      <div style={s.timelineContent}>
                        <p style={s.timelineDate}>
                          {new Date(rec.record_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                        {rec.signedUrl ? (
                          <img
                            src={rec.signedUrl}
                            alt={`Rx ${rec.record_date}`}
                            style={s.thumbnail}
                            onClick={() => setZoomUrl(rec.signedUrl)}
                            title="Click to view full size"
                          />
                        ) : (
                          <p style={s.emptyHint}>Preview unavailable</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── ZOOM MODAL ──────────────────────────────────────────── */}
      {zoomUrl && (
        <div style={s.modalBackdrop} onClick={() => setZoomUrl(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setZoomUrl(null)}>✕</button>
            <img src={zoomUrl} alt="Prescription full view" style={s.modalImg} />
          </div>
        </div>
      )}
    </StoreLayout>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  page:              { display: 'flex', minHeight: 'calc(100vh - 56px)', background: '#f0fdfd' },

  // sidebar
  sidebar:           { width: 260, flexShrink: 0, background: '#fff', borderRight: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: 8 },
  sideTitle:         { fontSize: 15, fontWeight: 800, color: '#0f3460', margin: '0 0 12px' },
  addForm:           { display: 'flex', gap: 6, marginBottom: 4 },
  input:             { flex: 1, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0f3460' },
  addBtn:            { padding: '8px 14px', background: '#0e9090', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  infoMsg:           { fontSize: 12, color: '#0e9090', margin: '4px 0 8px' },
  patientList:       { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  emptyHint:         { fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' },
  patientRow:        { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' },
  patientRowActive:  { background: '#f0fdfd', outline: '2px solid #0e9090' },
  patientAvatar:     { width: 30, height: 30, borderRadius: '50%', background: '#0e9090', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 },
  patientName:       { fontSize: 13, fontWeight: 600, color: '#0f3460', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  // main panel
  main:              { flex: 1, padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
  placeholder:       { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.6 },
  placeholderIcon:   { fontSize: 48 },
  placeholderTitle:  { fontSize: 18, fontWeight: 800, color: '#0f3460', margin: 0 },
  placeholderSub:    { fontSize: 14, color: '#64748b', margin: 0 },

  // patient header
  patientHeader:     { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 },
  patientHeaderAvatar: { width: 44, height: 44, borderRadius: '50%', background: '#0e9090', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 },
  patientHeaderName: { fontSize: 22, fontWeight: 800, color: '#0f3460', margin: 0 },

  // card
  card:              { background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 },
  cardTitle:         { fontSize: 14, fontWeight: 800, color: '#0f3460', margin: 0 },

  // dropzone
  dropzone:          { border: '2px dashed #cbd5e1', borderRadius: 12, padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', transition: 'border-color 0.2s', minHeight: 140, background: '#f8fafc' },
  dropzoneActive:    { borderColor: '#0e9090', background: '#f0fdfd' },
  dropIcon:          { fontSize: 32 },
  dropText:          { fontSize: 14, fontWeight: 600, color: '#475569' },
  dropSub:           { fontSize: 12, color: '#94a3b8' },
  preview:           { maxHeight: 120, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' },

  // upload row
  uploadRow:         { display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
  dateWrap:          { display: 'flex', flexDirection: 'column', gap: 4 },
  dateLabel:         { fontSize: 12, fontWeight: 600, color: '#64748b' },
  dateInput:         { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f3460', outline: 'none' },
  saveBtn:           { padding: '9px 20px', background: '#0e9090', color: '#fff', border: 'none', borderRadius: 99, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  saveBtnDisabled:   { background: '#cbd5e1', cursor: 'not-allowed' },
  successMsg:        { fontSize: 13, color: '#16a34a', fontWeight: 600 },
  errorMsg:          { fontSize: 13, color: '#dc2626', fontWeight: 600 },

  // timeline
  timeline:          { display: 'flex', flexDirection: 'column', gap: 20 },
  timelineItem:      { display: 'flex', gap: 16, alignItems: 'flex-start' },
  timelineDot:       { width: 10, height: 10, borderRadius: '50%', background: '#0e9090', marginTop: 6, flexShrink: 0 },
  timelineContent:   { flex: 1, display: 'flex', flexDirection: 'column', gap: 8 },
  timelineDate:      { fontSize: 13, fontWeight: 700, color: '#0f3460', margin: 0 },
  thumbnail:         { maxWidth: 220, maxHeight: 160, borderRadius: 8, objectFit: 'cover', cursor: 'zoom-in', border: '1.5px solid #e2e8f0', transition: 'transform 0.15s', display: 'block' },

  // zoom modal
  modalBackdrop:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalBox:          { position: 'relative', maxWidth: '92vw', maxHeight: '92vh', background: '#fff', borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalClose:        { position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', fontWeight: 700, zIndex: 1 },
  modalImg:          { maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', display: 'block' },
}
