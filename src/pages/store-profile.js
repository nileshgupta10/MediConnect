import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { compressImage } from '../lib/imageCompress';

export default function StoreProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

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
        .maybeSingle();

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

    setUploading(true);
    setMessage('Compressing image...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const compressedFile = await compressImage(file);

      setMessage(`Uploading (${Math.round(compressedFile.size / 1024)} KB)...`);

      const filePath = `store-licenses/${user.id}.jpg`;

      const uploadRes = await supabase.storage
        .from('licenses')
        .upload(filePath, compressedFile, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadRes.error) {
        console.error('Storage error:', uploadRes.error);
        throw uploadRes.error;
      }

      const { data: urlData } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      const dbRes = await supabase
        .from('store_profiles')
        .upsert({
          user_id: user.id,
          license_url: urlData.publicUrl,
          is_verified: false,
        });

      if (dbRes.error) {
        console.error('DB error:', dbRes.error);
        throw dbRes.error;
      }

      setProfile({
        license_url: urlData.publicUrl,
        is_verified: false,
      });

      setMessage('License uploaded. Verification pending.');
    } catch (err) {
      console.error('FINAL ERROR:', err);
      setMessage(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
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
              if (selected) setPreview(URL.createObjectURL(selected));
            }}
          />

          {preview && (
            <img
              src={preview}
              alt="Preview"
              style={{ width: '100%', maxWidth: 300, marginTop: 10 }}
            />
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{ marginTop: 10 }}
          >
            {uploading ? 'Uploading...' : 'Upload License'}
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
