// @ts-ignore
declare const process: { env: Record<string, string | undefined> };
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hzdcxfpohrcilvqkbobt.supabase.co';
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { userId, isActive } = body;
    const banDuration = isActive ? 'none' : '876000h'; // 100 years if disabled

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: banDuration,
    });

    try {
      await supabaseAdmin.from('user_profiles').update({ is_active: isActive }).eq('id', userId);
    } catch {}

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
