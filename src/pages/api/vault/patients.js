// src/pages/api/vault/patients.js
// GET   — list non-deleted patients for this store
// POST  — create patient (store_id set server-side)
// PATCH — rename patient (checks deleted_at IS NULL for duplicate name)
// DELETE — soft-delete patient (sets deleted_at = now())

import { getStoreOwnerId } from '../../../lib/khata-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  // ── GET ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('vault_patients')
      .select('id, name, created_at')
      .eq('store_id', storeOwnerId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ patients: data });
  }

  // ── POST: create ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Patient name is required.' });

    const { data, error } = await supabaseAdmin
      .from('vault_patients')
      .insert({ name: name.trim(), store_id: storeOwnerId })
      .select('id, name, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Duplicate — return the existing non-deleted patient
        const { data: existing } = await supabaseAdmin
          .from('vault_patients')
          .select('id, name, created_at')
          .eq('store_id', storeOwnerId)
          .eq('name', name.trim())
          .is('deleted_at', null)
          .single();
        return res.status(409).json({ error: 'duplicate', patient: existing });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ patient: data });
  }

  // ── PATCH: rename ─────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, name } = req.body;
    if (!id || !name?.trim()) return res.status(400).json({ error: 'id and name are required.' });

    // Verify patient belongs to store and is not deleted
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('vault_patients')
      .select('id')
      .eq('id', id)
      .eq('store_id', storeOwnerId)
      .is('deleted_at', null)
      .single();
    if (findErr || !existing) return res.status(403).json({ error: 'Patient not found or access denied.' });

    // Check for name conflict (only among non-deleted patients in this store)
    const { data: conflict } = await supabaseAdmin
      .from('vault_patients')
      .select('id')
      .eq('store_id', storeOwnerId)
      .eq('name', name.trim())
      .is('deleted_at', null)
      .neq('id', id)
      .maybeSingle();
    if (conflict) return res.status(409).json({ error: `"${name.trim()}" already exists.` });

    const { data, error } = await supabaseAdmin
      .from('vault_patients')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('store_id', storeOwnerId)
      .select('id, name, created_at')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ patient: data });
  }

  // ── DELETE: soft-delete ───────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required.' });

    // Verify ownership
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('vault_patients')
      .select('id')
      .eq('id', id)
      .eq('store_id', storeOwnerId)
      .is('deleted_at', null)
      .single();
    if (findErr || !existing) return res.status(403).json({ error: 'Patient not found or access denied.' });

    // Soft-delete: set deleted_at — records stay in DB (recoverable)
    // Their records are also effectively hidden via RLS SELECT policy
    const { error } = await supabaseAdmin
      .from('vault_patients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeOwnerId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
