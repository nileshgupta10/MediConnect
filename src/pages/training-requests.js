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

    // 1️⃣ Requests
    const { data: reqs } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        appointment_at,
        pharmacist_id,
        training_slots ( month, slot_number )
      `)
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      return;
    }

    // 2️⃣ Pharmacist profiles
    const pharmacistIds = [...new Set(reqs.map(r => r.pharmacist_id))];

    const { data: pharmacists } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, phone')
      .in('user_id', pharmacistIds);

    const pharmacistMap = Object.fromEntries(
      (pharmacists || []).map(p => [p.user_id, p])
    );

    // 3️⃣ Merge
    const merged = reqs.map(r => ({
      ...r,
      pharmacist: pharmacistMap[r.pharmacist_id],
    }));

    setRequests(merged);
  };

  const scheduleMeeting = async (id) => {
    if (!dateTime[id]) {
      alert('Select date & time');
      return;
    }

    await supabase
      .from('training_requests')
      .update({
        status: 'scheduled',
        appointment_at: dateTime[id],
      })
      .eq('id', id);

    alert('Meeting scheduled');
    load();
  };

  const formatTime = (dt) =>
    new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    });

  return (
    <>
      <h2>Training Requests</h2>

      {requests.length === 0 && <p>No training requests.</p>}

      {requests.map(r => (
        <div key={r.id} style={box}>
          <p>
            👨‍⚕️ <b>{r.pharmacist?.name || 'Pharmacist'}</b>
          </p>

          <p>
            📞 {r.pharmacist?.phone || '—'}
          </p>

          <p>
            📦 Slot {r.training_slots?.month} — #{r.training_slots?.slot_number}
          </p>

          {r.appointment_at && (
            <p>📅 {formatTime(r.appointment_at)}</p>
          )}

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
              <button onClick={() => scheduleMeeting(r.id)}>
                Schedule Meeting
              </button>
            </>
          )}
        </div>
      ))}
    </>
  );
}

const box = {
  border: '1px solid #e5e7eb',
  padding: 16,
  marginBottom: 16,
  borderRadius: 8,
};
