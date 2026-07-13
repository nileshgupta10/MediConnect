import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import StoreLayout from '../components/StoreLayout'

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}` }
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Client-side image compress (canvas, same pattern as purchase-import.js) ──
// Resizes to max 1600px on longest edge, exports JPEG @0.82 quality.
// Cuts typical 4-5 MB phone photo to ~300-500 KB before network.
function compressForUpload(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = e => { img.src = e.target.result }
    img.onload = () => {
      const MAX = 1600
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        resolve(new File([blob], 'rx.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.82)
    }
    reader.readAsDataURL(file)
  })
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PrescriptionVault() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/simple-login')
      else setAuthReady(true)
    })
  }, [])

  // ── patients ───────────────────────────────────────────────────
  const [patients,       setPatients]       = useState([])
  const [patientSearch,  setPatientSearch]  = useState('')
  const [newName,        setNewName]        = useState('')
  const [addingPatient,  setAddingPatient]  = useState(false)
  const [patientMsg,     setPatientMsg]     = useState('')
  const [renamingId,     setRenamingId]     = useState(null)   // patient id being renamed
  const [renameVal,      setRenameVal]      = useState('')
  const [deletingPatId,  setDeletingPatId]  = useState(null)   // confirm dialog

  // ── active patient + records ───────────────────────────────────
  const [active,         setActive]         = useState(null)
  const [records,        setRecords]        = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  // ── upload form ────────────────────────────────────────────────
  const [pages,          setPages]          = useState([])
  const [recordDate,     setRecordDate]     = useState(todayStr())
  const [uploadNotes,    setUploadNotes]    = useState('')
  const [uploading,      setUploading]      = useState(false)
  const [uploadStep,     setUploadStep]     = useState('')   // progress text
  const [uploadMsg,      setUploadMsg]      = useState('')
  const [dragOver,       setDragOver]       = useState(false)
  const [noImageMode,    setNoImageMode]    = useState(false)
  const fileInputRef = useRef(null)

  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [facingMode, setFacingMode] = useState('environment')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // ── record editing ─────────────────────────────────────────────
  const [editingRecId,   setEditingRecId]   = useState(null)
  const [editNoteVal,    setEditNoteVal]    = useState('')
  const [deletingRecId,  setDeletingRecId]  = useState(null)

  // ── modal ──────────────────────────────────────────────────────
  const [modalIdx,       setModalIdx]       = useState(null)  // index into records[]
  const [imgPageIdx,     setImgPageIdx]     = useState(0)
  const modalRef         = useRef(null)
  // pinch / wheel zoom
  const zoomState        = useRef({ scale: 1, startDist: null, startScale: 1 })

  // ── load patients ──────────────────────────────────────────────
  useEffect(() => { if (authReady) loadPatients() }, [authReady])

  useEffect(() => {
    if (!showCamera) return
    let cancelled = false
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode }, audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err) {
        setCameraError('Could not access camera. Check browser permissions, or use "Choose File" instead.')
      }
    }
    start()
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [showCamera, facingMode])

  const loadPatients = async () => {
    const h = await authHeader(); if (!h) return
    const res = await fetch('/api/vault/patients', { headers: h })
    const j   = await res.json()
    if (res.ok) setPatients(j.patients || [])
  }

  // ── load records ───────────────────────────────────────────────
  useEffect(() => {
    if (!active) { setRecords([]); return }
    loadRecords(active.id)
  }, [active])

  const loadRecords = async (pid) => {
    setLoadingRecords(true)
    const h = await authHeader(); if (!h) { setLoadingRecords(false); return }
    const res = await fetch(`/api/vault/records?patient_id=${pid}`, { headers: h })
    const j   = await res.json()
    if (res.ok) setRecords(j.records || [])
    setLoadingRecords(false)
  }

  // ── add patient ────────────────────────────────────────────────
  const handleAddPatient = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAddingPatient(true); setPatientMsg('')
    const h = await authHeader(); if (!h) { setAddingPatient(false); return }
    const res = await fetch('/api/vault/patients', {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const j = await res.json(); setAddingPatient(false)
    if (res.status === 409 && j.patient) {
      setPatientMsg(`"${j.patient.name}" already exists — selected.`)
      setActive(j.patient); setNewName(''); return
    }
    if (!res.ok) { setPatientMsg(j.error || 'Failed to add patient.'); return }
    setPatients(prev => [...prev, j.patient].sort((a, b) => a.name.localeCompare(b.name)))
    setActive(j.patient); setNewName('')
  }

  // ── rename patient ─────────────────────────────────────────────
  const handleRename = async (id) => {
    if (!renameVal.trim()) { setRenamingId(null); return }
    const h = await authHeader(); if (!h) return
    const res = await fetch('/api/vault/patients', {
      method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: renameVal.trim() }),
    })
    const j = await res.json()
    if (!res.ok) { setPatientMsg(j.error || 'Rename failed.'); setRenamingId(null); return }
    setPatients(prev => prev.map(p => p.id === id ? j.patient : p).sort((a, b) => a.name.localeCompare(b.name)))
    if (active?.id === id) setActive(j.patient)
    setRenamingId(null); setRenameVal('')
  }

  // ── soft-delete patient ────────────────────────────────────────
  const handleDeletePatient = async (id) => {
    const h = await authHeader(); if (!h) return
    const res = await fetch(`/api/vault/patients?id=${id}`, { method: 'DELETE', headers: h })
    if (!res.ok) { const j = await res.json(); setPatientMsg(j.error || 'Delete failed.'); }
    else {
      setPatients(prev => prev.filter(p => p.id !== id))
      if (active?.id === id) { setActive(null); setRecords([]) }
    }
    setDeletingPatId(null)
  }

  // ── file selection ─────────────────────────────────────────────
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const MAX_MB  = 10

  const handleFileSelect = (fOrList) => {
    if (!fOrList) return
    const filesToProcess = (fOrList instanceof FileList || Array.isArray(fOrList))
      ? Array.from(fOrList)
      : [fOrList]

    setPages(prev => {
      let newPages = [...prev]
      for (const f of filesToProcess) {
        if (newPages.length >= 5) {
          setUploadMsg('❌ Maximum 5 pages allowed.')
          break
        }
        if (!ALLOWED.includes(f.type)) {
          setUploadMsg(`❌ Only JPG, PNG, WEBP, HEIC files allowed. "${f.name}" was skipped.`)
          continue
        }
        if (f.size > MAX_MB * 1024 * 1024) {
          setUploadMsg(`❌ File "${f.name}" is ${(f.size/1024/1024).toFixed(1)} MB — max ${MAX_MB} MB.`)
          continue
        }
        newPages.push({ file: f, preview: URL.createObjectURL(f) })
        setUploadMsg('')
      }
      return newPages
    })
  }

  const removePage = (index) => {
    setPages(prev => {
      const target = prev[index]
      if (target?.preview) {
        URL.revokeObjectURL(target.preview)
      }
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const openCamera = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setUploadMsg('❌ Camera not supported on this browser/device. Please use Choose File.')
      return
    }
    setCameraError('')
    setShowCamera(true)
  }
  const closeCamera = () => setShowCamera(false)
  const switchCamera = () => setFacingMode(m => m === 'environment' ? 'user' : 'environment')
  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const f = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      handleFileSelect(f)
    }, 'image/jpeg', 0.9)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [])

  // ── upload ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if ((pages.length === 0 && !uploadNotes.trim()) || !active || !recordDate) return
    setUploading(true); setUploadMsg(''); setUploadStep('')

    const h = await authHeader(); if (!h) { setUploading(false); return }

    const form = new FormData()
    form.append('patient_id',  active.id)
    form.append('record_date', recordDate)
    if (uploadNotes.trim()) form.append('notes', uploadNotes.trim())

    if (pages.length > 0) {
      setUploadStep('Compressing images…')
      for (let i = 0; i < pages.length; i++) {
        const compressed = await compressForUpload(pages[i].file)
        form.append('file', compressed)
      }
      setUploadStep('Uploading…')
    }

    const res  = await fetch('/api/vault/upload', { method: 'POST', headers: h, body: form })
    const json = await res.json()
    setUploading(false); setUploadStep('')

    if (!res.ok) { setUploadMsg(json.error || 'Upload failed.'); return }

    setUploadMsg('✅ Saved.')
    pages.forEach(p => {
      if (p.preview) URL.revokeObjectURL(p.preview)
    })
    setPages([])
    setRecordDate(todayStr())
    setUploadNotes('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setNoImageMode(false)
    loadRecords(active.id)
  }

  // ── edit record notes ──────────────────────────────────────────
  const handleSaveNotes = async (rec) => {
    const h = await authHeader(); if (!h) return
    const res = await fetch('/api/vault/records', {
      method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rec.id, patient_id: active.id, notes: editNoteVal }),
    })
    const j = await res.json()
    if (res.ok) {
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, notes: j.record.notes, signedUrl: j.record.signedUrl || r.signedUrl } : r))
    }
    setEditingRecId(null)
  }

  // ── soft-delete record ─────────────────────────────────────────
  const handleDeleteRecord = async (id) => {
    const h = await authHeader(); if (!h) return
    const res = await fetch(`/api/vault/records?id=${id}&patient_id=${active.id}`, { method: 'DELETE', headers: h })
    if (res.ok) setRecords(prev => prev.filter(r => r.id !== id))
    setDeletingRecId(null)
  }

  // ── modal nav ──────────────────────────────────────────────────
  const openModal = (idx) => {
    setModalIdx(idx)
    setImgPageIdx(0)
    zoomState.current = { scale: 1, startDist: null, startScale: 1 }
  }
  const closeModal = () => { setModalIdx(null); zoomState.current.scale = 1 }

  // Pinch zoom (touch)
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      zoomState.current.startDist  = Math.hypot(dx, dy)
      zoomState.current.startScale = zoomState.current.scale
    }
  }
  const onTouchMove = (e) => {
    if (e.touches.length !== 2 || !zoomState.current.startDist) return
    const dx   = e.touches[0].clientX - e.touches[1].clientX
    const dy   = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const next = Math.min(5, Math.max(0.5, zoomState.current.startScale * (dist / zoomState.current.startDist)))
    zoomState.current.scale = next
    if (modalRef.current) modalRef.current.style.transform = `scale(${next})`
  }
  const onTouchEnd = () => { zoomState.current.startDist = null }

  // Wheel zoom (trackpad / mouse)
  const onWheel = (e) => {
    e.preventDefault()
    const next = Math.min(5, Math.max(0.5, zoomState.current.scale - e.deltaY * 0.002))
    zoomState.current.scale = next
    if (modalRef.current) modalRef.current.style.transform = `scale(${next})`
  }

  // Reset zoom on close
  const resetZoom = () => {
    zoomState.current.scale = 1
    if (modalRef.current) modalRef.current.style.transform = 'scale(1)'
  }

  // ── derived ────────────────────────────────────────────────────
  const filtered = patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
  const modalRec = modalIdx !== null ? records[modalIdx] : null
  const canSave  = (pages.length > 0 || uploadNotes.trim()) && !!recordDate

  if (!authReady) return null

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <StoreLayout>
      <div style={s.page} className="rxv-page">
        <style jsx>{`
          @media (max-width: 768px) {
            .rxv-page { flex-direction: column !important; }
            .rxv-sidebar {
              width: 100% !important;
              max-height: 240px !important;
              border-right: none !important;
              border-bottom: 1.5px solid #e2e8f0 !important;
              padding: 12px 14px !important;
            }
            .rxv-patient-list { max-height: 150px !important; overflow-y: auto !important; }
            .rxv-main { padding: 14px !important; }
            .rxv-thumbnail, .rxv-noimg {
              width: 100% !important;
              height: 160px !important;
            }
          }
        `}</style>

        {/* ── LEFT PANEL ─────────────────────────────────────────── */}
        <aside style={s.sidebar} className="rxv-sidebar">
          <h2 style={s.sideTitle}>Patients</h2>

          <form onSubmit={handleAddPatient} style={s.addForm}>
            <input style={s.input} type="text" placeholder="New patient name…"
              value={newName} onChange={e => setNewName(e.target.value)} disabled={addingPatient} />
            <button type="submit" style={s.addBtn} disabled={addingPatient || !newName.trim()}>
              {addingPatient ? '…' : '+'}
            </button>
          </form>
          {patientMsg && <p style={s.infoMsg}>{patientMsg}</p>}

          {patients.length > 4 && (
            <input style={{ ...s.input, marginBottom: 8 }} type="search"
              placeholder="Search patients…" value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)} />
          )}

          <div style={s.patientList} className="rxv-patient-list">
            {filtered.length === 0 && (
              <p style={s.emptyHint}>{patients.length === 0 ? 'Add your first patient above.' : 'No match.'}</p>
            )}
            {filtered.map(p => (
              <div key={p.id} style={active?.id === p.id ? { ...s.patientRow, ...s.patientRowActive } : s.patientRow}>
                {renamingId === p.id ? (
                  <input
                    autoFocus style={{ ...s.input, flex: 1, padding: '4px 8px' }}
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setRenamingId(null) }}
                    onBlur={() => handleRename(p.id)}
                  />
                ) : (
                  <button style={s.patientBtn}
                    onClick={() => { setActive(p); setPatientMsg(''); setUploadMsg('') }}>
                    <span style={s.patientAvatar}>{p.name[0].toUpperCase()}</span>
                    <span style={s.patientName}>{p.name}</span>
                  </button>
                )}
                {renamingId !== p.id && (
                  <div style={s.patientActions}>
                    <button style={s.iconBtn} title="Rename"
                      onClick={() => { setRenamingId(p.id); setRenameVal(p.name) }}>✏️</button>
                    <button style={s.iconBtn} title="Delete"
                      onClick={() => setDeletingPatId(p.id)}>🗑️</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <main style={s.main} className="rxv-main">
          {!active ? (
            <div style={s.placeholder}>
              <div style={{ fontSize: 48 }}>🗂️</div>
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

              {/* Upload card */}
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={s.cardTitle}>Add Prescription</h3>
                  <button style={s.toggleBtn} onClick={() => { setNoImageMode(m => !m); setPages([]); setUploadMsg('') }}>
                    {noImageMode ? '📷 Add with image' : '📋 Add without image'}
                  </button>
                </div>

                <div style={s.uploadGrid}>
                  {/* Dropzone — compact square */}
                  {!noImageMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <div
                        style={dragOver ? { ...s.dropzone, ...s.dropzoneActive } : s.dropzone}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {pages.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, justifyContent: 'center', width: '100%', height: '100%', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            {pages.map((p, index) => (
                              <div key={index} style={{ position: 'relative', width: 45, height: 45, borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removePage(index); }}
                                  style={{
                                    position: 'absolute',
                                    top: 1,
                                    right: 1,
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 14,
                                    height: 14,
                                    fontSize: 9,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                    lineHeight: 1
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            {pages.length < 5 && (
                              <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                  width: 45,
                                  height: 45,
                                  border: '1.5px dashed #cbd5e1',
                                  borderRadius: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 16,
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  background: '#fff'
                                }}
                              >
                                +
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <span style={{ fontSize: 28 }}>📷</span>
                            <span style={s.dropText}>Tap or drag</span>
                            <span style={s.dropSub}>JPG PNG WEBP HEIC · max 10 MB</span>
                          </>
                        )}
                      </div>
                      <button style={s.cameraBtn} onClick={openCamera} type="button">📷 Take Photo</button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" multiple
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files)} />

                  {/* Right column: date + notes + save */}
                  <div style={s.uploadSide}>
                    <label style={s.dateLabel}>Prescription Date</label>
                    <input type="date" style={s.dateInput} value={recordDate}
                      onChange={e => setRecordDate(e.target.value)} max={todayStr()} />

                    <label style={{ ...s.dateLabel, marginTop: 8 }}>Medicines / Notes</label>
                    <textarea style={s.notesInput} rows={3}
                      placeholder="e.g. Paracetamol 500mg, Crocin, Azithromycin…"
                      value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} />

                    <button
                      style={canSave && !uploading ? s.saveBtn : { ...s.saveBtn, ...s.saveBtnDisabled }}
                      onClick={handleUpload} disabled={!canSave || uploading}>
                      {uploading ? (uploadStep || 'Saving…') : 'Save'}
                    </button>
                    {uploadMsg && <p style={uploadMsg.startsWith('✅') ? s.successMsg : s.errorMsg}>{uploadMsg}</p>}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div style={s.card}>
                <h3 style={s.cardTitle}>Prescription History ({records.length})</h3>
                {loadingRecords && <p style={s.infoMsg}>Loading…</p>}
                {!loadingRecords && records.length === 0 && <p style={s.emptyHint}>No records yet.</p>}
                <div style={s.timeline}>
                  {records.map((rec, idx) => (
                    <div key={rec.id} style={s.timelineItem}>
                      <div style={s.timelineDotCol}>
                        <div style={s.timelineDot} />
                        {idx < records.length - 1 && <div style={s.timelineLine} />}
                      </div>
                      <div style={s.timelineContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={s.timelineDate}>{fmtDate(rec.record_date)}</p>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={s.iconBtn} title="Edit notes"
                              onClick={() => { setEditingRecId(rec.id); setEditNoteVal(rec.notes || '') }}>✏️</button>
                            <button style={s.iconBtn} title="Delete"
                              onClick={() => setDeletingRecId(rec.id)}>🗑️</button>
                          </div>
                        </div>

                        {(rec.images && rec.images.length > 0) || rec.signedUrl ? (
                          <div style={{ position: 'relative', width: 140, height: 100 }}>
                            <img src={rec.images?.[0]?.signedUrl || rec.signedUrl} alt={`Rx ${rec.record_date}`}
                              loading="lazy" style={s.thumbnail} className="rxv-thumbnail"
                              onClick={() => openModal(idx)} title="Click to zoom" />
                            {rec.images && rec.images.length > 1 && (
                              <span style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 6,
                                background: 'rgba(15, 52, 96, 0.9)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 800,
                                pointerEvents: 'none'
                              }}>
                                {rec.images.length}p
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={s.noImgPlaceholder} className="rxv-noimg" onClick={() => openModal(idx)} title="View notes">
                            <span style={{ fontSize: 22 }}>📋</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>No image</span>
                          </div>
                        )}

                        {/* Notes display */}
                        {editingRecId === rec.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <textarea style={s.notesInput} rows={3} autoFocus
                              value={editNoteVal} onChange={e => setEditNoteVal(e.target.value)} />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button style={s.saveBtn} onClick={() => handleSaveNotes(rec)}>Save</button>
                              <button style={s.cancelBtn} onClick={() => setEditingRecId(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : rec.notes ? (
                          <div style={s.notesPill}>
                            {rec.notes.split('\n').filter(Boolean).map((line, i) => (
                              <span key={i} style={s.noteTag}>{line}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── CONFIRM DELETE PATIENT ─────────────────────────────────── */}
      {deletingPatId && (
        <div style={s.confirmBackdrop}>
          <div style={s.confirmBox}>
            <p style={s.confirmText}>Delete this patient and hide all their records?</p>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Data is soft-deleted and recoverable.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={s.dangerBtn} onClick={() => handleDeletePatient(deletingPatId)}>Yes, delete</button>
              <button style={s.cancelBtn} onClick={() => setDeletingPatId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE RECORD ──────────────────────────────────── */}
      {deletingRecId && (
        <div style={s.confirmBackdrop}>
          <div style={s.confirmBox}>
            <p style={s.confirmText}>Delete this prescription record?</p>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Image is kept in storage (soft-delete).</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={s.dangerBtn} onClick={() => handleDeleteRecord(deletingRecId)}>Yes, delete</button>
              <button style={s.cancelBtn} onClick={() => setDeletingRecId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ZOOM MODAL ─────────────────────────────────────────────── */}
      {modalRec !== null && (
        <div style={s.modalBackdrop}
          onClick={() => { closeModal(); resetZoom() }}>
          <div style={s.modalShell} onClick={e => e.stopPropagation()}
            onWheel={onWheel} onTouchStart={onTouchStart}
            onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

            {/* Header bar */}
            <div style={s.modalHeader}>
              <button style={s.modalNav}
                onClick={() => { openModal(Math.max(0, modalIdx - 1)); resetZoom() }}
                disabled={modalIdx === 0}>‹</button>
              <div style={{ textAlign: 'center' }}>
                <p style={s.modalDate}>{fmtDate(modalRec.record_date)}</p>
                <p style={s.modalCounter}>{modalIdx + 1} / {records.length}</p>
              </div>
              <button style={s.modalNav}
                onClick={() => { openModal(Math.min(records.length - 1, modalIdx + 1)); resetZoom() }}
                disabled={modalIdx === records.length - 1}>›</button>
              <button style={s.modalClose} onClick={() => { closeModal(); resetZoom() }}>✕</button>
            </div>

            {modalRec.images && modalRec.images.length > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0
              }}>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: 18,
                    cursor: 'pointer',
                    opacity: imgPageIdx === 0 ? 0.3 : 1
                  }}
                  disabled={imgPageIdx === 0}
                  onClick={() => { setImgPageIdx(idx => Math.max(0, idx - 1)); resetZoom(); }}
                >
                  ‹
                </button>
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>
                  page {imgPageIdx + 1} / {modalRec.images.length}
                </span>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: 18,
                    cursor: 'pointer',
                    opacity: imgPageIdx === modalRec.images.length - 1 ? 0.3 : 1
                  }}
                  disabled={imgPageIdx === modalRec.images.length - 1}
                  onClick={() => { setImgPageIdx(idx => Math.min(modalRec.images.length - 1, idx + 1)); resetZoom(); }}
                >
                  ›
                </button>
              </div>
            )}

            {/* Image / no-image */}
            {modalRec.images && modalRec.images.length > 0 ? (
              <div style={s.modalImgWrap}>
                <img ref={modalRef} src={modalRec.images[imgPageIdx]?.signedUrl || modalRec.signedUrl}
                  alt={`Rx ${modalRec.record_date} p${imgPageIdx + 1}`} style={s.modalImg}
                  draggable={false} />
              </div>
            ) : modalRec.signedUrl ? (
              <div style={s.modalImgWrap}>
                <img ref={modalRef} src={modalRec.signedUrl}
                  alt={`Rx ${modalRec.record_date}`} style={s.modalImg}
                  draggable={false} />
              </div>
            ) : (
              <div style={{ ...s.modalImgWrap, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 48 }}>📋</span>
                <p style={{ color: '#64748b', fontSize: 14 }}>No image for this record</p>
              </div>
            )}

            {/* Notes in modal */}
            {modalRec.notes && (
              <div style={s.modalNotes}>
                <p style={{ fontWeight: 700, fontSize: 12, color: '#0f3460', marginBottom: 4 }}>Medicines</p>
                <p style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-line', margin: 0 }}>{modalRec.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {showCamera && (
        <div style={s.cameraBackdrop}>
          <video ref={videoRef} autoPlay playsInline muted style={s.cameraVideo} />
          {cameraError && <p style={s.cameraErrorMsg}>{cameraError}</p>}
          <div style={s.cameraControls}>
            <button style={s.cameraSecondaryBtn} onClick={closeCamera} type="button">Cancel</button>
            <button style={s.cameraCaptureBtn} onClick={capturePhoto} type="button">📸 Capture</button>
            <button style={s.cameraSecondaryBtn} onClick={switchCamera} type="button">🔄 Switch</button>
            <button style={s.cameraDoneBtn} onClick={() => setShowCamera(false)} type="button">Done</button>
          </div>
        </div>
      )}
    </StoreLayout>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  page:              { display: 'flex', minHeight: 'calc(100vh - 56px)', background: '#f0fdfd' },

  // sidebar
  sidebar:           { width: 248, flexShrink: 0, background: '#fff', borderRight: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px 14px', gap: 8 },
  sideTitle:         { fontSize: 14, fontWeight: 800, color: '#0f3460', margin: '0 0 10px' },
  addForm:           { display: 'flex', gap: 6, marginBottom: 4 },
  input:             { flex: 1, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0f3460', background: '#fff' },
  addBtn:            { padding: '8px 12px', background: '#0e9090', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  infoMsg:           { fontSize: 12, color: '#0e9090', margin: '2px 0 6px' },
  patientList:       { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 },
  emptyHint:         { fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '16px 0' },
  patientRow:        { display: 'flex', alignItems: 'center', borderRadius: 8, border: '1.5px solid transparent', overflow: 'hidden' },
  patientRowActive:  { background: '#f0fdfd', borderColor: '#0e9090' },
  patientBtn:        { flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' },
  patientAvatar:     { width: 28, height: 28, borderRadius: '50%', background: '#0e9090', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 },
  patientName:       { fontSize: 13, fontWeight: 600, color: '#0f3460', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  patientActions:    { display: 'flex', gap: 0, flexShrink: 0 },
  iconBtn:           { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '4px 5px', opacity: 0.6, lineHeight: 1 },

  // main
  main:              { flex: 1, padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 },
  placeholder:       { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.55 },
  placeholderTitle:  { fontSize: 17, fontWeight: 800, color: '#0f3460', margin: 0 },
  placeholderSub:    { fontSize: 13, color: '#64748b', margin: 0 },

  // patient header
  patientHeader:     { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 },
  patientHeaderAvatar: { width: 40, height: 40, borderRadius: '50%', background: '#0e9090', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 },
  patientHeaderName: { fontSize: 20, fontWeight: 800, color: '#0f3460', margin: 0 },

  // card
  card:              { background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  cardTitle:         { fontSize: 13, fontWeight: 800, color: '#0f3460', margin: 0 },
  toggleBtn:         { fontSize: 12, color: '#0e9090', background: '#f0fdfd', border: '1.5px solid #0e9090', borderRadius: 99, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 },

  // upload grid
  uploadGrid:        { display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  dropzone:          { width: 160, height: 160, flexShrink: 0, border: '2px dashed #cbd5e1', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', background: '#f8fafc', transition: 'border-color 0.2s' },
  dropzoneActive:    { borderColor: '#0e9090', background: '#f0fdfd' },
  dropText:          { fontSize: 12, fontWeight: 600, color: '#475569' },
  dropSub:           { fontSize: 10, color: '#94a3b8', textAlign: 'center', padding: '0 4px' },
  preview:           { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 },

  uploadSide:        { flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 },
  dateLabel:         { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dateInput:         { padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f3460', outline: 'none' },
  notesInput:        { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f3460', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  saveBtn:           { padding: '8px 18px', background: '#0e9090', color: '#fff', border: 'none', borderRadius: 99, fontWeight: 700, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' },
  saveBtnDisabled:   { background: '#cbd5e1', cursor: 'not-allowed' },
  cancelBtn:         { padding: '7px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 99, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  successMsg:        { fontSize: 13, color: '#16a34a', fontWeight: 600, margin: 0 },
  errorMsg:          { fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 },

  // timeline
  timeline:          { display: 'flex', flexDirection: 'column' },
  timelineItem:      { display: 'flex', gap: 14 },
  timelineDotCol:    { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10, flexShrink: 0 },
  timelineDot:       { width: 10, height: 10, borderRadius: '50%', background: '#0e9090', flexShrink: 0, marginTop: 4 },
  timelineLine:      { flex: 1, width: 2, background: '#e2e8f0', margin: '4px 0 0' },
  timelineContent:   { flex: 1, paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 },
  timelineDate:      { fontSize: 13, fontWeight: 700, color: '#0f3460', margin: 0 },
  thumbnail:         { width: 140, height: 100, borderRadius: 8, objectFit: 'cover', cursor: 'zoom-in', border: '1.5px solid #e2e8f0', display: 'block' },
  noImgPlaceholder:  { width: 140, height: 100, borderRadius: 8, border: '1.5px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', background: '#f8fafc' },

  notesPill:         { display: 'flex', flexWrap: 'wrap', gap: 4 },
  noteTag:           { fontSize: 11, padding: '2px 8px', background: '#f0fdfd', border: '1px solid #a7f3d0', borderRadius: 99, color: '#0f3460' },

  // confirm modals
  confirmBackdrop:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 },
  confirmBox:        { background: '#fff', borderRadius: 14, padding: '28px 32px', maxWidth: 340, textAlign: 'center' },
  confirmText:       { fontSize: 15, fontWeight: 700, color: '#0f3460', margin: '0 0 6px' },
  dangerBtn:         { padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 99, fontWeight: 700, cursor: 'pointer' },

  // zoom modal
  modalBackdrop:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', zIndex: 1000 },
  modalShell:        { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 700, background: '#111', touchAction: 'none' },
  modalHeader:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 },
  modalDate:         { fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 },
  modalCounter:      { fontSize: 11, color: '#94a3b8', margin: 0 },
  modalNav:          { background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', padding: '0 8px', opacity: 0.8, lineHeight: 1 },
  modalClose:        { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', fontWeight: 700 },
  modalImgWrap:      { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 8 },
  modalImg:          { maxWidth: '100%', objectFit: 'contain', transformOrigin: 'top center', userSelect: 'none', display: 'block' },
  modalNotes:        { padding: '12px 16px', background: 'rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 },
  cameraBtn:          { padding: '8px 12px', background: '#f0fdfd', color: '#0e9090', border: '1.5px solid #0e9090', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  cameraBackdrop:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  cameraVideo:         { width: '100%', maxWidth: 480, borderRadius: 12, background: '#000' },
  cameraControls:      { display: 'flex', gap: 12, marginTop: 16 },
  cameraCaptureBtn:    { padding: '12px 24px', background: '#0e9090', color: '#fff', border: 'none', borderRadius: 99, fontWeight: 800, fontSize: 15, cursor: 'pointer' },
  cameraSecondaryBtn:  { padding: '12px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 99, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  cameraErrorMsg:      { color: '#fca5a5', fontSize: 13, marginTop: 10, textAlign: 'center' },
  cameraDoneBtn:       { padding: '12px 20px', background: '#0e9090', color: '#fff', border: 'none', borderRadius: 99, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
}
