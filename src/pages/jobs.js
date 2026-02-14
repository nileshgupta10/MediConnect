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

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      // Get user's location from pharmacist profile
      const { data: profile } = await supabase
        .from('pharmacist_profiles')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.latitude && profile?.longitude) {
        setUserLocation({
          lat: profile.latitude,
          lng: profile.longitude,
        })
      }

      // Load applications
      const { data: apps } = await supabase
        .from('job_applications')
        .select('job_id, status')
        .eq('pharmacist_id', user.id)

      setApplications(apps || [])

      // Load appointments
const { data: appts, error: apptError } = await supabase
  .from('appointments')
  .select(`
    id,
    appointment_date,
    appointment_time,
    status,
    pharmacist_note,
    jobs (title),
    store_profiles (
      store_name,
      phone,
      latitude,
      longitude
    )
  `)
  .eq('pharmacist_id', user.id)
  .order('created_at', { ascending: false })

console.log('Appointments:', appts)
console.log('Appointments error:', apptError)

setAppointments(appts || [])
    }

    // Load all jobs with store location
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        store_profiles (latitude, longitude)
      `)
      .order('created_at', { ascending: false })

    setJobs(data || [])
    setFilteredJobs(data || [])
    setLoading(false)
  }

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Filter and sort jobs by distance
  useEffect(() => {
    if (!userLocation || !jobs.length) {
      setFilteredJobs(jobs)
      return
    }

    // Add distance to each job
    const jobsWithDistance = jobs.map(job => {
      if (!job.store_profiles?.latitude || !job.store_profiles?.longitude) {
        return { ...job, distance: 999999 } // Put jobs without location at end
      }

      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        job.store_profiles.latitude,
        job.store_profiles.longitude
      )

      return { ...job, distance }
    })

    // Filter by max distance
    const filtered = jobsWithDistance.filter(job => job.distance <= maxDistance)

    // Sort by distance (closest first)
    filtered.sort((a, b) => a.distance - b.distance)

    setFilteredJobs(filtered)
  }, [maxDistance, jobs, userLocation])

  const applyForJob = async (jobId) => {
    if (!user) {
      router.push('/simple-login')
      return
    }

    // Check if already applied
    const alreadyApplied = applications.some(app => app.job_id === jobId)
    if (alreadyApplied) {
      alert('You have already applied for this job!')
      return
    }

    const { error } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        pharmacist_id: user.id,
        status: 'pending',
      })

    if (error) {
      console.error('Apply error:', error)
      if (error.code === '23505') {
        alert('You have already applied for this job!')
      } else {
        alert('Error applying: ' + error.message)
      }
      return
    }

    alert('Application submitted successfully!')
    
    // Reload to update UI
    await load()
  }

  const handleAppointmentAction = async (appointmentId, action, note = '') => {
    const newStatus = action === 'confirm' ? 'confirmed' : 'reschedule_requested'

    const { error } = await supabase
      .from('appointments')
      .update({
        status: newStatus,
        pharmacist_note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    if (error) {
      alert(error.message)
      return
    }

    alert(action === 'confirm' ? 'Appointment confirmed!' : 'Reschedule request sent!')
    await load()
  }

  const hasApplied = (jobId) => {
    return applications.some(app => app.job_id === jobId)
  }

  const getJobDistance = (job) => {
    if (job.distance && job.distance < 999999) {
      return job.distance.toFixed(1)
    }
    return null
  }

  if (loading) return <p style={{ padding: 40 }}>Loading jobs…</p>

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
            Appointments ({appointments.length})
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
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                style={styles.slider}
              />
              <p style={styles.filterResult}>
                Showing {filteredJobs.length} of {jobs.length} jobs (sorted by distance)
              </p>
            </div>
          )}

          {!userLocation && user && (
            <div style={styles.warning}>
              ⚠️ Set your location in your profile to see distance-sorted jobs
            </div>
          )}

          {filteredJobs.length === 0 && <p>No jobs found in your area.</p>}

          {filteredJobs.map((job) => {
            const applied = hasApplied(job.id)
            const distance = getJobDistance(job)
            
            return (
              <div key={job.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0 }}>{job.title}</h3>
                  {distance && (
                    <span style={styles.distanceBadge}>📍 {distance} km away</span>
                  )}
                </div>
                <p style={styles.location}>📍 {job.location}</p>
                {job.shift && <p><b>Shift:</b> {job.shift}</p>}
                {job.required_experience && <p><b>Experience:</b> {job.required_experience}</p>}
                {job.num_openings && <p><b>Openings:</b> {job.num_openings}</p>}
                {job.preferred_software && <p><b>Preferred Software:</b> {job.preferred_software}</p>}
                {job.description && <p>{job.description}</p>}

                {applied ? (
                  <div style={styles.appliedBadge}>✓ Applied</div>
                ) : (
                  <button
                    style={styles.btn}
                    onClick={() => applyForJob(job.id)}
                  >
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

          {appointments.length === 0 && <p>No appointments yet.</p>}

          {appointments.map((appt) => (
            <AppointmentCard 
              key={appt.id} 
              appointment={appt} 
              onAction={handleAppointmentAction}
            />
          ))}
        </>
      )}
    </div>
  )
}

function AppointmentCard({ appointment, onAction }) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  const store = appointment.store_profiles
  const job = appointment.jobs

  const openMaps = () => {
    if (store.latitude && store.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`,
        '_blank'
      )
    }
  }

  return (
    <div style={styles.appointmentCard}>
      <h3>{job.title}</h3>
      <p><b>Store:</b> {store.store_name}</p>
      <p><b>Date:</b> {appointment.appointment_date}</p>
      <p><b>Time:</b> {appointment.appointment_time}</p>
      
      {appointment.status === 'pending' && (
        <>
          <div style={styles.statusBadge}>⏳ Awaiting Your Response</div>
          
          <button
            style={styles.confirmBtn}
            onClick={() => onAction(appointment.id, 'confirm')}
          >
            ✓ Confirm Appointment
          </button>

          <button
            style={styles.rescheduleBtn}
            onClick={() => setShowNote(!showNote)}
          >
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
              <button
                style={styles.submitBtn}
                onClick={() => {
                  onAction(appointment.id, 'reschedule', note)
                  setShowNote(false)
                  setNote('')
                }}
              >
                Submit Request
              </button>
            </div>
          )}
        </>
      )}

      {appointment.status === 'confirmed' && (
        <>
          <div style={styles.confirmedBadge}>✓ Confirmed</div>
          <p><b>Store Contact:</b> {store.phone}</p>
          <button style={styles.mapsBtn} onClick={openMaps}>
            📍 Get Directions
          </button>
        </>
      )}

      {appointment.status === 'reschedule_requested' && (
        <>
          <div style={styles.rescheduleBadge}>🔄 Reschedule Requested</div>
          {appointment.pharmacist_note && (
            <p style={styles.note}><b>Your note:</b> {appointment.pharmacist_note}</p>
          )}
          <p style={styles.waiting}>Waiting for store owner response...</p>
        </>
      )}
    </div>
  )
}

