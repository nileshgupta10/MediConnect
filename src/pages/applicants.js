import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ApplicantsPage() {
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState([])
  const [appointments, setAppointments] = useState([])
  const [activeTab, setActiveTab] = useState('applicants')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('store_owner_id', user.id)

    if (!jobs || jobs.length === 0) { setLoading(false); return }

    const jobIds = jobs.map(j => j.id)

    const [appsRes, apptsRes] = await Promise.all([
      supabase
        .from('job_applications')
        .select(`
          id, job_id, status,
          jobs (title),
          pharmacist_profiles (
            user_id, name, years_experience,
            software_experience, is_verified, license_url, phone
          )
        `)
        .in('job_id', jobIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('appointments')
        .select(`
          id, appointment_date, appointment_time, status, pharmacist_note,
          jobs (title),
          pharmacist_profiles (name, phone)
        `)
        .eq('store_owner_id', user.id)
        .order('appointment_date', { ascending: true }),
    ])

    setApplicants(appsRes.data || [])
    setAppointments(apptsRes.data || [])
    setLoading(false)
  }

  const markInterested = async (applicationId) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status: 'interested' })
      .eq('id', applicationId)

    if (error) { alert(error.message); return }
    await loadData()
  }

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>

  return (
    <div style={styles.page}>
      <div style={styles.tabs}>
        <button
          style={activeTab === 'applicants' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('applicants')}
        >
          Applicants ({applicants.length})
        </button>
        <button
          style={activeTab === 'appointments' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments ({appointments.length})
        </button>
      </div>

      {activeTab === 'applicants' && (
        <>
          <h1 style={styles.heading}>Job Applicants</h1>
          {applicants.length === 0 && <div style={styles.empty}>No applications yet.</div>}
          {applicants.map((app) => {
            const p = app.pharmacist_profiles
            if (!p) return null
            return (
              <ApplicantCard
                key={app.id}
                application={app}
                pharmacist={p}
                onInterested={markInterested}
                onReload={loadData}
              />
            )
          })}
        </>
      )}

      {activeTab === 'appointments' && (
        <>
          <h1 style={styles.heading}>Appointments</h1>
          {appointments.length === 0 && <div style={styles.empty}>No appointments yet.</div>}
          {appointments.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} onReload={loadData} />
          ))}
        </>
      )}
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
    if (!pharmacist.license_url) { alert('No license uploaded by this pharmacist.'); return }
    setLoadingLicense(true)

    const cleanPath = pharmacist.license_url.includes('supabase.co')
      ? pharmacist.license_url.split('/licenses/')[1]
      : pharmacist.license_url

    const { data, error } = await supabase.storage
      .from('licenses')
      .createSignedUrl(cleanPath, 3600)

    setLoadingLicense(false)
    if (error || !data?.signedUrl) { alert('Could not load license. Please try again.'); return }
    window.open(data.signedUrl, '_blank')
  }

  const scheduleAppointment = async () => {
    if (!date || !time) { alert('Please select both date and time.'); return }

    setScheduling(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('appointments')
      .insert({
        job_application_id: application.id,
        job_id: application.job_id,
        pharmacist_id: pharmacist.user_id,
        store_owner_id: user.id,
        appointment_date: date,
        appointment_time: time,
        status: 'pending',
      })

    if (error) { alert(error.message); setScheduling(false); return }

    await supabase
      .from('job_applications')
      .update({ status: 'appointment_scheduled' })
      .eq('id', application.id)

    setScheduling(false)
    setShowSchedule(false)
    await onReload()
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.name}>{pharmacist.name || 'Unnamed'}</h2>
        <span style={pharmacist.is_verified ? styles.verifiedBadge : styles.pendingBadge}>
          {pharmacist.is_verified ? '✓ Verified' : '⏳ Unverified'}
        </span>
      </div>

      <p style={styles.detail}><b>Job:</b> {application.jobs?.title}</p>
      <p style={styles.detail}><b>Experience:</b> {pharmacist.years_experience || '—'} years</p>
      <p style={styles.detail}><b>Software:</b> {pharmacist.software_experience || '—'}</p>

      <div style={styles.actions}>
        {pharmacist.license_url && (
          <button style={styles.licenseBtn} onClick={viewLicense} disabled={loadingLicense}>
            {loadingLicense ? 'Loading…' : '📄 View License'}
          </button>
        )}
        {application.status === 'pending' && (
          <button style={styles.interestedBtn} onClick={() => onInterested(application.id)}>
            ✓ Mark Interested
          </button>
        )}
      </div>

      {application.status === 'interested' && !showSchedule && (
        <button style={styles.scheduleBtn} onClick={() => setShowSchedule(true)}>
          📅 Schedule Appointment
        </button>
      )}

      {application.status === 'interested' && showSchedule && (
        <div style={styles.scheduleForm}>
          <label style={styles.formLabel}>Select Date</label>
          <input
            type="date" style={styles.input} value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
          />
          <label style={styles.formLabel}>Select Time</label>
          <input
            type="time" style={styles.input} value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <div style={styles.formActions}>
            <button style={styles.confirmBtn} onClick={scheduleAppointment} disabled={scheduling}>
              {scheduling ? 'Sending…' : 'Send Appointment'}
            </button>
            <button style={styles.cancelBtn} onClick={() => setShowSchedule(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {application.status === 'appointment_scheduled' && (
        <div style={styles.scheduledBadge}>📅 Appointment Scheduled</div>
      )}
    </div>
  )
}

function AppointmentCard({ appointment, onReload }) {
  const pharmacist = appointment.pharmacist_profiles
  const job = appointment.jobs
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [sending, setSending] = useState(false)

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':')
    const d = new Date()
    d.setHours(parseInt(h), parseInt(m))
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const isUpcoming = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const apptDate = new Date(appointment.appointment_date); apptDate.setHours(0, 0, 0, 0)
    return apptDate >= today && apptDate <= tomorrow
  }

  const sendNewSlot = async () => {
    if (!newDate || !newTime) { alert('Please select both date and time.'); return }
    setSending(true)

    const { error } = await supabase
      .from('appointments')
      .update({
        appointment_date: newDate,
        appointment_time: newTime,
        status: 'pending',
        pharmacist_note: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)

    setSending(false)
    if (error) { alert('Error: ' + error.message); return }

    setShowReschedule(false)
    setNewDate('')
    setNewTime('')
    await onReload()
  }

  return (
    <div style={{
      ...styles.card,
      ...(isUpcoming() && appointment.status === 'confirmed' ? { border: '2px solid #f59e0b' } : {}),
      ...(appointment.status === 'reschedule_requested' ? { border: '2px solid #f87171' } : {}),
    }}>
      {isUpcoming() && appointment.status === 'confirmed' && (
        <div style={styles.reminderBanner}>🔔 Reminder: This appointment is today or tomorrow!</div>
      )}
      {appointment.status === 'reschedule_requested' && (
        <div style={styles.rescheduleAlert}>🔄 Pharmacist has requested a reschedule</div>
      )}

      <h3 style={styles.name}>{pharmacist?.name}</h3>
      <p style={styles.detail}><b>Job:</b> {job?.title}</p>

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
        <div style={styles.awaitingBadge}>⏳ Awaiting Pharmacist Response</div>
      )}

      {appointment.status === 'confirmed' && (
        <>
          <div style={styles.confirmedBadge}>✓ Confirmed</div>
          <p style={styles.contactInfo}>
            📞 <b>Pharmacist Contact:</b> {pharmacist?.phone || 'Not provided'}
          </p>
        </>
      )}

      {appointment.status === 'reschedule_requested' && (
        <>
          <div style={styles.rescheduleBadge}>🔄 Reschedule Requested</div>
          {appointment.pharmacist_note && (
            <div style={styles.noteBox}>
              <span style={styles.noteLabel}>Reason from pharmacist:</span>
              <span style={styles.noteText}>{appointment.pharmacist_note}</span>
            </div>
          )}
          <p style={styles.contactInfo}>
            📞 <b>Pharmacist Contact:</b> {pharmacist?.phone || 'Not provided'}
          </p>

          {!showReschedule ? (
            <button style={styles.newSlotBtn} onClick={() => setShowReschedule(true)}>
              📅 Offer New Time Slot
            </button>
          ) : (
            <div style={styles.rescheduleForm}>
              <p style={styles.rescheduleFormTitle}>Select a new date and time:</p>
              <label style={styles.formLabel}>New Date</label>
              <input
                type="date" style={styles.input} value={newDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <label style={styles.formLabel}>New Time</label>
              <input
                type="time" style={styles.input} value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
              <div style={styles.formActions}>
                <button style={styles.confirmBtn} onClick={sendNewSlot} disabled={sending}>
                  {sending ? 'Sending…' : '✓ Send New Slot'}
                </button>
                <button
                  style={styles.cancelBtn}
                  onClick={() => { setShowReschedule(false); setNewDate(''); setNewTime('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', padding: 16, maxWidth: 800, margin: '0 auto' },
  tabs: { display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #e5e7eb' },
  tab: { padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: '#64748b' },
  activeTab: { padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: '3px solid #2563eb', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#2563eb' },
  heading: { fontSize: 22, marginBottom: 14 },
  empty: { background: '#fff', padding: 16, borderRadius: 10, fontSize: 14, color: '#64748b' },
  card: { background: 'white', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 4px 10px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 17, fontWeight: 600, margin: 0 },
  detail: { fontSize: 14, color: '#475569', margin: '4px 0' },
  verifiedBadge: { background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  pendingBadge: { background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  licenseBtn: { padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  interestedBtn: { padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  scheduleBtn: { marginTop: 10, padding: '10px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, width: '100%' },
  scheduleForm: { marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' },
  rescheduleForm: { marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' },
  rescheduleFormTitle: { fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 },
  formLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4, marginTop: 8 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' },
  formActions: { display: 'flex', gap: 8, marginTop: 12 },
  confirmBtn: { flex: 1, padding: '10px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  cancelBtn: { flex: 1, padding: '10px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  scheduledBadge: { marginTop: 10, padding: '8px 12px', background: '#dbeafe', color: '#1e40af', borderRadius: 6, fontSize: 13, fontWeight: 600, display: 'inline-block' },
  awaitingBadge: { marginTop: 10, padding: '8px 12px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontSize: 13, fontWeight: 600, display: 'inline-block' },
  confirmedBadge: { marginTop: 10, padding: '8px 12px', background: '#d1fae5', color: '#065f46', borderRadius: 6, fontSize: 13, fontWeight: 600, display: 'inline-block' },
  rescheduleBadge: { marginTop: 10, padding: '8px 12px', background: '#fecaca', color: '#991b1b', borderRadius: 6, fontSize: 13, fontWeight: 600, display: 'inline-block' },
  contactInfo: { marginTop: 10, fontSize: 14, color: '#0f172a', padding: '8px 12px', background: '#f0fdf4', borderRadius: 6 },
  reminderBanner: { background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  rescheduleAlert: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  dateTimeBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 },
  dateTimeItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  dateTimeLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateTimeValue: { fontSize: 15, color: '#0f172a', fontWeight: 600 },
  noteBox: { background: '#fef9f0', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 },
  noteLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  noteText: { fontSize: 14, color: '#92400e', fontStyle: 'italic' },
  newSlotBtn: { marginTop: 10, width: '100%', padding: '11px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
}