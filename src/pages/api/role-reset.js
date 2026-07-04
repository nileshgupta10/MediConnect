// src/pages/api/role-reset.js
// API route to reset the user's role:
//   1. Authenticates the caller via Supabase JWT
//   2. Uses SERVICE_ROLE_KEY to delete the user's entry in user_roles
//   3. Strictly touches ONLY user_roles table — no other data deleted

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth token' })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  // Use service role to bypass RLS and perform DELETE on user_roles
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', user.id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}
