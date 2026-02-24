import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'
import PharmacistLayout from '../components/PharmacistLayout'

const BANNER_IMG = 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=1200&q=80'

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
      if (!place.geometry) { setMessage('Please select from dropdown.'); return }
      const addr = place.formatted_address
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      setAddress(addr); setAddressInput(addr)
      setLatitude(lat); setLongitude(lng)
      setMessage('Location selected.')
    })
    return () => { window.google.maps.event.removeListener(listener) }
  }, [editing, mapsLoaded])

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, years_experience, software_experience, phone, latitude, longitude, address, license_url, is_verified, verification_status')
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
      setAddress(data.address || '')
      setAddressInput(data.address || '')
    }
    setLoading(false)
  }

  const detectLocation = () => {
    setLocating(true)
    setMessage('Detecting…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude
        const newLng = pos.coords.longitude
        setLatitude(newLat); setLongitude(newLng)
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          )
          const data = await res.json()
          if (data.results?.[0]) {
            const addr = data.results[0].formatted_address
            setAddress(addr); setAddressInput(addr)
            setMessage('Location detected: ' + addr)
          }
        } catch { setMessage('Location detected but could not get address.') }
        setLocating(false)
      },
      () => { setMessage('GPS denied. Please type your address.'); setLocating(false) }
    )
  }

  const saveProfile = async () => {
    if (!name.trim()) { setMessage('Please enter your name.'); return }
    setSaving(true); setMessage('Saving…')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('pharmacist_profiles').upsert({
      user_id: user.id, name: name.trim(),
      years_experience: yearsExperience,
      software_experience: softwareExperience.trim(),
      phone: phone.trim(), latitude, longitude, address,
    })
    setSaving(false)
    if (error) { setMessage('Error: ' + error.message); return }
    await load(); setMessage('Profile saved.'); setEditing(false)
  }

  const uploadLicense = async (file) => {
    if (!file) return
    setUploading(true); setMessage('Uploading…')
    try {
      const compressed = await compressImage(file)
      const { data: { user } } = await supabase.auth.getUser()
      const path = `pharmacist-licenses/${user.id}.jpg`
      const { error: uploadError } = await supabase.storage.from('licenses').upload(path, compressed, { upsert: true })
      if (uploadError) { setMessage('Upload failed: ' + uploadError.message); return }
      const { error: updateError } = await supabase.from('pharmacist_profiles')
        .update({ license_url: path, is_verified: false, verification_status: 'pending' })
        .eq('user_id', user.id)
      if (updateError) { setMessage('Error: ' + updateError.message); return }
      await load(); setMessage('License uploaded. Pending verification.')
    } catch (e) { setMessage('Error: ' + e.message) }
    finally { setUploading(false) }
  }

  if (loading) return <p style={{ padding: 40, fontFamily: 'Nunito, sans-serif' }}>Loading…</p>

  return (
    <PharmacistLayout>
    <div style={s.page}>
      {/* Banner */}
      <div style={s.banner}>
        <img src={BANNER_IMG} alt="" style={s.bannerImg} />
        <div style={s.bannerOverlay} />
        <div style={s.bannerContent}>
          <div style={s.bannerIcon}>💊</div>
          <div>
            <h2 style={s.bannerTitle}>My Pharmacist Profile</h2>
            <p style={s.bannerSub}>Your verified identity on MediClan</p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={s.cardWrap}>
        <div style={s.card}>
          <div style={profile?.is_verified ? s.verifiedBadge : s.pendingBadge}>
            {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
          </div>

          {!editing ? (
            <div style={s.viewMode}>
              <Field label="Name" value={name} />
              <Field label="Experience" value={yearsExperience ? yearsExperience + ' years' : null} />
              <Field label="Software" value={softwareExperience} />
              <Field label="Phone" value={phone} />
              <Field label="Location" value={address || (latitude ? '📍 Saved' : null)} />
              <button onClick={() => setEditing(true)} style={s.primaryBtn}>Edit Profile</button>
              <a href="/jobs" style={s.jobsLink}>Browse Jobs →</a>
            </div>
          ) : (
            <div style={s.editMode}>
              <IL text="Full Name *" />
              <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />

              <IL text="Years of Experience" />
              <input type="number" style={s.input} value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} placeholder="e.g. 3" />

              <IL text="Software Experience" />
              <input style={s.input} value={softwareExperience} onChange={e => setSoftwareExperience(e.target.value)} placeholder="e.g. Marg, GoFrugal" />

              <IL text="Phone Number" />
              <input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your contact number" />

              <IL text="Your Location" />
              <button style={s.gpsBtn} onClick={detectLocation} disabled={locating}>
                {locating ? '⏳ Detecting…' : '📍 Use My Current Location (GPS)'}
              </button>
              <div style={s.divider}><span style={s.dividerText}>OR type address below</span></div>
              <input
                id="pharmacist-address-input"
                style={s.input}
                placeholder="Start typing your address…"
                value={addressInput}
                onChange={e => {
                  setAddressInput(e.target.value)
                  if (latitude) { setLatitude(null); setLongitude(null); setAddress('') }
                }}
              />
              <p style={s.hint}>{mapsLoaded ? '💡 Select from dropdown' : '⏳ Loading search…'}</p>
              {address && latitude && <div style={s.addrPreview}>✓ {address}</div>}

              <hr style={s.hr} />
              <IL text="License" />
              <div style={s.licenseBox}>
                {profile?.license_url ? (
                  <span style={s.licenseOk}>
                    ✓ Uploaded{profile.verification_status === 'pending' ? ' — awaiting verification' : profile.verification_status === 'approved' ? ' — verified ✓' : ' — rejected, re-upload'}
                  </span>
                ) : <span style={s.licenseNone}>No license uploaded yet</span>}
              </div>

              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} hidden onChange={e => uploadLicense(e.target.files[0])} />
              <input type="file" accept="image/*" ref={galleryInputRef} hidden onChange={e => uploadLicense(e.target.files[0])} />

              <button onClick={() => cameraInputRef.current.click()} style={s.secondaryBtn} disabled={uploading}>
                📷 {uploading ? 'Uploading…' : profile?.license_url ? 'Replace License' : 'Take Photo of License'}
              </button>
              <button onClick={() => galleryInputRef.current.click()} style={s.secondaryBtn} disabled={uploading}>
                🖼️ Upload from Gallery
              </button>

              <hr style={s.hr} />
              <button onClick={saveProfile} style={s.primaryBtn} disabled={saving}>
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
              <button onClick={() => { setEditing(false); setMessage('') }} style={s.cancelBtn}>Cancel</button>
            </div>
          )}

          {message && (
            <p style={message.includes('Error') || message.includes('failed') || message.includes('denied') ? s.errorMsg : s.successMsg}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
    </PharmacistLayout>
  )
}

