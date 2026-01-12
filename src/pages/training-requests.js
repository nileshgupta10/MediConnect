import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrainingRequests() {
  const [requests, setRequests] = useState([]);
  const [dateTime, setDateTime] = useState({});
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
        pharmacist_profiles (
          name,
          phone
        ),
        store_profiles (
          store_name,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    setRequests(data || []);
    setLoading(false);
  };

  const schedule = async (id) => {
    if (!dateTime[id]) {
      alert('Please select date and time');
      return;
    }

    await supabase
      .from('training_requests')
      .update({
        appointment_at: dateTime[id],
        status: 'scheduled',
      })
      .eq('id', id);

    load();
  };

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={styles.page}>
      <h1>Training Requests – Scheduling</h1>

      {requests.length === 0 && <p>No training requests.</p>}

      {requests.map(r => (
        <div key={r.id} style={styles.card}>
          <h3>{r.pharmacist_profiles?.name || 'Pharmacist'}</h3>
          <p>
            Store: <b>{r.store_profiles?.store_name}</b>
          </p>

          <p>Status: <b>{r.status}</b></p>

          {r.status === 'pending' && (
            <>
              <label>Select Appointment Date & Time</label>
              <input
                type="datetime-local"
                value={dateTime[r.id] || ''}
                onChange={e =>
                  setDateTime({ ...dateTime, [r.id]: e.target.value })
                }
                style={styles.input}
              />

              <button style={styles.primaryBtn} onClick={() => schedule(r.id)}>
                Schedule Appointment
              </button>
            </>
          )}

          {r.status === 'scheduled' && (
            <>
              <p>
                📅 Scheduled for:{' '}
                {new Date(r.appointment_at).toLocaleString()}
              </p>

              <p>
                📞 Pharmacist Phone:{' '}
                <b>{r.pharmacist_profiles?.phone || '—'}</b>
              </p>

              <p>
                📞 Store Phone:{' '}
                <b>{r.store_profiles?.phone || '—'}</b>
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    maxWidth: 800,
    margin: '0 auto',
  },
  card: {
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    background: 'white',
  },
  input: {
    display: 'block',
    marginTop: 8,
    marginBottom: 10,
    padding: 8,
    width: '100%',
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
