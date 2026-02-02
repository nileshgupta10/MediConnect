import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'

export default function PharmacistProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)

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
      }

      setLoading(false)
    }
    load()
  }, [])

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

await supabase.storage
  .from('license-documents')
  .upload(path, compressed, { upsert: true })

const { data: url } =
  supabase.storage.from('license-documents').getPublicUrl(path)

      await supabase
        .from('pharmacist_profiles')
        .update({
          license_url: url.publicUrl,
          is_verified: false,
          verification_status: 'pending',
        })
        .eq('user_id', user.id)

      setMessage('License uploaded. Verification pending.')
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
          {profile?.is_verified ? '✅ Verified' : '⏳ Verification Pending'}
        </p>

        {!editing ? (
          <>
            <p><b>Name:</b> {name || '—'}</p>
            <p><b>Experience:</b> {yearsExperience || '—'} years</p>
            <p><b>Software:</b> {softwareExperience || '—'}</p>
            <p><b>Location:</b> {latitude ? 'Saved' : 'Not set'}</p>

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
              placeholder="Software Experience"
              value={softwareExperience}
              onChange={(e) => setSoftwareExperience(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button onClick={detectLocation} style={styles.secondaryBtn}>
              📍 Detect My Location
            </button>

            <button onClick={saveProfile} style={styles.primaryBtn}>
              Save Profile
            </button>
          </>
        )}

        <hr />

        <h3>Upload License</h3>

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

        <button onClick={() => cameraInputRef.current.click()} style={styles.primaryBtn}>
          Take Photo
        </button>

        <button onClick={() => galleryInputRef.current.click()} style={styles.secondaryBtn}>
          Choose from Gallery
        </button>

        {message && <p>{message}</p>}

        <hr />
        <a href="/jobs">Go to Job Listings →</a>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f8fafc',
  },
  card: {
    background: 'white',
    padding: 24,
    borderRadius: 12,
    width: 420,
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    padding: 10,
    border: 'none',
    borderRadius: 6,
    marginRight: 6,
  },
  secondaryBtn: {
    background: '#e5e7eb',
    padding: 10,
    border: 'none',
    borderRadius: 6,
    marginTop: 6,
  },
  verified: { color: 'green' },
  pending: { color: '#b45309' },
}
