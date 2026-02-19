import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'maniac.gupta@gmail.com'

export default function RoleSelect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Not logged in → redirect to login
      if (!user) { 
        router.replace('/simple-login')
        return 
      }

      // Admin → redirect to admin panel
      if (user.email === ADMIN_EMAIL) { 
        router.replace('/admin')
        return 
      }

      // Check if user already has a role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      // Has role → redirect to their profile
      if (existing?.role === 'pharmacist') { 
        router.replace('/pharmacist-profile')
        return 
      }
      if (existing?.role === 'store_owner') { 
        router.replace('/store-profile')
        return 
      }

      // No role yet → show role selection
      setUser(user)
      setLoading(false)
    }
    init()
  }, [router])

  const selectRole = async (role) => {
    setSaving(true)
    await supabase.from('user_roles').upsert({ 
      user_id: user.id, 
      role 
    })

    if (role === 'pharmacist') {
      router.replace('/pharmacist-profile')
    } else {
      router.replace('/store-profile')
    }
  }

  if (loading) {
    return (
      <div style={s.loadPage}>
        <div style={s.loadSpinner}>⏳</div>
        <p style={s.loadText}>Setting up your account…</p>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* Background gradient */}
      <div style={s.bgGradient} />

      {/* Content */}
      <div style={s.content}>
        {/* Logo */}
        <div style={s.logoSection}>
          <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.logo} />
          <h1 style={s.brandName}>MediClan</h1>
          <p style={s.tagline}>Relations, over the counter.</p>
        </div>

        {/* Welcome */}
        <div style={s.welcomeBox}>
          <h2 style={s.welcomeTitle}>
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}! 👋
          </h2>
          <p style={s.welcomeSub}>
            Just one quick step to get started — are you looking for work or looking to hire?
          </p>
        </div>

        {/* Role cards */}
        <div style={s.cards}>
          <button
            style={s.roleCard}
            onClick={() => selectRole('pharmacist')}
            disabled={saving}
          >
            <div style={s.roleIconWrap}>
              <span style={s.roleIcon}>💊</span>
            </div>
            <h3 style={s.roleTitle}>I'm a Pharmacist</h3>
            <p style={s.roleDesc}>
              Looking for pharmacy jobs near me
            </p>
            <div style={s.roleArrow}>Get Started →</div>
          </button>

          <button
            style={{ ...s.roleCard, ...s.roleCardAlt }}
            onClick={() => selectRole('store_owner')}
            disabled={saving}
          >
            <div style={{ ...s.roleIconWrap, background: '#fef3c7' }}>
              <span style={s.roleIcon}>🏪</span>
            </div>
            <h3 style={s.roleTitle}>I'm a Store Owner</h3>
            <p style={s.roleDesc}>
              Looking to hire verified pharmacists
            </p>
            <div style={{ ...s.roleArrow, color: '#f59e0b' }}>Get Started →</div>
          </button>
        </div>

        {saving && <p style={s.savingText}>Setting up your profile…</p>}

        {/* Footer note */}
        <p style={s.footerNote}>
          Choose carefully — your role cannot be changed after selection
        </p>
      </div>
    </div>
  )
}

const s = {
  loadPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    gap: 16,
    background: '#f0fdfd',
  },
  loadSpinner: { fontSize: 48 },
  loadText: { fontSize: 17, color: '#64748b', fontWeight: 700 },

  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },

  bgGradient: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, #0f3460 0%, #0e9090 100%)',
    zIndex: 0,
  },

  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
  },

  logoSection: {
    textAlign: 'center',
  },

  logo: {
    width: 72,
    height: 72,
    objectFit: 'contain',
    marginBottom: 12,
  },

  brandName: {
    fontSize: 32,
    fontWeight: 900,
    color: 'white',
    margin: 0,
    marginBottom: 4,
  },

  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    margin: 0,
  },

  welcomeBox: {
    background: 'white',
    borderRadius: 20,
    padding: '28px 32px',
    textAlign: 'center',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },

  welcomeTitle: {
    fontSize: 26,
    fontWeight: 900,
    color: '#0f3460',
    margin: 0,
    marginBottom: 10,
  },

  welcomeSub: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 1.65,
    margin: 0,
  },

  cards: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },

  roleCard: {
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: 20,
    padding: '24px 28px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  },

  roleCardAlt: {
    background: '#fffbeb',
    border: '2px solid #fde68a',
  },

  roleIconWrap: {
    width: 56,
    height: 56,
    background: '#e0f7f7',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  roleIcon: { fontSize: 28 },

  roleTitle: {
    fontSize: 19,
    fontWeight: 900,
    color: '#0f3460',
    margin: 0,
  },

  roleDesc: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },

  roleArrow: {
    fontSize: 14,
    fontWeight: 900,
    color: '#0e9090',
    marginTop: 4,
  },

  savingText: {
    textAlign: 'center',
    fontSize: 15,
    color: 'white',
    fontWeight: 700,
    background: 'rgba(255,255,255,0.15)',
    padding: '10px 20px',
    borderRadius: 50,
    backdropFilter: 'blur(8px)',
  },

  footerNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    margin: 0,
  },
}