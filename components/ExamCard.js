'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSubjectStyling } from '@/lib/subject-helpers';

export default function ExamCard({ exam, role, href, onDeleted }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const subjectStyle = getSubjectStyling(exam.subject);

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({ 
          is_published: false,
          title: exam.title?.startsWith('[Archived]') ? exam.title : `[Archived] ${exam.title}`
        })
        .eq('id', exam.id);

      if (error) throw error;
      if (onDeleted) {
        onDeleted(exam.id);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(`Failed to remove exam: ${err.message}`);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const isCoding = exam.title?.toLowerCase().includes('coding') || exam.description?.toLowerCase().includes('coding');
  const isHybrid = exam.title?.toLowerCase().includes('hybrid') || exam.description?.toLowerCase().includes('hybrid');
  const displayTitle = exam.title?.replace(/^\[(Coding Practical|Hybrid Assessment|Theory MCQ)\]\s*/i, '');

  return (
    <>
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      <div className="glass-card" style={{ height: '100%', position: 'relative' }}>
        <div className="exam-card-inner">
          <div className="exam-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge-subject" style={{
                background: subjectStyle.bg,
                color: subjectStyle.color,
                borderColor: subjectStyle.border
              }}>
                {subjectStyle.label}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top"}}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Live Coding
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Theory + Code
                </span>
              ) : null}

              <span className={`badge-status ${exam.is_published ? 'badge-published' : 'badge-draft'}`}>
                {exam.is_published ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Published</> : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Draft</>}
              </span>
            </div>

            {role === 'teacher' && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600
                }}
                title="Delete this exam permanently"
              >
                {deleting ? '...' : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg> Delete</>}
              </button>
            )}
          </div>

          <h3 className="exam-title" style={{ marginTop: '12px' }}>{displayTitle}</h3>
          <p className="exam-description">
            {exam.description || 'No description provided for this exam.'}
          </p>

          <div className="exam-meta">
            <div className="exam-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>{exam.duration_minutes}m</span>
            </div>
            <div className="exam-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
              <span>{exam.total_marks} pts</span>
            </div>
            {exam.max_warnings && (
              <div className="exam-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>Max {exam.max_warnings} warnings</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>

    {showDeleteModal && (
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Archive Examination</h3>
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '24px' }}>
            Are you sure you want to remove <strong style={{color:'#0f172a'}}>"{displayTitle}"</strong>? 
            <br/><br/>
            This will remove the exam from active listings while safely preserving historical student submissions and answer keys in student records.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteModal(false);
              }}
              className="btn btn-ghost"
              style={{ padding: '10px 20px', fontWeight: 600, color: '#475569', background: '#f1f5f9' }}
              disabled={deleting}
            >
              Cancel
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmDelete();
              }}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontWeight: 600, background: '#ef4444', borderColor: '#ef4444', color: 'white' }}
              disabled={deleting}
            >
              {deleting ? 'Archiving...' : 'Yes, Archive Exam'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
