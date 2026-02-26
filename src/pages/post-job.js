import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import StoreLayout from '../components/StoreLayout'


const BANNER_IMG = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&q=80'
const TABS = ['active', 'held', 'expired', 'closed']
const MAX_ACTIVE_JOBS = 2

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
  const [storeName, setStoreName] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/simple-login'); return }
    setUser(user)
    const { data: store } = await supabase.from('store_profiles').select('store_name, is_verified').eq('user_id', user.id).maybeSingle()
    if (store?.store_name) setStoreName(store.store_name.split(' ')[0])
    if (store?.is_verified) setIsVerified(true)
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

  const getActiveCount = () => {
    return jobs.filter(j => 
      j.status === 'active' && 
      !j.disabled_by_admin && 
      new Date(j.expires_at) > new Date()
    ).length
  }

  const submitJob = async () => {
    if (getActiveCount() >= MAX_ACTIVE_JOBS) {
      setMessage(`You can only have ${MAX_ACTIVE_JOBS} active job posts at a time. Please hold, close, or delete an existing job before posting a new one.`)
      return
    }

    if (!title.trim() || !shift || !numOpenings || !requiredExperience) {
      setMessage('Please fill in all required fields.')
      return
    }

    const openings = parseInt(numOpenings)
    if (isNaN(openings) || openings < 1) {
      setMessage('Openings must be at least 1.')
      return
    }

    setPosting(true)
    setMessage('')

    const { data: storeProfile } = await supabase.from('store_profiles').select('store_name').eq('user_id', user.id).maybeSingle()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error } = await supabase.from('jobs').insert({
      title: title.trim(), shift, num_openings: openings,
      required_experience: requiredExperience,
      preferred_software: preferredSoftware.trim() || null,
      description: description.trim() || null,
      location: storeProfile?.store_name || 'Location not set',
      store_owner_id: user.id, status: 'active',
      expires_at: expiresAt.toISOString(), disabled_by_admin: false,
    })

    setPosting(false)

    if (error) { setMessage('Error: ' + error.message); return }

    setMessage('Job posted successfully! ✓')
    setTitle(''); setShift(''); setNumOpenings(''); setRequiredExperience(''); setPreferredSoftware(''); setDescription('')
    await loadJobs(user.id)
  }

  const updateJobStatus = async (jobId, newStatus) => {
    const updates = { status: newStatus }
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString()

    const { error } = await supabase.from('jobs').update(updates).eq('id', jobId).eq('store_owner_id', user.id)
    if (error) { alert(error.message); return }
    await loadJobs(user.id)
  }

  const deleteJob = async (jobId) => {
    if (!confirm('Delete this job permanently?')) return
    const { error } = await supabase.from('jobs').delete().eq('id', jobId).eq('store_owner_id', user.id)
    if (error) { alert(error.message); return }
    await loadJobs(user.id)
  }

  const getDaysLeft = (expiresAt) => Math.ceil((new Date(expiresAt) - new Date()) / (1000*60*60*24))

  const filteredJobs = jobs.filter(job => {
    if (job.disabled_by_admin) return activeTab === 'held'
    const expired = new Date(job.expires_at) < new Date()
    if (expired && job.status === 'active') return activeTab === 'expired'
    return job.status === activeTab
  })

  const tabCount = (tab) => jobs.filter(job => {
    if (job.disabled_by_admin) return tab === 'held'
    const expired = new Date(job.expires_at) < new Date()
    if (expired && job.status === 'active') return tab === 'expired'
    return job.status === tab
  }).length

  const activeCount = getActiveCount()
  const canPost = activeCount < MAX_ACTIVE_JOBS

  if (loading) return <p style={{ padding: 40, fontFamily: 'Nunito, sans-serif' }}>Loading…</p>

  if (!isVerified) return (
    <StoreLayout>
      <div style={gateS.page}>
        <div style={gateS.card}>
          <div style={gateS.icon}>🔒</div>
          <h2 style={gateS.title}>Verification Required</h2>
          <p style={gateS.text}>
            Your store profile needs to be verified before you can post jobs. Upload your store license and our team will review it shortly.
          </p>
          <a href="/store-profile" style={gateS.btn}>Go to Profile → Upload License</a>
        </div>
      </div>
    </StoreLayout>
  )

  return (
    <StoreLayout>
    <div style={s.page}>
      {/* Banner */}
      <div style={s.banner}>
        <img src={BANNER_IMG} alt="" style={s.bannerImg} />
        <div style={s.bannerOverlay} />
        <div style={s.bannerContent}>
          <div>
            <h2 style={s.bannerTitle}>
              {storeName ? `${storeName}'s Jobs 💼` : 'Post a Job 💼'}
            </h2>
            <p style={s.bannerSub}>
              {activeCount} of {MAX_ACTIVE_JOBS} active job slots used
            </p>
          </div>
        </div>
      </div>
      {/* Quick Link to Applicants */}
<div style={s.quickLinks}>
  <a href="/applicants" style={s.quickLink}>
    👥 View Applicants & Appointments →
  </a>
</div>

      <div style={s.body}>
        {/* Post form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Post a New Job</h2>

          {!canPost && (
            <div style={s.limitWarning}>
              ⚠️ You have reached the maximum of {MAX_ACTIVE_JOBS} active job posts. Please hold, close, or delete an existing job before posting a new one.
            </div>
          )}

          <label style={s.label}>Job Title *</label>
          <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Full-time Pharmacist" maxLength={100} disabled={!canPost} />

          <label style={s.label}>Shift *</label>
          <select style={s.select} value={shift} onChange={e => setShift(e.target.value)} disabled={!canPost}>
            <option value="">Select Shift</option>
            <option>Morning</option>
            <option>Night</option>
            <option>Both (Morning & Night)</option>
          </select>

          <label style={s.label}>Number of Openings *</label>
          <input type="number" style={s.input} value={numOpenings} onChange={e => setNumOpenings(e.target.value)} placeholder="e.g. 2" min="1" max="99" disabled={!canPost} />

          <label style={s.label}>Required Experience *</label>
          <select style={s.select} value={requiredExperience} onChange={e => setRequiredExperience(e.target.value)} disabled={!canPost}>
            <option value="">Select Experience</option>
            <option>Fresher</option>
            <option>1-5 years</option>
            <option>5+ years</option>
          </select>

          <label style={s.label}>Preferred Software (Optional)</label>
          <input style={s.input} value={preferredSoftware} onChange={e => setPreferredSoftware(e.target.value)} placeholder="e.g. PharmERP, Marg, GoFrugal" maxLength={200} disabled={!canPost} />

          <label style={s.label}>Job Description (Optional)</label>
          <textarea style={s.textarea} value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional details…" maxLength={1000} disabled={!canPost} />

          <button style={s.primaryBtn} onClick={submitJob} disabled={posting || !canPost}>
            {posting ? 'Posting…' : !canPost ? `Max ${MAX_ACTIVE_JOBS} Active Jobs Reached` : '+ Post Job'}
          </button>

          {message && (
            <p style={message.startsWith('Error') || message.startsWith('Please') || message.startsWith('Openings') || message.startsWith('You can only') ? s.errorMsg : s.successMsg}>
              {message}
            </p>
          )}
        </div>

        {/* My Jobs */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>My Jobs</h2>

          <div style={s.tabs}>
            {TABS.map(tab => (
              <button key={tab} style={activeTab === tab ? s.activeTab : s.tab} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span style={s.tabCount}>{tabCount(tab)}</span>
              </button>
            ))}
          </div>

          {filteredJobs.length === 0 && <div style={s.empty}>No {activeTab} jobs.</div>}

          {filteredJobs.map(job => {
            const daysLeft = getDaysLeft(job.expires_at)
            const isExpiringSoon = daysLeft <= 3 && daysLeft > 0 && job.status === 'active' && !job.disabled_by_admin
            const isExpired = daysLeft <= 0

            return (
              <div key={job.id} style={{
                ...s.jobCard,
                ...(isExpiringSoon ? { border: '2px solid #f59e0b' } : {}),
                ...(job.disabled_by_admin ? { border: '2px solid #ef4444', opacity: 0.85 } : {}),
              }}>
                {job.disabled_by_admin && <div style={s.disabledBanner}>🚫 Disabled by Admin</div>}
                {isExpiringSoon && <div style={s.expireBanner}>⚠️ Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</div>}
                {isExpired && activeTab === 'expired' && <div style={s.expiredBanner}>⏰ Expired</div>}

                <div style={s.jobHeader}>
                  <h3 style={s.jobTitle}>{job.title}</h3>
                  <span style={getStatusStyle(job.status)}>{job.status}</span>
                </div>
                <div style={s.jobTags}>
                  {job.shift && <span style={s.tag}>🕐 {job.shift}</span>}
                  {job.required_experience && <span style={s.tag}>🎓 {job.required_experience}</span>}
                  {job.num_openings && <span style={s.tag}>👥 {job.num_openings}</span>}
                </div>
                {job.preferred_software && <p style={s.detail}><b>Software:</b> {job.preferred_software}</p>}
                {job.description && <p style={s.detail}>{job.description}</p>}

                {!job.disabled_by_admin && (
                  <div style={s.jobActions}>
                    {job.status === 'active' && (
                      <>
                        <button style={s.holdBtn} onClick={() => updateJobStatus(job.id, 'held')}>⏸ Hold</button>
                        <button style={s.closeBtn} onClick={() => updateJobStatus(job.id, 'closed')}>✓ Close</button>
                        <button style={s.deleteBtn} onClick={() => deleteJob(job.id)}>🗑 Delete</button>
                      </>
                    )}
                    {job.status === 'held' && (
                      <>
                        <button style={s.activateBtn} onClick={() => updateJobStatus(job.id, 'active')}>▶ Re-enable</button>
                        <button style={s.deleteBtn} onClick={() => deleteJob(job.id)}>🗑 Delete</button>
                      </>
                    )}
                    {(job.status === 'expired' || isExpired) && (
                      <button style={s.deleteBtn} onClick={() => deleteJob(job.id)}>🗑 Delete</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
    </StoreLayout>
  )
}

const getStatusStyle = (status) => {
  const base = { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }
  const map = {
    active: { background: '#d1fae5', color: '#065f46' },
    held: { background: '#fef3c7', color: '#92400e' },
    closed: { background: '#e0e7ff', color: '#3730a3' },
    expired: { background: '#fee2e2', color: '#991b1b' }
  }
  return { ...base, ...(map[status] || { background: '#e5e7eb', color: '#374151' }) }
}

const s = {
  page: { minHeight: '100vh', background: '#f0fdfd', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  banner: { position: 'relative', height: 160, overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%', objectFit: 'cover' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,52,96,0.88) 0%, rgba(14,144,144,0.72) 100%)' },
  bannerContent: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 24px' },
  bannerTitle: { color: 'white', fontSize: 22, fontWeight: 900, margin: 0 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  body: { maxWidth: 600, margin: '0 auto', padding: '20px 16px 40px' },
  card: { background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: 24, border: '1px solid #e2e8f0' },
  cardTitle: { fontSize: 18, fontWeight: 900, color: '#0f3460', marginBottom: 16 },
  limitWarning: { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, marginBottom: 16, lineHeight: 1.6 },
  label: { display: 'block', marginTop: 14, marginBottom: 6, fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: 'white', boxSizing: 'border-box', fontFamily: 'inherit' },
  textarea: { width: '100%', minHeight: 90, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  primaryBtn: { marginTop: 20, width: '100%', padding: 13, background: '#0e9090', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', fontWeight: 800 },
  successMsg: { marginTop: 10, fontSize: 13, color: '#059669', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontWeight: 600 },
  errorMsg: { marginTop: 10, fontSize: 13, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontWeight: 600 },
  tabs: { display: 'flex', gap: 6, marginBottom: 16, borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' },
  tab: { padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 },
  activeTab: { padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '3px solid #0e9090', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#0e9090', display: 'flex', alignItems: 'center', gap: 5 },
  tabCount: { background: '#e2e8f0', color: '#475569', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700 },
  empty: { padding: 16, fontSize: 14, color: '#64748b', textAlign: 'center' },
  jobCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12 },
  jobHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  jobTitle: { fontSize: 15, fontWeight: 800, color: '#0f3460', margin: 0 },
  jobTags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tag: { background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  detail: { fontSize: 13, color: '#475569', margin: '3px 0' },
  jobActions: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  holdBtn: { padding: '6px 10px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  activateBtn: { padding: '6px 10px', background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  closeBtn: { padding: '6px 10px', background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  deleteBtn: { padding: '6px 10px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  disabledBanner: { background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, marginBottom: 8 },
  expireBanner: { background: '#fef3c7', color: '#92400e', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, marginBottom: 8 },
  expiredBanner: { background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, marginBottom: 8 },
quickLinks: { 
  background: 'white', 
  padding: '12px 16px', 
  borderRadius: 12, 
  marginBottom: 16, 
  border: '1px solid #e2e8f0',
  display: 'inline-block'
},
quickLink: { 
  fontSize: 15, 
  fontWeight: 800, 
  color: '#0e9090', 
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 8
},
}

const gateS = {
  page: { minHeight: '100vh', background: '#f0fdfd', fontFamily: "'Nunito', 'Segoe UI', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: 'white', borderRadius: 20, padding: '48px 36px', maxWidth: 440, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.1)', textAlign: 'center' },
  icon: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 900, color: '#0f3460', marginBottom: 12 },
  text: { fontSize: 15, color: '#64748b', lineHeight: 1.75, marginBottom: 28 },
  btn: { display: 'inline-block', background: '#0e9090', color: 'white', padding: '12px 24px', borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: 'none' },
}