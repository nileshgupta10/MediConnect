import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MyTraining() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    // 1️⃣ Training requests
    const { data: reqs } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        appointment_at,
        store_owner_id,
        slot_id,
        training_slots ( month, slot_number )
      `)
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      return;
    }

    // 2️⃣ Store profiles
    const storeIds = [...new Set(reqs.map(r => r.store_owner_id))];

    const { data: stores } = await supabase
      .from('store_profiles')
      .select('user_id, store_name, store_timings')
      .in('user_id', storeIds);

    const storeMap = Object.fromEntries(
      (stores || []).map(s => [s.user_id, s])
    );

    // 3️⃣ Merge
    const merged = reqs.map(r => ({
      ...r,
      store: storeMap[r.store_owner_id],
    }));

    setRequests(merged);
  };

  const acceptMeeting = async (id) => {
    await supabase
      .from('training_requests')
      .update({ status: 'confirmed' })
      .eq('id', id);

    alert('Meeting confirmed');
    load();
  };

  const requestNewTime = async (id) => {
    await supabase
      .from('training_requests')
      .update({ status: 'reschedule_requested' })
      .eq('id', id);

    alert('Requested new date/time');
    load();
  };

  const formatTime = (dt) =>
    new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    });

  const mapLink = (name) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

  return (
    <>
      <h2>My Training</h2>

      {requests.length === 0 && <p>No training activity yet.</p>}

      {requests.map(r => (
        <div key={r.id} style={box}>
          <p>
            🏪 <b>{r.store?.store_name || 'Store'}</b>
          </p>

          <p>
            📍 <a href={mapLink(r.store?.store_name)} target="_blank">
              View on Google Maps
            </a>
          </p>

          <p>
            📦 Slot {r.training_slots?.month} — #{r.training_slots?.slot_number}
          </p>

          {r.appointment_at && (
            <p>📅 {formatTime(r.appointment_at)}</p>
          )}

          <p>Status: <b>{r.status}</b></p>

          {r.status === 'scheduled' && (
            <>
              <button onClick={() => acceptMeeting(r.id)}>
                Accept Meeting
              </button>{' '}
              <button onClick={() => requestNewTime(r.id)}>
                Request New Time
              </button>
            </>
          )}

          {r.status === 'confirmed' && (
            <p style={{ color: 'green' }}>✔ Meeting confirmed</p>
          )}

          {r.status === 'reschedule_requested' && (
            <p style={{ color: 'orange' }}>
              Waiting for store to respond
            </p>
          )}
        </div>
      ))}
    </>
  );
}

const box = {
  border: '1px solid #e5e7eb',
  padding: 16,
  marginBottom: 16,
  borderRadius: 8,
};
