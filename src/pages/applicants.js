import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BANNER_IMG = 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=1200&q=80'

const isPast = (dateStr) => {
  const today = new Date(); today.setHours(0,0,0,0)
  return new Date(dateStr) < today
}

export default function ApplicantsPage() {
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState([])
  const [appointments, setAppointments] = useState([])
  const [activeTab, setActiveTab] = useState('applicants')
  const [apptTab, setApptTab] = useState('upcoming')
  const [storeName, setStoreName] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: storeData } = await supabase
      .from('store_profiles').select('store_name').eq('user_id', user.id).maybeSingle()
    if (storeData?.store_name) setStoreName(storeData.store_name)

    const { data: jobs } = await supabase.from('jobs').select('id').eq('store_owner_id', user.id)
    if (!jobs?.length) { setLoading(false); return }

    const jobIds = jobs.map(j => j.id)
    const [appsRes, apptsRes] = await Promise.all([
      supabase.from('job_applications').select(`
        id, job_id, status,
        jobs (title),
        pharmacist_profiles (user_id, name, years_experience, software_experience, is_verified, license_url, phone)
      `).in('job_id', jobIds).order('created_at', { ascending: false }),
      supabase.from('appointments').select(`
        id, appointment_date, appointment_time, status, pharmacist_note,
        jobs (title),
        pharmacist_profiles (name, phone)
      `).eq('store_owner_id', user.id).order('appointment_date', { ascending: true }),
    ])

    setApplicants(appsRes.data || [])
    setAppointments(apptsRes.data || [])
    setLoading(false)
  }

  const markInterested = async (applicationId) => {
    const { error } = await supabase.from('job_applications').update({ status: 'interested' }).eq('id', applicationId)
    if (error) { alert(error.message); return }
    await loadData()
  }

  const upcomingAppts = appointments
    .filter(a => !isPast(a.appointment_date))
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))

  const pastAppts = appointments
    .filter(a => isPast(a.appointment_date))
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))

  if (loading) return <p style={{ padding: 20, fontFamily: 'Nunito, sans-serif' }}>Loading…</p>

  return (
    <div style={s.page}>
      <div style={s.banner}>
        <img src={BANNER_IMG} alt="" style={s.bannerImg} />
        <div style={s.bannerOverlay} />
        <div style={s.bannerContent}>
          <div>
            <h2 style={s.bannerTitle}>
              {storeName ? `Welcome, ${storeName}! 🏪` : 'My Dashboard 🏪'}
            </h2>
            <p style={s.bannerSub}>
              {applicants.length} applicant{applicants.length !== 1 ? 's' : ''} · {upcomingAppts.length} upcoming appointment{upcomingAppts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div style={s.body}>
        {/* Main tabs */}
        <div style={s.tabs}>
          <button style={activeTab === 'applicants' ? s.activeTab : s.tab} onClick={() => setActiveTab('applicants')}>
            👥 Applicants <span style={s.tabCount}>{applicants.length}</span>
          </button>
          <button style={activeTab === 'appointments' ? s.activeTab : s.tab} onClick={() => setActiveTab('appointments')}>
            📅 Appointments <span style={s.tabCount}>{appointments.length}</span>
          </button>
        </div>

        {/* APPLICANTS */}
        {activeTab === 'applicants' && (
          <>
            {applicants.length === 0 && <div style={s.empty}>No applications yet. Post a job to get started! 💼</div>}
            {applicants.map(app => {
              const p = app.pharmacist_profiles
              if (!p) return null
              return <ApplicantCard key={app.id} application={app} pharmacist={p} onInterested={markInterested} onReload={loadData} />
            })}
          </>
        )}

        {/* APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <>
            {/* Sub-tabs */}
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
                {upcomingAppts.length === 0 && <div style={s.empty}>No upcoming appointments. Mark applicants as interested to schedule! 📅</div>}
                {upcomingAppts.map(appt => <AppointmentCard key={appt.id} appointment={appt} onReload={loadData} isPast={false} />)}
              </>
            )}

            {apptTab === 'past' && (
              <>
                {pastAppts.length === 0 && <div style={s.empty}>No past appointments yet.</div>}
                {pastAppts.map(appt => <AppointmentCard key={appt.id} appointment={appt} onReload={loadData} isPast={true} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ApplicantCard({ application, pharmacist, onInterested, onReload }) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loadingLicense, setLoadingLicense] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  const viewLicense = async () => {
    if (!pharmacist.license_url) { alert('No license uploaded.'); return }
    setLoadingLicense(true)
    const cleanPath = pharmacist.license_url.includes('supabase.co') ? pharmacist.license_url.split('/licenses/')[1] : pharmacist.license_url
    const { data, error } = await supabase.storage.from('licenses').createSignedUrl(cleanPath, 3600)
    setLoadingLicense(false)
    if (error || !data?.signedUrl) { alert('Could not load license.'); return }
    window.open(data.signedUrl, '_blank')
  }

  const scheduleAppointment = async () => {
    if (!date || !time) { alert('Please select date and time.'); return }
    setScheduling(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('appointments').insert({
      job_application_id: application.id, job_id: application.job_id,
      pharmacist_id: pharmacist.user_id, store_owner_id: user.id,
      appointment_date: date, appointment_time: time, status: 'pending',
    })
    if (error) { alert(error.message); setScheduling(false); return }
    await supabase.from('job_applications').update({ status: 'appointment_scheduled' }).eq('id', application.id)
    setScheduling(false); setShowSchedule(false)
    await onReload()
  }

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <h2 style={s.name}>{pharmacist.name || 'Unnamed'}</h2>
        <span style={pharmacist.is_verified ? s.verifiedBadge : s.pendingBadge}>
          {pharmacist.is_verified ? '✓ Verified' : '⏳ Unverified'}
        </span>
      </div>
      <p style={s.detail}><b>Job:</b> {application.jobs?.title}</p>
      <p style={s.detail}><b>Experience:</b> {pharmacist.years_experience || '—'} years</p>
      <p style={s.detail}><b>Software:</b> {pharmacist.software_experience || '—'}</p>
      <div style={s.actions}>
        {pharmacist.license_url && (
          <button style={s.licenseBtn} onClick={viewLicense} disabled={loadingLicense}>
            {loadingLicense ? 'Loading…' : '📄 View License'}
          </button>
        )}
        {application.status === 'pending' && (
          <button style={s.interestedBtn} onClick={() => onInterested(application.id)}>✓ Interested</button>
        )}
      </div>
      {application.status === 'interested' && !showSchedule && (
        <button style={s.scheduleBtn} onClick={() => setShowSchedule(true)}>📅 Schedule Appointment</button>
      )}
      {application.status === 'interested' && showSchedule && (
        <div style={s.schedForm}>
          <label style={s.formLabel}>Date</label>
          <input type="date" style={s.input} value={date} min={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} />
          <label style={s.formLabel}>Time</label>
          <input type="time" style={s.input} value={time} onChange={e => setTime(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={s.confirmBtn} onClick={scheduleAppointment} disabled={scheduling}>{scheduling ? 'Sending…' : 'Send Appointment'}</button>
            <button style={s.cancelBtn} onClick={() => setShowSchedule(false)}>Cancel</button>
          </div>
        </div>
      )}
      {application.status === 'appointment_scheduled' && (
        <div style={s.scheduledBadge}>📅 Appointment Scheduled</div>
      )}
    </div>
  )
}

function AppointmentCard({ appointment, onReload, isPast }) {
  const pharmacist = appointment.pharmacist_profiles
  const job = appointment.jobs
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [sending, setSending] = useState(false)

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formatTime = (t) => { const [h,m] = t.split(':'); const d = new Date(); d.setHours(+h,+m); return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) }

  const isToday = () => {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
    const d = new Date(appointment.appointment_date); d.setHours(0,0,0,0)
    return d >= today && d < tomorrow
  }

  const sendNewSlot = async () => {
    if (!newDate || !newTime) { alert('Select date and time.'); return }
    setSending(true)
    const { error } = await supabase.from('appointments').update({
      appointment_date: newDate, appointment_time: newTime,
      status: 'pending', pharmacist_note: null, updated_at: new Date().toISOString(),
    }).eq('id', appointment.id)
    setSending(false)
    if (error) { alert(error.message); return }
    setShowReschedule(false); setNewDate(''); setNewTime('')
    await onReload()
  }

  return (
    <div style={{
      ...s.card,
      ...(isPast ? s.pastCard : {}),
      ...(isToday() && !isPast ? { border: '2px solid #f59e0b' } : {}),
      ...(appointment.status === 'reschedule_requested' && !isPast ? { border: '2px solid #f87171' } : {}),
    }}>
      {isPast && <div style={s.pastBanner}>🕐 Past Appointment</div>}
      {isToday() && !isPast && <div style={s.todayBanner}>🔔 This appointment is TODAY!</div>}
      {appointment.status === 'reschedule_requested' && !isPast && <div style={s.reschedAlert}>🔄 Pharmacist requested a reschedule</div>}

      <h3 style={{ ...s.name, ...(isPast ? { color: '#94a3b8' } : {}) }}>{pharmacist?.name}</h3>
      <p style={s.detail}><b>Job:</b> {job?.title}</p>

      <div style={{ ...s.dtBox, ...(isPast ? { background: '#f8fafc', borderColor: '#e2e8f0' } : {}) }}>
        <div style={s.dtItem}><span style={s.dtLabel}>📅 DATE</span><span style={{ ...s.dtVal, ...(isPast ? { color: '#94a3b8' } : {}) }}>{formatDate(appointment.appointment_date)}</span></div>
        <div style={s.dtItem}><span style={s.dtLabel}>🕐 TIME</span><span style={{ ...s.dtVal, ...(isPast ? { color: '#94a3b8' } : {}) }}>{formatTime(appointment.appointment_time)}</span></div>
      </div>

      {!isPast && (
        <>
          {appointment.status === 'pending' && <div style={s.awaitingBadge}>⏳ Awaiting Pharmacist Response</div>}
          {appointment.status === 'confirmed' && (
            <>
              <div style={s.confirmedBadge}>✓ Confirmed</div>
              <p style={s.contactInfo}>📞 <b>Pharmacist:</b> {pharmacist?.phone || 'Not provided'}</p>
            </>
          )}
          {appointment.status === 'reschedule_requested' && (
            <>
              <div style={s.reschedBadge}>🔄 Reschedule Requested</div>
              {appointment.pharmacist_note && <div style={s.noteBox}><span style={s.dtLabel}>REASON</span><span style={{ fontSize: 14, color: '#92400e', fontStyle: 'italic' }}>{appointment.pharmacist_note}</span></div>}
              <p style={s.contactInfo}>📞 <b>Pharmacist:</b> {pharmacist?.phone || 'Not provided'}</p>
              {!showReschedule ? (
                <button style={s.scheduleBtn} onClick={() => setShowReschedule(true)}>📅 Offer New Time Slot</button>
              ) : (
                <div style={s.schedForm}>
                  <label style={s.formLabel}>New Date</label>
                  <input type="date" style={s.input} value={newDate} min={new Date().toISOString().split('T')[0]} onChange={e => setNewDate(e.target.value)} />
                  <label style={s.formLabel}>New Time</label>
                  <input type="time" style={s.input} value={newTime} onChange={e => setNewTime(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={s.confirmBtn} onClick={sendNewSlot} disabled={sending}>{sending ? 'Sending…' : '✓ Send New Slot'}</button>
                    <button style={s.cancelBtn} onClick={() => { setShowReschedule(false); setNewDate(''); setNewTime('') }}>Cancel</button>
                  </div>
                </div>
              )}
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
  subTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  subTab: { padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 },
  activeSubTab: { padding: '8px 16px', background: '#0e9090', border: 'none', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 6 },
  tabCount: { background: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  empty: { background: 'white', padding: 24, borderRadius: 14, fontSize: 15, color: '#64748b', textAlign: 'center', border: '1px solid #e2e8f0' },
  card: { background: 'white', borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  pastCard: { background: '#f8fafc', boxShadow: 'none', border: '1px solid #e2e8f0', opacity: 0.8 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 17, fontWeight: 800, color: '#0f3460', margin: 0 },
  detail: { fontSize: 14, color: '#475569', margin: '3px 0' },
  verifiedBadge: { background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  pendingBadge: { background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  actions: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  licenseBtn: { padding: '7px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  interestedBtn: { padding: '7px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  scheduleBtn: { marginTop: 10, width: '100%', padding: '10px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 800 },
  schedForm: { marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' },
  formLabel: { display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  confirmBtn: { flex: 1, padding: '10px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  cancelBtn: { flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  scheduledBadge: { marginTop: 10, padding: '8px 12px', background: '#dbeafe', color: '#1e40af', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'inline-block' },
  awaitingBadge: { marginTop: 10, padding: '8px 12px', background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'inline-block' },
  confirmedBadge: { marginTop: 10, padding: '8px 12px', background: '#d1fae5', color: '#065f46', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'inline-block', marginBottom: 8 },
  reschedBadge: { marginTop: 10, padding: '8px 12px', background: '#fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'inline-block' },
  contactInfo: { fontSize: 14, color: '#0f172a', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, marginTop: 8, marginBottom: 4 },
  todayBanner: { background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 12 },
  pastBanner: { background: '#f1f5f9', color: '#64748b', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'inline-block' },
  reschedAlert: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 12 },
  dtBox: { background: '#f0fdfd', border: '1px solid #99f6e4', borderRadius: 10, padding: 12, margin: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 },
  dtItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  dtLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 },
  dtVal: { fontSize: 15, color: '#0f172a', fontWeight: 700 },
  noteBox: { background: '#fef9f0', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 },
  pastStatus: { fontSize: 13, color: '#94a3b8', marginTop: 8, fontWeight: 600 },
}