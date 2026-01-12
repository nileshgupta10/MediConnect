import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      if (user.email !== ADMIN_EMAIL) {
        alert('Unauthorized');
        router.replace('/');
        return;
      }

      await loadStores();
      setLoading(false);
    };

    init();
  }, [router]);

  const loadStores = async () => {
    const { data } = await supabase
      .from('store_profiles')
      .select('*')
      .order('store_name', { ascending: true });

    setStores(data || []);
  };

  const updateStoreStatus = async (id, status) => {
    await supabase
      .from('store_profiles')
      .update({
        verification_status: status,
        is_verified: status === 'approved',
      })
      .eq('user_id', id);

    loadStores();
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading admin panel…</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel</h1>

      <h2>Verify Stores</h2>

      {stores.map((s) => (
        <div key={s.user_id} style={styles.card}>
          <h3>
            {s.store_name || s.name || 'Unnamed Store'}
          </h3>

          <p>
            Status: <b>{s.verification_status}</b>
          </p>

          {s.license_url && (
            <p>
              <a href={s.license_url} target="_blank" rel="noreferrer">
                View License
              </a>
            </p>
          )}

          <button
            onClick={() => updateStoreStatus(s.user_id, 'approved')}
            disabled={s.verification_status === 'approved'}
          >
            Approve
          </button>{' '}
          <button
            onClick={() => updateStoreStatus(s.user_id, 'rejected')}
            disabled={s.verification_status === 'rejected'}
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
  },
};
