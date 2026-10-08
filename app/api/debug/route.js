import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: 'Not logged in' });
  
  // 1. Fetch a question
  const { data: qList } = await supabase.from('question_bank').select('id, subject').limit(1);
  if (!qList || qList.length === 0) return NextResponse.json({ error: 'No questions' });
  
  const qId = qList[0].id;
  
  // 2. Force update it to HTML
  const { data: updated, error: updErr } = await supabase.from('question_bank').update({ subject: 'HTML_TEST_123' }).eq('id', qId).select();
  
  // 3. Fetch again
  const { data: verify } = await supabase.from('question_bank').select('id, subject').eq('id', qId);
  
  return NextResponse.json({ 
    user_id: user.id,
    question_id: qId,
    update_result: updated,
    update_error: updErr,
    verification: verify
  });
}
