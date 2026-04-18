import { useState } from 'react'
import StoreLayout from '../components/StoreLayout'

export default function BillConverter() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConvert = async () => {
    if (!file) { setStatus('Please select a CSV file first.'); return }
    setLoading(true)
    setStatus('Converting...')

    try {
      const text = await file.text()
      const res = await fetch('/api/convert-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: text })
      })

      if (!res.ok) {
        const err = await res.json()
        setStatus('Error: ' + err.error)
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
        <p style={st.sub}>Upload your distributor bill (CSV) to generate a CARE-compatible .SMS file.</p>

        <div style={st.card}>
          <label style={st.label}>Select Bill File (.CSV)</label>
          <input
            type="file"
            accept=".csv,.CSV"
            onChange={e => { setFile(e.target.files[0]); setStatus('') }}
            style={st.input}
          />
          {file && <p style={st.filename}>📄 {file.name}</p>}
          <button
            onClick={handleConvert}
            disabled={loading || !file}
            style={loading || !file ? st.btnDisabled : st.btn}
          >
            {loading ? 'Converting...' : '⚡ Convert & Download'}
          </button>
          {status && (
            <div style={status.startsWith('✅') ? st.success : st.error}>
              {status}
            </div>
          )}
        </div>

        <div style={st.infoBox}>
          <p style={st.infoTitle}>How to use:</p>
          <p style={st.infoText}>1. Download the .SMS file</p>
          <p style={st.infoText}>2. Copy it to <b>C:\download\</b> on your CARE PC</p>
          <p style={st.infoText}>3. Open CARE → click <b>DwnLd Purch</b></p>
        </div>
      </div>
    </StoreLayout>
  )
}

const st = {
  page: { padding: 24, maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui,sans-serif' },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: '#64748b', fontSize: 14, marginBottom: 24 },
  card: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, background: 'white', marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' },
  input: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' },
  filename: { fontSize: 13, color: '#6366f1', marginBottom: 12 },
  btn: { width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  btnDisabled: { width: '100%', padding: '12px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'not-allowed' },
  success: { marginTop: 16, padding: 12, background: '#d1fae5', color: '#065f46', borderRadius: 8, fontSize: 14 },
  error: { marginTop: 16, padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 14 },
  infoBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' },
  infoText: { fontSize: 13, color: '#64748b', margin: '4px 0' },
}