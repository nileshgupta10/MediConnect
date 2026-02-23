import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const ADMIN_EMAIL = 'maniac.gupta@gmail.com'
const CACHE_KEY = 'mediclan_upcoming_count'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export default function Layout({ children }) {
  const [user, setUser] = useState(undefined)
  const [role, setRole] = useState(null)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const currentUser = data.session?.user ?? null
      setUser(currentUser)

      if (!currentUser) return

      if (currentUser.email === ADMIN_EMAIL) {
        setRole('admin')
        return
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      const userRole = roleData?.role || null
      setRole(userRole)

      if (!userRole) return

      // Check session cache first
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const { count, ts } = JSON.parse(cached)
          if (Date.now() - ts < CACHE_TTL) {
            setUpcomingCount(count)
            return
          }
        }
      } catch {}

      await checkUpcomingAppointments(currentUser.id, userRole)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        try { sessionStorage.removeItem(CACHE_KEY) } catch {}
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const checkUpcomingAppointments = async (userId, userRole) => {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const column = userRole === 'pharmacist' ? 'pharmacist_id' : 'store_owner_id'

    const { data } = await supabase
      .from('appointments')
      .select('id')
      .eq(column, userId)
      .eq('status', 'confirmed')
      .gte('appointment_date', today)
      .lte('appointment_date', tomorrowStr)

    const count = data?.length || 0
    setUpcomingCount(count)

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() }))
    } catch {}
  }

  if (user === undefined) return <div style={{ padding: 40 }}>Loading…</div>

  return (
    <div>
      <header style={styles.header}>
        <span style={styles.brand}>MediClan</span>

        <div style={styles.nav}>
          {user && role === 'pharmacist' && (
            <>
              <Link href="/pharmacist-profile" style={styles.navLink}>Profile</Link>
              <Link href="/jobs" style={styles.navLinkBadge}>
                Jobs
                {upcomingCount > 0 && <span style={styles.badge}>{upcomingCount}</span>}
              </Link>
            </>
          )}

          {user && role === 'store_owner' && (
            <>
              <Link href="/store-profile" style={styles.navLink}>Profile</Link>
              <Link href="/post-job" style={styles.navLink}>Post Job</Link>
              <Link href="/applicants" style={styles.navLinkBadge}>
                Applicants
                {upcomingCount > 0 && <span style={styles.badge}>{upcomingCount}</span>}
              </Link>
            </>
          )}

          {user && role === 'admin' && (
            <Link href="/admin" style={styles.navLink}>Admin</Link>
          )}

          
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

const styles = {
  header: { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#ffffff', flexWrap: 'wrap', gap: 12 },
  brand: { fontSize: 20, fontWeight: 700, color: '#0f172a', cursor: 'default' },
  nav: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  navLink: { fontSize: 14, color: '#475569', textDecoration: 'none', fontWeight: 500 },
  navLinkBadge: { fontSize: 14, color: '#475569', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 },
  badge: { background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
}