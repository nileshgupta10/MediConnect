import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Training() {
  const [stores, setStores] = useState([]);
  const [user, setUser] = useState(null);
  const [requested, setRequested] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);

      const { data: storesData } = await supabase
        .from('store_profiles')
        .select('user_id, store_name, store_timings')
        .eq('is_verified', true)
        .eq('is_training_eligible', true)
        .order('store_name', { ascending: true });

      setStores(storesData || []);

      if (user) {
        const { data: req } = await supabase
          .from('training_requests')
          .select('store_id')
          .eq('pharmacist_id', user.id);

        setRequested(req?.map(r => r.store_id) || []);
      }

      setLoading(false);
    };

    init();
  }, []);

  const requestTraining = async (storeId) => {
    if (!user) {
      alert('Please login to request training');
      return;
    }

    const { error } = await supabase.from('training_requests').insert({
      pharmacist_id: user.id,
      store_id: storeId,
    });

    if (!error) {
      setRequested([...requested, storeId]);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Training Module</h1>

        <h3>🏥 Approved Training Pharmacies</h3>

        {loading && <p>Loading…</p>}

        {!loading && stores.length === 0 && (
          <p>No training-eligible pharmacies available yet.</p>
        )}

        {stores.map((s) => {
          const alreadyRequested = requested.includes(s.user_id);

          return (
            <div key={s.user_id} style={styles.storeCard}>
              <h4>{s.store_name}</h4>
              <p>Timings: {s.store_timings || '—'}</p>

              <button
                disabled={alreadyRequested}
                onClick={() => requestTraining(s.user_id)}
                style={{
                  ...styles.btn,
                  background: alreadyRequested ? '#9ca3af' : '#2563eb',
                }}
              >
                {alreadyRequested ? 'Requested ✓' : 'Request Training'}
              </button>
            </div>
          );
        })}

        <hr />

        <h3>💻 Software Training</h3>
        <a
          href="https://youtu.be/Od9fwj8mOOk"
          target="_blank"
          rel="noreferrer"
        >
          CARE Pharmacy Software – Basic Walkthrough
        </a>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 20,
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    background: 'white',
    padding: 24,
    borderRadius: 12,
    maxWidth: 600,
    width: '100%',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
  },
  storeCard: {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  btn: {
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 6,
  },
};
