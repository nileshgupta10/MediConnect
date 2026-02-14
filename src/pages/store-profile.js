import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function StoreProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [locating, setLocating] = useState(false)
  const [searching, setSearching] = useState(false)

  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [storeTimings, setStoreTimings] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [address, setAddress] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState([])

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
        setAddress(data.address || '')
        setAddressInput(data.address || '')
      }

      setLoading(false)
    }
    load()
  }, [])

  // Search address using Google Geocoding
  const searchAddress = async () => {
    if (!addressInput || addressInput.length < 3) return

    setSearching(true)
    setSuggestions([])

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressInput)}&region=in&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()
      console.log('Geocoding response:', data)

      if (data.results && data.results.length > 0) {
        setSuggestions(data.results.slice(0, 4))
      } else {
        setMessage('No results found. Try a more specific address.')
      }
    } catch (e) {
      console.error('Geocoding error:', e)
      setMessage('Error searching address. Please try GPS instead.')
    }

    setSearching(false)
  }

  // Select a suggestion
  const selectSuggestion = (result) => {
    const addr = result.formatted_address
    const lat = result.geometry.location.lat
    const lng = result.geometry.location.lng

    setAddress(addr)
    setAddressInput(addr)
    setLatitude(lat)
    setLongitude(lng)
    setSuggestions([])
    setMessage('Location selected: ' + addr)
  }

  // GPS detection
  const detectLocation = async () => {
    setLocating(true)
    setMessage('Detecting location…')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude
        const newLng = pos.coords.longitude
        setLatitude(newLat)
        setLongitude(newLng)

        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          )
          const data = await response.json()
          if (data.results && data.results[0]) {
            const addr = data.results[0].formatted_address
            setAddress(addr)
            setAddressInput(addr)
            setMessage('Location detected: ' + addr)
          }
        } catch (e) {
          setMessage('Location detected but could not get address.')
        }

        setLocating(false)
      },
      () => {
        setMessage('GPS denied. Please search your address manually.')
        setLocating(false)
      }
    )
  }

  const saveProfile = async () => {
    if (!storeName) {
      setMessage('Please enter your store name.')
      return
    }

    if (!latitude || !longitude) {
      setMessage('Please set your store location using GPS or address search.')
      return
    }

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
        address,
      })

    if (error) {
      setMessage('Error: ' + error.message)
      return
    }

    setMessage('Profile saved successfully.')
    setEditing(false)
  }

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Store Profile</h1>

        <p style={profile?.is_verified ? styles.verified : styles.pending}>
          {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
        </p>

        {!editing ? (
          <div style={styles.viewMode}>
            <div style={styles.field}>
              <span style={styles.label}>Store Name</span>
              <span style={styles.value}>{storeName || '—'}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Contact</span>
              <span style={styles.value}>{phone || '—'}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Timings</span>
              <span style={styles.value}>{storeTimings || '—'}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Location</span>
              <span style={styles.value}>
                {address || (latitude ? '📍 Location saved' : '—')}
              </span>
            </div>

            {latitude && longitude && (
              <button
                style={styles.mapsBtn}
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps?q=${latitude},${longitude}`,
                    '_blank'
                  )
                }
              >
                📍 View Store on Google Maps
              </button>
            )}

            <button onClick={() => setEditing(true)} style={styles.editBtn}>
              Edit Profile
            </button>
          </div>
        ) : (
          <div style={styles.editMode}>
            <label style={styles.inputLabel}>Store Name *</label>
            <input
              style={styles.input}
              placeholder="Your pharmacy store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />

            <label style={styles.inputLabel}>Phone Number</label>
            <input
              style={styles.input}
              placeholder="Contact number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <label style={styles.inputLabel}>Store Timings</label>
            <input
              style={styles.input}
              placeholder="e.g. 9 AM - 9 PM"
              value={storeTimings}
              onChange={(e) => setStoreTimings(e.target.value)}
            />

            <label style={styles.inputLabel}>Store Location *</label>

            {/* GPS Button */}
            <button
              style={styles.gpsBtn}
              onClick={detectLocation}
              disabled={locating}
            >
              {locating ? '⏳ Detecting…' : '📍 Use My Current Location (GPS)'}
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerText}>OR search your address</span>
            </div>

            {/* Address Search */}
            <div style={styles.searchRow}>
              <input
                style={styles.searchInput}
                placeholder="Type area, street or landmark..."
                value={addressInput}
                onChange={(e) => {
                  setAddressInput(e.target.value)
                  setSuggestions([])
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchAddress()
                }}
              />
              <button
                style={styles.searchBtn}
                onClick={searchAddress}
                disabled={searching}
              >
                {searching ? '…' : 'Search'}
              </button>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div style={styles.suggestions}>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    style={styles.suggestion}
                    onClick={() => selectSuggestion(s)}
                  >
                    📍 {s.formatted_address}
                  </div>
                ))}
              </div>
            )}

            {/* Selected address preview */}
            {address && latitude && (
              <div style={styles.addressPreview}>
                ✓ Selected: {address}
              </div>
            )}

            <button onClick={saveProfile} style={styles.saveBtn}>
              Save Profile
            </button>

            <button onClick={() => setEditing(false)} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        )}

        {message && <p style={styles.message}>{message}</p>}

        <hr style={{ margin: '20px 0' }} />

        <div style={styles.links}>
          <a href="/post-job" style={styles.link}>Post a Job →</a>
          <a href="/applicants" style={styles.link}>View Applicants →</a>
        </div>
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
    maxWidth: 460,
    width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    height: 'fit-content',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
  },
  verified: {
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pending: {
    color: '#b45309',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  viewMode: {
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
  editMode: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginTop: 12,
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
    padding: '12px',
    background: '#0f172a',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    marginTop: 4,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '12px 0',
  },
  dividerText: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  },
  searchRow: {
    display: 'flex',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 14,
  },
  searchBtn: {
    padding: '10px 16px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  },
  suggestions: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  suggestion: {
    padding: '10px 12px',
    fontSize: 13,
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
    color: '#0f172a',
    background: '#fff',
  },
  addressPreview: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    color: '#15803d',
    marginTop: 4,
  },
  saveBtn: {
    marginTop: 16,
    width: '100%',
    padding: 12,
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    marginTop: 8,
    width: '100%',
    padding: 12,
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    cursor: 'pointer',
  },
  mapsBtn: {
    padding: '10px 14px',
    background: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    width: '100%',
    marginBottom: 4,
    marginTop: 8,
  },
  editBtn: {
    marginTop: 12,
    width: '100%',
    padding: 12,
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#059669',
    padding: '8px 12px',
    background: '#f0fdf4',
    borderRadius: 6,
  },
  links: {
    display: 'flex',
    gap: 16,
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
}