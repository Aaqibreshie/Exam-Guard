'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSubjectStyling } from '@/lib/subject-helpers';

export default function QuestionBankPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [qType, setQType] = useState('mcq');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qAnswer, setQAnswer] = useState('');
  const [qPoints, setQPoints] = useState(1);
  const [qSubject, setQSubject] = useState('General');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);

      const { data, error: fetchErr } = await supabase
        .from('question_bank')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setQuestions(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    
    try {
      let finalOptions = null;
      
      if (qType === 'mcq') {
        const filledOptions = qOptions.filter(o => o.trim() !== '');
        if (filledOptions.length < 2) throw new Error("MCQ needs at least 2 options.");
        if (!qAnswer) throw new Error("Please select the correct answer.");
        finalOptions = filledOptions;
      } else if (qType === 'coding') {
        finalOptions = { language: 'python' }; // Default for now
      }

      const newQ = {
        created_by: userId,
        question: qText,
        question_type: qType,
        options: finalOptions,
        correct_answer: qType === 'mcq' ? qAnswer : (qType === 'short_answer' ? qAnswer : null),
        points: qPoints,
        subject: qSubject
      };

      const { error: insErr } = await supabase
        .from('question_bank')
        .insert([newQ]);

      if (insErr) throw insErr;
      
      setShowAddModal(false);
      setQText('');
      setQOptions(['', '', '', '']);
      setQAnswer('');
      
      fetchQuestions();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this question from the bank?")) return;
    try {
      const { error: delErr } = await supabase.from('question_bank').delete().eq('id', id);
      if (delErr) throw delErr;
      setQuestions(q => q.filter(item => item.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="dashboard-title">📂 Global Question Bank</h1>
          <p className="dashboard-subtitle">Manage reusable questions for all your future exams.</p>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => setShowAddModal(true)}>
          ➕ Add to Bank
        </button>
      </div>

      {showAddModal && (
        <div className="glass-card-static" style={{ padding: '32px', marginBottom: '32px', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>New Question</h3>
            <button onClick={() => setShowAddModal(false)} className="btn btn-ghost">Cancel</button>
          </div>
          
          <form onSubmit={handleAddQuestion}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={qType} onChange={e => setQType(e.target.value)}>
                  <option value="mcq">Multiple Choice</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="coding">Live Coding (Python)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subject (e.g. Data Science)</label>
                <input className="form-input" value={qSubject} onChange={e => setQSubject(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Question Text</label>
              <textarea className="form-input" rows="3" value={qText} onChange={e => setQText(e.target.value)} required />
            </div>

            {qType === 'mcq' && (
              <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                <label className="form-label">Options (Mark Correct)</label>
                {qOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="radio" 
                      name="correct_ans"
                      checked={qAnswer === opt && opt !== ''}
                      onChange={() => setQAnswer(opt)}
                      disabled={!opt}
                    />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={`Option ${i+1}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...qOptions];
                        newOpts[i] = e.target.value;
                        setQOptions(newOpts);
                        if (qAnswer === opt) setQAnswer(e.target.value);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {qType === 'short_answer' && (
              <div className="form-group">
                <label className="form-label">Exact Correct Answer</label>
                <input className="form-input" value={qAnswer} onChange={e => setQAnswer(e.target.value)} required />
              </div>
            )}

            <div className="form-group" style={{ maxWidth: '200px' }}>
              <label className="form-label">Points</label>
              <input type="number" min="1" className="form-input" value={qPoints} onChange={e => setQPoints(parseInt(e.target.value))} required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Save to Bank'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading Question Bank...</div>
      ) : error ? (
        <div style={{ color: 'red', padding: '20px', background: '#fee2e2', borderRadius: '12px' }}>{error}</div>
      ) : questions.length === 0 ? (
        <div className="glass-card-static" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Your Bank is Empty</h3>
          <p style={{ color: '#64748b' }}>Start adding questions here to reuse them across multiple exams.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {questions.map(q => {
            const style = getSubjectStyling(q.subject);
            return (
              <div key={q.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge-subject" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
                      {style.label}
                    </span>
                    <span className="badge-subject" style={{ fontSize: '0.75rem', background: '#f8fafc', color: '#475569' }}>
                      {q.question_type.toUpperCase().replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{q.points} pts</span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 600 }}>{q.question}</h4>
                </div>
                <button onClick={() => handleDelete(q.id)} className="btn btn-ghost" style={{ color: '#ef4444' }}>
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
