import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function StoreProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [storeTimings, setStoreTimings] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [address, setAddress] = useState('')
  const [addressInput, setAddressInput] = useState('')

  // Load Google Maps SDK once
  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return }

    const existing = document.querySelector('#google-maps-script')
    if (existing) { setMapsLoaded(true); return }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setMapsLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Init autocomplete when editing starts and maps is loaded
  useEffect(() => {
    if (!editing || !mapsLoaded) return
    if (!window.google?.maps?.places) return

    const input = document.getElementById('address-input')
    if (!input) return

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'in' },
      fields: ['formatted_address', 'geometry'],
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry) {
        setMessage('Please select an address from the dropdown.')
        return
      }

      const addr = place.formatted_address
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      setAddress(addr)
      setAddressInput(addr)
      setLatitude(lat)
      setLongitude(lng)
      setMessage('Location selected.')
    })

    return () => {
      window.google.maps.event.removeListener(listener)
    }
  }, [editing, mapsLoaded])

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('store_profiles')
      .select('user_id, store_name, phone, store_timings, latitude, longitude, address, is_verified, verification_status')
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

  const detectLocation = () => {
    setLocating(true)
    setMessage('Detecting location…')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude
        const newLng = pos.coords.longitude
        setLatitude(newLat)
        setLongitude(newLng)

        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          )
          const data = await res.json()
          if (data.results?.[0]) {
            const addr = data.results[0].formatted_address
            setAddress(addr)
            setAddressInput(addr)
            setMessage('Location detected: ' + addr)
          }
        } catch {
          setMessage('Location detected but could not get address.')
        }
        setLocating(false)
      },
      () => {
        setMessage('GPS denied. Please type your address below.')
        setLocating(false)
      }
    )
  }

  const saveProfile = async () => {
    if (!storeName.trim()) {
      setMessage('Please enter your store name.')
      return
    }
    if (!latitude || !longitude) {
      setMessage('Please set your store location using GPS or address search.')
      return
    }

    setSaving(true)
    setMessage('Saving…')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('store_profiles')
      .upsert({
        user_id: user.id,
        store_name: storeName.trim(),
        phone: phone.trim(),
        store_timings: storeTimings.trim(),
        latitude,
        longitude,
        address,
      })

    setSaving(false)

    if (error) {
      setMessage('Error: ' + error.message)
      return
    }

    await load()
    setMessage('Profile saved successfully.')
    setEditing(false)
  }

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Store Profile</h1>

        <div style={profile?.is_verified ? styles.verifiedBadge : styles.pendingBadge}>
          {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
        </div>

        {!editing ? (
          <div style={styles.viewMode}>
            <Field label="Store Name" value={storeName} />
            <Field label="Contact" value={phone} />
            <Field label="Timings" value={storeTimings} />
            <Field label="Location" value={address || (latitude ? 'Location saved' : null)} />

            {latitude && longitude && (
              <button
                style={styles.mapsBtn}
                onClick={() => window.open(
                  `https://www.google.com/maps?q=${latitude},${longitude}`, '_blank'
                )}
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
            <InputLabel text="Store Name *" />
            <input
              style={styles.input}
              placeholder="Your pharmacy store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />

            <InputLabel text="Phone Number" />
            <input
              style={styles.input}
              placeholder="Contact number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <InputLabel text="Store Timings" />
            <input
              style={styles.input}
              placeholder="e.g. 9 AM - 9 PM"
              value={storeTimings}
              onChange={(e) => setStoreTimings(e.target.value)}
            />

            <InputLabel text="Store Location *" />

            <button
              style={styles.gpsBtn}
              onClick={detectLocation}
              disabled={locating}
            >
              {locating ? '⏳ Detecting…' : '📍 Use My Current Location (GPS)'}
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerText}>OR type your address below</span>
            </div>

            <input
              id="address-input"
              style={styles.input}
              placeholder="Start typing your store address…"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value)
                if (latitude) {
                  setLatitude(null)
                  setLongitude(null)
                  setAddress('')
                }
              }}
            />

            <p style={styles.hint}>
              {mapsLoaded
                ? '💡 Select from the dropdown suggestions'
                : '⏳ Loading address search…'}
            </p>

            {address && latitude && (
              <div style={styles.addressPreview}>
                ✓ {address}
              </div>
            )}

            <button
              onClick={saveProfile}
              style={styles.saveBtn}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </button>

            <button
              onClick={() => { setEditing(false); setMessage('') }}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        )}

        {message && (
          <p style={message.startsWith('Error') || message.startsWith('Please')
            ? styles.errorMsg
            : styles.successMsg
          }>
            {message}
          </p>
        )}

        <hr style={{ margin: '20px 0', borderColor: '#f1f5f9' }} />

        <div style={styles.links}>
          <a href="/post-job" style={styles.link}>Post a Job →</a>
          <a href="/applicants" style={styles.link}>View Applicants →</a>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div style={s.field}>
      <span style={s.label}>{label}</span>
      <span style={s.value}>{value || '—'}</span>
    </div>
  )
}

function InputLabel({ text }) {
  return <label style={s.inputLabel}>{text}</label>
}

const s = {
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
    marginTop: 12,
    marginBottom: 4,
    display: 'block',
  },
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
    gap: 4,
  },
  editMode: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
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
    padding: 12,
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
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 4,
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
  successMsg: {
    marginTop: 12,
    fontSize: 14,
    color: '#059669',
    padding: '8px 12px',
    background: '#f0fdf4',
    borderRadius: 6,
  },
  errorMsg: {
    marginTop: 12,
    fontSize: 14,
    color: '#dc2626',
    padding: '8px 12px',
    background: '#fef2f2',
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