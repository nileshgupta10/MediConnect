// src/pages/api/insurance/create-agent.js
// Uses SERVICE_ROLE_KEY to create an insurance agent login and profile — admin only
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'askmediclan@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify the caller is the admin (same pattern as admin-update.js)
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

  // Validate request body
  const { name, phone, email, password } = req.body
  if (!name?.trim() || !phone?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'All fields (name, phone, email, password) are required.' })
  }

  // Service role client to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Step 1: Create the auth user
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true,
  })
  if (createError || !authData?.user) {
    return res.status(500).json({ error: 'Failed to create auth user: ' + (createError?.message || 'Unknown error') })
  }
  const newUserId = authData.user.id

  // Step 2: Insert into user_roles
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({ user_id: newUserId, role: 'insurance_agent' })
  if (roleError) {
    return res.status(500).json({ error: 'Auth user created but failed to set user role: ' + roleError.message })
  }

  // Step 3: Insert into insurance_agents
  const { error: agentError } = await supabaseAdmin
    .from('insurance_agents')
    .insert({ user_id: newUserId, name: name.trim(), phone: phone.trim(), email: email.trim() })
  if (agentError) {
    return res.status(500).json({ error: 'Auth user created and role set, but failed to create agent profile: ' + agentError.message })
  }

  return res.status(200).json({ success: true })
}
