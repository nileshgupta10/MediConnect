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
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      const { data } = await supabase.from('appointments').select('id')
        .eq('pharmacist_id', user.id).eq('status', 'confirmed')
        .gte('appointment_date', today).lte('appointment_date', tomorrow.toISOString().split('T')[0])
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

  const nl = (path) => router.pathname === path ? s.activeLink : s.link

  return (
    <div style={s.wrap}>
      <nav style={s.nav}>
        <a href="/" style={s.brand}>
          <img src="/brand/mediclan-logo.png" alt="" style={s.logo} />
          <span style={s.brandTxt}>MediClan</span>
        </a>
        <a href="/pharmacist-profile" style={nl('/pharmacist-profile')}>Profile</a>
        <a href="/jobs" style={{ ...nl('/jobs'), display: 'flex', alignItems: 'center', gap: 4 }}>
          Jobs {upcomingCount > 0 && <span style={s.badge}>{upcomingCount}</span>}
        </a>
        <button style={s.logout} onClick={handleLogout}>Logout</button>
      </nav>
      {children}
    </div>
  )
}

const s = {
  wrap: { minHeight: '100vh', background: '#f0fdfd' },
  nav: {
    background: 'white',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center',
    padding: '0 8px', gap: 2,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginRight: 4, flexShrink: 0 },
  logo: { width: 22, height: 22, objectFit: 'contain' },
  brandTxt: { fontSize: 13, fontWeight: 900, color: '#0f3460', whiteSpace: 'nowrap' },
  link: { fontSize: 12, fontWeight: 700, color: '#64748b', textDecoration: 'none', padding: '10px 7px', whiteSpace: 'nowrap', flexShrink: 0 },
  activeLink: { fontSize: 12, fontWeight: 800, color: '#0e9090', textDecoration: 'none', padding: '10px 7px', whiteSpace: 'nowrap', flexShrink: 0, borderBottom: '3px solid #0e9090' },
  badge: { background: '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logout: { marginLeft: 'auto', padding: '6px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
}