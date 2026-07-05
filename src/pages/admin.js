import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AdminLayout from '../components/AdminLayout'

const ADMIN_EMAIL = 'askmediclan@gmail.com'
const PAGE_SIZE = 20

// Calls our server API which uses SERVICE_ROLE_KEY to bypass RLS
async function adminUpdate(table, userId, updates) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ table, userId, updates }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Update failed')
  return json
}

export default function AdminPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('pharmacists')
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
    setPage(0); setSearch(''); fetchData(0)
  }, [activeSection, status, loading])

  const fetchData = async (pageNum) => {
    if (activeSection === 'pharmacists') await loadPharmacists(pageNum)
    else if (activeSection === 'stores') await loadStores(pageNum)
    else if (activeSection === 'jobs') await loadJobs(pageNum)
  }

  const loadPharmacists = async (pageNum) => {
    const from = pageNum * PAGE_SIZE
    const { data } = await supabase.from('pharmacist_profiles')
      .select('user_id, name, verification_status, is_verified, license_url, verification_remark')
      .eq('verification_status', status).order('name').range(from, from + PAGE_SIZE - 1)
    if (pageNum === 0) setPharmacists(data || [])
    else setPharmacists(prev => [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)
  }

  const loadStores = async (pageNum) => {
    const from = pageNum * PAGE_SIZE
    const { data } = await supabase.from('store_profiles')
      .select('user_id, store_name, verification_status, is_verified, address, license_url, contact_person, phone, store_timings, num_vacancies, experience_required, verification_remark')
      .eq('verification_status', status).order('store_name').range(from, from + PAGE_SIZE - 1)
    if (pageNum === 0) setStores(data || [])
    else setStores(prev => [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)
  }

  const loadJobs = async (pageNum) => {
    const from = pageNum * PAGE_SIZE
    const { data } = await supabase.from('jobs')
      .select('id, title, location, status, created_at, disabled_by_admin, expires_at, store_owner_id, store_profiles(store_name)')
      .order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    if (pageNum === 0) setJobs(data || [])
    else setJobs(prev => [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)
  }

  const loadMore = () => { const next = page + 1; setPage(next); fetchData(next) }

  const updatePharmacistStatus = async (userId, newStatus, remarkVal) => {
    try {
      await adminUpdate('pharmacist_profiles', userId, {
        verification_status: newStatus,
        is_verified: newStatus === 'approved',
        verification_remark: remarkVal
      })
      await loadPharmacists(0); setPage(0)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const updatePharmacistRemark = async (userId, remarkVal) => {
    try {
      await adminUpdate('pharmacist_profiles', userId, {
        verification_remark: remarkVal
      })
      await loadPharmacists(0); setPage(0)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const updateStoreStatus = async (userId, newStatus, remarkVal) => {
    try {
      await adminUpdate('store_profiles', userId, {
        verification_status: newStatus,
        is_verified: newStatus === 'approved',
        verification_remark: remarkVal
      })
      await loadStores(0); setPage(0)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const updateStoreRemark = async (userId, remarkVal) => {
    try {
      await adminUpdate('store_profiles', userId, {
        verification_remark: remarkVal
      })
      await loadStores(0); setPage(0)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const toggleJobDisabled = async (jobId, currentlyDisabled) => {
    await supabase.from('jobs').update({ disabled_by_admin: !currentlyDisabled }).eq('id', jobId)
    await loadJobs(0); setPage(0)
  }

  const viewLicense = async (item) => {
    if (!item.license_url) { alert('No license uploaded.'); return }
    const cleanPath = item.license_url.includes('supabase.co')
      ? item.license_url.split('/licenses/')[1]
      : item.license_url
    const { data, error } = await supabase.storage.from('licenses').createSignedUrl(cleanPath, 3600)
    if (error || !data?.signedUrl) { alert('Could not load license. Error: ' + error?.message); return }
    window.open(data.signedUrl, '_blank')
  }

  const getPerformance = async (userId, type) => {
    if (type === 'store') {
      const [j, a] = await Promise.all([
        supabase.from('jobs').select('id, status').eq('store_owner_id', userId),
        supabase.from('appointments').select('id, status').eq('store_owner_id', userId),
      ])
      return {
        jobsPosted: j.data?.length || 0,
        jobsClosed: j.data?.filter(x => x.status === 'closed').length || 0,
        appointmentsConfirmed: a.data?.filter(x => x.status === 'confirmed').length || 0
      }
    } else {
      const [ap, a] = await Promise.all([
        supabase.from('job_applications').select('id').eq('pharmacist_id', userId),
        supabase.from('appointments').select('id, status').eq('pharmacist_id', userId),
      ])
      return {
        jobsApplied: ap.data?.length || 0,
        appointmentsConfirmed: a.data?.filter(x => x.status === 'confirmed').length || 0
      }
    }
  }

  const filteredPharmacists = pharmacists.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
  const filteredStores = stores.filter(s => s.store_name?.toLowerCase().includes(search.toLowerCase()) || s.address?.toLowerCase().includes(search.toLowerCase()))
  const filteredJobs = jobs.filter(j => j.title?.toLowerCase().includes(search.toLowerCase()) || j.store_profiles?.store_name?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <p style={{ padding: 20 }}>Loading admin panel…</p>

  return (
    <AdminLayout>
      <div style={st.page}>
        <h1 style={st.heading}>Admin Panel</h1>
        <div style={st.sectionTabs}>
          {['pharmacists','stores','jobs'].map(s => (
            <button key={s} style={activeSection===s ? st.activeTab : st.tab} onClick={() => setActiveSection(s)}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <input style={st.search} placeholder={activeSection==='pharmacists'?'Search pharmacist…':activeSection==='stores'?'Search store…':'Search job…'} value={search} onChange={e=>setSearch(e.target.value)} />
        {activeSection !== 'jobs' && (
          <div style={st.statusRow}>
            {['pending','approved','rejected','suspended'].map(s => (
              <button key={s} style={status===s ? st.activeBtn : st.btn} onClick={() => setStatus(s)}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {activeSection === 'pharmacists' && <>
          <h2 style={st.sub}>Pharmacists — {status} ({filteredPharmacists.length}{hasMore?'+':''})</h2>
          {filteredPharmacists.length===0 && <p style={st.empty}>No records.</p>}
          {filteredPharmacists.map(item => (
            <PharmacistCard key={item.user_id} item={item} status={status}
  onApprove={(remarkVal)=>updatePharmacistStatus(item.user_id,'approved', remarkVal)}
  onReject={(remarkVal)=>updatePharmacistStatus(item.user_id,'rejected', remarkVal)}
  onSuspend={()=>updatePharmacistStatus(item.user_id,'suspended')}
  onSaveRemark={(remarkVal)=>updatePharmacistRemark(item.user_id, remarkVal)}
  getPerformance={getPerformance} />
          ))}
        </>}

        {activeSection === 'stores' && <>
          <h2 style={st.sub}>Stores — {status} ({filteredStores.length}{hasMore?'+':''})</h2>
          {filteredStores.length===0 && <p style={st.empty}>No records.</p>}
          {filteredStores.map(item => (
            <StoreCard key={item.user_id} item={item} status={status}
  onApprove={(remarkVal)=>updateStoreStatus(item.user_id,'approved', remarkVal)}
  onReject={(remarkVal)=>updateStoreStatus(item.user_id,'rejected', remarkVal)}
  onSuspend={()=>updateStoreStatus(item.user_id,'suspended')}
  onSaveRemark={(remarkVal)=>updateStoreRemark(item.user_id, remarkVal)}
  getPerformance={getPerformance} />
          ))}
        </>}

        {activeSection === 'jobs' && <>
          <h2 style={st.sub}>All Jobs ({filteredJobs.length}{hasMore?'+':''})</h2>
          {filteredJobs.length===0 && <p style={st.empty}>No jobs.</p>}
          {filteredJobs.map(job => (
            <div key={job.id} style={{...st.card, ...(job.disabled_by_admin?{border:'2px solid #ef4444'}:{})}}>
              {job.disabled_by_admin && <div style={st.disabledBanner}>🚫 Disabled by Admin</div>}
              <h3 style={st.cardTitle}>{job.title}</h3>
              <p style={st.detail}><b>Store:</b> {job.store_profiles?.store_name||'—'}</p>
              <p style={st.detail}><b>Location:</b> {job.location}</p>
              <p style={st.detail}><b>Status:</b> {job.status}</p>
              <p style={st.detail}><b>Posted:</b> {new Date(job.created_at).toLocaleDateString('en-IN')}</p>
              <button style={job.disabled_by_admin?st.enableBtn:st.disableBtn} onClick={()=>toggleJobDisabled(job.id,job.disabled_by_admin)}>
                {job.disabled_by_admin?'✓ Re-enable':'🚫 Disable'}
              </button>
            </div>
          ))}
        </>}

        {hasMore && <button style={st.loadMore} onClick={loadMore}>Load More</button>}
      </div>
    </AdminLayout>
  )
}

function PharmacistCard({ item, status, onApprove, onReject, onSuspend, onSaveRemark, getPerformance }) {
  const [perf, setPerf] = useState(null)
  const [lp, setLp] = useState(false)
  const [showLicense, setShowLicense] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [licenseUrl, setLicenseUrl] = useState('')
  const [ll, setLl] = useState(false)
  const [remark, setRemark] = useState(item.verification_remark || '')

  const loadPerf = async () => { if(perf){setPerf(null);return} setLp(true); setPerf(await getPerformance(item.user_id,'pharmacist')); setLp(false) }

  const toggleLicense = async () => {
    if (showLicense) {
      setShowLicense(false)
      return
    }
    if (licenseUrl) {
      setShowLicense(true)
      return
    }
    if (!item.license_url) {
      alert('No license uploaded.')
      return
    }
    setLl(true)
    const cleanPath = item.license_url.includes('supabase.co')
      ? item.license_url.split('/licenses/')[1]
      : item.license_url
    const { data, error } = await supabase.storage.from('licenses').createSignedUrl(cleanPath, 3600)
    if (error || !data?.signedUrl) {
      alert('Could not load license. Error: ' + error?.message)
    } else {
      setLicenseUrl(data.signedUrl)
      setShowLicense(true)
    }
    setLl(false)
  }

  return (
    <div style={status==='pending' ? {...st.card, ...st.cardPending} : st.card}>
      <h3 style={st.cardTitle}>{item.name||'Unnamed'}</h3>
      <p style={st.detail}>Status: <span style={st.badge}>{item.verification_status||'pending'}</span></p>
      {item.verification_remark && <div style={st.remarkHighlight}>💬 <b>Remark:</b> {item.verification_remark}</div>}
      
      <div style={st.actions}>
        {item.license_url && <button style={st.licBtn} onClick={toggleLicense} disabled={ll}>{ll?'…':showLicense?'Hide License':'📄 License'}</button>}
        <button style={st.perfBtn} onClick={loadPerf} disabled={lp}>{lp?'…':perf?'Hide Stats':'📊 Stats'}</button>
      </div>

      {showLicense && licenseUrl && (
  <div style={st.licenseBox}>
    <img src={licenseUrl} alt="License" style={{...st.licenseImg, cursor: 'zoom-in'}} onClick={() => setZoomOpen(true)} title="Click to zoom" />
  </div>
)}
{zoomOpen && (
  <div style={st.zoomOverlay} onClick={() => setZoomOpen(false)}>
    <img src={licenseUrl} alt="License zoomed" style={st.zoomImg} />
    <button style={st.zoomClose} onClick={() => setZoomOpen(false)}>✕ Close</button>
  </div>
)}
      {zoomOpen && (
        <div style={st.zoomOverlay} onClick={() => setZoomOpen(false)}>
          <img src={licenseUrl} alt="License zoomed" style={st.zoomImg} />
          <button style={st.zoomClose} onClick={() => setZoomOpen(false)}>✕ Close</button>
        </div>
      )}

      {perf && <div style={st.perfBox}><p style={st.perfItem}>📋 Applied: <b>{perf.jobsApplied}</b></p><p style={st.perfItem}>✓ Appointments: <b>{perf.appointmentsConfirmed}</b></p></div>}
      
      <div style={{ marginTop: 12 }}>
        <textarea
          style={st.remarkInput}
          placeholder="Add verification remark / comments..."
          value={remark}
          onChange={e => setRemark(e.target.value)}
          rows={2}
        />
        <div style={st.approvalRow}>
          <button style={st.saveRemarkBtn} onClick={() => onSaveRemark(remark)}>💾 Save Remark</button>
<button style={st.reject} onClick={() => { setRemark(''); onSaveRemark(''); }}>🗑️ Delete Remark</button>
          {status==='pending' && (
            <>
              <button style={st.approve} onClick={() => onApprove(remark)}>✓ Approve</button>
              <button style={st.reject} onClick={() => onReject(remark)}>✕ Reject</button>
            </>
          )}
          {status==='approved' && <button style={st.suspend} onClick={onSuspend}>⏸ Suspend</button>}
{status==='suspended' && <button style={st.approve} onClick={() => onApprove(remark)}>✓ Re-approve</button>}
        </div>
      </div>
    </div>
  )
}

function StoreCard({ item, status, onApprove, onReject, onSuspend, onSaveRemark, getPerformance }) {
  const [perf, setPerf] = useState(null)
  const [lp, setLp] = useState(false)
  const [showLicense, setShowLicense] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [licenseUrl, setLicenseUrl] = useState('')
  const [ll, setLl] = useState(false)
  const [remark, setRemark] = useState(item.verification_remark || '')

  const loadPerf = async () => { if(perf){setPerf(null);return} setLp(true); setPerf(await getPerformance(item.user_id,'store')); setLp(false) }

  const toggleLicense = async () => {
    if (showLicense) {
      setShowLicense(false)
      return
    }
    if (licenseUrl) {
      setShowLicense(true)
      return
    }
    if (!item.license_url) {
      alert('No license uploaded.')
      return
    }
    setLl(true)
    const cleanPath = item.license_url.includes('supabase.co')
      ? item.license_url.split('/licenses/')[1]
      : item.license_url
    const { data, error } = await supabase.storage.from('licenses').createSignedUrl(cleanPath, 3600)
    if (error || !data?.signedUrl) {
      alert('Could not load license. Error: ' + error?.message)
    } else {
      setLicenseUrl(data.signedUrl)
      setShowLicense(true)
    }
    setLl(false)
  }

  return (
    <div style={status==='pending' ? {...st.card, ...st.cardPending} : st.card}>
      <h3 style={st.cardTitle}>{item.store_name||'Unnamed Store'}</h3>
      {item.contact_person && <p style={st.detail}>👤 <b>Contact Person:</b> {item.contact_person}</p>}
      {item.phone && <p style={st.detail}>📞 <b>Phone:</b> {item.phone}</p>}
      {item.address && <p style={st.detail}>📍 <b>Address:</b> {item.address}</p>}
      {item.store_timings && <p style={st.detail}>🕒 <b>Store Timings:</b> {item.store_timings}</p>}
      {item.num_vacancies !== undefined && item.num_vacancies !== null && <p style={st.detail}>💼 <b>Vacancies:</b> {item.num_vacancies}</p>}
      {item.experience_required && <p style={st.detail}>🎓 <b>Experience Required:</b> {item.experience_required}</p>}
      <p style={st.detail}>Status: <span style={st.badge}>{item.verification_status||'pending'}</span></p>
      {item.verification_remark && <div style={st.remarkHighlight}>💬 <b>Remark:</b> {item.verification_remark}</div>}
      
      <div style={st.actions}>
        {item.license_url && <button style={st.licBtn} onClick={toggleLicense} disabled={ll}>{ll?'…':showLicense?'Hide License':'📄 License'}</button>}
        <button style={st.perfBtn} onClick={loadPerf} disabled={lp}>{lp?'…':perf?'Hide Stats':'📊 Stats'}</button>
      </div>
{showLicense && licenseUrl && (
  <div style={st.licenseBox}>
    <img src={licenseUrl} alt="License" style={{...st.licenseImg, cursor: 'zoom-in'}} onClick={() => setZoomOpen(true)} title="Click to zoom" />
  </div>
)}
{zoomOpen && (
  <div style={st.zoomOverlay} onClick={() => setZoomOpen(false)}>
    <img src={licenseUrl} alt="License zoomed" style={st.zoomImg} />
    <button style={st.zoomClose} onClick={() => setZoomOpen(false)}>✕ Close</button>
  </div>
)}
      {zoomOpen && (
        <div style={st.zoomOverlay} onClick={() => setZoomOpen(false)}>
          <img src={licenseUrl} alt="License zoomed" style={st.zoomImg} />
          <button style={st.zoomClose} onClick={() => setZoomOpen(false)}>✕ Close</button>
        </div>
      )}

      {perf && <div style={st.perfBox}><p style={st.perfItem}>📋 Jobs Posted: <b>{perf.jobsPosted}</b></p><p style={st.perfItem}>✓ Hired: <b>{perf.jobsClosed}</b></p><p style={st.perfItem}>📅 Appointments: <b>{perf.appointmentsConfirmed}</b></p></div>}
      
      <div style={{ marginTop: 12 }}>
        <textarea
          style={st.remarkInput}
          placeholder="Add verification remark / comments..."
          value={remark}
          onChange={e => setRemark(e.target.value)}
          rows={2}
        />
        <div style={st.approvalRow}>
          <button style={st.saveRemarkBtn} onClick={() => onSaveRemark(remark)}>💾 Save Remark</button>
<button style={st.reject} onClick={() => { setRemark(''); onSaveRemark(''); }}>🗑️ Delete Remark</button>
          {status==='pending' && (
            <>
              <button style={st.approve} onClick={() => onApprove(remark)}>✓ Approve</button>
              <button style={st.reject} onClick={() => onReject(remark)}>✕ Reject</button>
            </>
          )}
          {status==='approved' && <button style={st.suspend} onClick={onSuspend}>⏸ Suspend</button>}
{status==='suspended' && <button style={st.approve} onClick={() => onApprove(remark)}>✓ Re-approve</button>}but
        </div>
      </div>
    </div>
  )
}

const st = {
  page:{ padding:20, maxWidth:800, margin:'0 auto', fontFamily:'system-ui,sans-serif' },
  heading:{ fontSize:26, fontWeight:700, marginBottom:16 },
  sectionTabs:{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' },
  tab:{ padding:'9px 18px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:14 },
  activeTab:{ padding:'9px 18px', borderRadius:8, border:'1px solid #2563eb', background:'#2563eb', color:'white', cursor:'pointer', fontSize:14, fontWeight:600 },
  search:{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #cbd5e1', fontSize:14, boxSizing:'border-box', marginBottom:14 },
  statusRow:{ display:'flex', gap:8, marginBottom:16 },
  btn:{ padding:'8px 14px', borderRadius:6, border:'1px solid #ccc', background:'#f8fafc', cursor:'pointer', fontSize:14 },
  activeBtn:{ padding:'8px 14px', borderRadius:6, border:'1px solid #2563eb', background:'#2563eb', color:'white', cursor:'pointer', fontSize:14 },
  sub:{ fontSize:18, fontWeight:600, marginBottom:12 },
  empty:{ fontSize:14, color:'#64748b', padding:16 },
  card:{ border:'1px solid #e2e8f0', padding:16, borderRadius:10, marginBottom:14, background:'white' },
  cardPending:{ borderLeft:'5px solid #f59e0b', background:'#fffbeb' },
  remarkHighlight:{ background:'#fef3c7', border:'1px solid #fbbf24', borderRadius:6, padding:'8px 10px', margin:'8px 0', fontSize:14, color:'#78350f' },
  cardTitle:{ fontSize:16, fontWeight:600, margin:'0 0 8px 0' },
  detail:{ fontSize:14, color:'#475569', margin:'3px 0' },
  badge:{ background:'#e5e7eb', padding:'2px 8px', borderRadius:12, fontSize:12 },
  actions:{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' },
  licBtn:{ padding:'6px 12px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer', fontSize:13 },
  perfBtn:{ padding:'6px 12px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, cursor:'pointer', fontSize:13, color:'#1e40af' },
  perfBox:{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px', marginTop:10 },
  perfItem:{ fontSize:14, color:'#0f172a', margin:'4px 0' },
  approvalRow:{ display:'flex', gap:8, marginTop:12 },
  approve:{ background:'#16a34a', color:'white', border:'none', padding:'8px 20px', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:14 },
  reject:{ background:'#dc2626', color:'white', border:'none', padding:'8px 20px', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:14 },
  disableBtn:{ marginTop:10, padding:'7px 14px', background:'#fee2e2', color:'#991b1b', border:'1px solid #fca5a5', borderRadius:6, cursor:'pointer', fontSize:13 },
  enableBtn:{ marginTop:10, padding:'7px 14px', background:'#d1fae5', color:'#065f46', border:'1px solid #6ee7b7', borderRadius:6, cursor:'pointer', fontSize:13 },
  disabledBanner:{ background:'#fee2e2', color:'#991b1b', padding:'6px 10px', borderRadius:6, fontSize:13, fontWeight:600, marginBottom:10 },
  loadMore:{ marginTop:20, width:'100%', padding:12, background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:14 },
  suspend:{ background:'#f59e0b', color:'white', border:'none', padding:'8px 20px', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:14 },
  licenseBox:{ marginTop:12, border:'1px solid #e2e8f0', borderRadius:8, padding:8, overflow:'hidden', background:'#f8fafc' },
  licenseImg:{ width:'100%', maxHeight:400, objectFit:'contain', display:'block', borderRadius:6 },
  zoomOverlay:{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, cursor:'zoom-out' },
  zoomImg:{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 },
  zoomClose:{ position:'fixed', top:20, right:20, background:'#dc2626', color:'white', border:'none', padding:'10px 18px', borderRadius:6, fontWeight:700, cursor:'pointer', fontSize:14 },
  remarkInput:{ width:'100%', padding:'8px 12px', border:'1.5px solid #cbd5e1', borderRadius:6, fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' },
  saveRemarkBtn:{ background:'#475569', color:'white', border:'none', padding:'8px 16px', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:14 },
}