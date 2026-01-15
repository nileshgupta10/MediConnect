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
      .select(`
        id,
        status,
        appointment_at,
        pharmacist_id,
        pharmacist_response,
        training_slots ( month, slot_number )
      `)
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
  };

  const scheduleMeeting = async (req) => {
    if (!dateTime[req.id]) {
      alert('Select date & time');
      return;
    }

    await supabase
      .from('training_requests')
      .update({
        status: 'scheduled',
        appointment_at: dateTime[req.id],
      })
      .eq('id', req.id);

    alert('Meeting scheduled');
    load();
  };

  return (
    <>
      <h2>Training Requests</h2>

      {requests.length === 0 && <p>No training requests.</p>}

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

          {r.status === 'interested' && (
            <>
              <input
                type="datetime-local"
                onChange={e =>
                  setDateTime({ ...dateTime, [r.id]: e.target.value })
                }
              />
              <br />
              <button onClick={() => scheduleMeeting(r)}>
                Schedule Meeting
              </button>
            </>
          )}

          {r.status === 'scheduled' && (
            <p>📅 Meeting proposed</p>
          )}

          {r.status === 'confirmed' && (
            <p style={{ color: 'green' }}>✅ Confirmed</p>
          )}

          {r.status === 'reschedule_requested' && (
            <p style={{ color: 'orange' }}>
              🔁 Pharmacist requested new time
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
