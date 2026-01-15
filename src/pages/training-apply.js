import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrainingApply() {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from('training_slots')
      .select('*')
      .eq('status', 'open');

    setSlots(data || []);
  };

  const acceptSlot = async (slot) => {
    const { data: auth } = await supabase.auth.getUser();

    await supabase.from('training_requests').insert({
      pharmacist_id: auth.user.id,
      store_owner_id: slot.store_owner_id,
      slot_id: slot.id,
      status: 'interested',
    });

    alert('Slot accepted. Store will schedule.');
  };

  return (
    <>
      <h2>Available Training Slots</h2>

      {slots.map(s => (
        <div key={s.id} style={box}>
          {s.month} — Slot #{s.slot_number}
          <br />
          <button onClick={() => acceptSlot(s)}>Accept Slot</button>
        </div>
      ))}
    </>
  );
}

const box = { border: '1px solid #ccc', padding: 12, marginBottom: 12 };
