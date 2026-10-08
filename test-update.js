const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('question_bank').update({ nonexistent_column: 'test' }).eq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Update Error:', error);
}
test();
