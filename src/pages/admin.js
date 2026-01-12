import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();

  const [mainTab, setMainTab] = useState('pharmacists'); // pharmacists | stores
  const [subTab, setSubTab] = useState('pending'); // pending | approved | rejected

  const [pharmacists, setPharmacists] = useState([]);
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

      await loadPharmacists();
      await loadStores();
      setLoading(false);
    };

    init();
  }, [router]);

  /* ---------- LOADERS ---------- */

  const loadPharmacists = async () => {
    const { data } = await supabase
      .from('pharmacist_profiles')
      .select('*')
      .order('name', { ascending: true });

    setPharmacists(data || []);
  };

  const loadStores = async () => {
    const { data } = await supabase
      .from('store_profiles')
      .select('*')
      .order('store_name', { ascending: true });

    setStores(data || []);
  };

  /* ---------- UPDATE ACTIONS ---------- */

  const updatePharmacistStatus = async (userId, status) => {
    await supabase
      .from('pharmacist_profiles')
      .update({
        verification_status: status,
        is_verified: status === 'approved',
      })
      .eq('user_id', userId);

    loadPharmacists();
  };

  const updateStoreStatus = async (userId, status) => {
    await supabase
      .from('store_profiles')
      .update({
        verification_status: status,
        is_verified: status === 'approved',
      })
      .eq('user_id', userId);

    loadStores();
  };

  /* ---------- FILTERED DATA ---------- */

  const filteredPharmacists = pharmacists.filter(
    (p) => (p.verification_status || 'pending') === subTab
  );

  const filteredStores = stores.filter(
    (s) => (s.verification_status || 'pending') === subTab
  );

  if (loading) {
    return <p style={{ padding: 20 }}>Loading admin panel…</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel</h1>

      {/* MAIN TABS */}
      <div style={styles.tabRow}>
        <button
          onClick={() => {
            setMainTab('pharmacists');
            setSubTab('pending');
          }}
        >
          Verify Pharmacists
        </button>
        <button
          onClick={() => {
            setMainTab('stores');
            setSubTab('pending');
          }}
        >
          Verify Stores
        </button>
      </div>

      {/* SUB TABS */}
      <div style={styles.subTabRow}>
        <button onClick={() => setSubTab('pending')}>Pending</button>
        <button onClick={() => setSubTab('approved')}>Approved</button>
        <button onClick={() => setSubTab('rejected')}>Rejected</button>
      </div>

      {/* NOTE FOR STORES */}
      {mainTab === 'stores' && subTab === 'pending' && (
        <div style={styles.note}>
          Once a store is approved or rejected, it will automatically move to the
          respective tab. Approved stores can later be marked as training-eligible.
        </div>
      )}

      {/* PHARMACISTS */}
      {mainTab === 'pharmacists' &&
        filteredPharmacists.map((p) => (
          <div key={p.user_id} style={styles.card}>
            <h3>{p.name || 'Unnamed Pharmacist'}</h3>
            <p>Status: <b>{p.verification_status || 'pending'}</b></p>

            {p.license_url && (
              <a href={p.license_url} target="_blank" rel="noreferrer">
                View License
              </a>
            )}

            {subTab === 'pending' && (
              <div>
                <button onClick={() => updatePharmacistStatus(p.user_id, 'approved')}>
                  Approve
                </button>{' '}
                <button onClick={() => updatePharmacistStatus(p.user_id, 'rejected')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}

      {/* STORES */}
      {mainTab === 'stores' &&
        filteredStores.map((s) => (
          <div key={s.user_id} style={styles.card}>
            <h3>{s.store_name || s.name || 'Unnamed Store'}</h3>
            <p>Status: <b>{s.verification_status || 'pending'}</b></p>

            {s.license_url && (
              <a href={s.license_url} target="_blank" rel="noreferrer">
                View License
              </a>
            )}

            {subTab === 'pending' && (
              <div>
                <button onClick={() => updateStoreStatus(s.user_id, 'approved')}>
                  Approve
                </button>{' '}
                <button onClick={() => updateStoreStatus(s.user_id, 'rejected')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  tabRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 12,
  },
  subTabRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    border: '1px solid #ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
  },
  note: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    fontSize: 14,
  },
};
