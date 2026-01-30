import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function StoreProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')

  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [storeTimings, setStoreTimings] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [address, setAddress] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setProfile(data)
        setStoreName(data.store_name || '')
        setPhone(data.phone || '')
        setStoreTimings(data.store_timings || '')
        setLatitude(data.latitude ?? null)
        setLongitude(data.longitude ?? null)

        // Convert coordinates to readable address
        if (data.latitude && data.longitude) {
          getAddressFromCoords(data.latitude, data.longitude)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()
      if (data.results && data.results[0]) {
        setAddress(data.results[0].formatted_address)
      }
    } catch (e) {
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    }
  }

  const saveProfile = async () => {
    setMessage('Saving profile…')
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('store_profiles')
      .upsert({
        user_id: user.id,
        store_name: storeName,
        phone,
        store_timings: storeTimings,
        latitude,
        longitude,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Profile saved successfully.')
    setEditing(false)

    // Reload to refresh address
    if (latitude && longitude) {
      getAddressFromCoords(latitude, longitude)
    }
  }

  const detectLocation = () => {
    setMessage('Detecting location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude
        const newLng = pos.coords.longitude
        setLatitude(newLat)
        setLongitude(newLng)
        getAddressFromCoords(newLat, newLng)
        setMessage('Location detected.')
      },
      () => {
        setMessage('Location permission denied.')
      }
    )
  }

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Store Profile</h1>

        <p style={profile?.is_verified ? styles.verified : styles.pending}>
          {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
        </p>

        {!editing ? (
          <>
            <p><b>Store Name:</b> {storeName || '—'}</p>
            <p><b>Contact:</b> {phone || '—'}</p>
            <p><b>Timings:</b> {storeTimings || '—'}</p>
            <p><b>Location:</b> {address || (latitude && longitude ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Not set')}</p>

            <button onClick={() => setEditing(true)} style={styles.secondaryBtn}>
              Edit Profile
            </button>
          </>
        ) : (
          <>
            <input
              style={styles.input}
              placeholder="Store Name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Store Timings (e.g., 9 AM - 9 PM)"
              value={storeTimings}
              onChange={(e) => setStoreTimings(e.target.value)}
            />

            <button onClick={detectLocation} style={styles.secondaryBtn}>
              📍 Detect My Store Location
            </button>

            {address && <p style={styles.addressPreview}>📍 {address}</p>}

            <button onClick={saveProfile} style={styles.primaryBtn}>
              Save Profile
            </button>
          </>
        )}

        {message && <p style={styles.message}>{message}</p>}

        <hr />
        <a href="/post-job">Post a Job →</a>
        <br />
        <a href="/applicants">View Applicants →</a>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#fff',
    padding: 28,
    borderRadius: 14,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: '1px solid #cbd5e1',
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    padding: 10,
    border: 'none',
    borderRadius: 6,
    marginRight: 6,
    cursor: 'pointer',
    width: '100%',
    marginTop: 6,
  },
  secondaryBtn: {
    background: '#e5e7eb',
    padding: 10,
    border: 'none',
    borderRadius: 6,
    marginTop: 6,
    width: '100%',
    cursor: 'pointer',
  },
  verified: { color: 'green', fontWeight: 'bold' },
  pending: { color: '#b45309', fontWeight: 'bold' },
  addressPreview: {
    fontSize: 13,
    color: '#16a34a',
    marginTop: 6,
    marginBottom: 6,
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    color: '#059669',
  },
}