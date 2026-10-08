const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('answers')
    .select('is_correct, questions(question_text)')
    .limit(5);
  console.log(JSON.stringify(data, null, 2), error);
}
test();
