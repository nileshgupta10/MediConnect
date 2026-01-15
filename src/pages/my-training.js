import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MyTraining() {
  const [requests, setRequests] = useState([]);

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
        slot_id,
        training_slots (
          id,
          month,
          slot_number
        )
      `)
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
  };

  const respond = async (req, response) => {
    await supabase
      .from('training_requests')
      .update({
        pharmacist_response: response,
        status: response === 'approved' ? 'confirmed' : 'postponed',
      })
      .eq('id', req.id);

    if (response === 'approved') {
      await supabase
        .from('training_slots')
        .update({ status: 'confirmed' })
        .eq('id', req.slot_id);
    }

    if (response === 'postponed') {
      await supabase
        .from('training_slots')
        .update({ status: 'available' })
        .eq('id', req.slot_id);
    }

    alert('Response saved');
    load();
  };

  return (
    <>
      <h2>My Training</h2>

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

          {r.status === 'scheduled' && (
            <>
              <p>
                Meeting at:{' '}
                {new Date(r.appointment_at).toLocaleString()}
              </p>

              <button onClick={() => respond(r, 'approved')}>
                Approve
              </button>{' '}
              <button onClick={() => respond(r, 'postponed')}>
                Postpone
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
