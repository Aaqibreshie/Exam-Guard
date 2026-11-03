import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkEverything() {
  const { count: sCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true });
  const { count: aCount } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  const { count: cCount } = await supabase.from('cheat_logs').select('*', { count: 'exact', head: true });
  const { count: pCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  console.log(`Submissions: ${sCount}`);
  console.log(`Answers: ${aCount}`);
  console.log(`Cheat Logs: ${cCount}`);
  console.log(`Profiles: ${pCount}`);
}

checkEverything();
