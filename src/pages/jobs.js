import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import PharmacistLayout from '../components/PharmacistLayout'

const BANNER_IMG = 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200&q=80'

const isPast = (dateStr) => {
  const today = new Date(); today.setHours(0,0,0,0)
  return new Date(dateStr) < today
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('jobs')
  const [apptTab, setApptTab] = useState('upcoming')
  const [maxDistance, setMaxDistance] = useState(50)
  const [userLocation, setUserLocation] = useState(null)
  const [pharmacistName, setPharmacistName] = useState('')
  const router = useRouter()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const [profileRes, appsRes, apptsRes] = await Promise.all([
        supabase.from('pharmacist_profiles').select('latitude, longitude, name').eq('user_id', user.id).maybeSingle(),
        supabase.from('job_applications').select('job_id, status').eq('pharmacist_id', user.id),
        supabase.from('appointments').select(`
          id, appointment_date, appointment_time, status, pharmacist_note,
          jobs!appointments_job_id_fkey (title),
          store_profiles (store_name, phone, latitude, longitude)
        `).eq('pharmacist_id', user.id).order('appointment_date', { ascending: true }),
      ])
      if (profileRes.data?.latitude) setUserLocation({ lat: profileRes.data.latitude, lng: profileRes.data.longitude })
      if (profileRes.data?.name) setPharmacistName(profileRes.data.name.split(' ')[0])
      setApplications(appsRes.data || [])
      setAppointments(apptsRes.data || [])
    }

    const { data } = await supabase
      .from('jobs')
      .select('id, title, location, shift, required_experience, num_openings, preferred_software, description, created_at, store_profiles (latitude, longitude)')
      .order('created_at', { ascending: false })
    setJobs(data || [])
    setLoading(false)
  }

  const reloadApplications = async (userId) => {
    const { data } = await supabase.from('job_applications').select('job_id, status').eq('pharmacist_id', userId)
    setApplications(data || [])
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  useEffect(() => {
    if (!jobs.length) { setFilteredJobs([]); return }
    if (!userLocation) { setFilteredJobs(jobs); return }
    const withDist = jobs.map(job => ({
      ...job,
      distance: job.store_profiles?.latitude
        ? calculateDistance(userLocation.lat, userLocation.lng, job.store_profiles.latitude, job.store_profiles.longitude)
        : null
    }))
    const near = withDist.filter(j => j.distance !== null && j.distance <= maxDistance).sort((a, b) => a.distance - b.distance)
    const far  = withDist.filter(j => j.distance === null)
    setFilteredJobs([...near, ...far])
  }, [maxDistance, jobs, userLocation])

  const applyForJob = async (jobId) => {
    if (!user) { router.push('/simple-login'); return }
    if (applications.some(a => a.job_id === jobId)) { alert('Already applied!'); return }
    const { error } = await supabase.from('job_applications').insert({ job_id: jobId, pharmacist_id: user.id, status: 'pending' })
    if (error) { alert(error.code === '23505' ? 'Already applied!' : error.message); return }
    await reloadApplications(user.id)
  }

  const handleAppointmentAction = async (appointmentId, action, note = '') => {
    const { error } = await supabase.from('appointments').update({
      status: action === 'confirm' ? 'confirmed' : 'reschedule_requested',
      pharmacist_note: note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', appointmentId)
    if (error) { alert(error.message); return }
    await load()
  }

  const upcomingAppts = appointments
    .filter(a => !isPast(a.appointment_date))
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))

  const pastAppts = appointments
    .filter(a => isPast(a.appointment_date))
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formatTime = (t) => { const [h,m] = t.split(':'); const d = new Date(); d.setHours(+h,+m); return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) }
  const isToday = (dateStr) => { const today = new Date(); today.setHours(0,0,0,0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1); const d = new Date(dateStr); d.setHours(0,0,0,0); return d >= today && d < tomorrow }

  if (loading) return <p style={{ padding: 40, fontFamily: 'Nunito, sans-serif' }}>Loading…</p>

  return (
    <PharmacistLayout>
    <div style={s.page}>
      <div style={s.banner}>
        <img src={BANNER_IMG} alt="" style={s.bannerImg} />
        <div style={s.bannerOverlay} />
        <div style={s.bannerContent}>
          <div>
            <h2 style={s.bannerTitle}>
              {pharmacistName ? `Welcome back, ${pharmacistName}! 👋` : 'Find Your Next Job 💊'}
            </h2>
            <p style={s.bannerSub}>
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} available
              {userLocation ? ` within ${maxDistance}km of you` : ' near you'}
            </p>
          </div>
        </div>
      </div>

      <div style={s.body}>
        {user && (
          <div style={s.tabs}>
            <button style={activeTab === 'jobs' ? s.activeTab : s.tab} onClick={() => setActiveTab('jobs')}>
              💼 Available Jobs
            </button>
            <button style={activeTab === 'appointments' ? s.activeTab : s.tab} onClick={() => setActiveTab('appointments')}>
              📅 Appointments
              {upcomingAppts.length > 0 && <span style={s.tabBadge}>{upcomingAppts.length}</span>}
            </button>
          </div>
        )}

        {/* JOBS TAB */}
        {activeTab === 'jobs' && (
          <>
            {userLocation && (
              <div style={s.filterBox}>
                <label style={s.filterLabel}>Show jobs within: <b>{maxDistance} km</b></label>
                <input type="range" min="5" max="100" step="5" value={maxDistance} onChange={e => setMaxDistance(Number(e.target.value))} style={{ width: '100%', accentColor: '#0e9090' }} />
                <p style={s.filterResult}>{filteredJobs.length} of {jobs.length} jobs shown — sorted by distance</p>
              </div>
            )}
            {!userLocation && user && (
              <div style={s.warning}>⚠️ Set your location in your profile to see distance-sorted jobs</div>
            )}
            {jobs.length === 0 && <div style={s.empty}>No jobs posted yet. Check back soon! 🏥</div>}
            {jobs.length > 0 && filteredJobs.length === 0 && (
              <div style={s.empty}>No jobs within {maxDistance}km. Try increasing the range.</div>
            )}
            {filteredJobs.map(job => {
              const applied = applications.some(a => a.job_id === job.id)
              return (
                <div key={job.id} style={s.jobCard}>
                  <div style={s.jobCardTop}>
                    <div>
                      <h3 style={s.jobTitle}>{job.title}</h3>
                      <p style={s.jobLocation}>📍 {job.location}</p>
                    </div>
                    {job.distance != null && (
                      <span style={s.distBadge}>📍 {job.distance.toFixed(1)} km</span>
                    )}
                  </div>
                  <div style={s.jobTags}>
                    {job.shift && <span style={s.tag}>🕐 {job.shift}</span>}
                    {job.required_experience && <span style={s.tag}>🎓 {job.required_experience}</span>}
                    {job.num_openings && <span style={s.tag}>👥 {job.num_openings} opening{job.num_openings > 1 ? 's' : ''}</span>}
                  </div>
                  {job.preferred_software && <p style={s.jobDetail}><b>Software:</b> {job.preferred_software}</p>}
                  {job.description && <p style={s.jobDetail}>{job.description}</p>}
                  {applied ? (
                    <div style={s.appliedBadge}>✓ Applied</div>
                  ) : (
                    <button style={s.applyBtn} onClick={() => applyForJob(job.id)}>
                      {user ? 'Apply Now →' : 'Login to Apply'}
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <>
            <div style={s.subTabs}>
              <button style={apptTab === 'upcoming' ? s.activeSubTab : s.subTab} onClick={() => setApptTab('upcoming')}>
                🔜 Upcoming <span style={s.tabCount}>{upcomingAppts.length}</span>
              </button>
              <button style={apptTab === 'past' ? s.activeSubTab : s.subTab} onClick={() => setApptTab('past')}>
                🕐 Past <span style={s.tabCount}>{pastAppts.length}</span>
              </button>
            </div>

            {apptTab === 'upcoming' && (
              <>
                {upcomingAppts.length === 0 && <div style={s.empty}>No upcoming appointments. Apply for jobs to get started! 🚀</div>}
                {upcomingAppts.map(appt => (
                  <AppointmentCard key={appt.id} appointment={appt} onAction={handleAppointmentAction} isToday={isToday(appt.appointment_date)} formatDate={formatDate} formatTime={formatTime} isPast={false} />
                ))}
              </>
            )}

            {apptTab === 'past' && (
              <>
                {pastAppts.length === 0 && <div style={s.empty}>No past appointments yet.</div>}
                {pastAppts.map(appt => (
                  <AppointmentCard key={appt.id} appointment={appt} onAction={handleAppointmentAction} isToday={false} formatDate={formatDate} formatTime={formatTime} isPast={true} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
    </PharmacistLayout>
  )
}

function AppointmentCard({ appointment, onAction, isToday, formatDate, formatTime, isPast }) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const store = appointment.store_profiles
  const job   = appointment.jobs

  return (
    <div style={{
      ...s.apptCard,
      ...(isPast ? s.pastCard : {}),
      ...(isToday && !isPast ? { border: '2px solid #f59e0b' } : {}),
    }}>
      {isPast && <div style={s.pastBanner}>🕐 Past Appointment</div>}
      {isToday && !isPast && <div style={s.todayBanner}>🔔 This appointment is TODAY!</div>}

      <h3 style={{ ...s.apptTitle, ...(isPast ? { color: '#94a3b8' } : {}) }}>{job?.title}</h3>
      <p style={s.jobDetail}><b>Store:</b> {store?.store_name}</p>

      <div style={{ ...s.dtBox, ...(isPast ? { background: '#f8fafc', borderColor: '#e2e8f0' } : {}) }}>
        <div style={s.dtItem}><span style={s.dtLabel}>📅 DATE</span><span style={{ ...s.dtVal, ...(isPast ? { color: '#94a3b8' } : {}) }}>{formatDate(appointment.appointment_date)}</span></div>
        <div style={s.dtItem}><span style={s.dtLabel}>🕐 TIME</span><span style={{ ...s.dtVal, ...(isPast ? { color: '#94a3b8' } : {}) }}>{formatTime(appointment.appointment_time)}</span></div>
      </div>

      {!isPast && (
        <>
          {appointment.status === 'pending' && (
            <>
              <div style={s.statusBadge}>⏳ Awaiting Your Response</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button style={s.confirmBtn} onClick={() => onAction(appointment.id, 'confirm')}>✓ Confirm</button>
                <button style={s.reschedBtn} onClick={() => setShowNote(!showNote)}>🔄 Reschedule</button>
              </div>
              {showNote && (
                <div style={{ marginTop: 10 }}>
                  <textarea style={s.noteInput} placeholder="Reason (optional)" value={note} onChange={e => setNote(e.target.value)} />
                  <button style={s.confirmBtn} onClick={() => { onAction(appointment.id, 'reschedule', note); setShowNote(false); setNote('') }}>Submit Request</button>
                </div>
              )}
            </>
          )}
          {appointment.status === 'confirmed' && (
            <>
              <div style={s.confirmedBadge}>✓ Confirmed</div>
              <p style={s.contactInfo}>📞 <b>Store Contact:</b> {store?.phone || 'Not provided'}</p>
              {store?.latitude && <button style={s.mapsBtn} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`, '_blank')}>📍 Get Directions</button>}
            </>
          )}
          {appointment.status === 'reschedule_requested' && (
            <>
              <div style={s.reschedBadge}>🔄 Reschedule Requested</div>
              {appointment.pharmacist_note && <p style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', marginTop: 6 }}><b>Your note:</b> {appointment.pharmacist_note}</p>}
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Waiting for store owner to respond…</p>
            </>
          )}
        </>
      )}

      {isPast && (
        <div style={s.pastStatus}>
          Status: <b>{appointment.status === 'confirmed' ? '✓ Was Confirmed' : appointment.status}</b>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0fdfd', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  banner: { position: 'relative', height: 160, overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%', objectFit: 'cover' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,52,96,0.88) 0%, rgba(14,144,144,0.72) 100%)' },
  bannerContent: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 24px' },
  bannerTitle: { color: 'white', fontSize: 22, fontWeight: 900, margin: 0 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  body: { maxWidth: 800, margin: '0 auto', padding: '20px 16px 40px' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e2e8f0' },
  tab: { padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 },
  activeTab: { padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: '3px solid #0e9090', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#0e9090', display: 'flex', alignItems: 'center', gap: 6 },
  tabBadge: { background: '#0e9090', color: 'white', borderRadius: 50, width: 20, height: 20, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  subTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  subTab: { padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 },
  activeSubTab: { padding: '8px 16px', background: '#0e9090', border: 'none', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 6 },
  tabCount: { background: 'rgba(0,0,0,0.1)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  filterBox: { background: 'white', padding: 16, borderRadius: 14, marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  filterLabel: { display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#0f3460' },
  filterResult: { fontSize: 13, color: '#64748b', marginTop: 8 },
  warning: { background: '#fef3c7', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 14, color: '#92400e', fontWeight: 600 },
  empty: { background: 'white', padding: 24, borderRadius: 14, fontSize: 15, color: '#64748b', textAlign: 'center', border: '1px solid #e2e8f0' },
  jobCard: { background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: 14, border: '1px solid #e2e8f0' },
  jobCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  jobTitle: { fontSize: 17, fontWeight: 800, color: '#0f3460', margin: 0, marginBottom: 2 },
  jobLocation: { fontSize: 13, color: '#64748b', margin: 0 },
  distBadge: { background: '#e0f7f7', color: '#0e9090', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 },
  jobTags: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  tag: { background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  jobDetail: { fontSize: 14, color: '#475569', margin: '4px 0' },
  applyBtn: { marginTop: 12, padding: '10px 20px', border: 'none', borderRadius: 10, background: '#0e9090', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: 14 },
  appliedBadge: { marginTop: 12, padding: '8px 14px', background: '#d1fae5', color: '#065f46', borderRadius: 10, display: 'inline-block', fontSize: 13, fontWeight: 800 },
  apptCard: { background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: 14, border: '1px solid #e2e8f0' },
  pastCard: { background: '#f8fafc', boxShadow: 'none', opacity: 0.85 },
  apptTitle: { fontSize: 17, fontWeight: 800, color: '#0f3460', margin: '0 0 8px' },
  todayBanner: { background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 12 },
  pastBanner: { background: '#f1f5f9', color: '#64748b', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'inline-block' },
  dtBox: { background: '#f0fdfd', border: '1px solid #99f6e4', borderRadius: 10, padding: 12, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 },
  dtItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  dtLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 },
  dtVal: { fontSize: 15, color: '#0f172a', fontWeight: 700 },
  statusBadge: { background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: 8, display: 'inline-block', fontSize: 13, fontWeight: 700 },
  confirmedBadge: { background: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: 8, display: 'inline-block', fontSize: 13, fontWeight: 700, marginBottom: 8 },
  reschedBadge: { background: '#fecaca', color: '#991b1b', padding: '6px 12px', borderRadius: 8, display: 'inline-block', fontSize: 13, fontWeight: 700 },
  confirmBtn: { padding: '9px 16px', border: 'none', borderRadius: 8, background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  reschedBtn: { padding: '9px 16px', border: 'none', borderRadius: 8, background: '#f59e0b', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  mapsBtn: { marginTop: 8, padding: '9px 16px', border: 'none', borderRadius: 8, background: '#0e9090', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  noteInput: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 60, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 },
  contactInfo: { fontSize: 14, color: '#0f172a', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, marginBottom: 8 },
  pastStatus: { fontSize: 13, color: '#94a3b8', marginTop: 8, fontWeight: 600 },
}