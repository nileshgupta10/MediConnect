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

    // 1️⃣ Fetch requests
    const { data: reqs, error } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        appointment_at,
        pharmacist_id,
        store_owner_id,
        training_slots ( month, slot_number )
      `)
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      return;
    }

    // 2️⃣ Fetch pharmacist profiles
    const pharmacistIds = [...new Set(reqs.map(r => r.pharmacist_id))];

    const { data: pharmacists } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, phone')
      .in('user_id', pharmacistIds);

    const pharmacistMap = Object.fromEntries(
      (pharmacists || []).map(p => [p.user_id, p])
    );

    // 3️⃣ Merge
    setRequests(
      reqs.map(r => ({
        ...r,
        pharmacist: pharmacistMap[r.pharmacist_id],
      }))
    );
  };

  const scheduleMeeting = async (id) => {
    if (!dateTime[id]) {
      alert('Please select date & time');
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

      {requests.length === 0 && (
        <p style={{ color: '#475569' }}>No training requests yet.</p>
      )}

      {requests.map(r => (
        <div key={r.id} style={card}>
          <b>{r.pharmacist?.name || 'Pharmacist'}</b>
          <p style={muted}>📞 {r.pharmacist?.phone || '—'}</p>

          <p>
            Slot {r.training_slots?.month} — #
            {r.training_slots?.slot_number}
          </p>

          {r.appointment_at && (
            <p>📅 {formatTime(r.appointment_at)}</p>
          )}

          <span style={badge(r.status)}>{r.status}</span>

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

const card = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

const muted = { color: '#475569', fontSize: 14 };

const badge = (s) => ({
  display: 'inline-block',
  marginTop: 6,
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
  background:
    s === 'confirmed'
      ? '#dcfce7'
      : s === 'scheduled'
      ? '#dbeafe'
      : '#fef3c7',
});
