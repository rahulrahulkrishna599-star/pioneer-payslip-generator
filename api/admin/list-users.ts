import { supabaseAdmin } from '../_supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const users = (data?.users || []).map((u: any) => {
      const isBanned = Boolean(u.banned_until && new Date(u.banned_until) > new Date());
      return {
        id: u.id,
        email: u.email,
        fullName: u.user_metadata?.full_name || (u.email === 'admin@pioneercorp.in' ? 'Pioneer HR Administrator' : u.email?.split('@')[0] || 'HR Member'),
        role: u.user_metadata?.role || (u.email === 'admin@pioneercorp.in' ? 'admin' : 'operator'),
        isActive: !isBanned,
        createdAt: u.created_at,
      };
    });

    return res.status(200).json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
