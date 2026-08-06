'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function StudentResults() {
  const supabase = createClient();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubId, setExpandedSubId] = useState(null);
  const [breakdownData, setBreakdownData] = useState({}); // subId -> questions array
  const [loadingBreakdown, setLoadingBreakdown] = useState({});

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          *,
          exams (
            id,
            title,
            subject,
            total_marks,
            is_published
          )
        `)
        .eq('student_id', user.id)
        .in('status', ['submitted', 'expelled'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setResults(submissions || []);
    } catch (err) {
      console.error('Error loading results:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBreakdown = async (subId, examId) => {
    if (expandedSubId === subId) {
      setExpandedSubId(null);
      return;
    }

    setExpandedSubId(subId);

    if (!breakdownData[subId]) {
      setLoadingBreakdown(prev => ({ ...prev, [subId]: true }));
      try {
        const res = await fetch(`/api/student/review?submission_id=${subId}&exam_id=${examId}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.breakdown)) {
          setBreakdownData(prev => ({ ...prev, [subId]: json.breakdown }));
        } else {
          setBreakdownData(prev => ({ ...prev, [subId]: [] }));
        }
      } catch (err) {
        console.error('Error fetching breakdown:', err);
        setBreakdownData(prev => ({ ...prev, [subId]: [] }));
      } finally {
        setLoadingBreakdown(prev => ({ ...prev, [subId]: false }));
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your examination records & evaluated papers...</p>
      </div>
    );
  }

  const totalExams = results.length;
  const avgScore = totalExams > 0 
    ? Math.round(results.reduce((acc, r) => acc + (r.percentage || 0), 0) / totalExams)
    : 0;
  const bestScore = totalExams > 0
    ? Math.max(...results.map(r => r.percentage || 0))
    : 0;

  return (
    <div className="dashboard-container" style={{ maxWidth: '980px' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="dashboard-title">Academic Results & Evaluated Papers</h1>
          <p className="dashboard-subtitle">
            Track your performance history, review individual answers, and inspect correct solutions
          </p>
        </div>
        <Link href="/dashboard/student" className="btn btn-ghost btn-sm">
          ← Back to Student Portal
        </Link>
      </div>

      {/* Summary Matrix */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="glass-card stat-card">
          <span className="stat-label">Exams Completed</span>
          <span className="stat-value">{totalExams}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Average Score</span>
          <span className="stat-value stat-value-purple">{avgScore}%</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Highest Score</span>
          <span className="stat-value stat-value-emerald">{bestScore}%</span>
        </div>
      </div>

      {/* Results List */}
      {results.length === 0 ? (
        <div className="glass-card-static" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '14px' }}>📝</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            No Examination Records Found
          </h3>
          <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
            You haven't completed any assigned examinations yet. Check your dashboard for active exam papers.
          </p>
          <Link href="/dashboard/student" className="btn btn-primary btn-md">
            View Available Exams →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {results.map(result => {
            const isExpelled = result.status === 'expelled';
            const pct = result.percentage || 0;
            const isPassed = pct >= 50;
            const isExpanded = expandedSubId === result.id;
            const breakdown = breakdownData[result.id] || [];
            const isLoadingDetails = loadingBreakdown[result.id];
            const examTitle = result.exams?.title || 'Evaluated Examination Paper';
            const examSubject = (result.exams?.subject || 'TEST').toUpperCase();

            return (
              <div
                key={result.id}
                className="glass-card-static"
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  border: isExpanded ? '1.5px solid #059669' : '1px solid #e2e8f0',
                  boxShadow: isExpanded ? '0 8px 24px rgba(5, 150, 105, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Main Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge-subject">{examSubject}</span>
                      <span className={`badge-status ${isExpelled ? 'badge-draft' : 'badge-published'}`} style={{
                        background: isExpelled ? '#fff1f2' : '#ecfdf5',
                        color: isExpelled ? '#e11d48' : '#059669',
                        borderColor: isExpelled ? '#fecdd3' : '#a7f3d0'
                      }}>
                        {isExpelled ? '❌ Expelled' : '✅ Verified'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(result.submitted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {examTitle}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.65rem', 
                        fontWeight: 800, 
                        color: isExpelled ? '#e11d48' : isPassed ? '#059669' : '#d97706' 
                      }}>
                        {pct}%
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                        {result.score} / {result.total_possible} Marks
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleBreakdown(result.id, result.exam_id)}
                      className={`btn ${isExpanded ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                      style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                    >
                      {isExpanded ? 'Hide Review ▲' : 'Inspect Review ▼'}
                    </button>
                  </div>
                </div>

                {/* Expandable Review & Solution Key Drawer */}
                {isExpanded && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #eaecf0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                        📋 Detailed Question Breakdown & Answer Key
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {breakdown.filter(b => b.is_correct).length} of {breakdown.length} Correct
                      </span>
                    </div>

                    {isLoadingDetails ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        <div className="spinner" style={{ margin: '0 auto 10px auto', width: '24px', height: '24px' }}></div>
                        Loading question paper details...
                      </div>
                    ) : breakdown.length === 0 ? (
                      <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.875rem', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                        {isExpelled ? (
                          <span>⚠️ This exam session was terminated early or was created with 0 questions.</span>
                        ) : (
                          <span>ℹ️ No question items were configured for this exam paper by the instructor.</span>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {breakdown.map((q, idx) => {
                          const isCorrect = q.is_correct;
                          const hasAnswered = q.student_answer && String(q.student_answer).trim() !== '';

                          return (
                            <div
                              key={q.id || idx}
                              style={{
                                padding: '16px 20px',
                                borderRadius: '12px',
                                background: '#f8fafc',
                                border: `1px solid ${isCorrect ? '#a7f3d0' : hasAnswered ? '#fecdd3' : '#e2e8f0'}`,
                                borderLeft: `4px solid ${isCorrect ? '#059669' : hasAnswered ? '#e11d48' : '#94a3b8'}`
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                                    Q{idx + 1}.
                                  </span>
                                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: '#e2e8f0', color: '#475569', textTransform: 'uppercase', fontWeight: 600 }}>
                                    {q.question_type}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isCorrect ? '#059669' : '#e11d48' }}>
                                  {isCorrect ? `+${q.points_earned || q.points} pts (Correct)` : '0 pts (Incorrect)'}
                                </span>
                              </div>

                              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                                {q.question_text}
                              </p>

                              {/* MCQ Choices */}
                              {q.question_type === 'mcq' && Array.isArray(q.options) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {q.options.map((opt, oIdx) => {
                                    const isCorrectOpt = q.correct_answer && String(opt).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
                                    const isStudentOpt = q.student_answer && String(opt).trim().toLowerCase() === String(q.student_answer).trim().toLowerCase();

                                    return (
                                      <div
                                        key={oIdx}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: '8px',
                                          background: isCorrectOpt ? '#ecfdf5' : isStudentOpt ? '#fff1f2' : '#ffffff',
                                          border: `1px solid ${isCorrectOpt ? '#10b981' : isStudentOpt ? '#ef4444' : '#e2e8f0'}`,
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          fontSize: '0.85rem'
                                        }}
                                      >
                                        <span style={{ color: isCorrectOpt ? '#065f46' : isStudentOpt ? '#991b1b' : '#475569', fontWeight: isCorrectOpt || isStudentOpt ? 600 : 400 }}>
                                          {String.fromCharCode(65 + oIdx)}. {opt}
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          {isStudentOpt && isCorrectOpt && (
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '8px', background: '#059669', color: '#ffffff', fontWeight: 700 }}>
                                              ✓ Your Answer
                                            </span>
                                          )}
                                          {isStudentOpt && !isCorrectOpt && (
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '8px', background: '#e11d48', color: '#ffffff', fontWeight: 700 }}>
                                              ✗ Your Answer
                                            </span>
                                          )}
                                          {!isStudentOpt && isCorrectOpt && (
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '8px', background: '#10b981', color: '#ffffff', fontWeight: 700 }}>
                                              ✓ Correct
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Short Answer */}
                              {q.question_type === 'short_answer' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: isCorrect ? '#ecfdf5' : '#fff1f2', border: `1px solid ${isCorrect ? '#a7f3d0' : '#fecdd3'}` }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isCorrect ? '#059669' : '#e11d48', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                      Your Submitted Answer
                                    </span>
                                    <span style={{ color: isCorrect ? '#065f46' : hasAnswered ? '#991b1b' : '#64748b', fontWeight: 600, fontStyle: hasAnswered ? 'normal' : 'italic' }}>
                                      {hasAnswered ? q.student_answer : '⚠️ No answer entered (Left blank)'}
                                    </span>
                                  </div>

                                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                      🎯 Correct Answer
                                    </span>
                                    <span style={{ color: '#15803d', fontWeight: 600 }}>
                                      {q.correct_answer || 'Reference not specified'}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Coding Challenge & Practical Assessments */}
                              {(q.question_type === 'coding' || q.question_type === 'project') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {/* Student Code Submission vs Blank State */}
                                  <div style={{
                                    borderRadius: '10px',
                                    background: hasAnswered ? '#090d16' : '#fff1f2',
                                    border: `1px solid ${hasAnswered ? '#1e293b' : '#fecdd3'}`,
                                    padding: '14px 16px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                      <span style={{ 
                                        fontSize: '0.75rem', 
                                        color: hasAnswered ? '#94a3b8' : '#e11d48', 
                                        fontWeight: 700, 
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        💻 Your Code Submission
                                      </span>
                                      <span style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '6px', 
                                        background: isCorrect ? '#059669' : hasAnswered ? '#e11d48' : '#cbd5e1',
                                        color: hasAnswered ? '#ffffff' : '#475569',
                                        fontWeight: 700 
                                      }}>
                                        {isCorrect ? '✅ Full Marks' : hasAnswered ? '❌ Failed Tests' : '⚠️ No Code Submitted'}
                                      </span>
                                    </div>

                                    {hasAnswered ? (
                                      <pre style={{
                                        margin: 0,
                                        padding: '12px',
                                        background: '#040711',
                                        borderRadius: '8px',
                                        border: '1px solid #1e293b',
                                        fontSize: '0.85rem',
                                        color: '#38bdf8',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        overflowX: 'auto',
                                        lineHeight: 1.5
                                      }}>
                                        {q.student_answer}
                                      </pre>
                                    ) : (
                                      <div style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, padding: '4px 0' }}>
                                        ⚠️ You did not write or submit any code for this problem during the exam session.
                                      </div>
                                    )}
                                  </div>

                                  {/* Model / Reference Solution (If Available) */}
                                  {q.correct_answer && (
                                    <div style={{
                                      borderRadius: '10px',
                                      background: '#f0fdf4',
                                      border: '1px solid #86efac',
                                      padding: '14px 16px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                          🎯 Reference Solution / Model Code
                                        </span>
                                      </div>
                                      <pre style={{
                                        margin: 0,
                                        padding: '12px',
                                        background: '#090d16',
                                        borderRadius: '8px',
                                        border: '1px solid #1e293b',
                                        fontSize: '0.85rem',
                                        color: '#4ade80',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        overflowX: 'auto',
                                        lineHeight: 1.5
                                      }}>
                                        {q.correct_answer}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Test Case Suite & Expected Values */}
                                  {Array.isArray(q.test_cases) && q.test_cases.length > 0 && (
                                    <div style={{
                                      borderRadius: '10px',
                                      background: '#ffffff',
                                      border: '1px solid #e2e8f0',
                                      padding: '14px 16px'
                                    }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                                        🧪 Test Case Suite & Expected Outputs ({q.test_cases.length} Cases)
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {q.test_cases.map((tc, tcIdx) => (
                                          <div
                                            key={tcIdx}
                                            style={{
                                              padding: '10px 12px',
                                              borderRadius: '8px',
                                              background: '#f8fafc',
                                              border: '1px solid #e2e8f0',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '6px',
                                              fontSize: '0.8rem'
                                            }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                                Test #{tcIdx + 1} {tc.description ? `— ${tc.description}` : ''}
                                              </span>
                                              {tc.hidden && (
                                                <span style={{ fontSize: '0.65rem', background: '#e2e8f0', color: '#64748b', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                  Evaluation Test
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                              <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                                                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>INPUT:</span>
                                                <code style={{ color: '#0284c7' }}>{tc.input}</code>
                                              </div>
                                              <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                                                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>EXPECTED:</span>
                                                <code style={{ color: '#059669', fontWeight: 700 }}>{tc.expected}</code>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
