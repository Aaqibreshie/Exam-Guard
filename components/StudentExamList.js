'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function StudentExamList({ exams = [], submissions = [], userBatch = '', userSubject = '' }) {
  const [selectedTrack, setSelectedTrack] = useState('all'); // 'all' | 'mern' | 'git'

  const mernCount = exams.filter(e => e.subject?.toLowerCase() === 'mern').length;
  const gitCount = exams.filter(e => e.subject?.toLowerCase() === 'git').length;

  const filteredExams = exams.filter(exam => {
    if (selectedTrack === 'all') return true;
    return exam.subject?.toLowerCase() === selectedTrack;
  });

  return (
    <div>
      {/* Track & Subject Filter Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '24px',
        borderBottom: '1px solid #eaecf0',
        paddingBottom: '14px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedTrack('all')}
            className={`btn btn-sm ${selectedTrack === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '20px', fontWeight: 600 }}
          >
            🌐 All Available Exams ({exams.length})
          </button>
          
          <button
            type="button"
            onClick={() => setSelectedTrack('mern')}
            className={`btn btn-sm ${selectedTrack === 'mern' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: '20px',
              fontWeight: 600,
              background: selectedTrack === 'mern' ? '#0284c7' : '#f0f9ff',
              color: selectedTrack === 'mern' ? '#ffffff' : '#0369a1',
              border: selectedTrack === 'mern' ? 'none' : '1px solid #bae6fd'
            }}
          >
            ⚡ MERN Stack ({mernCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTrack('git')}
            className={`btn btn-sm ${selectedTrack === 'git' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: '20px',
              fontWeight: 600,
              background: selectedTrack === 'git' ? '#7c3aed' : '#f5f3ff',
              color: selectedTrack === 'git' ? '#ffffff' : '#6d28d9',
              border: selectedTrack === 'git' ? 'none' : '1px solid #ddd6fe'
            }}
          >
            🐙 Git & GitHub ({gitCount})
          </button>
        </div>

        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
          Showing {filteredExams.length} of {exams.length} paper{exams.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Exams Grid */}
      <div className="exam-grid">
        {filteredExams.length > 0 ? (
          filteredExams.map(exam => {
            const isMern = exam.subject?.toLowerCase() === 'mern';
            const submission = submissions.find(s => s.exam_id === exam.id);
            const isTaken = submission && (submission.status === 'submitted' || submission.status === 'expelled');
            const isExpelled = submission?.status === 'expelled';
            
            const isCoding = exam.title?.toLowerCase().includes('coding') || exam.description?.toLowerCase().includes('coding');
            const isHybrid = exam.title?.toLowerCase().includes('hybrid') || exam.description?.toLowerCase().includes('hybrid');
            
            let timeStatus = 'Live Now';
            const now = new Date();
            if (exam.start_time && exam.end_time) {
              if (now < new Date(exam.start_time)) timeStatus = 'Coming Soon';
              else if (now > new Date(exam.end_time)) timeStatus = 'Closed';
            }

            return (
              <div key={exam.id} className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="exam-card-inner" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="exam-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="badge-subject" style={{
                        background: isMern ? '#e0f2fe' : '#f5f3ff',
                        color: isMern ? '#0284c7' : '#7c3aed',
                        borderColor: isMern ? '#bae6fd' : '#ddd6fe'
                      }}>
                        {isMern ? '⚡ MERN' : '🐙 GIT'}
                      </span>

                      {isCoding ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0'
                        }}>
                          💻 Live Coding
                        </span>
                      ) : isHybrid ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe'
                        }}>
                          ⚡ Theory + Code
                        </span>
                      ) : null}
                    </div>

                    <span className={`badge-status ${timeStatus === 'Live Now' ? 'badge-published' : 'badge-draft'}`}>
                      ● {timeStatus}
                    </span>
                  </div>

                  <h3 className="exam-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    {exam.title}
                  </h3>
                  
                  <p className="exam-description" style={{ flex: 1, color: '#475569', fontSize: '0.9rem', marginBottom: '16px', lineHeight: 1.5 }}>
                    {exam.description || 'Comprehensive evaluation assessment.'}
                  </p>

                  <div className="exam-meta" style={{ marginBottom: '20px' }}>
                    <div className="exam-meta-item">
                      <span>⏱️</span>
                      <span><strong>{exam.duration_minutes}m</strong> duration</span>
                    </div>
                    <div className="exam-meta-item">
                      <span>🎯</span>
                      <span><strong>{exam.total_marks}</strong> pts</span>
                    </div>
                    <div className="exam-meta-item">
                      <span>🛡️</span>
                      <span>Max <strong>{exam.max_warnings || 3}</strong> warnings</span>
                    </div>
                  </div>

                  {isTaken ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isExpelled ? '#fff1f2' : '#ecfdf5',
                        border: `1px solid ${isExpelled ? '#fecdd3' : '#a7f3d0'}`,
                        borderRadius: '10px',
                      }}>
                        <span style={{ fontSize: '0.8rem', color: isExpelled ? '#e11d48' : '#059669', fontWeight: 700 }}>
                          {isExpelled ? '❌ Expelled' : '✅ Evaluated'}
                        </span>
                        <strong style={{ 
                          fontSize: '0.95rem',
                          color: isExpelled ? '#e11d48' : '#059669'
                        }}>
                          {submission.score} / {submission.total_possible} ({submission.percentage}%)
                        </strong>
                      </div>

                      <Link 
                        href={`/dashboard/student/exam/${exam.id}`}
                        className="btn btn-ghost btn-sm w-full"
                        style={{ textAlign: 'center', fontSize: '0.8rem' }}
                      >
                        📝 Review Solutions & Answer Key →
                      </Link>
                    </div>
                  ) : (
                    <Link 
                      href={`/dashboard/student/exam/${exam.id}`} 
                      className={`btn ${submission?.status === 'in_progress' ? 'btn-ghost' : 'btn-primary'} btn-md w-full`}
                    >
                      {submission?.status === 'in_progress' ? '🔄 Resume Exam Session' : '🚀 Start Monitored Exam'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card-static" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              No {selectedTrack === 'all' ? 'Assigned' : selectedTrack.toUpperCase()} Exams Found
            </h3>
            <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto', fontSize: '0.9rem', marginBottom: '16px' }}>
              {selectedTrack === 'all' 
                ? `You do not have any active examinations assigned for your cohort (${userBatch || 'All Cohorts'}) at this time.`
                : `No published exams found under the ${selectedTrack === 'mern' ? 'MERN Stack' : 'Git & GitHub'} track.`}
            </p>
            {selectedTrack !== 'all' && (
              <button 
                type="button" 
                onClick={() => setSelectedTrack('all')}
                className="btn btn-ghost btn-sm"
              >
                View All Available Exams →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
