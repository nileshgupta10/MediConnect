// src/pages/api/insurance/create-agent.js
// Uses SERVICE_ROLE_KEY to create and list insurance agents — admin only
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'askmediclan@gmail.com'

// Helper: verify the request comes from the admin account
async function verifyAdmin(req) {
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const authHeader = req.headers.authorization
  if (!authHeader) return { error: 'No auth token', status: 401 }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token', status: 401 }
  if (user.email !== ADMIN_EMAIL) return { error: 'Not admin', status: 403 }
  return { user }
}

export default async function handler(req, res) {
  // GET — list all insurance agents (uses service role to bypass RLS)
  if (req.method === 'GET') {
    const auth = await verifyAdmin(req)
    if (auth.error) return res.status(auth.status).json({ error: auth.error })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data, error } = await supabaseAdmin
      .from('insurance_agents')
      .select('user_id, name, phone, email, is_active, created_at')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[create-agent] Failed to list insurance_agents:', error.message)
      return res.status(500).json({ error: 'Failed to load agents: ' + error.message })
    }
    return res.status(200).json({ agents: data })
  }

  // POST — create a new agent
  if (req.method === 'POST') {
    const auth = await verifyAdmin(req)
    if (auth.error) return res.status(auth.status).json({ error: auth.error })

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
      console.error('[create-agent] Failed to create auth user:', createError?.message)
      return res.status(500).json({ error: 'Failed to create auth user: ' + (createError?.message || 'Unknown error') })
    }
    const newUserId = authData.user.id

    // Step 2: Insert into user_roles
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role: 'insurance_agent' })
    if (roleError) {
      console.error('[create-agent] Failed to insert user_roles:', roleError.message)
      return res.status(500).json({ error: 'Auth user created but failed to set user role: ' + roleError.message })
    }

    // Step 3: Insert into insurance_agents
    const { error: agentError } = await supabaseAdmin
      .from('insurance_agents')
      .insert({ user_id: newUserId, name: name.trim(), phone: phone.trim(), email: email.trim() })
    if (agentError) {
      console.error('[create-agent] Failed to insert insurance_agents:', agentError.message)
      return res.status(500).json({ error: 'Auth user created and role set, but failed to create agent profile: ' + agentError.message })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

