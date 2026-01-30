import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const [user, setUser] = useState(undefined)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
    })

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
        <Link href="/" style={styles.brand}>
          MediClan
        </Link>

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
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    textDecoration: 'none',
    color: '#0f172a',
  },
  logout: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 6,
    cursor: 'pointer',
  },
}
