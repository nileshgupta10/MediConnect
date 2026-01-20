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

    const { data, error } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        appointment_at,
        pharmacist_response,
        slot_id,
        training_slots (
          month,
          slot_number
        ),
        store_profiles (
          phone
        ),
        pharmacist_profiles (
          phone
        )
      `)
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setRequests(data || []);
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

          {/* 🔑 THIS IS THE CRITICAL PART */}
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

              {/* 🔓 Phone numbers unlocked ONLY now */}
              <p style={{ marginTop: 10 }}>
                📞 Store: {r.store_profiles?.phone || '—'}<br />
                📞 You: {r.pharmacist_profiles?.phone || '—'}
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
