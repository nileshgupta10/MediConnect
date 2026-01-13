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

    // 1️⃣ Load requests
    const { data: reqs } = await supabase
      .from('training_requests')
      .select('*')
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      return;
    }

    // 2️⃣ Load slots
    const slotIds = [...new Set(reqs.map(r => r.slot_id).filter(Boolean))];

    const { data: slots } = await supabase
      .from('training_slots')
      .select('id, month, slot_number')
      .in('id', slotIds);

    const slotMap = Object.fromEntries(
      (slots || []).map(s => [s.id, s])
    );

    setRequests(
      reqs.map(r => ({
        ...r,
        slot: slotMap[r.slot_id],
      }))
    );
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
            Slot: <b>{r.slot?.month}</b> — Slot #{r.slot?.slot_number}
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
