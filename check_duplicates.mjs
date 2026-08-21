import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function findDuplicateAnswers() {
  const submissionId = "27857776-5c81-4c63-8bf4-c2ff65d125d6"; // From screenshot url

  const { data: answers, error } = await supabase
    .from('answers')
    .select('*')
    .eq('submission_id', submissionId);

  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${answers.length} answers for this submission.`);
  
  answers.forEach(a => {
     console.log(`Q: ${a.question_id} | Ans: ${a.student_answer ? a.student_answer.substring(0, 50) : '(empty)'} | ID: ${a.id} | Created: ${a.created_at || 'unknown'}`);
  });
}

findDuplicateAnswers();
