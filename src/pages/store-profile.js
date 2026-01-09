import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompress';

export default function StoreProfile() {
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
        setLoading(false);
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
  }, []);

  const handleFileChange = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    const compressed = await compressImage(rawFile);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const filePath = `store-licenses/${user.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('store_profiles')
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
      setMessage(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <p style={{ padding: 40 }}>Loading…</p>;
  }

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: 'auto' }}>
      <h1>Store Profile</h1>

      {!profile?.license_url && (
        <div style={{ marginBottom: 30 }}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
          />

          {preview && (
            <div style={{ marginTop: 10 }}>
              <img src={preview} style={{ maxWidth: 300 }} />
            </div>
          )}

          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload License'}
          </button>

          {message && <p>{message}</p>}
        </div>
      )}

      {profile?.license_url && !profile.is_verified && (
        <p>⏳ Verification pending</p>
      )}

      {profile?.is_verified && (
        <p>✅ Verified</p>
      )}

      <hr style={{ margin: '30px 0' }} />

      <a href="/post-job">➡️ Post a Job</a>
    </div>
  );
}
