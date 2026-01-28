// src/components/Layout.js (or wherever it lives)

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const [user, setUser] = useState(undefined) // 🔑 undefined = not ready
  const [role, setRole] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // 1️⃣ Initial session load
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    // 2️⃣ Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ⏳ IMPORTANT: wait until Supabase is ready
  if (user === undefined) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Loading…
      </div>
    )
  }

  // ❌ Layout NEVER redirects
  if (!user) return <>{children}</>

  // 🔁 Load role only after user exists
  useEffect(() => {
    if (!user) return

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setRole(data?.role ?? null))
  }, [user])

  return (
    <div>
      <header>
        <Link href="/">MediClan</Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.replace('/')
          }}
        >
          Logout
        </button>
      </header>

      <main>{children}</main>
    </div>
  )
}
