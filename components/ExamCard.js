'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSubjectStyling } from '@/lib/subject-helpers';

export default function ExamCard({ exam, role, href, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const subjectStyle = getSubjectStyling(exam.subject);

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to remove "${exam.title}"?\n\nThis will remove the exam from active listings while preserving historical student scores and question answers in student records.`)) {
      return;
    }

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
    }
  };

  const isCoding = exam.title?.toLowerCase().includes('coding') || exam.description?.toLowerCase().includes('coding');
  const isHybrid = exam.title?.toLowerCase().includes('hybrid') || exam.description?.toLowerCase().includes('hybrid');
  const displayTitle = exam.title?.replace(/^\[(Coding Practical|Hybrid Assessment|Theory MCQ)\]\s*/i, '');

  return (
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

              <span className={`badge-status ${exam.is_published ? 'badge-published' : 'badge-draft'}`}>
                {exam.is_published ? '● Published' : '○ Draft'}
              </span>
            </div>

            {role === 'teacher' && (
              <button
                type="button"
                onClick={handleDelete}
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
                {deleting ? '...' : '🗑️ Delete'}
              </button>
            )}
          </div>

          <h3 className="exam-title" style={{ marginTop: '12px' }}>{exam.title}</h3>
          <p className="exam-description">
            {exam.description || 'No description provided for this exam.'}
          </p>

          <div className="exam-meta">
            <div className="exam-meta-item">
              <span>⏱️</span>
              <span>{exam.duration_minutes}m</span>
            </div>
            <div className="exam-meta-item">
              <span>🎯</span>
              <span>{exam.total_marks} pts</span>
            </div>
            {exam.max_warnings && (
              <div className="exam-meta-item">
                <span>🛡️</span>
                <span>Max {exam.max_warnings} warnings</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
