import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const ADMIN_EMAIL = 'maniac.gupta@gmail.com'

export default function Layout({ children }) {
  const [user, setUser] = useState(undefined)
  const [role, setRole] = useState(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const loadUserAndRole = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      
      const currentUser = data.session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // Check if admin
        if (currentUser.email === ADMIN_EMAIL) {
          setRole('admin')
          return
        }

        // Get role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle()

        setRole(roleData?.role || null)
      }
    }

    loadUserAndRole()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (user === undefined) {
    return <div style={{ padding: 40 }}>Loading…</div>
  }

  return (
    <div>
      <header style={styles.header}>
        <span style={styles.brand}>MediClan</span>

        <div style={styles.nav}>
          {user && role === 'pharmacist' && (
            <>
              <Link href="/pharmacist-profile" style={styles.navLink}>Profile</Link>
              <Link href="/jobs" style={styles.navLink}>Jobs</Link>
            </>
          )}

          {user && role === 'store_owner' && (
            <>
              <Link href="/store-profile" style={styles.navLink}>Profile</Link>
              <Link href="/post-job" style={styles.navLink}>Post Job</Link>
              <Link href="/applicants" style={styles.navLink}>Applicants</Link>
            </>
          )}

          {user && role === 'admin' && (
            <Link href="/admin" style={styles.navLink}>Admin</Link>
          )}

          {user && (
            <button
              style={styles.logout}
              onClick={async () => {
                await supabase.auth.signOut()
                router.replace('/')
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

const styles = {
  header: {
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
    flexWrap: 'wrap',
    gap: 12,
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    cursor: 'default',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  navLink: {
    fontSize: 14,
    color: '#475569',
    textDecoration: 'none',
    fontWeight: 500,
  },
  logout: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
  },
}