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

    const recordIds = records.map(r => r.id);

    const { data: dbImages, error: imgErr } = await supabaseAdmin
      .from('vault_record_images')
      .select('id, record_id, image_path, page_order')
      .in('record_id', recordIds)
      .order('page_order', { ascending: true });

    if (imgErr) return res.status(500).json({ error: imgErr.message });

    // Group dbImages by record_id
    const dbImagesByRecordId = {};
    (dbImages || []).forEach(img => {
      if (!dbImagesByRecordId[img.record_id]) {
        dbImagesByRecordId[img.record_id] = [];
      }
      dbImagesByRecordId[img.record_id].push(img);
    });

    // Collect all unique image paths to get signed URLs for
    const allPathsSet = new Set();
    records.forEach(r => {
      const imgs = dbImagesByRecordId[r.id];
      if (imgs && imgs.length > 0) {
        imgs.forEach(img => {
          if (img.image_path) allPathsSet.add(img.image_path);
        });
      } else if (r.image_path) {
        allPathsSet.add(r.image_path);
      }
    });

    const paths = Array.from(allPathsSet);
    let signedMap = {};

    if (paths.length > 0) {
      const { data: signed, error: signErr } = await supabaseAdmin
        .storage
        .from('prescription-vault')
        .createSignedUrls(paths, 900);

      if (signErr) return res.status(500).json({ error: signErr.message });
      (signed || []).forEach(s => {
        signedMap[s.path] = s.signedUrl;
      });
    }

    // Enrich records with images array and signedUrl
    const enriched = records.map(r => {
      const imgs = dbImagesByRecordId[r.id];
      let images = [];

      if (imgs && imgs.length > 0) {
        images = imgs.map(img => ({
          image_path: img.image_path,
          signedUrl: img.image_path ? (signedMap[img.image_path] || null) : null,
          page_order: img.page_order,
        }));
      } else if (r.image_path) {
        images = [{
          image_path: r.image_path,
          signedUrl: signedMap[r.image_path] || null,
          page_order: 0,
        }];
      }

      return {
        ...r,
        signedUrl: images.length > 0 ? images[0].signedUrl : null,
        images,
      };
    });

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

    const { data: dbImages, error: imgErr } = await supabaseAdmin
      .from('vault_record_images')
      .select('id, record_id, image_path, page_order')
      .eq('record_id', data.id)
      .order('page_order', { ascending: true });

    if (imgErr) return res.status(500).json({ error: imgErr.message });

    const allPathsSet = new Set();
    if (dbImages && dbImages.length > 0) {
      dbImages.forEach(img => {
        if (img.image_path) allPathsSet.add(img.image_path);
      });
    } else if (data.image_path) {
      allPathsSet.add(data.image_path);
    }

    const paths = Array.from(allPathsSet);
    let signedMap = {};

    if (paths.length > 0) {
      const { data: signed } = await supabaseAdmin
        .storage
        .from('prescription-vault')
        .createSignedUrls(paths, 900);
      (signed || []).forEach(s => {
        signedMap[s.path] = s.signedUrl;
      });
    }

    let images = [];
    if (dbImages && dbImages.length > 0) {
      images = dbImages.map(img => ({
        image_path: img.image_path,
        signedUrl: img.image_path ? (signedMap[img.image_path] || null) : null,
        page_order: img.page_order,
      }));
    } else if (data.image_path) {
      images = [{
        image_path: data.image_path,
        signedUrl: signedMap[data.image_path] || null,
        page_order: 0,
      }];
    }

    const returnedRecord = {
      ...data,
      signedUrl: images.length > 0 ? images[0].signedUrl : null,
      images,
    };

    return res.status(200).json({ record: returnedRecord });
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
