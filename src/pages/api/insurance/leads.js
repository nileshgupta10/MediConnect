// src/pages/api/insurance/leads.js
// GET  — list all insurance_leads for this store, with their updates timeline
// POST — create a new insurance lead for this store
import { getStoreOwnerId } from '../../../lib/khata-auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res)
  if (!storeOwnerId) return

  // ── GET ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: leads, error: leadsErr } = await supabaseAdmin
      .from('insurance_leads')
      .select('id, customer_name, customer_phone, customer_age, status, created_at, updated_at, assigned_agent_id')
      .eq('store_owner_id', storeOwnerId)
      .order('created_at', { ascending: false })

    if (leadsErr) {
      console.error('[leads] GET insurance_leads error:', leadsErr.message)
      return res.status(500).json({ error: leadsErr.message })
    }

    // Fetch updates for all leads in one query, then attach
    if (leads && leads.length > 0) {
      const leadIds = leads.map(l => l.id)
      const { data: updates, error: updatesErr } = await supabaseAdmin
        .from('insurance_lead_updates')
        .select('id, lead_id, status, note, amount, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: true })

      if (updatesErr) {
        console.error('[leads] GET insurance_lead_updates error:', updatesErr.message)
        // Non-fatal — return leads without updates rather than error
      }

      const updatesByLead = {}
      ;(updates || []).forEach(u => {
        if (!updatesByLead[u.lead_id]) updatesByLead[u.lead_id] = []
        updatesByLead[u.lead_id].push(u)
      })

      const leadsWithUpdates = leads.map(l => ({
        ...l,
        updates: updatesByLead[l.id] || [],
      }))
      return res.status(200).json({ leads: leadsWithUpdates })
    }

    return res.status(200).json({ leads: [] })
  }

  // ── POST ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { customer_name, customer_phone, customer_age } = req.body
    if (!customer_name?.trim() || !customer_phone?.trim()) {
      return res.status(400).json({ error: 'Customer name and phone are required.' })
    }

    const insertRow = {
      store_owner_id: storeOwnerId,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      status: 'new',
    }
    if (customer_age !== undefined && customer_age !== null && String(customer_age).trim() !== '') {
      insertRow.customer_age = parseInt(customer_age, 10)
    }

    const { data, error } = await supabaseAdmin
      .from('insurance_leads')
      .insert(insertRow)
      .select('id, customer_name, customer_phone, customer_age, status, created_at, updated_at')
      .single()

    if (error) {
      console.error('[leads] POST insurance_leads error:', error.message)
      return res.status(500).json({ error: error.message })
    }
    return res.status(201).json({ success: true, lead: { ...data, updates: [] } })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
