import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { compressImage } from '../lib/imageCompress';

export default function PharmacistProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      const { data, error } = await supabase
        .from('pharmacist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error(error);
      }

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  // ✅ CORRECT async handler
  const handleFileChange = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    const compressed = await compressImage(rawFile);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select an image first.');
      return;
    }

    setMessage('Uploading...');

    const { data: { user } } = await supabase.auth.getUser();

    const filePath = `pharmacist-licenses/${user.id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('licenses')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('licenses')
      .getPublicUrl(filePath);

    await supabase
      .from('pharmacist_profiles')
      .update({
        license_url: urlData.publicUrl,
        is_verified: false,
      })
      .eq('user_id', user.id);

    setMessage('License uploaded. Verification pending.');
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (!profile) return <p style={{ padding: 40 }}>Profile not found</p>;

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: 'auto' }}>
      <h1>Pharmacist Profile</h1>

      {!profile.license_url && (
        <div
          style={{
            border: '2px dashed #2563eb',
            padding: 20,
            borderRadius: 8,
            background: '#f9fafb',
            marginBottom: 20,
          }}
        >
          <h3>Upload Pharmacy License</h3>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
          />

          {preview && (
            <div style={{ marginTop: 10 }}>
              <p>Selected Image:</p>
              <img
                src={preview}
                alt="License preview"
                style={{
                  width: '100%',
                  maxWidth: 300,
                  border: '1px solid #ccc',
                }}
              />
            </div>
          )}

          <button onClick={handleUpload} style={{ marginTop: 10 }}>
            Upload License
          </button>

          {message && <p>{message}</p>}
        </div>
      )}

      {profile.license_url && !profile.is_verified && (
        <p style={{ color: 'orange' }}>
          ⏳ License uploaded. Verification pending.
        </p>
      )}

      {profile.is_verified && (
        <p style={{ color: 'green' }}>
          ✅ Pharmacist verified
        </p>
      )}
    </div>
  );
}
