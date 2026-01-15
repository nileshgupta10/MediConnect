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
        training_slots ( month, slot_number )
      `)
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setRequests(data || []);
  };

  const scheduleMeeting = async (reqId) => {
    const selected = dateTime[reqId];

    if (!selected) {
      alert('Please select date and time');
      return;
    }

    const { error } = await supabase
      .from('training_requests')
      .update({
        status: 'scheduled',
        appointment_at: selected,
      })
      .eq('id', reqId);

    if (error) {
      alert('Scheduling failed: ' + error.message);
      return;
    }

    alert('Meeting scheduled');
    setDateTime({});
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
                value={dateTime[r.id] || ''}
                onChange={e =>
                  setDateTime({
                    ...dateTime,
                    [r.id]: e.target.value,
                  })
                }
              />
              <br />
              <button onClick={() => scheduleMeeting(r.id)}>
                Schedule Meeting
              </button>
            </>
          )}

          {r.status === 'scheduled' && (
            <p style={{ color: 'green' }}>
              📅 Meeting scheduled
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
