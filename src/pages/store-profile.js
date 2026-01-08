import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function StoreProfile() {
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

      const { data } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select an image first.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image must be under 5 MB.');
      return;
    }

    setMessage('Uploading...');

    const { data: { user } } = await supabase.auth.getUser();

    const filePath = `store-licenses/${user.id}.jpg`;

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
      .from('store_profiles')
      .update({
        license_url: urlData.publicUrl,
        is_verified: false,
      })
      .eq('user_id', user.id);

    setMessage('License uploaded. Verification pending.');
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: 'auto' }}>
      <h1>Store Profile</h1>

      {!profile?.license_url && (
        <div
          style={{
            border: '2px dashed #2563eb',
            padding: 20,
            borderRadius: 8,
            background: '#f9fafb',
            marginBottom: 20,
          }}
        >
          <h3>Upload Store License</h3>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const selected = e.target.files[0];
              setFile(selected);
              if (selected) {
                setPreview(URL.createObjectURL(selected));
              }
            }}
          />

          {preview && (
            <div style={{ marginTop: 10 }}>
              <p>Selected Image:</p>
              <img
                src={preview}
                alt="License preview"
                style={{ width: '100%', maxWidth: 300, border: '1px solid #ccc' }}
              />
            </div>
          )}

          <button onClick={handleUpload} style={{ marginTop: 10 }}>
            Upload License
          </button>

          {message && <p>{message}</p>}
        </div>
      )}

      {profile?.license_url && !profile.is_verified && (
        <p style={{ color: 'orange' }}>
          ⏳ License uploaded. Verification pending.
        </p>
      )}

      {profile?.is_verified && (
        <p style={{ color: 'green' }}>
          ✅ Store verified
        </p>
      )}
    </div>
  );
}
