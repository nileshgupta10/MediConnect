import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'
import StoreLayout from '../components/StoreLayout'

const BANNER_IMG = 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=1200&q=80'

export default function StoreProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [storeTimings, setStoreTimings] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [address, setAddress] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [ownerFirstName, setOwnerFirstName] = useState('')
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return }
    const existing = document.querySelector('#google-maps-script')
    if (existing) { setMapsLoaded(true); return }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true; script.defer = true
    script.onload = () => setMapsLoaded(true)
    document.head.appendChild(script)
  }, [])

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
    const fullName = user.user_metadata?.full_name || ''
    setOwnerFirstName(fullName.split(' ')[0] || '')
    const { data } = await supabase
      .from('store_profiles')
      .select('user_id, store_name, phone, store_timings, latitude, longitude, address, license_url, is_verified, verification_status')
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
    setLocating(true); setMessage('Detecting…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude; const newLng = pos.coords.longitude
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
    if (!storeName.trim()) { setMessage('Please enter store name.'); return }
    if (!latitude || !longitude) { setMessage('Please set your store location.'); return }
    setSaving(true); setMessage('Saving…')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('store_profiles').upsert({
      user_id: user.id, store_name: storeName.trim(),
      phone: phone.trim(), store_timings: storeTimings.trim(),
      latitude, longitude, address,
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
      const path = `store-licenses/${user.id}.jpg`
      const { error: uploadError } = await supabase.storage.from('licenses').upload(path, compressed, { upsert: true })
      if (uploadError) { setMessage('Upload failed: ' + uploadError.message); return }
      const { error: updateError } = await supabase.from('store_profiles')
        .update({ license_url: path, is_verified: false, verification_status: 'pending' })
        .eq('user_id', user.id)
      if (updateError) { setMessage('Error: ' + updateError.message); return }
      await load(); setMessage('License uploaded. Pending verification.')
    } catch (e) { setMessage('Error: ' + e.message) }
    finally { setUploading(false) }
  }

  const getBannerGreeting = () => {
    if (storeName) return `Welcome, ${storeName}! 🏪`
    if (ownerFirstName) return `Welcome, ${ownerFirstName}! 👋`
    return 'My Store Profile 🏪'
  }

  const getBannerSub = () => {
    if (!storeName) return 'Set up your pharmacy store on MediClan'
    if (profile?.is_verified) return '✓ Your store is verified and live'
    return 'Verification pending — we\'ll review shortly'
  }

  if (loading) return <p style={{ padding: 40, fontFamily: 'Nunito, sans-serif' }}>Loading…</p>

  return (
    <StoreLayout>
    <div style={s.page}>
      <div style={s.banner}>
        <img src={BANNER_IMG} alt="" style={s.bannerImg} />
        <div style={s.bannerOverlay} />
        <div style={s.bannerContent}>
          <div style={s.bannerIcon}>🏪</div>
          <div>
            <h2 style={s.bannerTitle}>{getBannerGreeting()}</h2>
            <p style={s.bannerSub}>{getBannerSub()}</p>
          </div>
        </div>
      </div>

      <div style={s.cardWrap}>
        <div style={s.card}>
          <div style={profile?.is_verified ? s.verifiedBadge : s.pendingBadge}>
            {profile?.is_verified ? '✓ Verified' : '⏳ Verification Pending'}
          </div>

          {!editing ? (
            <div style={s.viewMode}>
              <Field label="Store Name" value={storeName} />
              <Field label="Contact" value={phone} />
              <Field label="Timings" value={storeTimings} />
              <Field label="Location" value={address || (latitude ? 'Location saved' : null)} />
              {latitude && longitude && (
                <button style={s.mapsBtn} onClick={() => window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank')}>
                  📍 View Store on Google Maps
                </button>
              )}

              {/* License section in view mode */}
              <div style={s.licenseSection}>
                <span style={s.licenseSectionLabel}>STORE LICENSE</span>
                <div style={s.licenseBox}>
                  {profile?.license_url ? (
                    <span style={s.licenseOk}>
                      ✓ Uploaded — {profile.verification_status === 'approved' ? 'Verified ✓' : profile.verification_status === 'rejected' ? 'Rejected — please re-upload' : 'Awaiting verification'}
                    </span>
                  ) : <span style={s.licenseNone}>⚠️ No license uploaded yet — required for verification</span>}
                </div>
                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} hidden onChange={e => uploadLicense(e.target.files[0])} />
                <input type="file" accept="image/*" ref={galleryInputRef} hidden onChange={e => uploadLicense(e.target.files[0])} />
                <button onClick={() => cameraInputRef.current.click()} style={s.secondaryBtn} disabled={uploading}>
                  📷 {uploading ? 'Uploading…' : profile?.license_url ? 'Replace License' : 'Take Photo of License'}
                </button>
                <button onClick={() => galleryInputRef.current.click()} style={s.secondaryBtn} disabled={uploading}>
                  🖼️ Upload from Gallery
                </button>
              </div>

              <button onClick={() => setEditing(true)} style={s.primaryBtn}>Edit Profile</button>
              {!storeName && (
                <div style={s.wrongRoleBox}>
                  <p style={s.wrongRoleText}>Selected the wrong role?</p>
                  <a href="/role-select-reset" style={s.wrongRoleLink}>← Go back and change role</a>
                </div>
              )}
            </div>
          ) : (
            <div style={s.editMode}>
              <IL text="Store Name *" />
              <input style={s.input} placeholder="Your pharmacy store name" value={storeName} onChange={e => setStoreName(e.target.value)} />

              <IL text="Phone Number" />
              <input style={s.input} placeholder="Contact number" value={phone} onChange={e => setPhone(e.target.value)} />

              <IL text="Store Timings" />
              <input style={s.input} placeholder="e.g. 9 AM - 9 PM" value={storeTimings} onChange={e => setStoreTimings(e.target.value)} />

              <IL text="Store Location *" />
              <button style={s.gpsBtn} onClick={detectLocation} disabled={locating}>
                {locating ? '⏳ Detecting…' : '📍 Use My Current Location (GPS)'}
              </button>
              <div style={s.divider}><span style={s.dividerText}>OR type address below</span></div>
              <input
                id="address-input" style={s.input}
                placeholder="Start typing your store address…"
                value={addressInput}
                onChange={e => {
                  setAddressInput(e.target.value)
                  if (latitude) { setLatitude(null); setLongitude(null); setAddress('') }
                }}
              />
              <p style={s.hint}>{mapsLoaded ? '💡 Select from dropdown' : '⏳ Loading search…'}</p>
              {address && latitude && <div style={s.addrPreview}>✓ {address}</div>}

              <button onClick={saveProfile} style={s.primaryBtn} disabled={saving}>
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
              <button onClick={() => { setEditing(false); setMessage('') }} style={s.cancelBtn}>Cancel</button>
            </div>
          )}

          {message && (
            <p style={message.startsWith('Error') || message.startsWith('Please') || message.startsWith('Upload failed') ? s.errorMsg : s.successMsg}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
    </StoreLayout>
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
  bannerIcon: { fontSize: 44 },
  bannerTitle: { color: 'white', fontSize: 24, fontWeight: 900, margin: 0 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  cardWrap: { display: 'flex', justifyContent: 'center', padding: '0 16px 40px' },
  card: { background: 'white', padding: 28, borderRadius: 20, maxWidth: 460, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.1)', marginTop: -28, position: 'relative', zIndex: 1 },
  verifiedBadge: { display: 'inline-block', background: '#d1fae5', color: '#065f46', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, marginBottom: 16 },
  pendingBadge: { display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, marginBottom: 16 },
  viewMode: { display: 'flex', flexDirection: 'column', gap: 4 },
  editMode: { display: 'flex', flexDirection: 'column', gap: 2 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  gpsBtn: { width: '100%', padding: 11, background: '#0f3460', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  divider: { margin: '10px 0 6px' },
  dividerText: { display: 'block', textAlign: 'center', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 10, fontWeight: 700 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  addrPreview: { background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#15803d', fontWeight: 600, marginTop: 4 },
  licenseSection: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6 },
  licenseSectionLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 },
  licenseBox: { padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' },
  licenseOk: { fontSize: 13, color: '#15803d', fontWeight: 600 },
  licenseNone: { fontSize: 13, color: '#f59e0b', fontWeight: 600 },
  secondaryBtn: { background: '#f1f5f9', color: '#0f172a', padding: 11, border: 'none', borderRadius: 10, cursor: 'pointer', width: '100%', fontSize: 14, fontWeight: 600 },
  primaryBtn: { marginTop: 16, width: '100%', padding: 12, background: '#0e9090', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer' },
  cancelBtn: { marginTop: 6, width: '100%', padding: 12, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' },
  mapsBtn: { padding: '10px 14px', background: '#f0fdfd', color: '#0e9090', border: '1.5px solid #99f6e4', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, width: '100%', marginTop: 10, marginBottom: 4 },
  successMsg: { marginTop: 12, fontSize: 13, color: '#059669', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontWeight: 600 },
  errorMsg: { marginTop: 12, fontSize: 13, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontWeight: 600 },
  wrongRoleBox: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', textAlign: 'center' },
  wrongRoleText: { fontSize: 13, color: '#94a3b8', marginBottom: 6 },
  wrongRoleLink: { fontSize: 13, color: '#dc2626', fontWeight: 700, textDecoration: 'none' },
}