import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompress';

export default function StoreProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');

  const [storeName, setStoreName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [storeTimings, setStoreTimings] = useState('');

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setStoreName(data.store_name || '');
        setContactPerson(data.contact_person || '');
        setStoreTimings(data.store_timings || '');
      }

      setLoading(false);
    };
    load();
  }, []);

  const saveProfile = async () => {
    setMessage('Saving store profile…');
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('store_profiles').upsert({
      user_id: user.id,
      store_name: storeName,
      contact_person: contactPerson,
      store_timings: storeTimings,
    });

    setProfile(prev => ({
      ...prev,
      store_name: storeName,
      contact_person: contactPerson,
      store_timings: storeTimings,
    }));

    setEditing(false);
    setMessage('Store profile updated.');
  };

  const uploadLicense = async (file) => {
    if (!file) return;

    const compressed = await compressImage(file);
    const { data: { user } } = await supabase.auth.getUser();

    const path = `store-licenses/${user.id}.jpg`;

    await supabase.storage.from('licenses').upload(path, compressed, { upsert: true });

    const { data: url } = supabase.storage.from('licenses').getPublicUrl(path);

    await supabase.from('store_profiles').upsert({
      user_id: user.id,
      license_url: url.publicUrl,
      is_verified: false,
    });

    setProfile(prev => ({ ...prev, license_url: url.publicUrl, is_verified: false }));
    setMessage('License uploaded. Verification pending.');
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Store Profile</h1>

        <p style={profile?.is_verified ? styles.verified : styles.pending}>
          {profile?.is_verified ? '✅ Verified Store' : '⏳ Verification Pending'}
        </p>

        <h3>Store Details</h3>

        {!editing ? (
          <>
            <p><b>Store Name:</b> {profile?.store_name || '—'}</p>
            <p><b>Contact Person:</b> {profile?.contact_person || '—'}</p>
            <p><b>Store Timings:</b> {profile?.store_timings || '—'}</p>

            <button style={styles.secondaryBtn} onClick={() => setEditing(true)}>
              ✏️ Edit Store Profile
            </button>
          </>
        ) : (
          <>
            <label style={styles.label}>Store Name</label>
            <input style={styles.input} value={storeName} onChange={e => setStoreName(e.target.value)} />

            <label style={styles.label}>Contact Person</label>
            <input style={styles.input} value={contactPerson} onChange={e => setContactPerson(e.target.value)} />

            <label style={styles.label}>Store Timings</label>
            <input style={styles.input} value={storeTimings} onChange={e => setStoreTimings(e.target.value)} />

            <button style={styles.primaryBtn} onClick={saveProfile}>Save Store Profile</button>
          </>
        )}

        <hr />

        <h3>Upload Store License</h3>

        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{ display: 'none' }}
          onChange={e => uploadLicense(e.target.files[0])} />

        <input type="file" accept="image/*" ref={galleryInputRef} style={{ display: 'none' }}
          onChange={e => uploadLicense(e.target.files[0])} />

        <div style={styles.btnRow}>
          <button style={styles.primaryBtn} onClick={() => cameraInputRef.current.click()}>📷 Take Photo</button>
          <button style={styles.secondaryBtn} onClick={() => galleryInputRef.current.click()}>🖼️ Choose from Gallery</button>
        </div>

        {message && <p>{message}</p>}

        <hr />
        <a href="/post-job">➡️ Post a Job</a>
      </div>
    </div>
  );
}
