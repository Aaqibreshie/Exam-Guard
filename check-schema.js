const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Anon key might be limited by RLS
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's just update a question and see the full response
  const { data, error } = await supabase.from('question_bank').select('id, subject').limit(1);
  console.log('SELECT:', data, error);
}
run();
