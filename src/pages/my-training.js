import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MyTraining() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('training_requests')
      .select(`
        id,
        appointment_at,
        status,
        pharmacist_response,
        store_profiles (
          store_name,
          phone
        )
      `)
      .eq('pharmacist_id', user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
    setLoading(false);
  };

  const respond = async (id, response) => {
    await supabase
      .from('training_requests')
      .update({
        pharmacist_response: response,
      })
      .eq('id', id);

    load();
  };

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={styles.page}>
      <h1>My Training Appointments</h1>

      {requests.length === 0 && <p>No training requests.</p>}

      {requests.map(r => (
        <div key={r.id} style={styles.card}>
          <h3>{r.store_profiles?.store_name}</h3>

          {r.appointment_at ? (
            <>
              <p>
                📅 Appointment:{' '}
                {new Date(r.appointment_at).toLocaleString()}
              </p>

              <p>
                📞 Store Phone:{' '}
                <b>{r.store_profiles?.phone || '—'}</b>
              </p>

              <p>Status: <b>{r.pharmacist_response}</b></p>

              {r.pharmacist_response === 'pending' && (
                <div>
                  <button
                    style={styles.confirmBtn}
                    onClick={() => respond(r.id, 'confirmed')}
                  >
                    Confirm
                  </button>{' '}
                  <button
                    style={styles.postponeBtn}
                    onClick={() => respond(r.id, 'postpone_requested')}
                  >
                    Request Postpone
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>⏳ Awaiting scheduling by store.</p>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    maxWidth: 700,
    margin: '0 auto',
  },
  card: {
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    background: 'white',
  },
  confirmBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  postponeBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
