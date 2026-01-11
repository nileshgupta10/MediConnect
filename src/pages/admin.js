import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    const initAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      if (user.email !== ADMIN_EMAIL) {
        alert('Unauthorized access');
        router.replace('/');
        return;
      }

      const { data, error } = await supabase
        .from('store_profiles')
        .select('*');

      if (error) {
        console.error(error);
        alert('Failed to load stores');
      } else {
        setStores(data || []);
      }

      setLoading(false);
    };

    initAdmin();
  }, [router]);

  const toggleTrainingEligibility = async (userId, currentStatus) => {
    const { error } = await supabase
      .from('store_profiles')
      .update({ is_training_eligible: !currentStatus })
      .eq('user_id', userId);

    if (error) {
      alert('Update failed');
      return;
    }

    setStores((prev) =>
      prev.map((s) =>
        s.user_id === userId
          ? { ...s, is_training_eligible: !currentStatus }
          : s
      )
    );
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading admin panel…</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel</h1>
      <p>
        Logged in as <b>{ADMIN_EMAIL}</b>
      </p>

      {stores.length === 0 && <p>No stores found.</p>}

      {stores.map((store) => (
        <div
          key={store.user_id}
          style={{
            border: '1px solid #ccc',
            padding: 12,
            marginBottom: 12,
            borderRadius: 6,
          }}
        >
          <h3>{store.store_name || 'Unnamed Store'}</h3>
          <p>
            <b>Verified:</b>{' '}
            {store.is_verified ? '✅ Yes' : '❌ No'}
          </p>
          <p>
            <b>Training Eligible:</b>{' '}
            {store.is_training_eligible ? '✅ Yes' : '❌ No'}
          </p>

          <button
            onClick={() =>
              toggleTrainingEligibility(
                store.user_id,
                store.is_training_eligible
              )
            }
            style={{ padding: '6px 12px', cursor: 'pointer' }}
          >
            {store.is_training_eligible
              ? 'Revoke Training Eligibility'
              : 'Approve for Training'}
          </button>
        </div>
      ))}
    </div>
  );
}
