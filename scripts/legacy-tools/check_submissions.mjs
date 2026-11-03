import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSubmissions() {
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select(`
      id, 
      student_id, 
      status, 
      score, 
      percentage,
      warning_count,
      profiles!student_id (full_name)
    `)
    .order('started_at', { ascending: false });

  if (error) {
    console.error("Error fetching submissions:", error);
    return;
  }
  
  console.log(`Found ${submissions.length} total submissions.`);
  for (const sub of submissions) {
    console.log(`\nStudent: ${sub.profiles?.full_name} | Status: ${sub.status} | Score: ${sub.score} (${sub.percentage}%) | Warnings: ${sub.warning_count}`);
    
    // Fetch their answers
    const { data: answers } = await supabase
      .from('answers')
      .select('question_id, student_answer, is_correct, points_earned')
      .eq('submission_id', sub.id);
      
    if (answers && answers.length > 0) {
      console.log(`  Answers submitted: ${answers.length}`);
      answers.forEach(a => {
        let preview = a.student_answer;
        if (preview && preview.length > 50) preview = preview.substring(0, 50) + '...';
        console.log(`   - QID ${a.question_id}: [Correct: ${a.is_correct}] ${preview}`);
      });
    } else {
      console.log('  No answers saved in answers table yet.');
    }
  }
}

checkSubmissions();
