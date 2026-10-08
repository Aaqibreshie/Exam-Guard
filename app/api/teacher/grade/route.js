import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();


    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: Teachers only' }, { status: 403 });
    }

    // Use admin client to bypass RLS for grading
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // fallback to anon if service key is missing, though it will fail RLS
    );

    const body = await request.json();
    const { submission_id, breakdown } = body;

    if (!submission_id || !breakdown || !Array.isArray(breakdown)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let totalScore = 0;
    let totalPossible = 0;

    // Process each question update
    for (const q of breakdown) {
      totalPossible += (q.points || 1);
      totalScore += (q.points_earned || 0);

      // Update the answer in the database
      const { data: updatedAnswer, error: updateError } = await adminSupabase
        .from('answers')
        .update({
          is_correct: q.is_correct,
          points_earned: q.points_earned
        })
        .eq('submission_id', submission_id)
        .eq('question_id', q.id)
        .select('*');

      if (updateError) {
        console.error('Failed to update answer:', updateError);
        throw updateError;
      }
      
      if (!updatedAnswer || updatedAnswer.length === 0) {
        throw new Error(`Permission denied: Unable to update question ${q.id}. This is likely a Supabase RLS policy issue restricting teachers from updating student answers.`);
      }
    }

    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    // Update the submission total score
    const { data: updatedSub, error: subError } = await adminSupabase
      .from('submissions')
      .update({
        score: totalScore,
        total_possible: totalPossible,
        percentage: percentage
      })
      .eq('id', submission_id)
      .select('*');

    if (subError) {
      console.error('Failed to update submission score:', subError);
      throw subError;
    }
    
    if (!updatedSub || updatedSub.length === 0) {
      throw new Error('Permission denied: Unable to update submission record. RLS policy blocking teacher.');
    }

    return NextResponse.json({ success: true, score: totalScore, percentage });
  } catch (error) {
    console.error('Teacher grading error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
