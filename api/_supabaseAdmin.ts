import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hzdcxfpohrcilvqkbobt.supabase.co';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
