import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  // Fetch from the exams table (publicly accessible or whatever works)
  const { data, error } = await supabase.from('questions').select('*').limit(10);
  return NextResponse.json({ data, error });
}
