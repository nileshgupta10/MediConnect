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

    // 1️⃣ Get training requests
    let query = supabase
      .from('training_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('store_id', user.id);
    }

    const { data: reqs, error } = await query;
    if (error) {
      alert(error.message);
      return;
    }

    // 2️⃣ Collect IDs
    const pharmacistIds = [...new Set(reqs.map(r => r.pharmacist_id))];
    const storeIds = [...new Set(reqs.map(r => r.store_id))];

    // 3️⃣ Fetch profiles
    const { data: pharmacists } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, phone')
      .in('user_id', pharmacistIds);

    const { data: stores } = await supabase
      .from('store_profiles')
      .select('user_id, store_name, phone')
      .in('user_id', storeIds);

    // 4️⃣ Map for fast lookup
    const pharmacistMap = Object.fromEntries(
      (pharmacists || []).map(p => [p.user_id, p])
    );

    const storeMap = Object.fromEntries(
      (stores || []).map(s => [s.user_id, s])
    );

    // 5️⃣ Merge data
    const enriched = reqs.map(r => ({
      ...r,
      pharmacist: pharmacistMap[r.pharmacist_id],
      store: storeMap[r.store_id],
    }));

    setRequests(enriched);
    setLoading(false);
  };

  const schedule = async (id) => {
    if (!dateTime[id]) {
      alert('Select date & time');
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

      {requests.length === 0 && <p>No requests yet.</p>}

      {requests.map(r => (
        <div key={r.id} style={styles.card}>
          <h3>👨‍⚕️ {r.pharmacist?.name || 'Pharmacist'}</h3>
          <p>🏪 {r.store?.store_name}</p>
          <p>Status: <b>{r.status}</b></p>

          {r.status === 'pending' && (
            <>
              <input
                type="datetime-local"
                value={dateTime[r.id] || ''}
                onChange={e =>
                  setDateTime({ ...dateTime, [r.id]: e.target.value })
                }
              />
              <br />
              <button onClick={() => schedule(r.id)}>
                Schedule Appointment
              </button>
            </>
          )}

          {r.status === 'scheduled' && (
            <>
              <p>📅 {new Date(r.appointment_at).toLocaleString()}</p>
              <p>📞 Pharmacist: {r.pharmacist?.phone}</p>
              <p>📞 Store: {r.store?.phone}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    background: 'white',
  },
};
