// src/pages/api/vault/patients.js
// Manages vault_patients — create and list, scoped to the authenticated store.
// Uses getStoreOwnerId (same as khata routes) — store_id is ALWAYS set server-side.

import { getStoreOwnerId } from '../../../lib/khata-auth';
import { createClient } from '@supabase/supabase-js';

// Service-role client bypasses RLS — safe here because we manually
// enforce store_id == storeOwnerId in every query's WHERE / INSERT.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return; // getStoreOwnerId already sent 401

  // ── GET: list all patients for this store ──────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('vault_patients')
      .select('id, name, created_at')
      .eq('store_id', storeOwnerId)
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ patients: data });
  }

  // ── POST: create a new patient ─────────────────────────────────
  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Patient name is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('vault_patients')
      .insert({ name: name.trim(), store_id: storeOwnerId }) // store_id from server only
      .select('id, name, created_at')
      .single();

    if (error) {
      // unique_vault_patient_per_store constraint violation
      if (error.code === '23505') {
        // Look up the existing patient so the client can select them
        const { data: existing } = await supabaseAdmin
          .from('vault_patients')
          .select('id, name, created_at')
          .eq('store_id', storeOwnerId)
          .eq('name', name.trim())
          .single();
        return res.status(409).json({ error: 'duplicate', patient: existing });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ patient: data });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