function Field({ label, value }) {
  return (
    <div style={fs.field}>
      <span style={fs.label}>{label}</span>
      <span style={fs.value}>{value || '—'}</span>
    </div>
  )
}
function IL({ text }) {
  return <label style={fs.il}>{text}</label>
}

const fs = {
  field: { display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  label: { fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 },
  value: { fontSize: 15, color: '#0f172a', fontWeight: 600 },
  il: { fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 14, marginBottom: 4, display: 'block' },
}

const s = {
  page: { minHeight: '100vh', background: '#f0fdfd', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  banner: { position: 'relative', height: 200, overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%', objectFit: 'cover' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,52,96,0.85) 0%, rgba(14,144,144,0.65) 100%)' },
  bannerContent: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 32px' },
  bannerIcon: { fontSize: 40 },
  bannerTitle: { color: 'white', fontSize: 22, fontWeight: 900, margin: 0 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 },
  cardWrap: { display: 'flex', justifyContent: 'center', padding: '0 16px 40px' },
  card: { background: 'white', padding: 24, borderRadius: 20, width: '100%', maxWidth: 440, marginTop: -28, position: 'relative', zIndex: 1, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' },
  verifiedBadge: { display: 'inline-block', background: '#d1fae5', color: '#065f46', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, marginBottom: 16 },
  pendingBadge: { display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, marginBottom: 16 },
  viewMode: { display: 'flex', flexDirection: 'column' },
  editMode: { display: 'flex', flexDirection: 'column', gap: 2 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  gpsBtn: { width: '100%', padding: 11, background: '#0f3460', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  divider: { margin: '10px 0 6px' },
  dividerText: { display: 'block', textAlign: 'center', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 10, fontWeight: 700 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  addrPreview: { background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#15803d', marginTop: 4, fontWeight: 600 },
  licenseBox: { padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 },
  licenseOk: { fontSize: 13, color: '#15803d', fontWeight: 600 },
  licenseNone: { fontSize: 13, color: '#94a3b8' },
  primaryBtn: { background: '#0e9090', color: 'white', padding: 12, border: 'none', borderRadius: 10, marginTop: 16, cursor: 'pointer', width: '100%', fontSize: 14, fontWeight: 800 },
  secondaryBtn: { background: '#f1f5f9', color: '#0f172a', padding: 11, border: 'none', borderRadius: 10, marginTop: 6, cursor: 'pointer', width: '100%', fontSize: 14, fontWeight: 600 },
  cancelBtn: { background: '#f1f5f9', color: '#475569', padding: 11, border: 'none', borderRadius: 10, marginTop: 6, cursor: 'pointer', width: '100%', fontSize: 14 },
  hr: { margin: '16px 0', borderColor: '#f1f5f9', border: 'none', borderTop: '1px solid #f1f5f9' },
  successMsg: { marginTop: 12, fontSize: 13, color: '#059669', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontWeight: 600 },
  errorMsg: { marginTop: 12, fontSize: 13, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontWeight: 600 },
  jobsLink: { display: 'block', marginTop: 14, color: '#0e9090', textDecoration: 'none', fontSize: 14, fontWeight: 700 },
}