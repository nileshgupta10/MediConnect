import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrainingApply() {
  const [slots, setSlots] = useState([]);
  const [requestedSlots, setRequestedSlots] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    // all open slots
    const { data: slotsData } = await supabase
      .from('training_slots')
      .select('*')
      .eq('status', 'open');

    // slots already requested by this pharmacist
    const { data: reqs } = await supabase
      .from('training_requests')
      .select('slot_id')
      .eq('pharmacist_id', auth.user.id);

    setSlots(slotsData || []);
    setRequestedSlots((reqs || []).map(r => r.slot_id));
  };

  const acceptSlot = async (slot) => {
    const { data: auth } = await supabase.auth.getUser();

    if (requestedSlots.includes(slot.id)) {
      alert('You have already requested this slot.');
      return;
    }

    await supabase.from('training_requests').insert({
      pharmacist_id: auth.user.id,
      store_owner_id: slot.store_owner_id,
      slot_id: slot.id,
      status: 'interested',
    });

    alert('Slot requested');
    load();
  };

  return (
    <>
      <h2>Available Training Slots</h2>

      {slots.length === 0 && <p>No open slots.</p>}

      {slots.map(s => {
        const alreadyRequested = requestedSlots.includes(s.id);

        return (
          <div key={s.id} style={box}>
            <b>{s.month}</b> — Slot #{s.slot_number}
            <br />

            {!alreadyRequested && (
              <button onClick={() => acceptSlot(s)}>
                Request Slot
              </button>
            )}

            {alreadyRequested && (
              <p style={{ color: 'orange' }}>
                ⏳ Requested
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

const box = {
  border: '1px solid #ccc',
  padding: 12,
  marginBottom: 12,
};
