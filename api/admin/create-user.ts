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
    const { email, password, fullName, role } = body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role || 'operator',
      },
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    try {
      await supabaseAdmin.from('user_profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: role || 'operator',
        is_active: true,
      });
    } catch (e) {
      console.warn('Profile table upsert note:', e);
    }

    return res.status(200).json({
      success: true,
      user: {
        id: data.user.id,
        email,
        fullName,
        role: role || 'operator',
        isActive: true,
        createdAt: data.user.created_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
