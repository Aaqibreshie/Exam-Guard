import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import StudentExamList from '@/components/StudentExamList';

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Run data fetching in parallel to maximize speed
  const [profileRes, examsRes, submissionsRes, candidateRecordsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single(),
    supabase
      .from('exams')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('submissions')
      .select('*')
      .eq('student_id', user?.id),
    supabase
      .from('exam_candidates')
      .select('exam_id')
      .eq('student_id', user?.id)
  ]);

  const profile = profileRes.data || {};
  const userSubject = profile.subject || user?.user_metadata?.subject || 'mern';
  const userBatch = profile.batch || user?.user_metadata?.batch || 'Batch 1 (Morning)';

  const rawExams = (examsRes.data || []).filter(e => !e.title?.startsWith('[Archived]'));
  const submissions = submissionsRes.data || [];
  const candidateExamIds = new Set((candidateRecordsRes.data || []).map(c => c.exam_id));

  // Filter exams based on access level (all, batch, or individually selected)
  const accessibleExams = rawExams.filter(exam => {
    if (!exam.access_type || exam.access_type === 'all') return true;
    if (exam.access_type === 'batch') return exam.allowed_batch === userBatch;
    if (exam.access_type === 'selected') return candidateExamIds.has(exam.id);
    return false;
  });

  const takenExams = submissions.filter(s => s.status === 'submitted' || s.status === 'expelled');
  
  let bestScore = 0;
  let totalScore = 0;
  let completedCount = 0;

  takenExams.forEach(sub => {
    const pct = sub.percentage || 0;
    if (pct > bestScore) bestScore = pct;
    totalScore += pct;
    completedCount++;
  });

  const averageScore = completedCount > 0 ? (totalScore / completedCount).toFixed(1) : 0;
  const subjectDisplay = userSubject && userSubject !== 'mern' ? userSubject : (userSubject === 'mern' ? 'MERN Stack' : 'Undecided');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h1 className="dashboard-title">Student Portal</h1>
            <span className="badge-subject" style={{
              background: '#e0f2fe',
              color: '#0284c7',
              borderColor: '#bae6fd'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Track: {subjectDisplay}
            </span>
            <span style={{
              fontSize: '0.8rem',
              padding: '4px 12px',
              borderRadius: '20px',
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              fontWeight: 600
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>{userBatch}
            </span>
          </div>
          <p className="dashboard-subtitle">Select an assigned exam paper to begin your monitored evaluation session</p>
        </div>
        <Link href="/dashboard/student/results" className="btn btn-ghost btn-sm">
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-4"/></svg><span>View All My Results →</span></div>
        </Link>
      </div>

      {/* Stats Cards (4 Columns Responsive) */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <span className="stat-label">Assigned Papers</span>
          <span className="stat-value">{accessibleExams.length}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value stat-value-blue">{completedCount}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Average Score</span>
          <span className="stat-value stat-value-purple">{averageScore}%</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Best Score</span>
          <span className="stat-value stat-value-emerald">{bestScore}%</span>
        </div>
      </div>

      {/* AI Mock Test Arena Promo Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '28px',
        border: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #059669', color: '#10b981', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>NEW AI FEATURE</span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
            AI Mock Exam & Practice Arena
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Need practice before taking real exams? Generate tailored mock tests on JavaScript, MERN, Git, or custom topics with live coding execution and instant AI diagnostics.
          </p>
        </div>

        <Link
          href="/dashboard/student/mock-test"
          className="btn btn-primary btn-md"
          style={{
            background: '#059669',
            padding: '12px 22px',
            fontSize: '0.95rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)'
          }}
        >
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg><span>Launch AI Practice Arena →</span></div>
        </Link>
      </div>

      {/* Interactive Exam List & Filters */}
      <StudentExamList 
        exams={accessibleExams} 
        submissions={submissions} 
        userBatch={userBatch} 
        userSubject={userSubject} 
      />
    </div>
  );
}
