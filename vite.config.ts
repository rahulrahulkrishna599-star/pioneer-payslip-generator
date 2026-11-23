import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';

function adminAuthApiPlugin(env: Record<string, string>): Plugin {
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://hzdcxfpohrcilvqkbobt.supabase.co';
  const supabaseSecretKey = env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || '';

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return {
    name: 'admin-auth-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/admin/')) {
          return next();
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          let payload: any = {};
          try {
            if (body) payload = JSON.parse(body);
          } catch {}

          res.setHeader('Content-Type', 'application/json');

          const cleanUrl = req.url?.split('?')[0];

          // 1. Create Team User (No email sent, no rate limit)
          if (cleanUrl === '/api/admin/create-user' && req.method === 'POST') {
            try {
              const { email, password, fullName, role } = payload;
              if (!email || !password || !fullName) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
              }

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
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: error.message }));
              }

              // Attempt profile table upsert
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

              res.statusCode = 200;
              return res.end(
                JSON.stringify({
                  success: true,
                  user: {
                    id: data.user.id,
                    email,
                    fullName,
                    role: role || 'operator',
                    isActive: true,
                    createdAt: data.user.created_at,
                  },
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          }

          // 2. List Team Users
          if (cleanUrl === '/api/admin/list-users' && req.method === 'GET') {
            try {
              const { data, error } = await supabaseAdmin.auth.admin.listUsers();
              if (error) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: error.message }));
              }

              const users = (data?.users || []).map((u) => {
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

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, users }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          }

          // 3. Reset User Password
          if (cleanUrl === '/api/admin/reset-password' && req.method === 'POST') {
            try {
              const { userId, newPassword } = payload;
              if (!userId || !newPassword) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Missing userId or newPassword' }));
              }

              const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: newPassword,
              });

              if (error) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: error.message }));
              }

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          }

          // 4. Toggle User Status (Active / Disabled)
          if (cleanUrl === '/api/admin/toggle-status' && req.method === 'POST') {
            try {
              const { userId, isActive } = payload;
              const banDuration = isActive ? 'none' : '876000h'; // 100 years ban if disabled

              const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                ban_duration: banDuration,
              });

              try {
                await supabaseAdmin.from('user_profiles').update({ is_active: isActive }).eq('id', userId);
              } catch {}

              if (error) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: error.message }));
              }

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          }

          // 5. Delete User Account
          if (cleanUrl === '/api/admin/delete-user' && req.method === 'POST') {
            try {
              const { userId } = payload;
              const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

              try {
                await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
              } catch {}

              if (error) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: error.message }));
              }

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          }

          next();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), adminAuthApiPlugin(env)],
    server: {
      port: 5173,
      strictPort: true,
      host: '127.0.0.1',
      open: false,
    },
  };
});
