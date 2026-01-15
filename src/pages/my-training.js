import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MyTraining() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('training_requests')
      .select(`
        *,
        training_slots ( month, slot_number ),
        store_profiles ( phone ),
        pharmacist_profiles ( phone )
      `)
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
  };

  const acceptMeeting = async (id) => {
    await supabase
      .from('training_requests')
      .update({ status: 'confirmed' })
      .eq('id', id);

    alert('Meeting accepted');
    load();
  };

  const requestNewTime = async (id) => {
    await supabase
      .from('training_requests')
      .update({ status: 'reschedule_requested' })
      .eq('id', id);

    alert('Requested new time');
    load();
  };

  const formatTime = (dt) =>
    new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    });

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
                📅 {formatTime(r.appointment_at)}
              </p>

              <button onClick={() => acceptMeeting(r.id)}>
                Accept Meeting
              </button>{' '}
              <button onClick={() => requestNewTime(r.id)}>
                Request New Time
              </button>

              <p style={{ marginTop: 8 }}>
                📞 Store: {r.store_profiles?.phone}<br />
                📞 You: {r.pharmacist_profiles?.phone}
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
              🔁 You requested a new time
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
