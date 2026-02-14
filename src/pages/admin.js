import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();
  const [entity, setEntity] = useState('pharmacists');
  const [status, setStatus] = useState('pending');
  const [pharmacists, setPharmacists] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/simple-login'); return; }
      if (user.email !== ADMIN_EMAIL) { router.replace('/'); return; }
      await Promise.all([loadPharmacists(), loadStores()]);
      setLoading(false);
    };
    init();
  }, [router]);

  const loadPharmacists = async () => {
    const { data } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, verification_status, is_verified, license_url')
      .order('name', { ascending: true });
    setPharmacists(data || []);
  };

  const loadStores = async () => {
    const { data } = await supabase
      .from('store_profiles')
      .select('user_id, store_name, verification_status, is_verified')
      .order('store_name', { ascending: true });
    setStores(data || []);
  };

  const updatePharmacistStatus = async (userId, newStatus) => {
    await supabase
      .from('pharmacist_profiles')
      .update({
        verification_status: newStatus,
        is_verified: newStatus === 'approved',
      })
      .eq('user_id', userId);
    await loadPharmacists();
  };

  const updateStoreStatus = async (userId, newStatus) => {
    await supabase
      .from('store_profiles')
      .update({
        verification_status: newStatus,
        is_verified: newStatus === 'approved',
      })
      .eq('user_id', userId);
    await loadStores();
  };

  const viewLicense = async (item) => {
    if (!item.license_url) {
      alert('No license uploaded.');
      return;
    }

    const cleanPath = item.license_url.includes('supabase.co')
      ? item.license_url.split('/licenses/')[1]
      : item.license_url

    const { data, error } = await supabase.storage
      .from('licenses')
      .createSignedUrl(cleanPath, 3600);

    if (error || !data?.signedUrl) {
      alert('Could not load license.');
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  const list = entity === 'pharmacists'
    ? pharmacists.filter(p => (p.verification_status || 'pending') === status)
    : stores.filter(s => (s.verification_status || 'pending') === status);

  if (loading) return <p style={{ padding: 20 }}>Loading admin panel…</p>;

  return (
    <div style={styles.page}>
      <h1>Admin Panel</h1>

      <div style={styles.switchRow}>
        <button
          style={entity === 'pharmacists' ? styles.activeBtn : styles.btn}
          onClick={() => setEntity('pharmacists')}
        >
          Pharmacists
        </button>
        <button
          style={entity === 'stores' ? styles.activeBtn : styles.btn}
          onClick={() => setEntity('stores')}
        >
          Stores
        </button>
      </div>

      <div style={styles.switchRow}>
        {['pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            style={status === s ? styles.activeBtn : styles.btn}
            onClick={() => setStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}{' '}
        {entity === 'pharmacists' ? 'Pharmacists' : 'Stores'}
        {' '}({list.length})
      </h2>

      {list.length === 0 && <p>No records found.</p>}

      {list.map((item) => (
        <div key={item.user_id} style={styles.card}>
          <h3>
            {entity === 'pharmacists'
              ? item.name || 'Unnamed'
              : item.store_name || 'Unnamed Store'}
          </h3>

          <p>
            Status:{' '}
            <span style={styles.badge}>
              {item.verification_status || 'pending'}
            </span>
          </p>

          {entity === 'pharmacists' && item.license_url && (
            <button
              style={styles.licenseBtn}
              onClick={() => viewLicense(item)}
            >
              📄 View License
            </button>
          )}

          {status === 'pending' && (
            <div style={{ marginTop: 10 }}>
              <button
                style={styles.approve}
                onClick={() =>
                  entity === 'pharmacists'
                    ? updatePharmacistStatus(item.user_id, 'approved')
                    : updateStoreStatus(item.user_id, 'approved')
                }
              >
                Approve
              </button>{' '}
              <button
                style={styles.reject}
                onClick={() =>
                  entity === 'pharmacists'
                    ? updatePharmacistStatus(item.user_id, 'rejected')
                    : updateStoreStatus(item.user_id, 'rejected')
                }
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { padding: 20, maxWidth: 800, margin: '0 auto' },
  switchRow: { display: 'flex', gap: 10, marginTop: 10 },
  btn: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#f8fafc',
    cursor: 'pointer',
  },
  activeBtn: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: 'white',
    cursor: 'pointer',
  },
  card: {
    border: '1px solid #ddd',
    padding: 14,
    borderRadius: 8,
    marginTop: 14,
    background: 'white',
  },
  badge: {
    background: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
  },
  licenseBtn: {
    marginTop: 8,
    padding: '6px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  approve: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  reject: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};