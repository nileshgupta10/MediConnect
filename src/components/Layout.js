// src/components/Layout.js

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [role, setRole] = useState(null)
  const router = useRouter()

  // 🔑 1. Session hydration (always runs)
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

  // 🔑 2. Role load (always declared, condition inside)
  useEffect(() => {
    if (!user) {
      setRole(null)
      return
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role ?? null)
      })
  }, [user])

  // ⏳ Render logic (AFTER all hooks)

  if (user === undefined) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Loading…
      </div>
    )
  }

  return (
    <div>
      <header style={{ padding: 12 }}>
        <Link href="/">MediClan</Link>

        {user && (
          <button
            style={{ marginLeft: 12 }}
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
