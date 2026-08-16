import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
  try {
    const { data, error } = await supabase.from('exams').select('*').limit(1);
    if (data && data.length > 0) {
      console.log('Exams columns:', Object.keys(data[0]));
    } else {
      console.log('No exams found or blocked by RLS');
    }
  } catch (err) {
    console.error(err);
  }
}
checkSchema();
