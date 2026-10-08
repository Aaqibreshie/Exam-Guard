'use client';

import React, { useState, useEffect, use, Fragment } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSubjectStyling } from '@/lib/subject-helpers';
import Link from 'next/link';
import TeacherGrader from '@/components/TeacherGrader';

export default function ExamResultsPage({ params }) {
  const { id } = use(params);
  const supabase = createClient();
  
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubId, setExpandedSubId] = useState(null);

  useEffect(() => {
    fetchResults();
  }, [id]);

  async function fetchResults() {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();
        
      if (examError) throw examError;
      setExam(examData);

      const { data: subsData, error: subsError } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles!submissions_student_id_fkey(full_name, batch),
          cheat_logs(*)
        `)
        .eq('exam_id', id)
        .order('submitted_at', { ascending: false });
        
      if (subsError) throw subsError;
      setSubmissions(subsData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'severe_head_turn_detected':
      case 'face_away_detected': return '🔄';
      case 'repeated_offscreen_glance': return '👀';
      case 'sudden_movement_detected': return '⚡';
      case 'multiple_faces_detected': return '👥';
      case 'student_absent': return '🏃';
      case 'llm_burst_detected': return '⚡';
      case 'ai_paste_detected': return '📋';
      case 'dual_monitor_detected': return '🖥️';
      case 'tab_switch': return '📑';
      case 'window_blur': return '🪟';
      case 'fullscreen_exit': return '🔲';
      case 'sidecar_disconnected': return '📱';
      default: return '⚠️';
    }
  };

  const getIntegrityScore = (cheatLogs = []) => {
    let score = 100;
    cheatLogs.forEach(log => {
      if (log.event_type === 'multiple_faces_detected' || log.event_type === 'llm_burst_detected' || log.event_type === 'ai_paste_detected') {
        score -= 25;
      } else if (log.event_type === 'severe_head_turn_detected' || log.event_type === 'repeated_offscreen_glance' || log.event_type === 'face_away_detected' || log.event_type === 'student_absent' || log.event_type === 'dual_monitor_detected') {
        score -= 15;
      } else {
        score -= 5;
      }
    });
    return Math.max(0, score);
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading examination analytics & AI proctor audit logs...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>Exam Not Found</h2>
        <Link href="/dashboard/teacher" className="btn btn-primary btn-md">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const totalSubs = submissions.length;
  const avgScore = totalSubs > 0 
    ? Math.round(submissions.reduce((acc, sub) => acc + (sub.percentage || 0), 0) / totalSubs)
    : 0;

  const totalViolations = submissions.reduce((acc, sub) => acc + (sub.cheat_logs?.length || 0), 0);

  return (
    <div className="dashboard-container" style={{ maxWidth: '1140px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href={`/dashboard/teacher/exam/${id}`} className="btn btn-ghost" style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px', 
            padding: '8px 16px', borderRadius: '8px', 
            border: '1px solid #e2e8f0', color: '#64748b', 
            fontWeight: 600, fontSize: '0.9rem',
            background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Exam Paper & Candidate Settings
        </Link>
      </div>

      {/* Header & Stats Banner */}
      <div className="glass-card-static" style={{ padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge-subject" style={{background: getSubjectStyling(exam.subject).bg, color: getSubjectStyling(exam.subject).color, borderColor: getSubjectStyling(exam.subject).border}}>{getSubjectStyling(exam.subject).label}</span>
              <span className="badge-status badge-published"><><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> AI Proctor Monitored</></span>
              {exam.require_phone_sidecar && (
                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"1px"}}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg> Dual-Angle Sidecar Enforced</>
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>{exam.title?.replace(/^\[.*?\]\s*/i, '')}</h1>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '4px' }}>
              Comprehensive performance evaluation and multi-sensor integrity audit
            </p>
          </div>

          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Candidates</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{totalSubs}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Class Average</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{avgScore}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Security Flags</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalViolations > 0 ? '#e11d48' : '#059669' }}>{totalViolations}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-card-static" style={{ padding: '24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Candidate Performance & AI Proctor Timeline
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Click any candidate row to inspect their full chronological integrity audit
            </span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eaecf0' }}>
              <th style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Candidate</th>
              <th style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Score</th>
              <th style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Grade</th>
              <th style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Integrity Score</th>
              <th style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Proctor Flags</th>
              <th style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg></div>
                  No candidates have submitted this examination yet.
                </td>
              </tr>
            ) : (
              submissions.map(sub => {
                const isExpelled = sub.status === 'expelled';
                const isPassed = sub.percentage >= 50;
                const isExpanded = expandedSubId === sub.id;
                const logs = sub.cheat_logs || [];
                const integrityScore = getIntegrityScore(logs);

                return (
                  <Fragment key={sub.id}>
                    <tr 
                      onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                      style={{ 
                        borderBottom: '1px solid #eaecf0', 
                        cursor: 'pointer',
                        background: isExpanded ? '#f8fafc' : 'transparent',
                        transition: 'background 0.15s' 
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {sub.student?.full_name || 'Candidate'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {sub.student?.batch || 'Batch 1 (Morning)'}
                        </div>
                      </td>

                      <td style={{ padding: '16px', color: '#475569', fontWeight: 600 }}>
                        {sub.score} / {sub.total_possible}
                      </td>

                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: isExpelled ? '#e11d48' : (isPassed ? '#059669' : '#d97706') }}>
                            {sub.percentage}%
                          </strong>
                          <div style={{ width: '50px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${Math.min(100, sub.percentage || 0)}%`, 
                              height: '100%', 
                              backgroundColor: isExpelled ? '#e11d48' : (isPassed ? '#059669' : '#d97706') 
                            }} />
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px' }}>
                        <span className={`badge-status ${isExpelled ? 'badge-draft' : 'badge-published'}`} style={{
                          background: isExpelled ? '#fff1f2' : '#ecfdf5',
                          color: isExpelled ? '#e11d48' : '#059669',
                          borderColor: isExpelled ? '#fecdd3' : '#a7f3d0'
                        }}>
                          {isExpelled ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Expelled</> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><polyline points="20 6 9 17 4 12"></polyline></svg> Verified</>}
                        </span>
                      </td>

                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: integrityScore >= 80 ? '#ecfdf5' : integrityScore >= 50 ? '#fffbeb' : '#fff1f2',
                          color: integrityScore >= 80 ? '#059669' : integrityScore >= 50 ? '#d97706' : '#e11d48',
                          border: `1px solid ${integrityScore >= 80 ? '#a7f3d0' : integrityScore >= 50 ? '#fde68a' : '#fecdd3'}`
                        }}>
                          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> {integrityScore}%</>
                        </span>
                      </td>

                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: logs.length > 0 ? '#e11d48' : '#64748b' 
                        }}>
                          {logs.length} Flag{logs.length === 1 ? '' : 's'}
                        </span>
                      </td>

                      <td style={{ padding: '16px' }}>
                        <button
    type="button"
    className="btn btn-ghost"
    style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: isExpanded ? '#f1f5f9' : '#ffffff', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
  >
    {isExpanded ? <><span style={{marginRight: "2px"}}>Hide Logs</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block"}}><polyline points="18 15 12 9 6 15"></polyline></svg></> : <><span style={{marginRight: "2px"}}>Audit Logs</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block"}}><polyline points="6 9 12 15 18 9"></polyline></svg></>}
  </button>
                      </td>
                    </tr>

                    {/* Expandable Proctor Timeline Drawer */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #eaecf0' }}>
                          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>
                              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"6px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px", color: '#64748b'}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Sensor &</> Anti-Cheat Audit Trail ({logs.length} events logged)
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Session: {new Date(sub.started_at).toLocaleTimeString()} → {sub.submitted_at ? new Date(sub.submitted_at).toLocaleTimeString() : 'Active'}
                            </span>
                          </div>

                          {logs.length === 0 ? (
                            <div style={{ padding: '14px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"6px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><polyline points="20 6 9 17 4 12"></polyline></svg> Clean Session:</> No face deviation, tab switches, or script injections detected throughout the exam.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {logs.map(log => (
                                <div
                                  key={log.id}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1.1rem' }}>{getLogIcon(log.event_type)}</span>
                                    <div>
                                      <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>
                                        {log.event_type.replace(/_/g, ' ')}
                                      </strong>
                                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                                        {log.details}
                                      </p>
                                    </div>
                                  </div>

                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                    {new Date(log.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ marginTop: '24px', borderTop: '1px solid #eaecf0', paddingTop: '20px' }}>
                            <TeacherGrader 
                              submissionId={sub.id} 
                              examId={exam.id} 
                              onGradeUpdated={fetchResults}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
