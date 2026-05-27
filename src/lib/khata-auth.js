// src/lib/khata-auth.js
import { createClient } from '@supabase/supabase-js';

export async function getStoreOwnerId(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization token provided' });
      return null;
    }
    
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired session token' });
      return null;
    }
    
    return user.id; // Return the Supabase User ID as the storeOwnerId
  } catch (err) {
    console.error("getStoreOwnerId error:", err);
    res.status(500).json({ error: 'Internal server authorization error' });
    return null;
  }
}
