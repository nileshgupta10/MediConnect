import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('jobs')
  const [maxDistance, setMaxDistance] = useState(50)
  const [userLocation, setUserLocation] = useState(null)
  const router = useRouter()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const [profileRes, appsRes, apptsRes] = await Promise.all([
        supabase
          .from('pharmacist_profiles')
          .select('latitude, longitude')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('job_applications')
          .select('job_id, status')
          .eq('pharmacist_id', user.id),
        supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            pharmacist_note,
            jobs!appointments_job_id_fkey (title),
            store_profiles (store_name, phone, latitude, longitude)
          `)
          .eq('pharmacist_id', user.id)
          .order('appointment_date', { ascending: true }),
      ])

      if (profileRes.data?.latitude && profileRes.data?.longitude) {
        setUserLocation({ lat: profileRes.data.latitude, lng: profileRes.data.longitude })
      }
      setApplications(appsRes.data || [])
      setAppointments(apptsRes.data || [])
    }

    const { data } = await supabase
      .from('jobs')
      .select(`
        id, title, location, shift, required_experience,
        num_openings, preferred_software, description, created_at,
        store_profiles (latitude, longitude)
      `)
      .order('created_at', { ascending: false })

    setJobs(data || [])
    setLoading(false)
  }

  const reloadApplications = async (userId) => {
    const { data } = await supabase
      .from('job_applications')
      .select('job_id, status')
      .eq('pharmacist_id', userId)
    setApplications(data || [])
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  useEffect(() => {
    if (!jobs.length) { setFilteredJobs([]); return }
    if (!userLocation) { setFilteredJobs(jobs); return }

    const jobsWithDistance = jobs.map(job => {
      if (!job.store_profiles?.latitude || !job.store_profiles?.longitude) {
        return { ...job, distance: null }
      }
      return {
        ...job,
        distance: calculateDistance(
          userLocation.lat, userLocation.lng,
          job.store_profiles.latitude, job.store_profiles.longitude
        )
      }
    })

    const withLocation = jobsWithDistance
      .filter(j => j.distance !== null && j.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)

    const withoutLocation = jobsWithDistance.filter(j => j.distance === null)
    setFilteredJobs([...withLocation, ...withoutLocation])
  }, [maxDistance, jobs, userLocation])

  const applyForJob = async (jobId) => {
    if (!user) { router.push('/simple-login'); return }

    const alreadyApplied = applications.some(app => app.job_id === jobId)
    if (alreadyApplied) { alert('You have already applied for this job!'); return }

    const { error } = await supabase
      .from('job_applications')
      .insert({ job_id: jobId, pharmacist_id: user.id, status: 'pending' })

    if (error) {
      alert(error.code === '23505'
        ? 'You have already applied for this job!'
        : 'Error: ' + error.message)
      return
    }

    await reloadApplications(user.id)
  }

  const handleAppointmentAction = async (appointmentId, action, note = '') => {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: action === 'confirm' ? 'confirmed' : 'reschedule_requested',
        pharmacist_note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    if (error) { alert(error.message); return }
    await load()
  }

  const isUpcoming = (dateStr) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const apptDate = new Date(dateStr)
    apptDate.setHours(0, 0, 0, 0)
    return apptDate >= today && apptDate <= tomorrow
  }

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':')
    const d = new Date()
    d.setHours(parseInt(h), parseInt(m))
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      {user && (
        <div style={styles.tabs}>
          <button
            style={activeTab === 'jobs' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('jobs')}
          >
            Available Jobs
          </button>
          <button
            style={activeTab === 'appointments' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
            {appointments.length > 0 && (
              <span style={styles.tabCount}>{appointments.length}</span>
            )}
          </button>
        </div>
      )}

      {activeTab === 'jobs' && (
        <>
          <h1 style={styles.heading}>Available Pharmacy Jobs</h1>

          {userLocation && (
            <div style={styles.filterBox}>
              <label style={styles.filterLabel}>
                Show jobs within: <b>{maxDistance} km</b>
              </label>
              <input
                type="range" min="5" max="100" step="5"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <p style={styles.filterResult}>
                Showing {filteredJobs.length} of {jobs.length} jobs — sorted by distance
              </p>
            </div>
          )}

          {!userLocation && user && (
            <div style={styles.warning}>
              ⚠️ Set your location in your profile to see distance-sorted jobs
            </div>
          )}

          {jobs.length === 0 && <p>No jobs posted yet.</p>}
          {jobs.length > 0 && filteredJobs.length === 0 && (
            <p>No jobs found within {maxDistance} km. Try increasing the range.</p>
          )}

          {filteredJobs.map((job) => {
            const applied = applications.some(app => app.job_id === job.id)
            return (
              <div key={job.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0 }}>{job.title}</h3>
                  {job.distance != null && (
                    <span style={styles.distanceBadge}>📍 {job.distance.toFixed(1)} km</span>
                  )}
                </div>
                <p style={styles.location}>📍 {job.location}</p>
                {job.shift && <p style={styles.detail}><b>Shift:</b> {job.shift}</p>}
                {job.required_experience && <p style={styles.detail}><b>Experience:</b> {job.required_experience}</p>}
                {job.num_openings && <p style={styles.detail}><b>Openings:</b> {job.num_openings}</p>}
                {job.preferred_software && <p style={styles.detail}><b>Software:</b> {job.preferred_software}</p>}
                {job.description && <p style={styles.detail}>{job.description}</p>}

                {applied ? (
                  <div style={styles.appliedBadge}>✓ Applied</div>
                ) : (
                  <button style={styles.applyBtn} onClick={() => applyForJob(job.id)}>
                    {user ? 'Apply Now' : 'Login to Apply'}
                  </button>
                )}
              </div>
            )
          })}
        </>
      )}

      {activeTab === 'appointments' && (
        <>
          <h1 style={styles.heading}>My Appointments</h1>
          {appointments.length === 0 && <div style={styles.empty}>No appointments yet.</div>}
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onAction={handleAppointmentAction}
              isUpcoming={isUpcoming(appt.appointment_date)}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </>
      )}
    </div>
  )
}

function AppointmentCard({ appointment, onAction, isUpcoming, formatDate, formatTime }) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const store = appointment.store_profiles
  const job = appointment.jobs

  const openMaps = () => {
    if (store?.latitude && store?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`,
        '_blank'
      )
    }
  }

  return (
    <div style={{
      ...styles.appointmentCard,
      ...(isUpcoming && appointment.status === 'confirmed' ? styles.upcomingCard : {})
    }}>
      {isUpcoming && appointment.status === 'confirmed' && (
        <div style={styles.reminderBanner}>🔔 Reminder: This appointment is today or tomorrow!</div>
      )}

      <h3 style={styles.apptTitle}>{job?.title}</h3>
      <p style={styles.detail}><b>Store:</b> {store?.store_name}</p>

      <div style={styles.dateTimeBox}>
        <div style={styles.dateTimeItem}>
          <span style={styles.dateTimeLabel}>📅 Date</span>
          <span style={styles.dateTimeValue}>{formatDate(appointment.appointment_date)}</span>
        </div>
        <div style={styles.dateTimeItem}>
          <span style={styles.dateTimeLabel}>🕐 Time</span>
          <span style={styles.dateTimeValue}>{formatTime(appointment.appointment_time)}</span>
        </div>
      </div>

      {appointment.status === 'pending' && (
        <>
          <div style={styles.statusBadge}>⏳ Awaiting Your Response</div>
          <button style={styles.confirmBtn} onClick={() => onAction(appointment.id, 'confirm')}>
            ✓ Confirm Appointment
          </button>
          <button style={styles.rescheduleBtn} onClick={() => setShowNote(!showNote)}>
            🔄 Request Reschedule
          </button>
          {showNote && (
            <div style={{ marginTop: 10 }}>
              <textarea
                style={styles.noteInput}
                placeholder="Reason for rescheduling (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button style={styles.submitBtn} onClick={() => {
                onAction(appointment.id, 'reschedule', note)
                setShowNote(false)
                setNote('')
              }}>
                Submit Request
              </button>
            </div>
          )}
        </>
      )}

      {appointment.status === 'confirmed' && (
        <>
          <div style={styles.confirmedBadge}>✓ Confirmed</div>
          <p style={styles.contactInfo}>📞 <b>Store Contact:</b> {store?.phone || 'Not provided'}</p>
          <button style={styles.mapsBtn} onClick={openMaps}>📍 Get Directions</button>
        </>
      )}

      {appointment.status === 'reschedule_requested' && (
        <>
          <div style={styles.rescheduledBadge}>🔄 Reschedule Requested</div>
          {appointment.pharmacist_note && (
            <p style={styles.note}><b>Your note:</b> {appointment.pharmacist_note}</p>
          )}
          <p style={styles.waiting}>Waiting for store owner to respond…</p>
        </>
      )}
    </div>
  )
}

