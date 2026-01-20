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
        pharmacist_response,
        slot_id,
        training_slots ( month, slot_number )
      `)
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
  };

  const acceptMeeting = async (id) => {
    await supabase
      .from('training_requests')
      .update({
        status: 'confirmed',
        pharmacist_response: 'approved',
      })
      .eq('id', id);

    alert('Meeting confirmed');
    load();
  };

  const requestNewTime = async (id) => {
    await supabase
      .from('training_requests')
      .update({
        status: 'reschedule_requested',
        pharmacist_response: 'reschedule_requested',
      })
      .eq('id', id);

    alert('Requested new date/time');
    load();
  };

  const formatTime = (dt) =>
    new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    });

  const badge = (status) => {
    const map = {
      interested: { bg: '#fef3c7', text: 'Requested' },
      scheduled: { bg: '#dbeafe', text: 'Meeting Proposed' },
      confirmed: { bg: '#dcfce7', text: 'Confirmed' },
      reschedule_requested: { bg: '#ffedd5', text: 'Waiting for Store' },
    };
    return map[status] || {};
  };

  return (
    <>
      <h2>My Training</h2>

      {requests.length === 0 && <p>No training activity yet.</p>}

      {requests.map(r => {
        const b = badge(r.status);

        return (
          <div key={r.id} style={box}>
            <p>
              <b>
                Slot {r.training_slots?.month} — #{r.training_slots?.slot_number}
              </b>
            </p>

            <span style={{ ...statusBadge, background: b.bg }}>
              {b.text}
            </span>

            {/* Date/time ALWAYS visible once scheduled */}
            {r.appointment_at && (
              <p style={{ marginTop: 8 }}>
                📅 {formatTime(r.appointment_at)}
              </p>
            )}

            {r.status === 'scheduled' && (
              <>
                <button onClick={() => acceptMeeting(r.id)}>
                  Accept Meeting
                </button>{' '}
                <button onClick={() => requestNewTime(r.id)}>
                  Request New Time
                </button>
              </>
            )}

            {r.status === 'confirmed' && (
              <p style={{ color: '#15803d', marginTop: 6 }}>
                ✔ Meeting confirmed
              </p>
            )}

            {r.status === 'reschedule_requested' && (
              <p style={{ color: '#c2410c', marginTop: 6 }}>
                Waiting for store to respond
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

const box = {
  border: '1px solid #e5e7eb',
  padding: 16,
  marginBottom: 16,
  borderRadius: 8,
  background: '#ffffff',
};

const statusBadge = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  marginTop: 6,
};
