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
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/simple-login'); return }
      setUserId(user.id)
      setChecking(false)
    }
    checkAuth()
  }, [])

  if (checking) return <p style={{ padding: 20 }}>Loading...</p>

  const handleConvert = async () => {
    if (!file) { setStatus('Please select a file first.'); return }
    setLoading(true)
    setStatus('Converting...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      let endpoint = '/api/convert-bill'
      if (userId) endpoint += `?storeOwnerId=${userId}`

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
        <p style={st.sub}>Upload your distributor bill (CSV or PDF) to generate a CARE-compatible .SMS file.</p>

        <div style={st.card}>
          <label style={st.label}>Select Bill File (CSV or PDF)</label>
          <input
            type="file"
            accept=".csv,.CSV,.pdf,.PDF"
            onChange={e => { setFile(e.target.files[0]); setStatus('') }}
            style={st.input}
          />
          {file && <p style={st.filename}>📄 {file.name}</p>}

          <div style={st.btnContainer}>
            <button
              onClick={handleConvert}
              disabled={loading || !file}
              style={loading || !file ? st.btnDisabled : st.btnStandard}
            >
              {loading ? '⏳ Converting...' : '⚡ Convert & Download'}
            </button>
          </div>

          {status && (
            <div style={status.startsWith('✅') ? st.success : st.error}>
              {status}
            </div>
          )}
        </div>

        <div style={st.explainBox}>
          <p style={st.explainTitle}>What this does</p>
          <p style={st.explainText}>
            This tool reads a distributor's bill (CSV or PDF format) and automatically converts it into a protocol-ready file matching that distributor's exact format, allowing you to load it straight into the <b>CARE</b> software without manual data entry.
          </p>
          <p style={{ ...st.explainText, fontWeight: 700, marginTop: 8 }}>
            Supported Distributors:
          </p>
          <ul style={st.explainList}>
            <li style={st.explainListItem}>• Patwari Pharma</li>
            <li style={st.explainListItem}>• Medica (Prem Agency)</li>
            <li style={st.explainListItem}>• C G Marketing</li>
            <li style={st.explainListItem}>• Beauty Cosmetics</li>
            <li style={st.explainListItem}>• Manshi Agencies</li>
            <li style={st.explainListItem}>• Navkar Cosmetics</li>
            <li style={st.explainListItem}>• Navkar Pharma</li>
            <li style={st.explainListItem}>• AB Marketing</li>
            <li style={st.explainListItem}>• Medicine House</li>
          </ul>
          <p style={{ ...st.explainText, marginTop: 8 }}>
            The converted file downloads directly to your device and is ready to copy into your CARE software's download folder with no manual editing needed.
          </p>
        </div>

        <div style={st.infoBox}>
          <p style={st.infoTitle}>How to use:</p>
          <p style={st.infoText}>1. Select your distributor bill file (CSV or PDF format).</p>
          <p style={st.infoText}>2. Click <b>Convert &amp; Download</b> — the app identifies your distributor automatically.</p>
          <p style={st.infoText}>3. Copy the downloaded .SMS file to your CARE PC&apos;s <b>C:\download\</b> folder and click <b>DwnLd Purch</b>.</p>
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
  filename: { fontSize: 13, color: '#6366f1', marginBottom: 16 },
  btnDisabled: { width: '100%', padding: '12px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'not-allowed', opacity: 0.7 },
  btnContainer: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 },
  btnStandard: { width: '100%', padding: '12px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  success: { marginTop: 16, padding: 12, background: '#d1fae5', color: '#065f46', borderRadius: 8, fontSize: 14 },
  error: { marginTop: 16, padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 14 },
  infoBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' },
  infoText: { fontSize: 13, color: '#64748b', margin: '4px 0' },
  explainBox: { background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10, padding: 16, marginBottom: 20 },
  explainTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#0e7c7c' },
  explainText: { fontSize: 13, color: '#0f3460', margin: '4px 0', lineHeight: 1.5 },
  explainList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '4px 8px', margin: '8px 0', paddingLeft: 0, listStyle: 'none' },
  explainListItem: { fontSize: 12, color: '#0e9090', fontWeight: 700, display: 'flex', alignItems: 'center' },
}