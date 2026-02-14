import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();

  const [entity, setEntity] = useState('pharmacists'); // pharmacists | stores
  const [status, setStatus] = useState('pending'); // pending | approved | rejected

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

  /* ---------- ACTIONS ---------- */

  const updatePharmacistStatus = async (userId, newStatus) => {
    await supabase
      .from('pharmacist_profiles')
      .update({
        verification_status: newStatus,
        is_verified: newStatus === 'approved',
      })
      .eq('user_id', userId);

    loadPharmacists();
  };

  const updateStoreStatus = async (userId, newStatus) => {
    await supabase
      .from('store_profiles')
      .update({
        verification_status: newStatus,
        is_verified: newStatus === 'approved',
        is_training_eligible: false, // reset on re-verify
      })
      .eq('user_id', userId);

    loadStores();
  };

  const toggleTrainingEligibility = async (userId, current) => {
    await supabase
      .from('store_profiles')
      .update({
        is_training_eligible: !current,
      })
      .eq('user_id', userId);

    loadStores();
  };

  /* ---------- FILTERED LIST ---------- */

  const list =
    entity === 'pharmacists'
      ? pharmacists.filter(p => (p.verification_status || 'pending') === status)
      : stores.filter(s => (s.verification_status || 'pending') === status);

  if (loading) {
    return <p style={{ padding: 20 }}>Loading admin panel…</p>;
  }

  return (
    <div style={styles.page}>
      <h1>Admin Panel</h1>

      {/* ENTITY SELECT */}
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

      {/* STATUS SELECT */}
      <div style={styles.switchRow}>
        <button
          style={status === 'pending' ? styles.activeBtn : styles.btn}
          onClick={() => setStatus('pending')}
        >
          Pending
        </button>
        <button
          style={status === 'approved' ? styles.activeBtn : styles.btn}
          onClick={() => setStatus('approved')}
        >
          Approved
        </button>
        <button
          style={status === 'rejected' ? styles.activeBtn : styles.btn}
          onClick={() => setStatus('rejected')}
        >
          Rejected
        </button>
      </div>

      {/* CONTEXT HEADER */}
      <h2 style={{ marginTop: 20 }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}{' '}
        {entity === 'pharmacists' ? 'Pharmacists' : 'Stores'}
      </h2>

      {/* NOTE */}
      {entity === 'stores' && status === 'pending' && (
        <div style={styles.note}>
          After approval or rejection, stores will automatically move to the
          respective tab. Approved stores can be marked as training-eligible.
        </div>
      )}

      {/* LIST */}
      {list.length === 0 && <p>No records found.</p>}

      {list.map((item) => (
        <div key={item.user_id} style={styles.card}>
          <h3>
            {entity === 'pharmacists'
              ? item.name || 'Unnamed Pharmacist'
              : item.store_name || item.name || 'Unnamed Store'}
          </h3>

          <p>
            Status:{' '}
            <span style={styles.badge}>
              {item.verification_status || 'pending'}
            </span>
          </p>

          {item.license_url && (
  <button
    style={styles.viewLicenseBtn}
    onClick={async () => {
      const path = `pharmacist-licenses/${item.user_id}.jpg`
      const { data } = await supabase.storage
        .from('licenses')
        .createSignedUrl(path, 3600)
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    }}
  >
    View License
  </button>
)}

          {/* ACTIONS */}
          {status === 'pending' && (
            <div style={{ marginTop: 8 }}>
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

          {/* TRAINING TOGGLE */}
          {entity === 'stores' && status === 'approved' && (
            <div style={{ marginTop: 10 }}>
              <label>
                <input
                  type="checkbox"
                  checked={item.is_training_eligible || false}
                  onChange={() =>
                    toggleTrainingEligibility(
                      item.user_id,
                      item.is_training_eligible
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

/* ---------- STYLES ---------- */

const styles = {
  page: {
    padding: 20,
    maxWidth: 800,
    margin: '0 auto',
  },
  switchRow: {
    display: 'flex',
    gap: 10,
    marginTop: 10,
  },
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
  note: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 14,
  },
};
