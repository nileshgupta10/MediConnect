import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function RoleSelectReset() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const doReset = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/simple-login')
          return
        }

        const res = await fetch('/api/role-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'Failed to reset role.')
        }

        router.replace('/role-select')
      } catch (err) {
        setErrorMsg(err.message)
      }
    }
    doReset()
  }, [router])

  return (
    <div style={s.page}>
      <div style={s.box}>
        {errorMsg ? (
          <>
            <span style={s.errorIcon}>❌</span>
            <h2 style={s.title}>Reset Failed</h2>
            <p style={s.text}>{errorMsg}</p>
            <button style={s.btn} onClick={() => router.push('/')}>
              Go to Homepage
            </button>
          </>
        ) : (
          <>
            <span style={s.spinner}>⏳</span>
            <h2 style={s.title}>Resetting Role</h2>
            <p style={s.text}>Clearing your account role setup, please wait…</p>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0fdfd',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    padding: 20,
  },
  box: {
    background: 'white',
    padding: '36px 32px',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  spinner: { fontSize: 44, animation: 'spin 2s linear infinite' },
  errorIcon: { fontSize: 44 },
  title: { fontSize: 20, fontWeight: 900, color: '#0f3460', margin: 0 },
  text: { fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 },
  btn: {
    marginTop: 8,
    padding: '10px 20px',
    background: '#0e9090',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
}
