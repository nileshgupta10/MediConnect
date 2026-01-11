import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('pharmacists');
  const [pharmacists, setPharmacists] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      if (user.email !== ADMIN_EMAIL) {
        alert('Unauthorized');
        router.replace('/');
        return;
      }

      setUser(user);

      await loadPharmacists();
      await loadStores();

      setLoading(false);
    };

    init();
  }, [router]);

  const loadPharmacists = async () => {
    const { data } = await supabase
      .from('pharmacist_profiles')
      .select('*');

    setPharmacists(data || []);
  };

  const loadStores = async () => {
    const { data } = await supabase
      .from('store_profiles')
      .select('*');

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

  if (loading) return <p style={{ padding: 20 }}>Loading admin panel…</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel</h1>

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setTab('pharmacists')}>
          Verify Pharmacists
        </button>{' '}
        <button onClick={() => setTab('stores')}>
          Verify Stores
        </button>
      </div>

      {/* Pharmacists */}
      {tab === 'pharmacists' &&
        pharmacists.map((p) => (
          <div
            key={p.user_id}
            style={{
              border: '1px solid #ccc',
              padding: 12,
              marginBottom: 12,
              borderRadius: 6,
            }}
          >
            <h3>{p.name || 'Unnamed Pharmacist'}</h3>
            <p>Status: <b>{p.verification_status}</b></p>

            {p.license_url && (
              <p>
                <a href={p.license_url} target="_blank" rel="noreferrer">
                  View License
                </a>
              </p>
            )}

            <textarea
              placeholder="Admin remark"
              defaultValue={p.verification_remark || ''}
              id={`remark-ph-${p.user_id}`}
              style={{ width: '100%', marginBottom: 8 }}
            />

            <button
              onClick={() =>
                updatePharmacistStatus(
                  p.user_id,
                  'approved',
                  document.getElementById(`remark-ph-${p.user_id}`).value
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
                  document.getElementById(`remark-ph-${p.user_id}`).value
                )
              }
            >
              Reject
            </button>
          </div>
        ))}

      {/* Stores */}
      {tab === 'stores' &&
        stores.map((s) => (
          <div
            key={s.user_id}
            style={{
              border: '1px solid #ccc',
              padding: 12,
              marginBottom: 12,
              borderRadius: 6,
            }}
          >
            <h3>{s.store_name || 'Unnamed Store'}</h3>
            <p>Status: <b>{s.verification_status}</b></p>

            {s.license_url && (
              <p>
                <a href={s.license_url} target="_blank" rel="noreferrer">
                  View License
                </a>
              </p>
            )}

            <textarea
              placeholder="Admin remark"
              defaultValue={s.verification_remark || ''}
              id={`remark-st-${s.user_id}`}
              style={{ width: '100%', marginBottom: 8 }}
            />

            <button
              onClick={() =>
                updateStoreStatus(
                  s.user_id,
                  'approved',
                  document.getElementById(`remark-st-${s.user_id}`).value
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
                  document.getElementById(`remark-st-${s.user_id}`).value
                )
              }
            >
              Reject
            </button>
          </div>
        ))}
    </div>
  );
}
