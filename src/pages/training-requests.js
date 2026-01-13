import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrainingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: reqs } = await supabase
      .from('training_requests')
      .select('*')
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const pharmacistIds = [...new Set(reqs.map(r => r.pharmacist_id))];

    const { data: pharmacists } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, years_experience, software_experience')
      .in('user_id', pharmacistIds);

    const map = Object.fromEntries(
      (pharmacists || []).map(p => [p.user_id, p])
    );

    setRequests(
      reqs.map(r => ({
        ...r,
        pharmacist: map[r.pharmacist_id],
      }))
    );

    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await supabase
      .from('training_requests')
      .update({ status })
      .eq('id', id);

    load();
  };

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h2>Training Requests</h2>

      {requests.length === 0 && <p>No requests received.</p>}

      {requests.map(r => (
        <div key={r.id} style={box}>
          <b>{r.pharmacist?.name}</b>
          <p>Experience: {r.pharmacist?.years_experience} years</p>
          <p>Software: {r.pharmacist?.software_experience}</p>
          <p>Status: <b>{r.status}</b></p>

          {r.status === 'pending' && (
            <>
              <button onClick={() => updateStatus(r.id, 'approved')}>
                Approve
              </button>{' '}
              <button onClick={() => updateStatus(r.id, 'rejected')}>
                Reject
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
