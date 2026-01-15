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
        pharmacist_profiles ( phone ),
        store_profiles ( phone )
      `)
      .eq('pharmacist_id', auth.user.id);

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

  return (
    <>
      <h2>My Training</h2>

      {requests.map(r => (
        <div key={r.id} style={box}>
          Slot: {r.training_slots?.month} — #{r.training_slots?.slot_number}
          <p>Status: <b>{r.status}</b></p>

          {r.status === 'scheduled' && (
            <>
              <p>{new Date(r.appointment_at).toLocaleString()}</p>
              <button onClick={() => acceptMeeting(r.id)}>Accept</button>
              <button onClick={() => requestNewTime(r.id)}>Request New Time</button>

              <p>
                📞 Store: {r.store_profiles?.phone} <br />
                📞 You: {r.pharmacist_profiles?.phone}
              </p>
            </>
          )}
        </div>
      ))}
    </>
  );
}

const box = { border: '1px solid #ccc', padding: 12, marginBottom: 12 };
