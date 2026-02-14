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
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('pharmacist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setProfile(data)
        setName(data.name || '')
        setYearsExperience(data.years_experience || '')
        setSoftwareExperience(data.software_experience || '')
        setPhone(data.phone || '')
        setLatitude(data.latitude ?? null)
        setLongitude(data.longitude ?? null)

        // Generate signed URL if license exists
        if (data.license_url) {
          await generateSignedUrl(user.id)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  // Generate a signed URL that expires in 1 hour
  const generateSignedUrl = async (userId) => {
    const path = `pharmacist-licenses/${userId}.jpg`
    
    const { data, error } = await supabase.storage
      .from('licenses')
      .createSignedUrl(path, 3600) // 3600 seconds = 1 hour

    if (error) {
      console.error('Signed URL error:', error)
      return
    }

    setLicenseUrl(data.signedUrl)
  }

  const saveProfile = async () => {
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
      setMessage(error.message)
      return
    }

    setMessage('Profile saved successfully.')
    setEditing(false)
  }

  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setMessage('Location detected.')
      },
      () => alert('Location permission denied')
    )
  }

  const uploadLicense = async (file) => {
    if (!file) return
    setUploading(true)
    setMessage('Uploading license…')

    try {
      const compressed = await compressImage(file)
      const { data: { user } } = await supabase.auth.getUser()

      const path = `pharmacist-licenses/${user.id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(path, compressed, { upsert: true })

      if (uploadError) {
        setMessage('Upload error: ' + uploadError.message)
        return
      }

      // Store just the path, not a public URL
      await supabase
        .from('pharmacist_profiles')
        .update({
          license_url: path,
          is_verified: false,
          verification_status: 'pending',
        })
        .eq('user_id', user.id)

      // Generate signed URL to show immediately
      await generateSignedUrl(user.id)

      setMessage('License uploaded successfully. Verification pending.')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Pharmacist Profile</h1>

        <p style={profile?.is_verified ? styles.verified : styles.pending}>
          {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
        </p>

        {!editing ? (
          <>
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
          </>
        ) : (
          <>
            <input
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Years of Experience"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Software Experience (e.g. Marg, GoFrugal)"
              value={softwareExperience}
              onChange={(e) => setSoftwareExperience(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button onClick={detectLocation} style={styles.secondaryBtn}>
              📍 Detect My Location
            </button>

            <button onClick={saveProfile} style={styles.primaryBtn}>
              Save Profile
            </button>

            <button onClick={() => setEditing(false)} style={styles.cancelBtn}>
              Cancel
            </button>
          </>
        )}

        <hr style={{ margin: '20px 0' }} />

        <h3>License</h3>

        {licenseUrl ? (
          <div style={styles.licenseBox}>
            <img
              src={licenseUrl}
              alt="License"
              style={styles.licenseImage}
            />
            <p style={styles.licenseNote}>
              ⏱ This preview expires in 1 hour for security
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
          📷 Take Photo of License
        </button>

        <button
          onClick={() => galleryInputRef.current.click()}
          style={styles.secondaryBtn}
          disabled={uploading}
        >
          🖼️ Upload from Gallery
        </button>

        {message && <p style={styles.message}>{message}</p>}

        <hr style={{ margin: '20px 0' }} />
        <a href="/jobs" style={styles.link}>Go to Job Listings →</a>
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
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  label: {
    fontSize: 12,
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
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    padding: 10,
    border: 'none',
    borderRadius: 6,
    marginTop: 6,
    cursor: 'pointer',
    width: '100%',
    fontSize: 14,
    fontWeight: 600,
  },
  secondaryBtn: {
    background: '#e5e7eb',
    color: '#0f172a',
    padding: 10,
    border: 'none',
    borderRadius: 6,
    marginTop: 6,
    cursor: 'pointer',
    width: '100%',
    fontSize: 14,
  },
  cancelBtn: {
    background: '#f1f5f9',
    color: '#475569',
    padding: 10,
    border: 'none',
    borderRadius: 6,
    marginTop: 6,
    cursor: 'pointer',
    width: '100%',
    fontSize: 14,
  },
  verified: {
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pending: {
    color: '#b45309',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  licenseBox: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
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