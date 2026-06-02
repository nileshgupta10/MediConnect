import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import StoreLayout from '../components/StoreLayout'

export default function BillConverter() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [useRandomParty, setUseRandomParty] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/simple-login'); return }
      setChecking(false)
    }
    checkAuth()
  }, [])

  if (checking) return <p style={{ padding: 20 }}>Loading...</p>

  const handleConvert = async (useAI = false) => {
    if (!file) { setStatus('Please select a file first.'); return }
    setLoading(true)
    setStatus(useAI ? '🤖 Gemini AI is reading your bill and extracting items... Please wait...' : 'Converting...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      let endpoint = useAI ? '/api/convert-bill-ai' : '/api/convert-bill'
      if (useRandomParty) {
        endpoint += '?randomParty=true'
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      const contentType = res.headers.get('Content-Type') || ''

      if (!res.ok || contentType.includes('application/json')) {
        let errMsg = 'Unknown error'
        try {
          const err = await res.json()
          errMsg = err.error || errMsg
        } catch (_) {
          try {
            const text = await res.text()
            errMsg = text.substring(0, 150) || errMsg
          } catch (_) {}
        }
        setStatus('Error: ' + errMsg)
        setLoading(false)
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filename = disposition?.split('filename=')[1]?.replace(/"/g, '') || 'output.sms'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatus('✅ Done! ' + filename + ' downloaded. Copy to C:\\download\\ on CARE PC.')
    } catch (err) {
      setStatus('Error: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <StoreLayout>
      <div style={st.page}>
        <h1 style={st.heading}>📋 Bill Converter</h1>
        <p style={st.sub}>Upload your distributor bill (CSV, PDF, or image photo) to generate a CARE-compatible .SMS file.</p>

        <div style={st.card}>
          <label style={st.label}>Select Bill File (CSV, PDF, or Photo)</label>
          <input
            type="file"
            accept=".csv,.CSV,.pdf,.PDF,.jpg,.jpeg,.png,.webp,.JPG,.JPEG,.PNG,.WEBP"
            onChange={e => { setFile(e.target.files[0]); setStatus('') }}
            style={st.input}
          />
          {file && <p style={st.filename}>📄 {file.name}</p>}

          {/* Premium Branded Toggle Card */}
          <div style={st.toggleCard}>
            <label style={st.toggleLabel}>
              <input
                type="checkbox"
                checked={useRandomParty}
                onChange={e => setUseRandomParty(e.target.checked)}
                style={st.checkbox}
              />
              <div style={st.toggleTextContainer}>
                <span style={st.toggleTitle}>🔗 Force CARE "Party Mapping" Dialog</span>
                <span style={st.toggleDesc}>
                  Generates a random party code so CARE asks you to map/link this import to any of your existing suppliers.
                </span>
              </div>
            </label>
          </div>
          
          <div style={st.btnContainer}>
            <button
              onClick={() => handleConvert(false)}
              disabled={loading || !file}
              style={loading || !file ? st.btnDisabled : st.btnStandard}
            >
              ⚡ Convert & Download (Protocols)
            </button>
            
            <button
              onClick={() => handleConvert(true)}
              disabled={loading || !file}
              style={loading || !file ? st.btnDisabled : st.btnAI}
            >
              🤖 AI Scan & Convert (Gemini)
            </button>
          </div>

          {status && (
            <div style={status.startsWith('✅') ? st.success : st.error}>
              {status}
            </div>
          )}
        </div>

        <div style={st.infoBox}>
          <p style={st.infoTitle}>How to use:</p>
          <p style={st.infoText}>1. Select any invoice file (PDF/CSV) or upload a direct photo/scan of a printed paper invoice.</p>
          <p style={st.infoText}>2. Use <b>Convert & Download (Protocols)</b> for your configured standard distributors.</p>
          <p style={st.infoText}>3. Use <b>AI Scan & Convert (Gemini)</b> to scan *any* printed invoice or arbitrary distributor bill automatically!</p>
          <p style={st.infoText}>4. Copy the downloaded file to your CARE PC's <b>C:\download\</b> folder and click <b>DwnLd Purch</b>.</p>
        </div>
      </div>
    </StoreLayout>
  )
}

const st = {
  page: { padding: 24, maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui,sans-serif' },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: '#64748b', fontSize: 14, marginBottom: 24 },
  toggleCard: {
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    width: '100%',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#0e9090',
    cursor: 'pointer',
    marginTop: '3px',
  },
  toggleTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  toggleTitle: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f3460',
  },
  toggleDesc: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: '1.4',
  },
  card: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, background: 'white', marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' },
  input: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' },
  filename: { fontSize: 13, color: '#6366f1', marginBottom: 16 },
  btnDisabled: { width: '100%', padding: '12px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'not-allowed', opacity: 0.7 },
  btnContainer: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 },
  btnStandard: { width: '100%', padding: '12px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnAI: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' },
  success: { marginTop: 16, padding: 12, background: '#d1fae5', color: '#065f46', borderRadius: 8, fontSize: 14 },
  error: { marginTop: 16, padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 14 },
  infoBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' },
  infoText: { fontSize: 13, color: '#64748b', margin: '4px 0' },
}