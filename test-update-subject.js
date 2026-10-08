const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// We must use the service role key to bypass RLS, OR auth with user credentials.
// But we don't have the password for reshieaaqib@gmail.com
