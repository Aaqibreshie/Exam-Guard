import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { submission_id, answers } = body;

    if (!submission_id || !answers || Object.keys(answers).length === 0) {
      return NextResponse.json({ success: true, message: 'No answers to save' });
    }

    // Verify submission belongs to user
    const { data: submission } = await supabase
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

    // Fetch existing answers to decide whether to INSERT or UPDATE
    const { data: existingAnswers } = await supabase
      .from('answers')
      .select('id, question_id')
      .eq('submission_id', submission_id);

    const existingMap = new Map();
    if (existingAnswers) {
      existingAnswers.forEach(ans => existingMap.set(ans.question_id, ans.id));
    }

    // Batch upsert answers in a single database roundtrip
    const payload = Object.entries(answers)
      .filter(([_, val]) => val !== undefined && val !== null)
      .map(([question_id, student_answer]) => {
        const item = {
          submission_id,
          question_id,
          student_answer: String(student_answer)
        };
        if (existingMap.has(question_id)) {
          item.id = existingMap.get(question_id);
        }
        return item;
      });

    if (payload.length > 0) {
      const { error: upsertErr } = await supabase.from('answers').upsert(payload);
      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Auto-save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
