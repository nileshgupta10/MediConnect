import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'

export default function PharmacistProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  const [name, setName] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [softwareExperience, setSoftwareExperience] = useState('')
  const [phone, setPhone] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [address, setAddress] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [locating, setLocating] = useState(false)

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

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

  // Init autocomplete when editing starts and maps loaded
  useEffect(() => {
    if (!editing || !mapsLoaded) return
    if (!window.google?.maps?.places) return

    const input = document.getElementById('pharmacist-address-input')
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

    const { data, error } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, years_experience, software_experience, phone, latitude, longitude, address, license_url, is_verified, verification_status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!error && data) {
      setProfile(data)
      setName(data.name || '')
      setYearsExperience(data.years_experience || '')
      setSoftwareExperience(data.software_experience || '')
      setPhone(data.phone || '')
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
    if (!name.trim()) { setMessage('Please enter your name.'); return }

    setSaving(true)
    setMessage('Saving…')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('pharmacist_profiles')
      .upsert({
        user_id: user.id,
        name: name.trim(),
        years_experience: yearsExperience,
        software_experience: softwareExperience.trim(),
        phone: phone.trim(),
        latitude,
        longitude,
        address,
      })

    setSaving(false)
    if (error) { setMessage('Error: ' + error.message); return }

    await load()
    setMessage('Profile saved.')
    setEditing(false)
  }

  const uploadLicense = async (file) => {
    if (!file) return
    setUploading(true)
    setMessage('Uploading…')

    try {
      const compressed = await compressImage(file)
      const { data: { user } } = await supabase.auth.getUser()
      const path = `pharmacist-licenses/${user.id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(path, compressed, { upsert: true })

      if (uploadError) { setMessage('Upload failed: ' + uploadError.message); return }

      const { error: updateError } = await supabase
        .from('pharmacist_profiles')
        .update({
          license_url: path,
          is_verified: false,
          verification_status: 'pending',
        })
        .eq('user_id', user.id)

      if (updateError) { setMessage('Error saving: ' + updateError.message); return }

      await load()
      setMessage('License uploaded. Pending verification.')
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
        <h1 style={styles.title}>My Profile</h1>

        <div style={profile?.is_verified ? styles.verifiedBadge : styles.pendingBadge}>
          {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
        </div>

        {!editing ? (
          <div style={styles.viewMode}>
            <Field label="Name" value={name} />
            <Field label="Experience" value={yearsExperience ? yearsExperience + ' years' : null} />
            <Field label="Software" value={softwareExperience} />
            <Field label="Phone" value={phone} />
            <Field label="Location" value={address || (latitude ? '📍 Saved' : null)} />

            <button onClick={() => setEditing(true)} style={styles.primaryBtn}>
              Edit Profile
            </button>
            <a href="/jobs" style={styles.jobsLink}>Browse Jobs →</a>
          </div>
        ) : (
          <div style={styles.editMode}>
            <InputField label="Full Name *" value={name} onChange={setName} placeholder="Your full name" />
            <InputField label="Years of Experience" value={yearsExperience} onChange={setYearsExperience} placeholder="e.g. 3" type="number" />
            <InputField label="Software Experience" value={softwareExperience} onChange={setSoftwareExperience} placeholder="e.g. Marg, GoFrugal" />
            <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="Your contact number" />

            <label style={styles.inputLabel}>Your Location</label>

            <button style={styles.gpsBtn} onClick={detectLocation} disabled={locating}>
              {locating ? '⏳ Detecting…' : '📍 Use My Current Location (GPS)'}
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerText}>OR type your address below</span>
            </div>

            <input
              id="pharmacist-address-input"
              style={styles.addressInput}
              placeholder="Start typing your address…"
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
              {mapsLoaded ? '💡 Select from the dropdown suggestions' : '⏳ Loading address search…'}
            </p>

            {address && latitude && (
              <div style={styles.addressPreview}>✓ {address}</div>
            )}

            <hr style={styles.hr} />

            <label style={styles.inputLabel}>License</label>
            <div style={styles.licenseStatus}>
              {profile?.license_url ? (
                <span style={styles.licenseUploaded}>
                  ✓ License uploaded
                  {profile.verification_status === 'pending' && ' — awaiting verification'}
                  {profile.verification_status === 'approved' && ' — verified'}
                  {profile.verification_status === 'rejected' && ' — rejected, please re-upload'}
                </span>
              ) : (
                <span style={styles.licenseNone}>No license uploaded yet</span>
              )}
            </div>

            <input
              type="file" accept="image/*" capture="environment"
              ref={cameraInputRef} hidden
              onChange={(e) => uploadLicense(e.target.files[0])}
            />
            <input
              type="file" accept="image/*"
              ref={galleryInputRef} hidden
              onChange={(e) => uploadLicense(e.target.files[0])}
            />

            <button
              onClick={() => cameraInputRef.current.click()}
              style={styles.secondaryBtn}
              disabled={uploading}
            >
              📷 {uploading ? 'Uploading…' : profile?.license_url ? 'Replace License Photo' : 'Take Photo of License'}
            </button>

            <button
              onClick={() => galleryInputRef.current.click()}
              style={styles.secondaryBtn}
              disabled={uploading}
            >
              🖼️ {uploading ? 'Uploading…' : 'Upload from Gallery'}
            </button>

            <hr style={styles.hr} />

            <button onClick={saveProfile} style={styles.primaryBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>

            <button onClick={() => { setEditing(false); setMessage('') }} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        )}

        {message && (
          <p style={message.includes('Error') || message.includes('failed') || message.includes('denied')
            ? styles.errorMsg : styles.successMsg}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div style={fieldStyles.field}>
      <span style={fieldStyles.label}>{label}</span>
      <span style={fieldStyles.value}>{value || '—'}</span>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={inputStyles.label}>{label}</label>
      <input
        type={type}
        style={inputStyles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

const fieldStyles = {
  field: { display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  label: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, color: '#0f172a', fontWeight: 500 },
}

const inputStyles = {
  label: { fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 12, marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' },
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#f8fafc', padding: 20 },
  card: { background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 440, height: 'fit-content', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 12 },
  verifiedBadge: { display: 'inline-block', background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16 },
  pendingBadge: { display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16 },
  viewMode: { display: 'flex', flexDirection: 'column' },
  editMode: { display: 'flex', flexDirection: 'column', gap: 4 },
  inputLabel: { fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 12, marginBottom: 4, display: 'block' },
  gpsBtn: { width: '100%', padding: 10, background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  divider: { display: 'flex', alignItems: 'center', margin: '10px 0' },
  dividerText: { width: '100%', textAlign: 'center', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10 },
  addressInput: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 4 },
  addressPreview: { background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: '#15803d', marginTop: 4 },
  licenseStatus: { padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 },
  licenseUploaded: { fontSize: 13, color: '#15803d', fontWeight: 500 },
  licenseNone: { fontSize: 13, color: '#94a3b8' },
  primaryBtn: { background: '#2563eb', color: 'white', padding: 11, border: 'none', borderRadius: 8, marginTop: 16, cursor: 'pointer', width: '100%', fontSize: 14, fontWeight: 600 },
  secondaryBtn: { background: '#f1f5f9', color: '#0f172a', padding: 11, border: 'none', borderRadius: 8, marginTop: 6, cursor: 'pointer', width: '100%', fontSize: 14 },
  cancelBtn: { background: '#f1f5f9', color: '#475569', padding: 11, border: 'none', borderRadius: 8, marginTop: 6, cursor: 'pointer', width: '100%', fontSize: 14 },
  hr: { margin: '16px 0', borderColor: '#f1f5f9' },
  successMsg: { marginTop: 12, fontSize: 14, color: '#059669', padding: '8px 12px', background: '#f0fdf4', borderRadius: 6 },
  errorMsg: { marginTop: 12, fontSize: 14, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 6 },
  jobsLink: { display: 'block', marginTop: 16, color: '#2563eb', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
}