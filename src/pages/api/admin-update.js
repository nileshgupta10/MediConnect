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

  // Detect a pure "Save Remark" action: pharmacist_profiles, has a remark, but NOT an Approve/Reject
  const isPureRemarkSave =
    table === 'pharmacist_profiles' &&
    typeof updates.verification_remark === 'string' &&
    updates.verification_remark.trim() !== '' &&
    !('verification_status' in updates)

  // Flip remark_seen to false in the same update so the badge appears immediately
  if (isPureRemarkSave) {
    updates.remark_seen = false
  }

  const { error } = await supabaseAdmin
    .from(table)
    .update(updates)
    .eq('user_id', userId)

  if (error) return res.status(500).json({ error: error.message })

  // After a successful pure remark save, email the pharmacist via Resend
  if (isPureRemarkSave) {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const pharmacistEmail = userData?.user?.email
      if (pharmacistEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `MediClan <${process.env.RESEND_SENDER_EMAIL}>`,
            to: [pharmacistEmail],
            subject: 'New note on your MediClan profile',
            html: `<p>Hi,</p><p>MediClan left a note on your pharmacist profile:</p><blockquote>${updates.verification_remark}</blockquote><p>Please log in to MediClan and open your Profile page to respond.</p>`,
          }),
        })
      }
    } catch (emailErr) {
      console.error('[admin-update] Resend email failed (non-fatal):', emailErr)
    }
  }

  return res.status(200).json({ success: true })
}