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
            Upload the bill file you get from your distributor. This tool reads it and turns it into a file that CARE understands — so you don't have to type each item into CARE by hand.
          </p>
          <p style={{ ...st.explainText, fontWeight: 700, marginTop: 8 }}>
            Supported Distributors:
          </p>
          <ul style={st.explainList}>
            <li style={st.explainListItem}>• Patwari Pharma</li>
            <li style={st.explainListItem}>• Medica (Prem Agency)</li>
          </ul>
          <p style={{ ...st.explainText, marginTop: 4, fontStyle: 'italic' }}>
            Many others coming soon.
          </p>
          <p style={{ ...st.explainText, marginTop: 8 }}>
            The converted file downloads to your device. Check it against your bill first (see the yellow box below), then copy it into your CARE software.
          </p>
        </div>

        <div style={{ ...st.explainBox, background: '#fffbeb', border: '1px solid #fcd34d' }}>
          <p style={{ ...st.explainTitle, color: '#92400e' }}>Please check before you save</p>
          <p style={st.explainText}>
            Always compare the converted entry with your original bill: items, quantity, rate, GST and bill total. Fix any mistake before you save it in your software. You are responsible for the data you save in your stock, books and GST returns.
          </p>
          <p style={st.explainText}>
            MediClan is an independent service and is not affiliated with CARE or its makers. The name CARE is used only to say which file type this tool creates.
          </p>
        </div>

        <div style={st.infoBox}>
          <p style={st.infoTitle}>How to use (5 easy steps)</p>
          <p style={st.infoText}><b>Step 1.</b> Tap the file box and choose the bill you got from your distributor (CSV or PDF).</p>
          <p style={st.infoText}><b>Step 2.</b> Tap <b>Convert &amp; Download</b> and wait a few seconds. A file ending in .SMS will download.</p>
          <p style={st.infoText}><b>Step 3.</b> Copy that .SMS file into the <b>C:\download\</b> folder on your CARE computer. (If it downloaded on your phone, send it to the CARE computer first.)</p>
          <p style={st.infoText}><b>Step 4.</b> In CARE, click <b>DwnLd Purch</b>.</p>
          <p style={st.infoText}><b>Step 5.</b> Check the items, quantity, rate, GST and total against your bill. Correct anything wrong, then save.</p>
        </div>

        <div style={{ ...st.infoBox, marginTop: 12 }}>
          <p style={st.infoTitle}>Your privacy</p>
          <p style={st.infoText}>
            We do not save your bill file or the items, prices or quantities in it. We only remember the distributor&apos;s name, your last invoice number and the bill&apos;s column layout, so the next conversion is quicker. See our <a href="/privacy-policy" style={{ color: '#0e9090', fontWeight: 700 }}>Privacy Policy</a>.
          </p>
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