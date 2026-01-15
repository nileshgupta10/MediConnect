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

    const { data } = await supabase
      .from('training_requests')
      .select(`
        *,
        training_slots ( month, slot_number )
      `)
      .eq('store_owner_id', auth.user.id);

    setRequests(data || []);
  };

  const schedule = async (r) => {
    await supabase
      .from('training_requests')
      .update({
        status: 'scheduled',
        appointment_at: dateTime[r.id],
      })
      .eq('id', r.id);

    alert('Meeting scheduled');
    load();
  };

  return (
    <>
      <h2>Training Requests</h2>

      {requests.map(r => (
        <div key={r.id} style={box}>
          Slot: {r.training_slots?.month} — #{r.training_slots?.slot_number}
          <p>Status: <b>{r.status}</b></p>

          {r.status === 'interested' && (
            <>
              <input
                type="datetime-local"
                onChange={e => setDateTime({ ...dateTime, [r.id]: e.target.value })}
              />
              <button onClick={() => schedule(r)}>Schedule</button>
            </>
          )}
        </div>
      ))}
    </>
  );
}

const box = { border: '1px solid #ccc', padding: 12, marginBottom: 12 };
