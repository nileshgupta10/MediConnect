import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })

      setJobs(data || [])
      setLoading(false)
    }

    load()
  }, [])

  const applyForJob = async (jobId) => {
    if (!user) {
      router.push('/simple-login')
      return
    }

    const { error } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        pharmacist_id: user.id,
      })

    if (error) {
      alert(error.message)
      return
    }

    alert('Application submitted successfully!')
  }

  if (loading) return <p style={{ padding: 40 }}>Loading jobs…</p>

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Available Pharmacy Jobs</h1>

      {jobs.length === 0 && <p>No jobs posted yet.</p>}

      {jobs.map((job) => (
        <div key={job.id} style={styles.card}>
          <h3>{job.title}</h3>
          <p style={styles.location}>📍 {job.location}</p>
          {job.description && <p>{job.description}</p>}

          <button
            style={styles.btn}
            onClick={() => applyForJob(job.id)}
          >
            {user ? 'Apply Now' : 'Login to Apply'}
          </button>
        </div>
      ))}
    </div>
  )
}

const styles = {
  page: {
    padding: 24,
    maxWidth: 800,
    margin: '0 auto',
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  heading: {
    fontSize: 26,
    marginBottom: 20,
  },
  card: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    marginBottom: 18,
  },
  location: {
    color: '#64748b',
    fontSize: 14,
  },
  btn: {
    marginTop: 10,
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
}