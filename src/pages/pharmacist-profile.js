import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompress';

export default function PharmacistProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  // form fields
  const [name, setName] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [softwareExperience, setSoftwareExperience] = useState('');

  // file handling
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

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
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleImageUpload = async (rawFile) => {
    if (!rawFile) return;

    setUploading(true);
    setMessage('Uploading license…');

    try {
      const compressed = await compressImage(rawFile);
      const { data: { user } } = await supabase.auth.getUser();

      const path = `pharmacist-licenses/${user.id}.jpg`;

      const { error: storageError } = await supabase.storage
        .from('licenses')
        .upload(path, compressed, { upsert: true });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('licenses')
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from('pharmacist_profiles')
        .upsert({
          user_id: user.id,
          license_url: urlData.publicUrl,
          is_verified: false,
        });

      if (dbError) throw dbError;

      setProfile(prev => ({
        ...prev,
        license_url: urlData.publicUrl,
        is_verified: false,
      }));

      setMessage('License uploaded. Verification pending.');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setUploading(false);
    }
  };

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
    }));

    setEditing(false);
    setMessage('Profile updated.');
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Pharmacist Profile</h1>

        {/* STATUS */}
        {profile?.is_verified ? (
          <span style={styles.verified}>✅ Verified</span>
        ) : (
          <span style={styles.pending}>⏳ Verification Pending</span>
        )}

        {/* PROFILE DETAILS */}
        {!editing ? (
          <>
            <p><b>Name:</b> {profile?.name || '—'}</p>
            <p><b>Experience:</b> {profile?.years_experience || '—'} years</p>
            <p><b>Software:</b> {profile?.software_experience || '—'}</p>

            <button style={styles.secondaryBtn} onClick={() => setEditing(true)}>
              ✏️ Edit Profile
            </button>
          </>
        ) : (
          <>
            <input
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Years of Experience"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Software Experience"
              value={softwareExperience}
              onChange={(e) => setSoftwareExperience(e.target.value)}
            />

            <button style={styles.primaryBtn} onClick={saveProfile}>
              Save Profile
            </button>
          </>
        )}

        <hr style={{ margin: '25px 0' }} />

        {/* LICENSE UPLOAD */}
        <h3>Upload License</h3>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          style={{ display: 'none' }}
          onChange={(e) => handleImageUpload(e.target.files[0])}
        />

        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          style={{ display: 'none' }}
          onChange={(e) => handleImageUpload(e.target.files[0])}
        />

        <div style={styles.btnRow}>
          <button style={styles.primaryBtn} onClick={() => cameraInputRef.current.click()}>
            📷 Take Photo
          </button>
          <button style={styles.secondaryBtn} onClick={() => galleryInputRef.current.click()}>
            🖼️ Choose from Gallery
          </button>
        </div>

        {message && <p style={{ marginTop: 10 }}>{message}</p>}

        <hr style={{ margin: '25px 0' }} />
        <a href="/jobs">➡️ Go to Job Listings</a>
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
  heading: {
    marginBottom: 10,
    color: '#0f172a',
  },
  verified: {
    color: 'green',
    fontWeight: 'bold',
  },
  pending: {
    color: '#b45309',
    fontWeight: 'bold',
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
