import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role === 'teacher') {
      const { data: exams, error } = await supabase
        .from('exams')
        .select('*')
        .eq('created_by', user.id)
        
      if (error) throw error
      return NextResponse.json({ exams })
    } else {
      const { data: exams, error } = await supabase
        .from('exams')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ exams })
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

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, subject, duration_minutes, start_time, end_time, passcode, max_warnings } = body

    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        subject,
        duration_minutes,
        start_time,
        end_time,
        passcode,
        max_warnings,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ exam })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })

    const { data: existingExam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingExam || existingExam.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: exam, error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ exam })
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

    if (!id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })

    const { data: existingExam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingExam || existingExam.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
