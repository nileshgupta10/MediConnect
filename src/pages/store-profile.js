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

      const { data, error } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

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
    setMessage('Compressing and uploading...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ Compress image
      const compressedFile = await compressImage(file);

      const filePath = `store-licenses/${user.id}.jpg`;

      // ✅ Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, compressedFile, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      // ✅ UPSERT profile row (INSERT or UPDATE safely)
      const { error: dbError } = await supabase
        .from('store_profiles')
        .upsert({
          user_id: user.id,
          license_url: urlData.publicUrl,
          is_verified: false,
        });

      if (dbError) throw dbError;

      setMessage('License uploaded. Verification pending.');

      setProfile({
        ...profile,
        license_url: urlData.publicUrl,
        is_verified: false,
      });
    } catch (err) {
      console.error(err);
      setMessage('Upload failed. Please try again.');
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
                style={{
                  width: '100%',
                  maxWidth: 300,
                  border: '1px solid #ccc',
                }}
              />
            </div>
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
