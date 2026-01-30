import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function StoreProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      setProfile(data)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Store Profile</h1>

        <p><b>Store Name:</b> {profile?.store_name || '—'}</p>
        <p><b>Contact:</b> {profile?.phone || '—'}</p>
        <p><b>Timings:</b> {profile?.store_timings || '—'}</p>
        <p><b>Location:</b> {profile?.latitude && profile?.longitude
          ? `${profile.latitude}, ${profile.longitude}`
          : 'Not set'}
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#fff',
    padding: 28,
    borderRadius: 14,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
}
