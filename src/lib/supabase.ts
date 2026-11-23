import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hzdcxfpohrcilvqkbobt.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZGN4ZnBvaHJjaWx2cWtib2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNDYxOTYsImV4cCI6MjExMDkyMjE5Nn0.qEguqy-eHU-dn869y2eqLOCDdlQ2w7NazbVC7bw0wek';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
