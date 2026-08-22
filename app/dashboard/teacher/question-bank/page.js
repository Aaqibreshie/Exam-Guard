'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSubjectStyling } from '@/lib/subject-helpers';
import { autoDetectAndParse } from '@/lib/question-parser';

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
    if (!bulkInput.trim()) return alert('Please enter question data');
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
      
      alert(`Successfully imported ${toInsert.length} questions into the bank!`);
      setBulkInput('');
      setShowAddModal(false);
      fetchQuestions();
    } catch (err) {
      alert(err.message);
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCreationMode('single')} 
                className={`btn btn-sm ${creationMode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
              >
                ✏️ Single Form
              </button>
              <button 
                onClick={() => setCreationMode('bulk')} 
                className={`btn btn-sm ${creationMode === 'bulk' ? 'btn-primary' : 'btn-ghost'}`}
              >
                ⚡ Bulk Import
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm" style={{ marginLeft: '12px' }}>Cancel</button>
            </div>
          </div>
          
          {creationMode === 'bulk' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Load Template:</span>
                <button type="button" onClick={() => loadSampleTemplate('coding')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ecfdf5', color: '#059669' }}>
                  💻 Coding JSON
                </button>
                <button type="button" onClick={() => loadSampleTemplate('json')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#f5f3ff', color: '#7c3aed' }}>
                  🔘 MCQ JSON
                </button>
              </div>
              <textarea 
                className="form-input" 
                rows="12" 
                value={bulkInput} 
                onChange={e => setBulkInput(e.target.value)} 
                placeholder="Paste your JSON array of questions here..."
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
              <button onClick={handleBulkImport} className="btn btn-primary" style={{ marginTop: '16px' }} disabled={bulkLoading}>
                {bulkLoading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          ) : (
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
          )}
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