const styles = {
  page: { padding: 24, maxWidth: 800, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
  tabs: { display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #e5e7eb' },
  tab: { padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 },
  activeTab: { padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: '3px solid #2563eb', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8 },
  tabCount: { background: '#2563eb', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 26, marginBottom: 20 },
  filterBox: { background: '#f8fafc', padding: 16, borderRadius: 10, marginBottom: 20, border: '1px solid #e5e7eb' },
  filterLabel: { display: 'block', fontSize: 14, marginBottom: 8 },
  filterResult: { fontSize: 13, color: '#64748b', marginTop: 8 },
  warning: { background: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14, color: '#92400e' },
  card: { background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', marginBottom: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  distanceBadge: { background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  location: { color: '#64748b', fontSize: 14, marginBottom: 6 },
  detail: { fontSize: 14, color: '#475569', margin: '4px 0' },
  applyBtn: { marginTop: 12, padding: '10px 16px', border: 'none', borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  appliedBadge: { marginTop: 12, padding: '8px 14px', background: '#d1fae5', color: '#065f46', borderRadius: 6, display: 'inline-block', fontSize: 14, fontWeight: 600 },
  empty: { background: '#fff', padding: 16, borderRadius: 10, fontSize: 14, color: '#64748b' },
  appointmentCard: { background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', marginBottom: 16, border: '1px solid #e5e7eb' },
  upcomingCard: { border: '2px solid #f59e0b', boxShadow: '0 4px 12px rgba(245,158,11,0.15)' },
  reminderBanner: { background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  apptTitle: { fontSize: 17, fontWeight: 600, margin: '0 0 8px 0' },
  dateTimeBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 },
  dateTimeItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  dateTimeLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateTimeValue: { fontSize: 15, color: '#0f172a', fontWeight: 600 },
  statusBadge: { background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: 6, display: 'inline-block', fontSize: 13, fontWeight: 600, marginBottom: 10 },
  confirmedBadge: { background: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: 6, display: 'inline-block', fontSize: 13, fontWeight: 600, marginTop: 4, marginBottom: 10 },
  rescheduledBadge: { background: '#fecaca', color: '#991b1b', padding: '6px 12px', borderRadius: 6, display: 'inline-block', fontSize: 13, fontWeight: 600, marginBottom: 10 },
  confirmBtn: { marginRight: 8, padding: '10px 16px', border: 'none', borderRadius: 8, background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  rescheduleBtn: { padding: '10px 16px', border: 'none', borderRadius: 8, background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  mapsBtn: { marginTop: 10, padding: '10px 16px', border: 'none', borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  noteInput: { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', minHeight: 60, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' },
  submitBtn: { marginTop: 8, padding: '8px 14px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 },
  contactInfo: { fontSize: 14, color: '#0f172a', padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, marginBottom: 8 },
  note: { fontSize: 13, color: '#475569', marginTop: 8, fontStyle: 'italic' },
  waiting: { fontSize: 13, color: '#64748b', fontStyle: 'italic', marginTop: 8 },
}