import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://vlkmsxsnaykbbklnzdbe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsa21zeHNuYXlrYmJrbG56ZGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzY0MjIsImV4cCI6MjEwMTUxMjQyMn0.1iJQCUd-GHltgn7ZHkrvw3XbmGfH3I2N7kSY7UWBHn8');

async function test() {
  const { data: examData } = await supabase.from('exams').select('id, title').eq('title', 'Python Basics: Multiplication');
  console.log('Exams:', examData);

  const { data: allQuestions } = await supabase.from('questions').select('id, exam_id, question_text, options');
  console.log('Questions:', allQuestions);
}
test();
