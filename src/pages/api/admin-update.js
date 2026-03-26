// src/pages/api/admin-update.js
// Uses SERVICE_ROLE_KEY to bypass RLS — only callable from admin panel
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'askmediclan@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify the caller is the admin
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth token' })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })
  if (user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Not admin' })

  // Now use service role to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { table, userId, updates } = req.body
  if (!table || !userId || !updates) return res.status(400).json({ error: 'Missing fields' })

  // Only allow these tables for safety
  if (!['store_profiles', 'pharmacist_profiles'].includes(table)) {
    return res.status(400).json({ error: 'Invalid table' })
  }

  const { error } = await supabaseAdmin
    .from(table)
    .update(updates)
    .eq('user_id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}