const styles = {
  page: {
    padding: 24,
    maxWidth: 800,
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  tabs: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
    borderBottom: '2px solid #e5e7eb',
  },
  tab: {
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 500,
    color: '#64748b',
  },
  activeTab: {
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid #2563eb',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    color: '#2563eb',
  },
  heading: {
    fontSize: 26,
    marginBottom: 20,
  },
  filterBox: {
    background: '#f8fafc',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    border: '1px solid #e5e7eb',
  },
  filterLabel: {
    display: 'block',
    fontSize: 15,
    marginBottom: 10,
    color: '#0f172a',
  },
  slider: {
    width: '100%',
    height: 8,
  },
  filterResult: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  warning: {
    background: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    color: '#92400e',
  },
  card: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    marginBottom: 18,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  distanceBadge: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '6px 12px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  location: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 8,
  },
  btn: {
    marginTop: 10,
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  appliedBadge: {
    marginTop: 10,
    padding: '8px 14px',
    background: '#10b981',
    color: 'white',
    borderRadius: 6,
    display: 'inline-block',
    fontSize: 14,
    fontWeight: 600,
  },
  appointmentCard: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    marginBottom: 18,
  },
  statusBadge: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '6px 12px',
    borderRadius: 6,
    display: 'inline-block',
    fontSize: 14,
    fontWeight: 600,
    marginTop: 10,
    marginBottom: 10,
  },
  confirmedBadge: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '6px 12px',
    borderRadius: 6,
    display: 'inline-block',
    fontSize: 14,
    fontWeight: 600,
    marginTop: 10,
    marginBottom: 10,
  },
  rescheduleBadge: {
    background: '#fecaca',
    color: '#991b1b',
    padding: '6px 12px',
    borderRadius: 6,
    display: 'inline-block',
    fontSize: 14,
    fontWeight: 600,
    marginTop: 10,
    marginBottom: 10,
  },
  confirmBtn: {
    marginTop: 10,
    marginRight: 8,
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    background: '#10b981',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  rescheduleBtn: {
    marginTop: 10,
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    background: '#f59e0b',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  mapsBtn: {
    marginTop: 10,
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  noteInput: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    minHeight: 60,
    fontSize: 14,
    fontFamily: 'inherit',
  },
  submitBtn: {
    marginTop: 8,
    padding: '8px 14px',
    border: 'none',
    borderRadius: 6,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
  note: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
  },
  waiting: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
}