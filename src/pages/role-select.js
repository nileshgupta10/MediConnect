import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function RoleSelect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const ADMIN_EMAIL = 'maniac.gupta@gmail.com'

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/simple-login'); return }

      if (user.email === ADMIN_EMAIL) { router.replace('/admin'); return }

      const { data: existing } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing?.role === 'pharmacist') { router.replace('/pharmacist-profile'); return }
      if (existing?.role === 'store_owner') { router.replace('/store-profile'); return }

      setUser(user)
      setLoading(false)
    }
    init()
  }, [router])

  const selectRole = async (role) => {
    setSaving(true)
    await supabase.from('user_roles').upsert({ user_id: user.id, role })
    if (role === 'pharmacist') router.replace('/pharmacist-profile')
    else router.replace('/store-profile')
  }

  if (loading) return (
    <div style={s.loadPage}>
      <div style={s.loadSpinner}>⏳</div>
      <p style={s.loadText}>Setting up your account…</p>
    </div>
  )

  return (
    <div style={s.page}>
      {/* Blurred background */}
      <div style={s.bg} />

      {/* Modal card */}
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.logo} />
          <h1 style={s.title}>Welcome to MediClan!</h1>
          <p style={s.subtitle}>
            Hi {user?.user_metadata?.full_name?.split(' ')[0] || 'there'} 👋<br />
            Just one quick question to get you started:
          </p>
        </div>

        <div style={s.cards}>
          <button
            style={s.roleCard}
            onClick={() => selectRole('pharmacist')}
            disabled={saving}
          >
            <div style={s.roleIconWrap}>
              <span style={s.roleIcon}>💊</span>
            </div>
            <h2 style={s.roleTitle}>I'm a Pharmacist</h2>
            <p style={s.roleDesc}>
              Looking for pharmacy jobs near me
            </p>
            <div style={s.roleArrow}>Get Started →</div>
          </button>

          <button
            style={{ ...s.roleCard, ...s.roleCardAmber }}
            onClick={() => selectRole('store_owner')}
            disabled={saving}
          >
            <div style={{ ...s.roleIconWrap, background: '#fef3c7' }}>
              <span style={s.roleIcon}>🏪</span>
            </div>
            <h2 style={s.roleTitle}>I'm a Store Owner</h2>
            <p style={s.roleDesc}>
              Looking to hire verified pharmacists
            </p>
            <div style={{ ...s.roleArrow, color: '#f59e0b' }}>Get Started →</div>
          </button>
        </div>

        {saving && <p style={s.saving}>Setting up your account…</p>}
      </div>
    </div>
  )
}

const s = {
  loadPage: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", gap: 12 },
  loadSpinner: { fontSize: 40 },
  loadText: { fontSize: 16, color: '#64748b', fontWeight: 600 },

  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    padding: 20,
    background: 'linear-gradient(135deg, #0f3460 0%, #0e9090 100%)',
    position: 'relative',
  },
  bg: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #0f3460 0%, #0e9090 100%)',
    zIndex: 0,
  },
  modal: {
    position: 'relative', zIndex: 1,
    background: 'white',
    borderRadius: 24,
    padding: '36px 32px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
  },
  modalHeader: { textAlign: 'center', marginBottom: 28 },
  logo: { width: 56, height: 56, objectFit: 'contain', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 900, color: '#0f3460', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 1.65 },

  cards: { display: 'flex', flexDirection: 'column', gap: 14 },

  roleCard: {
    background: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: 16,
    padding: '20px 22px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  roleCardAmber: {
    background: '#fffbeb',
    border: '2px solid #fde68a',
  },
  roleIconWrap: {
    width: 48, height: 48,
    background: '#e0f7f7',
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  roleIcon: { fontSize: 24 },
  roleTitle: { fontSize: 17, fontWeight: 900, color: '#0f3460', margin: 0 },
  roleDesc: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 },
  roleArrow: { fontSize: 13, fontWeight: 800, color: '#0e9090', marginTop: 6 },

  saving: { textAlign: 'center', marginTop: 16, fontSize: 14, color: '#64748b', fontWeight: 600 },
}