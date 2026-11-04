import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submission_id');
    const examId = searchParams.get('exam_id');

    if (!submissionId && !examId) {
      return NextResponse.json({ error: 'submission_id or exam_id is required' }, { status: 400 });
    }

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = (user.user_metadata?.role || profile?.role || '').toLowerCase();
    const isInstructor = userRole === 'teacher' || userRole === 'admin';

    // 1. Fetch submission record
    let submission = null;
    if (submissionId) {
      const { data, error } = await adminSupabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      submission = data;
    } else {
      const { data } = await adminSupabase
        .from('submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .single();
      submission = data;
    }

    if (!submission) {
      return NextResponse.json({ error: 'No submission found' }, { status: 404 });
    }

    // Access control: Students can only view their own completed submissions
    if (!isInstructor) {
      if (submission.student_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (submission.status === 'in_progress') {
        return NextResponse.json({ 
          error: 'Review is only available after exam submission has completed.' 
        }, { status: 403 });
      }
    }

    const targetExamId = submission?.exam_id || examId;

    // 2. Fetch exam details
    const { data: exam } = await adminSupabase
      .from('exams')
      .select('*')
      .eq('id', targetExamId)
      .single();

    // 3. Fetch questions
    const { data: questions, error: qError } = await adminSupabase
      .from('questions')
      .select('*')
      .eq('exam_id', targetExamId)
      .order('order_index', { ascending: true });

    if (qError) {
      console.error('Error fetching questions:', qError);
    }

    // 4. Fetch answers if submission exists
    let answers = [];
    if (submission?.id) {
      const { data: ansData } = await adminSupabase
        .from('answers')
        .select('*')
        .eq('submission_id', submission.id);
      answers = ansData || [];
    }

    const ansMap = {};
    answers.forEach(a => {
      ansMap[a.question_id] = a;
    });

    const breakdown = (questions || []).map(q => {
      let sc = q.starter_code || '';
      let tc = q.test_cases || [];
      let qType = q.question_type || 'mcq';

      if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
        if (q.options.starter_code) sc = q.options.starter_code;
        if (q.options.test_cases) tc = q.options.test_cases;
        if (q.options.is_coding || q.options.starter_code) qType = 'coding';
      }

      const a = ansMap[q.id] || {};
      const studentAns = a.student_answer !== undefined && a.student_answer !== null ? a.student_answer : '';
      const correctAns = q.correct_answer || '';
      
      let isCorrect = null;
      if (a.is_correct !== undefined && a.is_correct !== null) {
        isCorrect = a.is_correct;
      } else if (correctAns && studentAns) {
        isCorrect = String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
      } else if (!studentAns) {
        isCorrect = false;
      }

      return {
        id: q.id,
        question_text: q.question_text,
        question_type: qType,
        options: q.options || null,
        starter_code: sc,
        test_cases: tc,
        correct_answer: correctAns,
        points: q.points || 1,
        student_answer: studentAns,
        is_correct: isCorrect,
        points_earned: a.points_earned !== undefined && a.points_earned !== null ? a.points_earned : (isCorrect === true ? (q.points || 1) : 0),
      };
    });

    return NextResponse.json({
      success: true,
      submission,
      exam,
      breakdown,
      total_questions: breakdown.length,
      correct_count: breakdown.filter(b => b.is_correct).length
    });
  } catch (err) {
    console.error('Review API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
