import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  // Without service role key, we can't bypass RLS!
  // BUT I can fetch the exams because exams are public!
  const { data: exams } = await supabase.from('exams').select('*').order('created_at', { ascending: false }).limit(2);
  return NextResponse.json({ exams });
}
