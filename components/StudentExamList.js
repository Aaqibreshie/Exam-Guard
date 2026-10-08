'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { getSubjectStyling } from '@/lib/subject-helpers';

export default function StudentExamList({ exams = [], submissions = [], userBatch = '', userSubject = '' }) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState('all'); // 'all' | 'mern' | 'git'
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [selectedExamForPasscode, setSelectedExamForPasscode] = useState(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const handleStartAttempt = (exam, isResuming) => {
    if (exam.passcode && !isResuming) {
      setSelectedExamForPasscode(exam);
      setShowPasscodeModal(true);
      setPasscodeInput('');
      setPasscodeError('');
    } else {
      router.push(`/dashboard/student/exam/${exam.id}`);
    }
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcodeInput.trim() === selectedExamForPasscode.passcode) {
      router.push(`/dashboard/student/exam/${selectedExamForPasscode.id}`);
      setShowPasscodeModal(false);
    } else {
      setPasscodeError('Incorrect passcode. Please ask your instructor.');
    }
  };

  const uniqueSubjects = [...new Set(exams.map(e => e.subject || 'General'))].sort();

  const filteredExams = exams.filter(exam => {
    if (selectedTrack === 'all') return true;
    return (exam.subject || 'General') === selectedTrack;
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
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>All Available Exams</span></div> ({exams.length})
          </button>
          
          {uniqueSubjects.map(sub => {
            const count = exams.filter(e => (e.subject || 'General') === sub).length;
            const isSelected = selectedTrack === sub;
            const style = getSubjectStyling(sub);
            return (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedTrack(sub)}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: '20px',
                  fontWeight: 600,
                  background: isSelected ? style.color : style.bg,
                  color: isSelected ? '#ffffff' : style.color,
                  border: isSelected ? 'none' : `1px solid ${style.border}`
                }}
              >
                {style.label} ({count})
              </button>
            );
          })}
        </div>

        <span style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
          Showing {filteredExams.length} of {exams.length} paper{exams.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Exams Grid */}
      <div className="exam-grid">
        {filteredExams.length > 0 ? (
          filteredExams.map(exam => {
            const subjectStyle = getSubjectStyling(exam.subject);
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
                        background: subjectStyle.bg,
                        color: subjectStyle.color,
                        borderColor: subjectStyle.border
                      }}>
                        {subjectStyle.label}
                      </span>

                      {isCoding ? (
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="12" x="3" y="4" rx="2" ry="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg> Live Coding
                        </span>
                      ) : isHybrid ? (
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Theory + Code
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
                      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#94a3b8'}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                      <span><strong>{exam.duration_minutes}m</strong> duration</span>
                    </div>
                    <div className="exam-meta-item">
                      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#94a3b8'}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
                      <span><strong>{exam.total_marks}</strong> pts</span>
                    </div>
                    <div className="exam-meta-item">
                      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#94a3b8'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
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
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: isExpelled ? '#e11d48' : '#059669', fontWeight: 700 }}>
                          {isExpelled ? <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>Expelled</span></div> : <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Evaluated</span></div>}
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
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span>Review Solutions & Answer Key →</span></div>
                      </Link>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleStartAttempt(exam, submission?.status === 'in_progress')}
                      className={`btn ${submission?.status === 'in_progress' ? 'btn-ghost' : 'btn-primary'} btn-md w-full`}
                    >
                      {submission?.status === 'in_progress' ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c0-5.523 4.477-10 10-10 5.522 0 10 4.477 10 10 0 5.522-4.477 10-10 10-2.822 0-5.367-1.171-7.185-3.056"></path><path d="M3 13v5h5"></path></svg><span>Resume Exam Session</span></div> : <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg><span>Start Monitored Exam</span></div>}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card-static" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>
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

      {showPasscodeModal && selectedExamForPasscode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card-static" style={{ padding: '30px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}><div style={{display:'flex',alignItems:'center',gap:'8px'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Protected Exam</span></div></h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '20px' }}>
              Your instructor has protected this exam. Please enter the passcode provided to you.
            </p>
            <form onSubmit={handlePasscodeSubmit}>
              <input
                type="text"
                autoFocus
                placeholder="Enter Passcode..."
                className="form-input"
                style={{ marginBottom: '12px' }}
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value);
                  setPasscodeError('');
                }}
              />
              {passcodeError && (
                <div style={{ color: '#e11d48', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 600 }}>
                  {passcodeError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPasscodeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Verify & Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
