import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

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

    const isAdmin = user.email === ADMIN_EMAIL;

    let query = supabase
      .from('training_requests')
      .select(`
        id,
        appointment_at,
        status,
        pharmacist_id,
        store_id,
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

    // 🔒 STORE OWNER SEES ONLY THEIR REQUESTS
    if (!isAdmin) {
      query = query.eq('store_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
    } else {
      setRequests(data || []);
    }

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
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1>Training Requests</h1>

      {requests.length === 0 && (
        <p>No training requests yet.</p>
      )}

      {requests.map(r => (
        <div
          key={r.id}
          style={{
            border: '1px solid #ccc',
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
            background: 'white',
          }}
        >
          <h3>👨‍⚕️ {r.pharmacist_profiles?.name || 'Pharmacist'}</h3>
          <p>
            🏪 Store: <b>{r.store_profiles?.store_name}</b>
          </p>

          <p>Status: <b>{r.status}</b></p>

          {r.status === 'pending' && (
            <>
              <label>Schedule Appointment</label>
              <input
                type="datetime-local"
                value={dateTime[r.id] || ''}
                onChange={e =>
                  setDateTime({ ...dateTime, [r.id]: e.target.value })
                }
                style={{ display: 'block', marginBottom: 10 }}
              />

              <button onClick={() => schedule(r.id)}>
                Schedule
              </button>
            </>
          )}

          {r.status === 'scheduled' && (
            <>
              <p>
                📅 {new Date(r.appointment_at).toLocaleString()}
              </p>

              <p>
                📞 Pharmacist Phone:{' '}
                <b>{r.pharmacist_profiles?.phone}</b>
              </p>

              <p>
                📞 Store Phone:{' '}
                <b>{r.store_profiles?.phone}</b>
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
