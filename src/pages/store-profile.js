import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function StoreProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
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
    };

    loadProfile();
  }, [router]);

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select or capture an image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Image must be under 2 MB.');
      return;
    }

    setUploading(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();
    const filePath = `store-${user.id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('license-documents')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      setMessage('Upload failed or already uploaded.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('license-documents')
      .getPublicUrl(filePath);

    await supabase
      .from('store_profiles')
      .update({
        license_url: urlData.publicUrl,
        is_verified: false,
      })
      .eq('user_id', user.id);

    setMessage('License uploaded. Verification pending.');
    setUploading(false);
  };

  if (!profile) return <p style={{ padding: 30 }}>Loading…</p>;

  const needsVerification = !profile.license_url || profile.is_verified === false;

  return (
    <div style={{ padding: 30 }}>
      <h1>Store Profile</h1>

      {needsVerification && (
        <div style={{ border: '1px solid #ccc', padding: 20, marginBottom: 20 }}>
          <h3>License Verification Required</h3>
          <p>Please upload your store license to continue.</p>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <br /><br />

          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload License'}
          </button>

          <p>{message}</p>
        </div>
      )}

      <h3>Store Name</h3>
      <p>{profile.name || 'Not provided'}</p>

      <h3>Status</h3>
      <p>{profile.is_verified ? '✅ Verified' : '⏳ Verification Pending'}</p>

      {!profile.is_verified && (
        <p style={{ color: 'red' }}>
          Job posting disabled until verification.
        </p>
      )}

      <button
        disabled={!profile.is_verified}
        onClick={() => router.push('/post-job')}
      >
        Post New Job
      </button>
    </div>
  );
}
