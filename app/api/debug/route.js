import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: 'Not logged in' });
  
  const { data, error } = await supabase.from('question_bank').select('id, subject, created_by').limit(20);
  
  return NextResponse.json({ user_id: user.id, questions: data, error });
}
