import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'

export default function PharmacistProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [licenseUrl, setLicenseUrl] = useState(null)

  const [name, setName] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [softwareExperience, setSoftwareExperience] = useState('')
  const [phone, setPhone] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Only fetch needed columns
    const { data, error } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, years_experience, software_experience, phone, latitude, longitude, license_url, is_verified, verification_status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Profile load error:', error)
      setLoading(false)
      return
    }

    if (data) {
      setProfile(data)
      setName(data.name || '')
      setYearsExperience(data.years_experience || '')
      setSoftwareExperience(data.software_experience || '')
      setPhone(data.phone || '')
      setLatitude(data.latitude ?? null)
      setLongitude(data.longitude ?? null)

      // Generate signed URL only if license exists
      if (data.license_url) {
        await generateSignedUrl(data.license_url)
      }
    }

    setLoading(false)
  }

  const generateSignedUrl = async (path) => {
    // Clean path - remove full URL if accidentally stored
    const cleanPath = path.includes('supabase.co')
      ? path.split('/licenses/')[1]
      : path

    const { data, error } = await supabase.storage
      .from('licenses')
      .createSignedUrl(cleanPath, 3600) // 1 hour expiry

    if (error) {
      console.error('Signed URL error:', error)
      return
    }

    setLicenseUrl(data.signedUrl)
  }

  const saveProfile = async () => {
    if (!name) {
      setMessage('Please enter your name.')
      return
    }

    setMessage('Saving profile…')
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('pharmacist_profiles')
      .upsert({
        user_id: user.id,
        name,
        years_experience: yearsExperience,
        software_experience: softwareExperience,
        phone,
        latitude,
        longitude,
      })

    if (error) {
      setMessage('Error: ' + error.message)
      return
    }

    setMessage('Profile saved successfully.')
    setEditing(false)
  }

  const detectLocation = () => {
    setMessage('Detecting location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setMessage('Location saved.')
      },
      () => setMessage('Location permission denied.')
    )
  }

  const uploadLicense = async (file) => {
    if (!file) return

    setUploading(true)
    setMessage('Compressing and uploading…')

    try {
      const compressed = await compressImage(file)
      const { data: { user } } = await supabase.auth.getUser()
      const path = `pharmacist-licenses/${user.id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(path, compressed, { upsert: true })

      if (uploadError) {
        setMessage('Upload failed: ' + uploadError.message)
        return
      }

      // Store only the path, never the full URL
      const { error: updateError } = await supabase
        .from('pharmacist_profiles')
        .update({
          license_url: path,
          is_verified: false,
          verification_status: 'pending',
        })
        .eq('user_id', user.id)

      if (updateError) {
        setMessage('Error saving license: ' + updateError.message)
        return
      }

      // Generate signed URL to show immediately
      await generateSignedUrl(path)
      setMessage('License uploaded. Verification pending.')
    } catch (e) {
      setMessage('Error: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pharmacist Profile</h1>

        <div style={profile?.is_verified ? styles.verifiedBadge : styles.pendingBadge}>
          {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
        </div>

        {!editing ? (
          <div style={styles.viewMode}>
            <div style={styles.field}>
              <span style={styles.label}>Name</span>
              <span style={styles.value}>{name || '—'}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Experience</span>
              <span style={styles.value}>{yearsExperience ? yearsExperience + ' years' : '—'}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Software</span>
              <span style={styles.value}>{softwareExperience || '—'}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Phone</span>
              <span style={styles.value}>{phone || '—'}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Location</span>
              <span style={styles.value}>{latitude ? '📍 Saved' : 'Not set'}</span>
            </div>

            <button onClick={() => setEditing(true)} style={styles.secondaryBtn}>
              Edit Profile
            </button>
          </div>
        ) : (
          <div style={styles.editMode}>
            <label style={styles.inputLabel}>Full Name *</label>
            <input
              style={styles.input}
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label style={styles.inputLabel}>Years of Experience</label>
            <input
              style={styles.input}
              placeholder="e.g. 3"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />

            <label style={styles.inputLabel}>Software Experience</label>
            <input
              style={styles.input}
              placeholder="e.g. Marg, GoFrugal, PharmERP"
              value={softwareExperience}
              onChange={(e) => setSoftwareExperience(e.target.value)}
            />

            <label style={styles.inputLabel}>Phone Number</label>
            <input
              style={styles.input}
              placeholder="Your contact number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <label style={styles.inputLabel}>Your Location</label>
            <button onClick={detectLocation} style={styles.gpsBtn}>
              📍 Detect My Location
            </button>
            {latitude && (
              <p style={styles.locationSaved}>📍 Location saved</p>
            )}

            <button onClick={saveProfile} style={styles.primaryBtn}>
              Save Profile
            </button>

            <button onClick={() => setEditing(false)} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        )}

        {message && <p style={styles.message}>{message}</p>}

        <hr style={{ margin: '20px 0', borderColor: '#f1f5f9' }} />

        <h3 style={styles.sectionTitle}>License</h3>

        {licenseUrl ? (
          <div style={styles.licenseBox}>
            <img
              src={licenseUrl}
              alt="License"
              style={styles.licenseImage}
            />
            <p style={styles.licenseNote}>
              🔒 Secure preview — expires in 1 hour
            </p>
            <button
              onClick={() => window.open(licenseUrl, '_blank')}
              style={styles.viewBtn}
            >
              View Full Size
            </button>
          </div>
        ) : (
          <p style={styles.noLicense}>No license uploaded yet</p>
        )}

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          hidden
          onChange={(e) => uploadLicense(e.target.files[0])}
        />
        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          hidden
          onChange={(e) => uploadLicense(e.target.files[0])}
        />

        <button
          onClick={() => cameraInputRef.current.click()}
          style={styles.primaryBtn}
          disabled={uploading}
        >
          📷 {uploading ? 'Uploading…' : 'Take Photo of License'}
        </button>

        <button
          onClick={() => galleryInputRef.current.click()}
          style={styles.secondaryBtn}
          disabled={uploading}
        >
          🖼️ Upload from Gallery
        </button>

        <hr style={{ margin: '20px 0', borderColor: '#f1f5f9' }} />

        <a href="/jobs" style={styles.link}>Browse Job Listings →</a>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: 20,
  },
  card: {
    background: 'white',
    padding: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 440,
    height: 'fit-content',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 12,
  },
  verifiedBadge: {
    display: 'inline-block',
    background: '#d1fae5',
    color: '#065f46',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
  },
  pendingBadge: {
    display: 'inline-block',
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
  },
  viewMode: {
    display: 'flex',
    flexDirection: 'column',
  },
  editMode: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: 500,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  gpsBtn: {
    width: '100%',
    padding: 10,
    background: '#0f172a',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  locationSaved: {
    fontSize: 13,
    color: '#15803d',
    marginTop: 4,
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    padding: 11,
    border: 'none',
    borderRadius: 8,
    marginTop: 8,
    cursor: 'pointer',
    width: '100%',
    fontSize: 14,
    fontWeight: 600,
  },
  secondaryBtn: {
    background: '#f1f5f9',
    color: '#0f172a',
    padding: 11,
    border: 'none',
    borderRadius: 8,
    marginTop: 6,
    cursor: 'pointer',
    width: '100%',
    fontSize: 14,
  },
  cancelBtn: {
    background: '#f1f5f9',
    color: '#475569',
    padding: 11,
    border: 'none',
    borderRadius: 8,
    marginTop: 6,
    cursor: 'pointer',
    width: '100%',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
  },
  licenseBox: {
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    marginBottom: 12,
  },
  licenseImage: {
    width: '100%',
    display: 'block',
  },
  licenseNote: {
    fontSize: 12,
    color: '#94a3b8',
    padding: '6px 10px',
    background: '#f8fafc',
    margin: 0,
  },
  viewBtn: {
    width: '100%',
    padding: 10,
    background: '#f8fafc',
    border: 'none',
    borderTop: '1px solid #e2e8f0',
    cursor: 'pointer',
    fontSize: 14,
    color: '#2563eb',
    fontWeight: 600,
  },
  noLicense: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    color: '#059669',
    padding: '8px 12px',
    background: '#f0fdf4',
    borderRadius: 6,
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
}