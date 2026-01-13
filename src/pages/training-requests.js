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

    const { data } = await supabase
      .from('training_requests')
      .select('*')
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
  };

  const schedule = async (id, slotId) => {
    if (!dateTime[id]) {
      alert('Select date and time');
      return;
    }

    await supabase
      .from('training_requests')
      .update({
        status: 'scheduled',
        appointment_at: dateTime[id],
      })
      .eq('id', id);

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

      {requests.map(r => (
        <div key={r.id} style={box}>
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
              <p>Scheduled at: {new Date(r.appointment_at).toLocaleString()}</p>
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
  padding: 15,
  marginBottom: 15,
};
