import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const TABS = ['active', 'held', 'expired', 'closed']

export default function PostJob() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [shift, setShift] = useState('')
  const [numOpenings, setNumOpenings] = useState('')
  const [requiredExperience, setRequiredExperience] = useState('')
  const [preferredSoftware, setPreferredSoftware] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [jobs, setJobs] = useState([])
  const [activeTab, setActiveTab] = useState('active')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/simple-login'); return }
    setUser(user)
    await loadJobs(user.id)
    setLoading(false)
  }

  const loadJobs = async (userId) => {
    const { data } = await supabase
      .from('jobs')
      .select('id, title, shift, num_openings, required_experience, preferred_software, description, location, status, expires_at, disabled_by_admin, created_at')
      .eq('store_owner_id', userId)
      .order('created_at', { ascending: false })

    setJobs(data || [])
  }

  const submitJob = async () => {
    if (!title.trim() || !shift || !numOpenings || !requiredExperience) {
      setMessage('Please fill in all required fields.')
      return
    }

    const openings = parseInt(numOpenings)
    if (isNaN(openings) || openings < 1) {
      setMessage('Number of openings must be at least 1.')
      return
    }

    setPosting(true)
    setMessage('')

    const { data: storeProfile } = await supabase
      .from('store_profiles')
      .select('store_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error } = await supabase
      .from('jobs')
      .insert({
        title: title.trim(),
        shift,
        num_openings: openings,
        required_experience: requiredExperience,
        preferred_software: preferredSoftware.trim() || null,
        description: description.trim() || null,
        location: storeProfile?.store_name || 'Location not set',
        store_owner_id: user.id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        disabled_by_admin: false,
      })

    setPosting(false)

    if (error) { setMessage('Error: ' + error.message); return }

    setMessage('Job posted successfully!')
    setTitle('')
    setShift('')
    setNumOpenings('')
    setRequiredExperience('')
    setPreferredSoftware('')
    setDescription('')
    await loadJobs(user.id)
  }

  const updateJobStatus = async (jobId, newStatus) => {
    const updates = { status: newStatus }
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString()

    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .eq('store_owner_id', user.id)

    if (error) { alert('Error: ' + error.message); return }
    await loadJobs(user.id)
  }

  const deleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) return

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .eq('store_owner_id', user.id)

    if (error) { alert('Error: ' + error.message); return }
    await loadJobs(user.id)
  }

  const getDaysLeft = (expiresAt) => {
    const now = new Date()
    const exp = new Date(expiresAt)
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
    return diff
  }

  const filteredJobs = jobs.filter(job => {
    if (job.disabled_by_admin) return activeTab === 'active' ? false : activeTab === 'held'
    const expired = new Date(job.expires_at) < new Date()
    if (expired && job.status === 'active') return activeTab === 'expired'
    return job.status === activeTab
  })

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      {/* POST JOB FORM */}
      <div style={styles.card}>
        <h1 style={styles.heading}>Post a Job</h1>

        <label style={styles.label}>Job Title *</label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Full-time Pharmacist"
          maxLength={100}
        />

        <label style={styles.label}>Shift *</label>
        <select style={styles.select} value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="">Select Shift</option>
          <option value="Morning">Morning</option>
          <option value="Night">Night</option>
          <option value="Both">Both (Morning & Night)</option>
        </select>

        <label style={styles.label}>Number of Openings *</label>
        <input
          type="number" style={styles.input} value={numOpenings}
          onChange={(e) => setNumOpenings(e.target.value)}
          placeholder="e.g. 2" min="1" max="99"
        />

        <label style={styles.label}>Required Experience *</label>
        <select style={styles.select} value={requiredExperience} onChange={(e) => setRequiredExperience(e.target.value)}>
          <option value="">Select Experience</option>
          <option value="Fresher">Fresher</option>
          <option value="1-5 years">1-5 years</option>
          <option value="5+ years">5+ years</option>
        </select>

        <label style={styles.label}>Preferred Software (Optional)</label>
        <input
          style={styles.input} value={preferredSoftware}
          onChange={(e) => setPreferredSoftware(e.target.value)}
          placeholder="e.g. PharmERP, Marg, GoFrugal" maxLength={200}
        />

        <label style={styles.label}>Job Description (Optional)</label>
        <textarea
          style={styles.textarea} value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details about working hours, benefits, etc."
          maxLength={1000}
        />

        <button style={styles.primaryBtn} onClick={submitJob} disabled={posting}>
          {posting ? 'Posting…' : 'Post Job'}
        </button>

        {message && (
          <p style={message.startsWith('Error') || message.startsWith('Please') || message.startsWith('Number')
            ? styles.errorMsg : styles.successMsg}>
            {message}
          </p>
        )}
      </div>

      {/* MY JOBS */}
      <div style={styles.myJobsSection}>
        <h2 style={styles.myJobsTitle}>My Jobs</h2>

        <div style={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span style={styles.tabCount}>
                {jobs.filter(j => {
                  if (j.disabled_by_admin) return tab === 'held'
                  const expired = new Date(j.expires_at) < new Date()
                  if (expired && j.status === 'active') return tab === 'expired'
                  return j.status === tab
                }).length}
              </span>
            </button>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div style={styles.empty}>No {activeTab} jobs.</div>
        )}

        {filteredJobs.map(job => {
          const daysLeft = getDaysLeft(job.expires_at)
          const isExpiringSoon = daysLeft <= 3 && daysLeft > 0 && job.status === 'active'
          const isExpired = daysLeft <= 0 && job.status === 'active'

          return (
            <div key={job.id} style={{
              ...styles.jobCard,
              ...(isExpiringSoon ? styles.expiringSoonCard : {}),
              ...(job.disabled_by_admin ? styles.disabledCard : {}),
            }}>
              {job.disabled_by_admin && (
                <div style={styles.disabledBanner}>🚫 Disabled by Admin</div>
              )}
              {isExpiringSoon && (
                <div style={styles.expiringSoonBanner}>
                  ⚠️ Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                </div>
              )}
              {isExpired && (
                <div style={styles.expiredBanner}>⏰ Expired</div>
              )}

              <div style={styles.jobCardHeader}>
                <h3 style={styles.jobTitle}>{job.title}</h3>
                <span style={getStatusStyle(job.status)}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>

              <p style={styles.detail}><b>Shift:</b> {job.shift}</p>
              <p style={styles.detail}><b>Experience:</b> {job.required_experience}</p>
              <p style={styles.detail}><b>Openings:</b> {job.num_openings}</p>
              {job.preferred_software && (
                <p style={styles.detail}><b>Software:</b> {job.preferred_software}</p>
              )}
              {job.description && (
                <p style={styles.detail}>{job.description}</p>
              )}

              {!job.disabled_by_admin && (
                <div style={styles.jobActions}>
                  {job.status === 'active' && (
                    <>
                      <button
                        style={styles.holdBtn}
                        onClick={() => updateJobStatus(job.id, 'held')}
                      >
                        ⏸ Hold
                      </button>
                      <button
                        style={styles.closeBtn}
                        onClick={() => updateJobStatus(job.id, 'closed')}
                      >
                        ✓ Close Opening
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => deleteJob(job.id)}
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}

                  {job.status === 'held' && (
                    <>
                      <button
                        style={styles.activateBtn}
                        onClick={() => updateJobStatus(job.id, 'active')}
                      >
                        ▶ Re-enable
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => deleteJob(job.id)}
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}

                  {(job.status === 'expired' || isExpired) && (
                    <button
                      style={styles.deleteBtn}
                      onClick={() => deleteJob(job.id)}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const getStatusStyle = (status) => {
  const base = { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }
  switch (status) {
    case 'active': return { ...base, background: '#d1fae5', color: '#065f46' }
    case 'held': return { ...base, background: '#fef3c7', color: '#92400e' }
    case 'closed': return { ...base, background: '#e0e7ff', color: '#3730a3' }
    case 'expired': return { ...base, background: '#fee2e2', color: '#991b1b' }
    default: return { ...base, background: '#e5e7eb', color: '#374151' }
  }
}

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', padding: 20, maxWidth: 600, margin: '0 auto' },
  card: { background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.08)', marginBottom: 32 },
  heading: { fontSize: 22, marginBottom: 20 },
  label: { display: 'block', marginTop: 14, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#475569' },
  input: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' },
  select: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, background: 'white', boxSizing: 'border-box' },
  textarea: { width: '100%', minHeight: 100, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  primaryBtn: { marginTop: 20, width: '100%', padding: 14, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 600 },
  successMsg: { marginTop: 12, fontSize: 14, color: '#059669', padding: '8px 12px', background: '#f0fdf4', borderRadius: 6 },
  errorMsg: { marginTop: 12, fontSize: 14, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 6 },
  myJobsSection: { background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.08)' },
  myJobsTitle: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' },
  tab: { padding: '8px 14px', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 },
  activeTab: { padding: '8px 14px', background: 'transparent', border: 'none', borderBottom: '3px solid #2563eb', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 },
  tabCount: { background: '#e5e7eb', color: '#475569', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  empty: { padding: 16, fontSize: 14, color: '#64748b', textAlign: 'center' },
  jobCard: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14 },
  expiringSoonCard: { border: '2px solid #f59e0b' },
  disabledCard: { border: '2px solid #ef4444', opacity: 0.8 },
  disabledBanner: { background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 10 },
  expiringSoonBanner: { background: '#fef3c7', color: '#92400e', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 10 },
  expiredBanner: { background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 10 },
  jobCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  jobTitle: { fontSize: 16, fontWeight: 600, margin: 0 },
  detail: { fontSize: 14, color: '#475569', margin: '3px 0' },
  jobActions: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  holdBtn: { padding: '7px 12px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  activateBtn: { padding: '7px 12px', background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  closeBtn: { padding: '7px 12px', background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  deleteBtn: { padding: '7px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
}