import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();
    const body = await request.json();
    const { submission_id, answers } = body;

    if (!submission_id || !answers || Object.keys(answers).length === 0) {
      return NextResponse.json({ success: true, message: 'No answers to save' });
    }

    // Verify submission belongs to user
    const { data: submission } = await adminSupabase
      .from('submissions')
      .select('student_id, status')
      .eq('id', submission_id)
      .single();

    if (!submission || submission.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (submission.status !== 'in_progress') {
      return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });
    }

    // Fetch existing answers to safely separate updates and inserts
    const { data: existingAnswers } = await adminSupabase
      .from('answers')
      .select('id, question_id')
      .eq('submission_id', submission_id);

    const existingMap = new Map();
    if (existingAnswers) {
      existingAnswers.forEach(ans => existingMap.set(ans.question_id, ans.id));
    }

    const toUpdate = [];
    const toInsert = [];

    for (const [question_id, student_answer] of Object.entries(answers)) {
      if (student_answer === undefined || student_answer === null) continue;
      const existingId = existingMap.get(question_id);
      if (existingId) {
        toUpdate.push({ id: existingId, student_answer: String(student_answer) });
      } else {
        toInsert.push({
          submission_id,
          question_id,
          student_answer: String(student_answer)
        });
      }
    }

    const promises = [];
    if (toInsert.length > 0) {
      promises.push(adminSupabase.from('answers').insert(toInsert));
    }
    for (const item of toUpdate) {
      promises.push(
        adminSupabase.from('answers').update({ student_answer: item.student_answer }).eq('id', item.id)
      );
    }
    await Promise.all(promises);

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Auto-save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
