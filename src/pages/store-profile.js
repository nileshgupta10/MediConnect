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

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Store Profile</h1>

        {profile?.verification_status === 'approved' &&
        profile?.is_training_eligible === true ? (
          <div style={styles.trainingApproved}>
            🟢 Approved Training Pharmacy
            <br />
            <small>
              Authorized to provide industry training under MediConnect.
            </small>
          </div>
        ) : (
          <p style={profile?.verification_status === 'approved'
            ? styles.verified
            : styles.pending}
          >
            {profile?.verification_status === 'approved'
              ? '✅ Verified Store'
              : '⏳ Verification Pending'}
          </p>
        )}

        {!editing ? (
          <>
            <p><b>Store Name:</b> {profile?.store_name}</p>
            <p><b>Contact:</b> {profile?.contact_person}</p>
            <p><b>Timings:</b> {profile?.store_timings}</p>

            <button style={styles.secondaryBtn} onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          </>
        ) : (
          <>
            <input value={storeName} onChange={e => setStoreName(e.target.value)} />
            <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
            <input value={storeTimings} onChange={e => setStoreTimings(e.target.value)} />
            <button style={styles.primaryBtn} onClick={saveProfile}>Save</button>
          </>
        )}

        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    background: 'white',
    padding: 30,
    borderRadius: 12,
    width: 420,
  },
  verified: { color: 'green', fontWeight: 'bold' },
  pending: { color: '#b45309', fontWeight: 'bold' },
  trainingApproved: {
    background: '#ecfdf5',
    border: '1px solid #6ee7b7',
    padding: 12,
    borderRadius: 8,
    color: '#065f46',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    padding: 10,
    border: 'none',
    borderRadius: 6,
  },
  secondaryBtn: {
    background: '#e5e7eb',
    padding: 10,
    border: 'none',
    borderRadius: 6,
  },
};
