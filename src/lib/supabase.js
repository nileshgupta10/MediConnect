// src/lib/supabase.js

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// NEW HELPER FUNCTION: To check if a user is logged in
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};