// src/pages/api/vault/records.js
// GET   — list non-deleted records for a patient, with signed URLs (900s TTL)
// PATCH — edit notes on a record
// DELETE — soft-delete a record (sets deleted_at = now(); image kept in storage)

import { getStoreOwnerId } from '../../../lib/khata-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyPatientOwnership(patientId, storeOwnerId) {
  const { data, error } = await supabaseAdmin
    .from('vault_patients')
    .select('id')
    .eq('id', patientId)
    .eq('store_id', storeOwnerId)
    .is('deleted_at', null)
    .single();
  return !error && !!data;
}

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  // ── GET ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required.' });

    const owned = await verifyPatientOwnership(patient_id, storeOwnerId);
    if (!owned) return res.status(403).json({ error: 'Patient not found or access denied.' });

    const { data: records, error: recErr } = await supabaseAdmin
      .from('vault_prescription_records')
      .select('id, image_path, record_date, uploaded_at, notes')
      .eq('patient_id', patient_id)
      .is('deleted_at', null)
      .order('record_date', { ascending: false });

    if (recErr) return res.status(500).json({ error: recErr.message });
    if (!records?.length) return res.status(200).json({ records: [] });

    // Batch signed URLs (900s = 15 min) for records that have an image
    const paths = records.filter(r => r.image_path).map(r => r.image_path);
    let signedMap = {};

    if (paths.length > 0) {
      const { data: signed, error: signErr } = await supabaseAdmin
        .storage
        .from('prescription-vault')
        .createSignedUrls(paths, 900);

      if (signErr) return res.status(500).json({ error: signErr.message });
      (signed || []).forEach(s => { signedMap[s.path] = s.signedUrl; });
    }

    const enriched = records.map(r => ({
      ...r,
      signedUrl: r.image_path ? (signedMap[r.image_path] || null) : null,
    }));

    return res.status(200).json({ records: enriched });
  }

  // ── PATCH: edit notes ─────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, patient_id, notes } = req.body;
    if (!id || !patient_id) return res.status(400).json({ error: 'id and patient_id are required.' });

    const owned = await verifyPatientOwnership(patient_id, storeOwnerId);
    if (!owned) return res.status(403).json({ error: 'Patient not found or access denied.' });

    const { data, error } = await supabaseAdmin
      .from('vault_prescription_records')
      .update({ notes: notes ?? null })
      .eq('id', id)
      .eq('patient_id', patient_id)
      .is('deleted_at', null)
      .select('id, image_path, record_date, uploaded_at, notes')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Return with fresh signed URL if image exists
    let signedUrl = null;
    if (data.image_path) {
      const { data: signed } = await supabaseAdmin
        .storage.from('prescription-vault')
        .createSignedUrls([data.image_path], 900);
      signedUrl = signed?.[0]?.signedUrl || null;
    }

    return res.status(200).json({ record: { ...data, signedUrl } });
  }

  // ── DELETE: soft-delete ───────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id, patient_id } = req.query;
    if (!id || !patient_id) return res.status(400).json({ error: 'id and patient_id are required.' });

    const owned = await verifyPatientOwnership(patient_id, storeOwnerId);
    if (!owned) return res.status(403).json({ error: 'Patient not found or access denied.' });

    // Soft-delete — image stays in storage (recoverable)
    const { error } = await supabaseAdmin
      .from('vault_prescription_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('patient_id', patient_id)
      .is('deleted_at', null);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
