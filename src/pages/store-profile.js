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

    const { error } = await supabase.from('store_profiles').upsert({
      user_id: user.id,
      store_name: storeName,
      contact_person: contactPerson,
      store_timings: storeTimings,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

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

    try {
      const compressed = await compressImage(file);
      const { data: { user } } = await supabase.auth.getUser();

      const path = `store-licenses/${user.id}.jpg`;

      await supabase.storage
        .from('licenses')
        .upload(path, compressed, { upsert: true });

      const { data: url } = supabase.storage
        .from('licenses')
        .getPublicUrl(path);

      await supabase.from('store_profiles').upsert({
        user_id: user.id,
        license_url: url.publicUrl,
        is_verified: false,
        verification_status: 'pending',
      });

      setProfile(prev => ({
        ...prev,
        license_url: url.publicUrl,
        is_verified: false,
        verification_status: 'pending',
      }));

      setMessage('License uploaded. Verification pending.');
    } catch (e) {
      setMessage(e.message);
    }
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Store Profile</h1>

        {/* ✅ TRAINING BADGE (ONLY ADDITION) */}
        {profile?.verification_status === 'approved' &&
          profile?.is_training_eligible === true && (
            <div style={styles.trainingApproved}>
              🟢 <b>Approved Training Pharmacy</b>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Authorized to provide industry training under MediConnect.
              </div>
            </div>
        )}

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
            <input
              style={styles.input}
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
            />

            <label style={styles.label}>Contact Person</label>
            <input
              style={styles.input}
              value={contactPerson}
              onChange={e => setContactPerson(e.target.value)}
            />

            <label style={styles.label}>Store Timings</label>
            <input
              style={styles.input}
              value={storeTimings}
              onChange={e => setStoreTimings(e.target.value)}
            />

            <button style={styles.primaryBtn} onClick={saveProfile}>
              Save Store Profile
            </button>
          </>
        )}

        <hr />

        <h3>Upload Store License</h3>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          style={{ display: 'none' }}
          onChange={e => uploadLicense(e.target.files[0])}
        />

        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          style={{ display: 'none' }}
          onChange={e => uploadLicense(e.target.files[0])}
        />

        <div style={styles.btnRow}>
          <button style={styles.primaryBtn} onClick={() => cameraInputRef.current.click()}>
            📷 Take Photo
          </button>
          <button style={styles.secondaryBtn} onClick={() => galleryInputRef.current.click()}>
            🖼️ Choose from Gallery
          </button>
        </div>

        {message && <p>{message}</p>}

        <hr />
        <a href="/post-job">➡️ Post a Job</a>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(120deg, #e0f2fe, #f0fdf4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    background: 'white',
    borderRadius: 12,
    padding: 30,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  },
  verified: {
    color: 'green',
    fontWeight: 'bold',
  },
  pending: {
    color: '#b45309',
    fontWeight: 'bold',
  },
  trainingApproved: {
    background: '#ecfdf5',
    border: '1px solid #6ee7b7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    color: '#065f46',
  },
  label: {
    fontSize: 14,
    marginTop: 10,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: '1px solid #ccc',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: '#e5e7eb',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
