import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { bill, items } = req.body;

    // 1. Save bill header
    const { data: billData, error: billError } = await supabase
      .from('inward_bills')
      .insert([bill])
      .select()
      .single();

    if (billError) return res.status(500).json({ error: billError.message });

    // 2. Attach bill id to each item
    const itemsWithBillId = items.map(item => ({
      ...item,
      inward_bill_id: billData.id,
    }));

    // 3. Save all items
    const { error: itemsError } = await supabase
      .from('inward_items')
      .insert(itemsWithBillId);

    if (itemsError) return res.status(500).json({ error: itemsError.message });

    return res.status(200).json({ success: true, billId: billData.id });
  }

  if (req.method === 'GET') {
    // Fetch bills list
    const { data, error } = await supabase
      .from('inward_bills')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ bills: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}