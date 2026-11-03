import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkExpelled() {
  const { data: expelled, error } = await supabase
    .from('submissions')
    .select('id, student_id, status, warning_count, profiles(full_name)')
    .eq('status', 'expelled');

  if (error) {
    console.error("Error fetching:", error);
    return;
  }
  
  console.log(`Found ${expelled.length} expelled students.`);
  console.log(expelled);
}

checkExpelled();
