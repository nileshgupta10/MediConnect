import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrainingRequests() {
  const [requests, setRequests] = useState([]);
  const [dateTime, setDateTime] = useState({});

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
        slot_id,
        training_slots (
          id,
          month,
          slot_number,
          status
        )
      `)
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setRequests(data || []);
  };

  const schedule = async (reqId, slotId) => {
    if (!dateTime[reqId]) {
      alert('Select date & time');
      return;
    }

    await supabase
      .from('training_requests')
      .update({
        status: 'scheduled',
        appointment_at: dateTime[reqId],
      })
      .eq('id', reqId);

    await supabase
      .from('training_slots')
      .update({ status: 'scheduled' })
      .eq('id', slotId);

    load();
  };

  const closeSlot = async (slotId) => {
    await supabase
      .from('training_slots')
      .update({ status: 'closed' })
      .eq('id', slotId);

    alert('Slot closed');
    load();
  };

  return (
    <>
      <h2>Training Requests</h2>

      {requests.length === 0 && <p>No requests.</p>}

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

          {r.status === 'pending' && (
            <>
              <input
                type="datetime-local"
                onChange={e =>
                  setDateTime({ ...dateTime, [r.id]: e.target.value })
                }
              />
              <br />
              <button onClick={() => schedule(r.id, r.slot_id)}>
                Schedule
              </button>
            </>
          )}

          {r.status === 'scheduled' && (
            <>
              <p>
                Scheduled at:{' '}
                {new Date(r.appointment_at).toLocaleString()}
              </p>
              <button onClick={() => closeSlot(r.slot_id)}>
                Close Slot
              </button>
            </>
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
