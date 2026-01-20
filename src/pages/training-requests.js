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
        pharmacist_response,
        training_slots ( month, slot_number )
      `)
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
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

  const badge = (status) => {
    const map = {
      interested: { bg: '#fef3c7', text: 'Interested' },
      scheduled: { bg: '#dbeafe', text: 'Scheduled' },
      confirmed: { bg: '#dcfce7', text: 'Confirmed' },
      reschedule_requested: { bg: '#ffedd5', text: 'Reschedule Requested' },
    };
    return map[status] || {};
  };

  return (
    <>
      <h2>Training Requests</h2>

      {requests.length === 0 && <p>No training requests.</p>}

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

            {/* Date/time NEVER disappears */}
            {r.appointment_at && (
              <p style={{ marginTop: 8 }}>
                📅 {formatTime(r.appointment_at)}
              </p>
            )}

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

            {r.status === 'scheduled' && (
              <p style={{ color: '#2563eb', marginTop: 6 }}>
                Waiting for pharmacist response
              </p>
            )}

            {r.status === 'confirmed' && (
              <p style={{ color: '#15803d', marginTop: 6 }}>
                ✔ Pharmacist confirmed. Expect visit.
              </p>
            )}

            {r.status === 'reschedule_requested' && (
              <p style={{ color: '#c2410c', marginTop: 6 }}>
                Pharmacist requested new date/time
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
