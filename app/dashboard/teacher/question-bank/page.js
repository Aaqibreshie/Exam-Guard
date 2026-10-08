'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSubjectStyling } from '@/lib/subject-helpers';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import { autoDetectAndParse } from '@/lib/question-parser';

export default function QuestionBankPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "", isError: false });
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", message: "", isDanger: false, onConfirm: null });

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
  // Bulk Import State
  const [creationMode, setCreationMode] = useState('single'); // 'single' | 'bulk'
  const [bulkInput, setBulkInput] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadSampleTemplate = (format) => {
    if (format === 'coding') {
      setBulkInput(JSON.stringify([
        {
          "question": "Write a function `reverseArray(arr)` that returns a new array with elements in reversed order.",
          "type": "coding",
          "starter_code": "function reverseArray(arr) {\n  // Your code here\n  return arr.reverse();\n}",
          "test_cases": [
            { "input": "[1, 2, 3, 4, 5]", "expected": "[5, 4, 3, 2, 1]", "hidden": false }
          ],
          "points": 5,
          "subject": "JavaScript"
        }
      ], null, 2));
    } else if (format === 'json') {
      setBulkInput(JSON.stringify([
        {
          "question": "What is the primary role of the virtual DOM in React?",
          "type": "mcq",
          "options": ["Direct manipulation of native DOM nodes", "In-memory representation", "Node.js APIs", "MongoDB"],
          "answer": "In-memory representation",
          "points": 2,
          "subject": "MERN"
        }
      ], null, 2));
    } else if (format === 'csv') {
      setBulkInput("Question,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Points\nWhat command creates a Git branch?,git branch -new,git checkout -b,git switch -c,git branch --create,git checkout -b,2\nWhich middleware parses JSON?,express.urlencoded(),express.json(),bodyParser.text(),express.static(),express.json(),1");
    } else if (format === 'txt') {
      setBulkInput("1. What hook is used in React to manage state?\nA) useEffect\nB) useState\nC) useContext\nD) useReducer\nAnswer: B\nPoints: 1\n\n2. Explain what a closure is in JavaScript.\nCorrect Answer: A function that remembers its outer lexical environment.\nPoints: 2");
    }
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return showAlert('Please enter question data', 'Input Required', true);
    setBulkLoading(true);
    try {
      let parsed = [];
      try {
        parsed = autoDetectAndParse(bulkInput);
        if (!parsed || parsed.length === 0) throw new Error("Could not detect any valid questions.");
      } catch (err) {
        throw new Error("Failed to parse format: " + err.message);
      }

      const toInsert = parsed.map((q, i) => {
        let qLanguage = 'python';
        if (qSubject && qSubject.toLowerCase().includes('javascript')) qLanguage = 'javascript';
        if (qSubject && qSubject.toLowerCase().includes('java') && !qSubject.toLowerCase().includes('script')) qLanguage = 'java';
        
        const isCodeType = q.question_type === 'coding' || q.question_type === 'project';
        const finalOptions = isCodeType ? { language: qLanguage } : (q.options || null);

        return {
          created_by: userId,
          question: q.question_text || `Imported Question ${i + 1}`,
          question_type: q.question_type || 'mcq',
          options: finalOptions,
          correct_answer: q.correct_answer || null,
          points: q.points || 1,
          subject: qSubject || 'General',
          starter_code: q.starter_code || null,
          test_cases: q.test_cases || []
        };
      });

      const { error: insErr } = await supabase
        .from('question_bank')
        .insert(toInsert);

      if (insErr) throw insErr;
      
      showAlert(`Successfully imported ${toInsert.length} questions into the bank!`, 'Success');
      setBulkInput('');
      setShowAddModal(false);
      fetchQuestions();
    } catch (err) {
      showAlert(err.message, 'Error', true);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setBulkInput(content);
      }
    };
    reader.readAsText(file);
  };

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
      setQSubject('General');
      
      fetchQuestions();
    } catch (err) {
      showAlert(err.message, 'Error', true);
    } finally {
      setAddLoading(false);
    }
  };


  const [editingQuestion, setEditingQuestion] = useState(null);

  const startEdit = (q) => {
    setEditingQuestion(q);
    setQType(q.question_type);
    setQText(q.question);
    
    if (q.question_type === 'mcq') {
      const opts = q.options || [];
      setQOptions([opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || '']);
    } else {
      setQOptions(['', '', '', '']);
    }
    
    setQAnswer(q.correct_answer || '');
    setQPoints(q.points);
    setQSubject(q.subject || 'General');
    setShowAddModal(true);
    setCreationMode('single');
  };

  const handleUpdateQuestion = async (e) => {
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
        finalOptions = editingQuestion.options || { language: 'python' };
      }

      const updatedQ = {
        question: qText,
        question_type: qType,
        options: finalOptions,
        correct_answer: qType === 'mcq' ? qAnswer : (qType === 'short_answer' ? qAnswer : null),
        points: qPoints,
        subject: qSubject
      };

      const { error: updErr, data: updData } = await supabase
        .from('question_bank')
        .update(updatedQ)
        .eq('id', editingQuestion.id)
        .select();
        
      if (updData && updData.length === 0) {
        showAlert("Warning: 0 rows were updated. You might not have permission to edit this question (e.g., if another teacher created it).", 'Permission Denied', true);
      }

      if (updErr) throw updErr;
      
      setShowAddModal(false);
      setEditingQuestion(null);
      setQText('');
      setQOptions(['', '', '', '']);
      setQAnswer('');
      setQSubject('General');
      
      // Update state with exact DB return to avoid cache issues
      if (updData && updData.length > 0) {
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? updData[0] : q));
      }
    } catch (err) {
      showAlert(err.message, 'Error', true);
    } finally {
      setAddLoading(false);
    }
  };

  const triggerDelete = (id) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Question',
      message: 'Remove this question from the bank? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const { error: delErr } = await supabase.from('question_bank').delete().eq('id', id);
          if (delErr) throw delErr;
          setQuestions(q => q.filter(item => item.id !== id));
        } catch (err) {
          showAlert(err.message, 'Error', true);
        }
      }
    });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#059669" }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Global Question Bank</h1>
          <p className="dashboard-subtitle">Manage reusable questions for all your future exams.</p>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => setShowAddModal(true)}>
          ➕ Add to Bank
        </button>
      </div>

      {showAddModal && (
        <div className="glass-card-static" style={{ padding: '32px', marginBottom: '32px', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{editingQuestion ? <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg> Edit Question</> : 'New Question'}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCreationMode('single')} 
                className={`btn btn-sm ${creationMode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg> Single Form
              </button>
              <button 
                onClick={() => setCreationMode('bulk')} 
                className={`btn btn-sm ${creationMode === 'bulk' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg><span>Bulk Import</span></div>
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm" style={{ marginLeft: '12px' }}>Cancel</button>
            </div>
          </div>
          
          {creationMode === 'bulk' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Load Template:</span>
                <button type="button" onClick={() => loadSampleTemplate('coding')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ecfdf5', color: '#059669' }}>
                  <div style={{display:'flex',alignItems:'center',gap:'4px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg><span>Coding JSON</span></div>
                </button>
                <button type="button" onClick={() => loadSampleTemplate('json')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#f5f3ff', color: '#7c3aed' }}>
                  <div style={{display:'flex',alignItems:'center',gap:'4px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg><span>MCQ JSON</span></div>
                </button>
                <button type="button" onClick={() => loadSampleTemplate('csv')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fffbeb', color: '#b45309' }}>
                  <div style={{display:'flex',alignItems:'center',gap:'4px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg><span>CSV</span></div>
                </button>
                <button type="button" onClick={() => loadSampleTemplate('txt')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1' }}>
                  <div style={{display:'flex',alignItems:'center',gap:'4px'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span>Raw Text</span></div>
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <input type="file" accept=".json,.csv,.txt" onChange={handleFileUpload} className="form-input" style={{ padding: '8px' }} />
              </div>

              <textarea 
                className="form-input" 
                rows="12" 
                value={bulkInput} 
                onChange={e => setBulkInput(e.target.value)} 
                placeholder="Paste your JSON, CSV, or Raw Text questions here..."
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
              <button onClick={handleBulkImport} className="btn btn-primary" style={{ marginTop: '16px' }} disabled={bulkLoading}>
                {bulkLoading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          ) : (
            <form onSubmit={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
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
              {addLoading ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Save to Bank')}
            </button>
          </form>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading Question Bank...</div>
      ) : error ? (
        <div style={{ color: 'red', padding: '20px', background: '#fee2e2', borderRadius: '12px' }}>{error}</div>
      ) : questions.length === 0 ? (
        <div className="glass-card-static" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg></div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Your Bank is Empty</h3>
          <p style={{ color: '#64748b' }}>Start adding questions here to reuse them across multiple exams.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {questions.map(q => {
            const style = getSubjectStyling(q.subject);
            return (
              <div key={q.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={() => startEdit(q)} className="btn btn-ghost" title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, borderRadius: '8px', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#059669'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                  </button>
                  <button onClick={() => triggerDelete(q.id)} className="btn btn-ghost" title="Delete" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, borderRadius: '8px', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        isError={alertConfig.isError}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        confirmText="Confirm"
      />
    </div>
  );
}
