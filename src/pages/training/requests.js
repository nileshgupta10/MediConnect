import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TrainingRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('training_requests')
        .select('*')
        .eq('pharmacist_id', user.id);

      setRequests(data || []);
    };
    load();
  }, []);

  const updateStatus = async (id, status) => {
    await supabase
      .from('training_requests')
      .update({ status })
      .eq('id', id);
    location.reload();
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>My Training Requests</h1>

      {requests.map((r) => (
        <div key={r.id} style={styles.card}>
          <p>Status: <b>{r.status}</b></p>
          <p>Appointment: {r.appointment_date || 'Not scheduled yet'}</p>

          {r.status === 'scheduled' && (
            <>
              <button onClick={() => updateStatus(r.id, 'accepted')}>
                Accept
              </button>{' '}
              <button onClick={() => updateStatus(r.id, 'postpone_requested')}>
                Request Postpone
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
  },
};
