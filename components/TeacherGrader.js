'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TeacherGrader({ submissionId, examId, onGradeUpdated }) {
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    fetchReviewData();
  }, [submissionId]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/student/review?submission_id=${submissionId}`);
      if (!res.ok) throw new Error('Failed to fetch submission details');
      const data = await res.json();
      setBreakdown(data.breakdown || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePointChange = (qId, newPoints) => {
    setBreakdown(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, points_earned: Number(newPoints) };
      }
      return q;
    }));
  };

  const handleCorrectToggle = (qId, isCorrect) => {
    setBreakdown(prev => prev.map(q => {
      if (q.id === qId) {
        return { 
          ...q, 
          is_correct: isCorrect,
          points_earned: isCorrect ? q.points : (isCorrect === false ? 0 : q.points_earned)
        };
      }
      return q;
    }));
  };

  const saveGrades = async () => {
    try {
      setSaving(true);
      
      // 1. Update answers table
      for (const q of breakdown) {
        const { error } = await supabase
          .from('answers')
          .update({
            is_correct: q.is_correct,
            points_earned: q.points_earned
          })
          .eq('submission_id', submissionId)
          .eq('question_id', q.id);
          
        if (error) throw error;
      }

      // 2. Recalculate total score
      const newTotalScore = breakdown.reduce((acc, q) => acc + (q.points_earned || 0), 0);
      const totalPossible = breakdown.reduce((acc, q) => acc + (q.points || 1), 0);
      const newPercentage = totalPossible > 0 ? Math.round((newTotalScore / totalPossible) * 100) : 0;
      
      // Assume pass if percentage >= 50, but we just save the score
      const { error: subErr } = await supabase
        .from('submissions')
        .update({
          score: newTotalScore,
          total_possible: totalPossible,
          percentage: newPercentage
        })
        .eq('id', submissionId);
        
      if (subErr) throw subErr;

      if (onGradeUpdated) {
        onGradeUpdated();
      }
      
      alert('Grades saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving grades: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 10px auto', width: '20px', height: '20px' }}></div>
        Loading submission details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#e11d48' }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px', background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <strong style={{ color: '#0f172a', fontSize: '1rem' }}>
          📝 Manual Grading Interface
        </strong>
        <button 
          onClick={saveGrades} 
          disabled={saving}
          className="btn btn-primary btn-sm"
        >
          {saving ? 'Saving...' : 'Save & Recalculate Grades'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {breakdown.map((q, idx) => {
          const hasAnswered = q.student_answer && String(q.student_answer).trim() !== '';
          const isPending = q.is_correct === null;

          return (
            <div
              key={q.id}
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                background: isPending ? '#fffbeb' : '#f8fafc',
                border: `1px solid ${isPending ? '#fde68a' : '#e2e8f0'}`,
                borderLeft: `4px solid ${q.is_correct === true ? '#059669' : q.is_correct === false ? '#e11d48' : '#d97706'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    Q{idx + 1}.
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: '#e2e8f0', color: '#475569', textTransform: 'uppercase', fontWeight: 600 }}>
                    {q.question_type}
                  </span>
                  {isPending && (
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', fontWeight: 700 }}>
                      ⏳ Needs Grading
                    </span>
                  )}
                </div>
                
                {/* Grading Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Points:</label>
                    <input 
                      type="number" 
                      min="0"
                      max={q.points || 1}
                      value={q.points_earned !== undefined ? q.points_earned : 0}
                      onChange={(e) => handlePointChange(q.id, e.target.value)}
                      style={{ width: '50px', padding: '4px 6px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/ {q.points || 1}</span>
                  </div>
                  
                  <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }}></div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={() => handleCorrectToggle(q.id, true)}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        background: q.is_correct === true ? '#10b981' : '#f1f5f9',
                        color: q.is_correct === true ? '#ffffff' : '#64748b',
                        border: `1px solid ${q.is_correct === true ? '#059669' : '#cbd5e1'}`
                      }}
                    >
                      ✓ Correct
                    </button>
                    <button 
                      onClick={() => handleCorrectToggle(q.id, false)}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        background: q.is_correct === false ? '#ef4444' : '#f1f5f9',
                        color: q.is_correct === false ? '#ffffff' : '#64748b',
                        border: `1px solid ${q.is_correct === false ? '#dc2626' : '#cbd5e1'}`
                      }}
                    >
                      ✗ Incorrect
                    </button>
                  </div>
                </div>
              </div>

              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                {q.question_text}
              </p>

              {/* Student Answer */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Student&apos;s Answer:</div>
                {hasAnswered ? (
                  q.question_type === 'coding' || q.question_type === 'project' ? (
                    <pre style={{ margin: 0, padding: '12px', background: '#040711', borderRadius: '8px', fontSize: '0.85rem', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {q.student_answer}
                    </pre>
                  ) : (
                    <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#0f172a' }}>
                      {q.student_answer}
                    </div>
                  )
                ) : (
                  <div style={{ color: '#991b1b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    (No answer submitted)
                  </div>
                )}
              </div>

              {/* Reference Answer */}
              {q.correct_answer && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: '4px' }}>Reference Answer:</div>
                  {q.question_type === 'coding' || q.question_type === 'project' ? (
                    <pre style={{ margin: 0, padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#166534', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {q.correct_answer}
                    </pre>
                  ) : (
                    <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.9rem', color: '#166534' }}>
                      {q.correct_answer}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
