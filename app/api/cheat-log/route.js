import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { submission_id, event_type, details } = body

    if (!submission_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('student_id, warning_count')
      .eq('id', submission_id)
      .single()

    if (!submission || submission.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: logError } = await supabase
      .from('cheat_logs')
      .insert({
        submission_id,
        event_type,
        details
      })

    if (logError) throw logError

    const isSevere = ['tab_switch', 'window_blur', 'copy_paste'].includes(event_type)
    let newWarningCount = submission.warning_count || 0
    if (isSevere) {
      newWarningCount += 1
      await supabase
        .from('submissions')
        .update({ warning_count: newWarningCount })
        .eq('id', submission_id)
    }

    return NextResponse.json({ success: true, warning_count: newWarningCount })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    if (profile?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const submission_id = searchParams.get('submission_id')

    if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })

    const { data: logs, error } = await supabase
      .from('cheat_logs')
      .select('*')
      .eq('submission_id', submission_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
