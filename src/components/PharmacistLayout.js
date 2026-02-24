import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CACHE_KEY = 'mediclan_pharm_upcoming_count'
const CACHE_TTL = 5 * 60 * 1000

export default function PharmacistLayout({ children }) {
  const router = useRouter()
  const [upcomingCount, setUpcomingCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const { count, ts } = JSON.parse(cached)
          if (Date.now() - ts < CACHE_TTL) { setUpcomingCount(count); return }
        }
      } catch {}

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const { data } = await supabase
        .from('appointments')
        .select('id')
        .eq('pharmacist_id', user.id)
        .eq('status', 'confirmed')
        .gte('appointment_date', today)
        .lte('appointment_date', tomorrowStr)

      const count = data?.length || 0
      setUpcomingCount(count)
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() })) } catch {}
    }
    load()
  }, [])

  const handleLogout = async () => {
    try { sessionStorage.removeItem(CACHE_KEY) } catch {}
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={s.layout}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.brand}>
            <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.logo} />
            <span style={s.brandText}>MediClan</span>
          </div>
          <div style={s.navLinks}>
            <a href="/pharmacist-profile" style={router.pathname === '/pharmacist-profile' ? s.activeLink : s.link}>
              💊 Profile
            </a>
            <a href="/jobs" style={{ ...(router.pathname === '/jobs' ? s.activeLink : s.link), display: 'flex', alignItems: 'center', gap: 6 }}>
              💼 Jobs
              {upcomingCount > 0 && <span style={s.badge}>{upcomingCount}</span>}
            </a>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>
      <div style={s.content}>
        {children}
      </div>
    </div>
  )
}

const s = {
  layout: { minHeight: '100vh', background: '#f0fdfd' },
  nav: { background: 'white', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32, objectFit: 'contain' },
  brandText: { fontSize: 18, fontWeight: 900, color: '#0f3460' },
  navLinks: { display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', alignItems: 'center' },
  link: { fontSize: 14, fontWeight: 700, color: '#64748b', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, whiteSpace: 'nowrap' },
  activeLink: { fontSize: 14, fontWeight: 800, color: '#0e9090', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, background: '#e0f7f7', whiteSpace: 'nowrap' },
  badge: { background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoutBtn: { padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  content: { minHeight: 'calc(100vh - 60px)' },
}