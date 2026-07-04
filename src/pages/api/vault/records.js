// src/pages/api/vault/records.js
// Manages vault_prescription_records — list records and generate signed URLs.
// All access is scoped to the authenticated store via patient.store_id.

import { getStoreOwnerId } from '../../../lib/khata-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  // ── GET: list records for a patient, with short-lived signed URLs ──
  if (req.method === 'GET') {
    const { patient_id } = req.query;
    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id query param is required.' });
    }

    // Verify this patient belongs to the requesting store
    const { data: patient, error: patientErr } = await supabaseAdmin
      .from('vault_patients')
      .select('id')
      .eq('id', patient_id)
      .eq('store_id', storeOwnerId)
      .single();

    if (patientErr || !patient) {
      return res.status(403).json({ error: 'Patient not found or access denied.' });
    }

    // Fetch all records for this patient, newest-first
    const { data: records, error: recErr } = await supabaseAdmin
      .from('vault_prescription_records')
      .select('id, image_path, record_date, uploaded_at')
      .eq('patient_id', patient_id)
      .order('record_date', { ascending: false });

    if (recErr) return res.status(500).json({ error: recErr.message });
    if (!records || records.length === 0) {
      return res.status(200).json({ records: [] });
    }

    // Batch-generate signed URLs (300 seconds = 5 minutes)
    const paths = records.map(r => r.image_path);
    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from('prescription-vault')
      .createSignedUrls(paths, 300);

    if (signErr) return res.status(500).json({ error: signErr.message });

    // Map signed URL back onto each record
    const signedMap = {};
    (signed || []).forEach(s => { signedMap[s.path] = s.signedUrl; });

    const enriched = records.map(r => ({
      ...r,
      signedUrl: signedMap[r.image_path] || null,
    }));

    return res.status(200).json({ records: enriched });
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
