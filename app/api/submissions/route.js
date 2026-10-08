import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const { searchParams } = new URL(request.url)
    const exam_id = searchParams.get('exam_id')

    if (profile?.role === 'teacher') {
      if (exam_id) {
        const { data: submissions, error } = await adminSupabase.from('submissions')
          .select(`*, profiles(full_name, avatar_url)`)
          .eq('exam_id', exam_id)
        if (error) throw error
        return NextResponse.json({ submissions })
      }
      return NextResponse.json({ error: 'exam_id required for teachers' }, { status: 400 })
    } else {
      if (exam_id) {
        const { data: submission, error } = await adminSupabase.from('submissions')
          .select('*')
          .eq('exam_id', exam_id)
          .eq('student_id', user.id)
          .single()
        if (error && error.code !== 'PGRST116') throw error
        return NextResponse.json({ submission: submission || null })
      } else {
        const { data: submissions, error } = await adminSupabase.from('submissions')
          .select(`*, exams(title, subject, duration_minutes)`)
          .eq('student_id', user.id)
        if (error) throw error
        return NextResponse.json({ submissions })
      }
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { exam_id } = body
    if (!exam_id) return NextResponse.json({ error: 'exam_id required' }, { status: 400 })

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('is_published')
      .eq('id', exam_id)
      .single()
      
    if (examError || !exam?.is_published) return NextResponse.json({ error: 'Exam not found or published' }, { status: 404 })

    const { data: existingSubmission } = await adminSupabase.from('submissions')
      .select('*')
      .eq('exam_id', exam_id)
      .eq('student_id', user.id)
      .single()

    if (existingSubmission) {
      if (existingSubmission.status !== 'in_progress') {
        return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 })
      }
      return NextResponse.json({ submission: existingSubmission })
    }

    const { data: submission, error } = await adminSupabase.from('submissions')
      .insert({
        exam_id,
        student_id: user.id,
        status: 'in_progress',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ submission })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const body = await request.json()
    const { submission_id, answers, status = 'submitted', warning_count, auto_submitted } = body

    const { data: submission } = await adminSupabase.from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (!submission || submission.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 })
    }

    let totalScore = 0
    let totalPossible = 0

    if (answers && Object.keys(answers).length > 0) {
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', submission.exam_id)
      
      const answerInserts = []

      for (const q of questions) {
        totalPossible += (q.points || 1)
        const student_answer = answers[q.id]
        
        let points_earned = 0
        let is_correct = false
        let needs_manual = false

        if (student_answer !== undefined && student_answer !== null) {
           if (q.question_type === 'project') {
             needs_manual = true
             points_earned = 0
           } else {
             if (String(student_answer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) {
               is_correct = true
               points_earned = (q.points || 1)
             }
           }
        }

        totalScore += points_earned
        
        if (student_answer !== undefined) {
          answerInserts.push({
            submission_id,
            question_id: q.id,
            student_answer: String(student_answer),
            is_correct,
            points_earned
          })
        }
      }

      if (answerInserts.length > 0) {
        // Fetch existing answers to safely update or insert
        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('id, question_id')
          .eq('submission_id', submission_id);

        const existingMap = new Map();
        if (existingAnswers) {
          existingAnswers.forEach(ans => existingMap.set(ans.question_id, ans.id));
        }

        for (const ans of answerInserts) {
          if (existingMap.has(ans.question_id)) {
            // UPDATE
            await adminSupabase.from('answers').update(ans).eq('id', existingMap.get(ans.question_id));
          } else {
            // INSERT
            await adminSupabase.from('answers').insert(ans);
          }
        }
      }
    }

    const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0
    const updates = {
      submitted_at: new Date().toISOString(),
      score: totalScore,
      total_possible: totalPossible,
      percentage,
      status
    }
    if (warning_count !== undefined) updates.warning_count = warning_count
    if (auto_submitted !== undefined) updates.auto_submitted = auto_submitted

    const { data: updatedSubmission, error } = await adminSupabase.from('submissions')
      .update(updates)
      .eq('id', submission_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ submission: updatedSubmission })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
