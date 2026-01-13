import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrainingApply() {
  const [slots, setSlots] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    setUser(auth.user);

    const { data } = await supabase
      .from('training_slots')
      .select('*')
      .eq('status', 'available')
      .order('created_at');

    setSlots(data || []);
  };

  const apply = async (slotId, storeOwnerId) => {
    await supabase.from('training_requests').insert({
      pharmacist_id: user.id,
      store_owner_id: storeOwnerId,
      status: 'pending',
      slot_id: slotId,
    });

    await supabase
      .from('training_slots')
      .update({ status: 'requested' })
      .eq('id', slotId);

    alert('Applied for slot');
    load();
  };

  return (
    <>
      <h2>Available Training Slots</h2>

      {slots.length === 0 && <p>No slots available.</p>}

      {slots.map(s => (
        <div key={s.id} style={box}>
          <b>{s.month}</b> — Slot {s.slot_number}
          <br />
          <button onClick={() => apply(s.id, s.store_owner_id)}>
            Apply
          </button>
        </div>
      ))}
    </>
  );
}

const box = {
  border: '1px solid #ccc',
  padding: 12,
  marginBottom: 10,
};
