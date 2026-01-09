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
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      const { data } = await supabase
        .from('pharmacist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleFileChange = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    setMessage('Compressing image...');
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

    setUploading(true);
    setMessage('Uploading...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');

      const filePath = `pharmacist-licenses/${user.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, file, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('pharmacist_profiles')
        .upsert({
          user_id: user.id,
          license_url: urlData.publicUrl,
          is_verified: false,
        });

      if (dbError) throw dbError;

      setProfile({
        license_url: urlData.publicUrl,
        is_verified: false,
      });

      setMessage('License uploaded. Verification pending.');
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: 'auto' }}>
      <h1>Pharmacist Profile</h1>

      {!profile?.license_url && (
        <div
          style={{
            border: '2px dashed #16a34a',
            padding: 20,
            borderRadius: 8,
            background: '#f9fafb',
            marginBottom: 20,
          }}
        >
          <h3>Upload Pharmacist License</h3>

          <input
            type="file"
            accept="image/*"
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
          ✅ Pharmacist verified
        </p>
      )}
    </div>
  );
}
