'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function PracticeArenaPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'solved', 'unsolved'

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch Question Bank
      const { data: qbData, error: qbErr } = await supabase
        .from('question_bank')
        .select('id, question, question_type, subject, difficulty, points, created_at')
        .order('created_at', { ascending: false });

      if (qbErr) throw qbErr;

      // 2. Fetch User's Attempts to see what they solved
      const { data: attData, error: attErr } = await supabase
        .from('practice_attempts')
        .select('question_id')
        .eq('student_id', user.id)
        .eq('is_correct', true);

      if (attErr) throw attErr;

      const solvedSet = new Set(attData.map(a => a.question_id));
      
      setQuestions(qbData || []);
      setAttempts(solvedSet);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getDifficultyColor = (diff) => {
    switch ((diff || 'Medium').toLowerCase()) {
      case 'easy': return { bg: '#dcfce7', color: '#166534' };
      case 'hard': return { bg: '#fee2e2', color: '#991b1b' };
      case 'medium':
      default: return { bg: '#fef3c7', color: '#92400e' };
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filterSubject && (!q.subject || !q.subject.toLowerCase().includes(filterSubject.toLowerCase()))) return false;
    if (filterDifficulty && (q.difficulty || 'Medium').toLowerCase() !== filterDifficulty.toLowerCase()) return false;
    
    const isSolved = attempts.has(q.id);
    if (filterStatus === 'solved' && !isSolved) return false;
    if (filterStatus === 'unsolved' && isSolved) return false;
    
    return true;
  });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="dashboard-title">🌎 Global Practice Arena</h1>
          <p className="dashboard-subtitle">Browse and solve coding problems at your own pace.</p>
        </div>
      </div>

      <div className="glass-card-static" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search by Subject (e.g. JavaScript)" 
            className="form-input" 
            style={{ maxWidth: '250px' }}
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
          />
          <select 
            className="form-input" 
            style={{ maxWidth: '180px' }}
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select 
            className="form-input" 
            style={{ maxWidth: '180px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="solved">✅ Solved</option>
            <option value="unsolved">❌ Unsolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading problems...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div className="glass-card-static" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '16px 24px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px 24px', color: '#475569', fontWeight: 600 }}>Title</th>
                <th style={{ padding: '16px 24px', color: '#475569', fontWeight: 600 }}>Subject</th>
                <th style={{ padding: '16px 24px', color: '#475569', fontWeight: 600 }}>Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q, idx) => {
                const isSolved = attempts.has(q.id);
                const diffStyle = getDifficultyColor(q.difficulty);
                
                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px 24px' }}>
                      {isSolved ? (
                        <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✅</span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '1.2rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <Link 
                        href={`/dashboard/student/practice/${q.id}`} 
                        style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}
                        className="hover-underline"
                      >
                        {idx + 1}. {q.question.length > 80 ? q.question.substring(0, 80) + '...' : q.question}
                      </Link>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        {q.subject || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ background: diffStyle.bg, color: diffStyle.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                        {q.difficulty || 'Medium'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No problems found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hover-underline:hover { text-decoration: underline !important; color: #4f46e5 !important; }
        tr:hover { background-color: #f8fafc; }
      `}} />
    </div>
  );
}
