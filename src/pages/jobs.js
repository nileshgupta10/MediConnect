import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/simple-login')
        return
      }

      const { data: profile } = await supabase
        .from('pharmacist_profiles')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .single()

      if (!profile?.latitude || !profile?.longitude) {
        setLoading(false)
        return
      }

      const { data } = await supabase.rpc('nearby_jobs', {
        lat: profile.latitude,
        lng: profile.longitude,
      })

      setJobs(data || [])
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) return <p style={{ padding: 40 }}>Loading jobs…</p>

  return (
    <div style={{ padding: 20 }}>
      <h1>Nearby Jobs</h1>

      {jobs.length === 0 && <p>No nearby jobs found.</p>}

      {jobs.map((j) => (
        <div key={j.job_id} style={card}>
          <h3>{j.title}</h3>
          <p>{j.store_name}</p>
          <p>{j.description}</p>
          <p><b>{j.distance_km.toFixed(1)} km away</b></p>
        </div>
      ))}
    </div>
  )
}

const card = {
  background: 'white',
  padding: 16,
  marginBottom: 12,
  borderRadius: 8,
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
}
