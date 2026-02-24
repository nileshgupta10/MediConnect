import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AdminLayout from '../components/AdminLayout'

const ADMIN_EMAIL = 'maniac.gupta@gmail.com'
const PAGE_SIZE = 20

export default function AdminPage() {
  const router = useRouter()
  const activeSection = router.query.section || 'pharmacists'
  const [status, setStatus] = useState('pending')
  const [pharmacists, setPharmacists] = useState([])
  const [stores, setStores] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/simple-login'); return }
      if (user.email !== ADMIN_EMAIL) { router.replace('/'); return }
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (loading) return
    setPage(0)
    setSearch('')
    fetchData(0)
  }, [activeSection, status, loading])

  const fetchData = async (pageNum) => {
    if (activeSection === 'pharmacists') await loadPharmacists(pageNum)
    else if (activeSection === 'stores') await loadStores(pageNum)
    else if (activeSection === 'jobs') await loadJobs(pageNum)
  }

  const loadPharmacists = async (pageNum) => {
    const from = pageNum * PAGE_SIZE
    const { data } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, verification_status, is_verified, license_url')
      .eq('verification_status', status)
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (pageNum === 0) setPharmacists(data || [])
    else setPharmacists(prev => [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)
  }

  const loadStores = async (pageNum) => {
    const from = pageNum * PAGE_SIZE
    const { data } = await supabase
      .from('store_profiles')
      .select('user_id, store_name, verification_status, is_verified, address')
      .eq('verification_status', status)
      .order('store_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (pageNum === 0) setStores(data || [])
    else setStores(prev => [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)
  }

  const loadJobs = async (pageNum) => {
    const from = pageNum * PAGE_SIZE
    const { data } = await supabase
      .from('jobs')
      .select('id, title, location, status, created_at, disabled_by_admin, expires_at, store_owner_id, store_profiles(store_name)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (pageNum === 0) setJobs(data || [])
    else setJobs(prev => [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchData(next)
  }

  const updatePharmacistStatus = async (userId, newStatus) => {
    await supabase
      .from('pharmacist_profiles')
      .update({ verification_status: newStatus, is_verified: newStatus === 'approved' })
      .eq('user_id', userId)
    setPharmacists(prev => prev.filter(p => p.user_id !== userId))
  }

  const updateStoreStatus = async (userId, newStatus) => {
    await supabase
      .from('store_profiles')
      .update({ verification_status: newStatus, is_verified: newStatus === 'approved' })
      .eq('user_id', userId)
    setStores(prev => prev.filter(s => s.user_id !== userId))
  }

  const toggleJobDisabled = async (jobId, currentlyDisabled) => {
    await supabase
      .from('jobs')
      .update({ disabled_by_admin: !currentlyDisabled })
      .eq('id', jobId)
    await loadJobs(0)
    setPage(0)
  }

  const viewLicense = async (item) => {
    if (!item.license_url) { alert('No license uploaded.'); return }
    const cleanPath = item.license_url.includes('supabase.co')
      ? item.license_url.split('/licenses/')[1]
      : item.license_url
    const { data, error } = await supabase.storage
      .from('licenses')
      .createSignedUrl(cleanPath, 3600)
    if (error || !data?.signedUrl) { alert('Could not load license.'); return }
    window.open(data.signedUrl, '_blank')
  }

  const getPerformance = async (userId, type) => {
    if (type === 'store') {
      const [jobsRes, apptsRes] = await Promise.all([
        supabase.from('jobs').select('id, status').eq('store_owner_id', userId),
        supabase.from('appointments').select('id, status').eq('store_owner_id', userId),
      ])
      return {
        jobsPosted: jobsRes.data?.length || 0,
        jobsClosed: jobsRes.data?.filter(j => j.status === 'closed').length || 0,
        appointmentsConfirmed: apptsRes.data?.filter(a => a.status === 'confirmed').length || 0,
      }
    } else {
      const [appsRes, apptsRes] = await Promise.all([
        supabase.from('job_applications').select('id').eq('pharmacist_id', userId),
        supabase.from('appointments').select('id, status').eq('pharmacist_id', userId),
      ])
      return {
        jobsApplied: appsRes.data?.length || 0,
        appointmentsConfirmed: apptsRes.data?.filter(a => a.status === 'confirmed').length || 0,
      }
    }
  }

  // Filter by search
  const filteredPharmacists = pharmacists.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredStores = stores.filter(s =>
    s.store_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.store_profiles?.store_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p style={{ padding: 20 }}>Loading admin panel…</p>

  return (
    <AdminLayout activeSection={activeSection}>
    <div style={styles.page}>
      {/* SEARCH */}
      <div style={styles.searchBox}>
        <input
          style={styles.searchInput}
          placeholder={
            activeSection === 'pharmacists' ? 'Search by pharmacist name…'
            : activeSection === 'stores' ? 'Search by store name or area…'
            : 'Search by job title or store name…'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* STATUS FILTER (not for jobs) */}
      {activeSection !== 'jobs' && (
        <div style={styles.statusRow}>
          {['pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              style={status === s ? styles.activeBtn : styles.btn}
              onClick={() => setStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* PHARMACISTS */}
      {activeSection === 'pharmacists' && (
        <>
          <h2 style={styles.subHeading}>
            {status.charAt(0).toUpperCase() + status.slice(1)} Pharmacists ({filteredPharmacists.length}{hasMore ? '+' : ''})
          </h2>
          {filteredPharmacists.length === 0 && <p style={styles.empty}>No records found.</p>}
          {filteredPharmacists.map(item => (
            <PharmacistCard
              key={item.user_id}
              item={item}
              status={status}
              onApprove={() => updatePharmacistStatus(item.user_id, 'approved')}
              onReject={() => updatePharmacistStatus(item.user_id, 'rejected')}
              onViewLicense={() => viewLicense(item)}
              getPerformance={getPerformance}
            />
          ))}
        </>
      )}

      {/* STORES */}
      {activeSection === 'stores' && (
        <>
          <h2 style={styles.subHeading}>
            {status.charAt(0).toUpperCase() + status.slice(1)} Stores ({filteredStores.length}{hasMore ? '+' : ''})
          </h2>
          {filteredStores.length === 0 && <p style={styles.empty}>No records found.</p>}
          {filteredStores.map(item => (
            <StoreCard
              key={item.user_id}
              item={item}
              status={status}
              onApprove={() => updateStoreStatus(item.user_id, 'approved')}
              onReject={() => updateStoreStatus(item.user_id, 'rejected')}
              getPerformance={getPerformance}
            />
          ))}
        </>
      )}

      {/* JOBS */}
      {activeSection === 'jobs' && (
        <>
          <h2 style={styles.subHeading}>
            All Jobs ({filteredJobs.length}{hasMore ? '+' : ''})
          </h2>
          {filteredJobs.length === 0 && <p style={styles.empty}>No jobs found.</p>}
          {filteredJobs.map(job => (
            <div key={job.id} style={{
              ...styles.card,
              ...(job.disabled_by_admin ? { border: '2px solid #ef4444' } : {})
            }}>
              {job.disabled_by_admin && (
                <div style={styles.disabledBanner}>🚫 Disabled by Admin</div>
              )}
              <h3 style={styles.cardTitle}>{job.title}</h3>
              <p style={styles.detail}><b>Store:</b> {job.store_profiles?.store_name || '—'}</p>
              <p style={styles.detail}><b>Location:</b> {job.location}</p>
              <p style={styles.detail}><b>Status:</b> {job.status}</p>
              <p style={styles.detail}>
                <b>Posted:</b> {new Date(job.created_at).toLocaleDateString('en-IN')}
              </p>
              <p style={styles.detail}>
                <b>Expires:</b> {new Date(job.expires_at).toLocaleDateString('en-IN')}
              </p>
              <button
                style={job.disabled_by_admin ? styles.enableBtn : styles.disableBtn}
                onClick={() => toggleJobDisabled(job.id, job.disabled_by_admin)}
              >
                {job.disabled_by_admin ? '✓ Re-enable Job' : '🚫 Disable Job'}
              </button>
            </div>
          ))}
        </>
      )}

      {hasMore && (
        <button style={styles.loadMoreBtn} onClick={loadMore}>Load More</button>
      )}
    </div>
    </AdminLayout>
  )
}

function PharmacistCard({ item, status, onApprove, onReject, onViewLicense, getPerformance }) {
  const [perf, setPerf] = useState(null)
  const [loadingPerf, setLoadingPerf] = useState(false)

  const loadPerf = async () => {
    if (perf) { setPerf(null); return }
    setLoadingPerf(true)
    const data = await getPerformance(item.user_id, 'pharmacist')
    setPerf(data)
    setLoadingPerf(false)
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{item.name || 'Unnamed'}</h3>
      <p style={styles.detail}>
        Status: <span style={styles.badge}>{item.verification_status || 'pending'}</span>
      </p>

      <div style={styles.cardActions}>
        {item.license_url && (
          <button style={styles.licenseBtn} onClick={onViewLicense}>📄 View License</button>
        )}
        <button style={styles.perfBtn} onClick={loadPerf} disabled={loadingPerf}>
          {loadingPerf ? 'Loading…' : perf ? 'Hide Stats' : '📊 View Stats'}
        </button>
      </div>

      {perf && (
        <div style={styles.perfBox}>
          <p style={styles.perfItem}>📋 Jobs Applied: <b>{perf.jobsApplied}</b></p>
          <p style={styles.perfItem}>✓ Appointments Confirmed: <b>{perf.appointmentsConfirmed}</b></p>
        </div>
      )}

      {status === 'pending' && (
        <div style={styles.approvalActions}>
          <button style={styles.approve} onClick={onApprove}>Approve</button>
          <button style={styles.reject} onClick={onReject}>Reject</button>
        </div>
      )}
    </div>
  )
}

function StoreCard({ item, status, onApprove, onReject, getPerformance }) {
  const [perf, setPerf] = useState(null)
  const [loadingPerf, setLoadingPerf] = useState(false)

  const loadPerf = async () => {
    if (perf) { setPerf(null); return }
    setLoadingPerf(true)
    const data = await getPerformance(item.user_id, 'store')
    setPerf(data)
    setLoadingPerf(false)
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{item.store_name || 'Unnamed Store'}</h3>
      {item.address && <p style={styles.detail}>📍 {item.address}</p>}
      <p style={styles.detail}>
        Status: <span style={styles.badge}>{item.verification_status || 'pending'}</span>
      </p>

      <div style={styles.cardActions}>
        <button style={styles.perfBtn} onClick={loadPerf} disabled={loadingPerf}>
          {loadingPerf ? 'Loading…' : perf ? 'Hide Stats' : '📊 View Stats'}
        </button>
      </div>

      {perf && (
        <div style={styles.perfBox}>
          <p style={styles.perfItem}>📋 Jobs Posted: <b>{perf.jobsPosted}</b></p>
          <p style={styles.perfItem}>✓ Jobs Closed (Hired): <b>{perf.jobsClosed}</b></p>
          <p style={styles.perfItem}>📅 Appointments Confirmed: <b>{perf.appointmentsConfirmed}</b></p>
        </div>
      )}

      {status === 'pending' && (
        <div style={styles.approvalActions}>
          <button style={styles.approve} onClick={onApprove}>Approve</button>
          <button style={styles.reject} onClick={onReject}>Reject</button>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { padding: 20, maxWidth: 800, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  heading: { fontSize: 26, fontWeight: 700, marginBottom: 16 },

  searchBox: { marginBottom: 14 },
  searchInput: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' },
  statusRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  btn: { padding: '8px 14px', borderRadius: 6, border: '1px solid #ccc', background: '#f8fafc', cursor: 'pointer', fontSize: 14 },
  activeBtn: { padding: '8px 14px', borderRadius: 6, border: '1px solid #2563eb', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: 14 },
  subHeading: { fontSize: 18, fontWeight: 600, marginBottom: 12, marginTop: 4 },
  empty: { fontSize: 14, color: '#64748b', padding: 16 },
  card: { border: '1px solid #e2e8f0', padding: 16, borderRadius: 10, marginBottom: 14, background: 'white' },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: '0 0 8px 0' },
  detail: { fontSize: 14, color: '#475569', margin: '3px 0' },
  badge: { background: '#e5e7eb', padding: '2px 8px', borderRadius: 12, fontSize: 12 },
  cardActions: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  licenseBtn: { padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  perfBtn: { padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1e40af' },
  perfBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginTop: 10 },
  perfItem: { fontSize: 14, color: '#0f172a', margin: '4px 0' },
  approvalActions: { display: 'flex', gap: 8, marginTop: 12 },
  approve: { background: '#16a34a', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  reject: { background: '#dc2626', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  disableBtn: { marginTop: 10, padding: '7px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  enableBtn: { marginTop: 10, padding: '7px 14px', background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  disabledBanner: { background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 10 },
  loadMoreBtn: { marginTop: 20, width: '100%', padding: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
}