import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ExamCard from '@/components/ExamCard';
import TeacherAnalytics from '@/components/TeacherAnalytics';

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>Session Expired</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Please log in to access your instructor workspace.</p>
        <Link href="/login" className="btn btn-primary btn-md">
          Sign In
        </Link>
      </div>
    );
  }

  // Fetch exams created by this instructor
  const { data: exams, error } = await supabase
    .from('exams')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching exams:', error.message || error);
  }

  const examList = (exams || []).filter(e => !e.title?.startsWith('[Archived]'));
  const totalExams = examList.length;
  const publishedExams = examList.filter(e => e.is_published).length;
  
  let totalSubmissions = 0;
  let totalScores = 0;
  let totalPossible = 0;

  // Fetch submissions stats if there are exams
  if (totalExams > 0) {
    const examIds = examList.map(e => e.id);
    const { data: subs } = await supabase
      .from('submissions')
      .select('exam_id, score, total_possible')
      .in('exam_id', examIds);

    if (subs) {
      totalSubmissions = subs.length;
      subs.forEach(sub => {
        totalScores += (sub.score || 0);
        totalPossible += (sub.total_possible || 0);
      });
    }
  }

  
  const averageScore = totalPossible > 0 ? Math.round((totalScores / totalPossible) * 100) : 0;

  // Process Exam Stats for Recharts
  const examStats = [];
  if (totalExams > 0 && subs) {
    examList.forEach(exam => {
      const examSubs = subs.filter(s => s.exam_id === exam.id);
      if (examSubs.length > 0) {
        let eScores = 0;
        let ePossible = 0;
        examSubs.forEach(s => {
          eScores += (s.score || 0);
          ePossible += (s.total_possible || 0);
        });
        const eAvg = ePossible > 0 ? Math.round((eScores / ePossible) * 100) : 0;
        examStats.push({
          name: exam.title.length > 15 ? exam.title.substring(0, 15) + '...' : exam.title,
          average: eAvg,
          submissions: examSubs.length
        });
      }
    });
  }

  // Question Stats placeholder (we can fetch this if needed, but for now we will just use a mock or fetch if answers exist)
  let questionStats = [];
  if (totalExams > 0) {
    const { data: answers } = await supabase
      .from('answers')
      .select('is_correct, question_id, questions(question_text, exam_id)')
      .limit(1000);
      
    if (answers && answers.length > 0) {
      const qStats = {};
      answers.forEach(ans => {
        // filter out answers not belonging to teacher's exams
        if (ans.questions && examIds.includes(ans.questions.exam_id)) {
          const qid = ans.question_id;
          if (!qStats[qid]) {
            qStats[qid] = {
              text: ans.questions.question_text,
              total: 0,
              correct: 0
            };
          }
          qStats[qid].total += 1;
          if (ans.is_correct) qStats[qid].correct += 1;
        }
      });
      
      questionStats = Object.values(qStats).map(q => {
        const textStr = typeof q.text === 'string' ? q.text : 'Question';
        return {
          shortName: textStr.length > 20 ? textStr.substring(0, 20) + '...' : textStr,
          successRate: Math.round((q.correct / q.total) * 100),
          total: q.total
        };
      }).sort((a, b) => a.successRate - b.successRate).slice(0, 5); // Bottom 5 (hardest questions)
    }
  }


  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Instructor Workspace</h1>
          <p className="dashboard-subtitle">Manage examination papers, student submissions, and anti-cheat analytics</p>
        </div>
        <Link href="/dashboard/teacher/create-exam" className="btn btn-primary btn-md">
          <span>➕</span> Create New Exam
        </Link>
      </div>

      {/* Stats Matrix */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <span className="stat-label">Total Exams</span>
          <span className="stat-value">{totalExams}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Published</span>
          <span className="stat-value stat-value-purple">{publishedExams}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Submissions</span>
          <span className="stat-value stat-value-blue">{totalSubmissions}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Average Score</span>
          <span className="stat-value stat-value-emerald">{averageScore}%</span>
        </div>
      </div>

      <TeacherAnalytics examStats={examStats} questionStats={questionStats} />

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Your Examinations</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{totalExams} Total</span>
      </div>

      <div className="exam-grid">
        {examList.length > 0 ? (
          examList.map(exam => (
            <ExamCard 
              key={exam.id} 
              exam={exam} 
              role="teacher" 
              href={`/dashboard/teacher/exam/${exam.id}`} 
            />
          ))
        ) : (
          <div className="glass-card-static" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', borderRadius: '20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>No Exams Created Yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
              Create your first MERN or Git examination paper to test and evaluate students.
            </p>
            <Link href="/dashboard/teacher/create-exam" className="btn btn-primary btn-md">
              Create Your First Exam →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
