import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState('pharmacists');
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

  const updatePharmacistStatus = async (id, status, remark) => {
    await supabase
      .from('pharmacist_profiles')
      .update({
        verification_status: status,
        verification_remark: remark,
        is_verified: status === 'approved',
      })
      .eq('user_id', id);

    loadPharmacists();
  };

  const updateStoreStatus = async (id, status, remark) => {
    await supabase
      .from('store_profiles')
      .update({
        verification_status: status,
        verification_remark: remark,
        is_verified: status === 'approved',
      })
      .eq('user_id', id);

    loadStores();
  };

  const toggleTrainingEligibility = async (id, current) => {
    await supabase
      .from('store_profiles')
      .update({ is_training_eligible: !current })
      .eq('user_id', id);

    loadStores();
  };

  if (loading) return <p style={{ padding: 20 }}>Loading admin panel…</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setTab('pharmacists')}>Verify Pharmacists</button>{' '}
        <button onClick={() => setTab('stores')}>Verify Stores</button>
      </div>

      {/* PHARMACISTS */}
      {tab === 'pharmacists' &&
        pharmacists.map((p) => (
          <div key={p.user_id} style={styles.card}>
            <h3>{p.name || 'Unnamed Pharmacist'}</h3>
            <p>Status: <b>{p.verification_status}</b></p>

            {p.license_url && (
              <a href={p.license_url} target="_blank" rel="noreferrer">
                View License
              </a>
            )}

            <textarea
              id={`ph-${p.user_id}`}
              defaultValue={p.verification_remark || ''}
              placeholder="Admin remark"
              style={styles.textarea}
            />

            <button
              onClick={() =>
                updatePharmacistStatus(
                  p.user_id,
                  'approved',
                  document.getElementById(`ph-${p.user_id}`).value
                )
              }
            >
              Approve
            </button>{' '}
            <button
              onClick={() =>
                updatePharmacistStatus(
                  p.user_id,
                  'rejected',
                  document.getElementById(`ph-${p.user_id}`).value
                )
              }
            >
              Reject
            </button>
          </div>
        ))}

      {/* STORES */}
      {tab === 'stores' &&
        stores.map((s) => (
          <div key={s.user_id} style={styles.card}>
            <h3>{s.store_name || 'Unnamed Store'}</h3>
            <p>Status: <b>{s.verification_status}</b></p>

            {s.license_url && (
              <a href={s.license_url} target="_blank" rel="noreferrer">
                View License
              </a>
            )}

            <textarea
              id={`st-${s.user_id}`}
              defaultValue={s.verification_remark || ''}
              placeholder="Admin remark"
              style={styles.textarea}
            />

            <button
              onClick={() =>
                updateStoreStatus(
                  s.user_id,
                  'approved',
                  document.getElementById(`st-${s.user_id}`).value
                )
              }
            >
              Approve
            </button>{' '}
            <button
              onClick={() =>
                updateStoreStatus(
                  s.user_id,
                  'rejected',
                  document.getElementById(`st-${s.user_id}`).value
                )
              }
            >
              Reject
            </button>

            {s.verification_status === 'approved' && (
              <div style={{ marginTop: 10 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={s.is_training_eligible === true}
                    onChange={() =>
                      toggleTrainingEligibility(
                        s.user_id,
                        s.is_training_eligible
                      )
                    }
                  />{' '}
                  Training Eligible
                </label>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #ccc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  textarea: {
    width: '100%',
    margin: '8px 0',
    padding: 8,
  },
};
