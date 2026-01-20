import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MyTraining() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    // 1️⃣ Get training requests
    const { data: reqs, error } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        appointment_at,
        pharmacist_response,
        pharmacist_id,
        store_owner_id,
        slot_id,
        training_slots ( month, slot_number )
      `)
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // 2️⃣ Collect user IDs
    const storeIds = [...new Set(reqs.map(r => r.store_owner_id))];
    const pharmacistIds = [...new Set(reqs.map(r => r.pharmacist_id))];

    // 3️⃣ Fetch phone numbers separately
    const { data: stores } = await supabase
      .from('store_profiles')
      .select('user_id, phone')
      .in('user_id', storeIds);

    const { data: pharmacists } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, phone')
      .in('user_id', pharmacistIds);

    const storeMap = Object.fromEntries(
      (stores || []).map(s => [s.user_id, s.phone])
    );

    const pharmacistMap = Object.fromEntries(
      (pharmacists || []).map(p => [p.user_id, p.phone])
    );

    // 4️⃣ Merge everything
    const merged = reqs.map(r => ({
      ...r,
      store_phone: storeMap[r.store_owner_id],
      pharmacist_phone: pharmacistMap[r.pharmacist_id],
    }));

    setRequests(merged);
    setLoading(false);
  };

  const acceptMeeting = async (reqId) => {
    await supabase
      .from('training_requests')
      .update({
        status: 'confirmed',
        pharmacist_response: 'approved',
      })
      .eq('id', reqId);

    alert('Meeting accepted');
    load();
  };

  const requestNewTime = async (reqId) => {
    await supabase
      .from('training_requests')
      .update({
        status: 'reschedule_requested',
        pharmacist_response: 'reschedule_requested',
      })
      .eq('id', reqId);

    alert('Requested new date/time');
    load();
  };

  const formatTime = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    });
  };

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h2>My Training</h2>

      {requests.length === 0 && <p>No training activity yet.</p>}

      {requests.map(r => (
        <div key={r.id} style={box}>
          <p>
            Slot:{' '}
            <b>
              {r.training_slots?.month} — Slot #
              {r.training_slots?.slot_number}
            </b>
          </p>

          <p>Status: <b>{r.status}</b></p>

          {r.status === 'scheduled' && (
            <>
              <p>
                📅 Proposed meeting:{' '}
                <b>{formatTime(r.appointment_at)}</b>
              </p>

              <button onClick={() => acceptMeeting(r.id)}>
                Accept Meeting
              </button>{' '}
              <button onClick={() => requestNewTime(r.id)}>
                Request New Time
              </button>

              {/* 🔓 Phones visible ONLY now */}
              <p style={{ marginTop: 10 }}>
                📞 Store: {r.store_phone || '—'}<br />
                📞 You: {r.pharmacist_phone || '—'}
              </p>
            </>
          )}

          {r.status === 'confirmed' && (
            <p style={{ color: 'green' }}>
              ✅ Meeting confirmed
            </p>
          )}

          {r.status === 'reschedule_requested' && (
            <p style={{ color: 'orange' }}>
              🔁 Waiting for store to reschedule
            </p>
          )}
        </div>
      ))}
    </>
  );
}

const box = {
  border: '1px solid #ccc',
  padding: 14,
  marginBottom: 14,
};
