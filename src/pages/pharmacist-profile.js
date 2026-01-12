import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompress';

export default function PharmacistProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [softwareExperience, setSoftwareExperience] = useState('');
  const [phone, setPhone] = useState('');

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('pharmacist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setName(data.name || '');
        setYearsExperience(data.years_experience || '');
        setSoftwareExperience(data.software_experience || '');
        setPhone(data.phone || '');
      }

      setLoading(false);
    };
    load();
  }, []);

  const saveProfile = async () => {
    setMessage('Saving profile…');
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('pharmacist_profiles')
      .upsert({
        user_id: user.id,
        name,
        years_experience: yearsExperience,
        software_experience: softwareExperience,
        phone,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setProfile(prev => ({
      ...prev,
      name,
      years_experience: yearsExperience,
      software_experience: softwareExperience,
      phone,
    }));

    setEditing(false);
    setMessage('Profile updated successfully.');
  };

  const uploadLicense = async (file) => {
    if (!file) return;
    setUploading(true);
    setMessage('Uploading license…');

    try {
      const compressed = await compressImage(file);
      const { data: { user } } = await supabase.auth.getUser();

      const path = `pharmacist-licenses/${user.id}.jpg`;

      await supabase.storage.from('licenses').upload(path, compressed, { upsert: true });

      const { data: url } = supabase.storage.from('licenses').getPublicUrl(path);

      await supabase
        .from('pharmacist_profiles')
        .upsert({
          user_id: user.id,
          license_url: url.publicUrl,
          is_verified: false,
        });

      setProfile(prev => ({ ...prev, license_url: url.publicUrl, is_verified: false }));
      setMessage('License uploaded. Verification pending.');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Pharmacist Profile</h1>

        <p style={profile?.is_verified ? styles.verified : styles.pending}>
          {profile?.is_verified ? '✅ Verified Pharmacist' : '⏳ Verification Pending'}
        </p>

        <h3>Professional Details</h3>

        {!editing ? (
          <>
            <p><b>Full Name:</b> {profile?.name || '—'}</p>
            <p><b>Years of Experience:</b> {profile?.years_experience || '—'}</p>
            <p><b>Software Experience:</b> {profile?.software_experience || '—'}</p>

            <button style={styles.secondaryBtn} onClick={() => setEditing(true)}>
              ✏️ Edit Profile
            </button>
          </>
        ) : (
          <>
            <label style={styles.label}>Full Name</label>
            <input style={styles.input} value={name} onChange={e => setName(e.target.value)} />

            <label style={styles.label}>Years of Experience</label>
            <input style={styles.input} value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} />

            <label style={styles.label}>Pharmacy Software Experience</label>
            <input
              style={styles.input}
              placeholder="e.g. Marg, GoFrugal, PharmERP"
              value={softwareExperience}
              onChange={e => setSoftwareExperience(e.target.value)}
            />

            <label style={styles.label}>Phone Number (not shared publicly)</label>
            <input
              style={styles.input}
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />

            <button style={styles.primaryBtn} onClick={saveProfile}>
              Save Profile
            </button>
          </>
        )}

        <hr />

        <h3>Upload Pharmacy License</h3>

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
        <a href="/jobs">➡️ Go to Job Listings</a>
      </div>
    </div>
  );
}

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
  heading: { marginBottom: 10 },
  verified: { color: 'green', fontWeight: 'bold' },
  pending: { color: '#b45309', fontWeight: 'bold' },
  label: { fontSize: 14, marginTop: 10, display: 'block' },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: '1px solid #ccc',
  },
  btnRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
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
