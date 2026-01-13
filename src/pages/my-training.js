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

    const { data: reqs } = await supabase
      .from('training_requests')
      .select('*')
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    setRequests(reqs || []);
  };

  const respond = async (id, response) => {
    await supabase
      .from('training_requests')
      .update({
        pharmacist_response: response,
        status: response === 'approved' ? 'confirmed' : 'postponed',
      })
      .eq('id', id);

    alert('Response saved');
    load();
  };

  return (
    <>
      <h2>My Training Requests</h2>

      {requests.length === 0 && <p>No requests.</p>}

      {requests.map(r => (
        <div key={r.id} style={box}>
          <p>Status: <b>{r.status}</b></p>

          {r.status === 'scheduled' && (
            <>
              <p>
                Meeting at:{' '}
                {new Date(r.appointment_at).toLocaleString()}
              </p>

              <button onClick={() => respond(r.id, 'approved')}>
                Approve
              </button>{' '}
              <button onClick={() => respond(r.id, 'postponed')}>
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
