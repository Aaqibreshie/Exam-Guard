import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const exam_id = searchParams.get('exam_id')

    if (!exam_id) return NextResponse.json({ error: 'exam_id required' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let hasAccess = false
    
    if (profile?.role === 'teacher') {
      const { data: exam } = await supabase
        .from('exams')
        .select('created_by')
        .eq('id', exam_id)
        .single()
      
      if (exam?.created_by === user.id) {
        hasAccess = true
      }
    } else {
      const { data: submission } = await supabase
        .from('submissions')
        .select('id')
        .eq('exam_id', exam_id)
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .single()
        
      if (submission) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = supabase
      .from('questions')
      .select(profile?.role === 'teacher' ? '*' : 'id, exam_id, question_text, question_type, options, points, order_index')
      .eq('exam_id', exam_id)
      .order('order_index')

    const { data: questions, error } = await query

    if (error) throw error
    return NextResponse.json({ questions })
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

    if (profile?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { exam_id, question_text, question_type, options, correct_answer, points } = body

    const { data: exam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('id', exam_id)
      .single()
      
    if (exam?.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: currentQuestions } = await supabase
      .from('questions')
      .select('order_index')
      .eq('exam_id', exam_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const order_index = currentQuestions?.length ? currentQuestions[0].order_index + 1 : 1

    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        exam_id,
        question_text,
        question_type,
        options,
        correct_answer,
        points,
        order_index
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ question })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data: question } = await supabase
      .from('questions')
      .select('exam_id')
      .eq('id', id)
      .single()

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const { data: exam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('id', question.exam_id)
      .single()

    if (exam?.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
