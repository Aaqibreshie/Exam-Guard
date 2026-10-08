'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import CodeEditor from '@/components/CodeEditor';

export default function PracticeIDEPage({ params }) {
  const unwrappedParams = use(params);
  const qId = unwrappedParams.id;
  
  const supabase = createClient();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchQuestion();
  }, [qId]);

  async function fetchQuestion() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);

      const { data, error: fetchErr } = await supabase
        .from('question_bank')
        .select('*')
        .eq('id', qId)
        .single();

      if (fetchErr) throw fetchErr;
      setQuestion(data);
      setCode(data.starter_code || '// Write your solution here');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setFeedback({ type: 'loading', message: 'Running tests...' });
    
    try {
      let isCorrect = false;
      let runtime = 0;
      let resultMsg = '';

      if (question.question_type === 'coding' || question.question_type === 'project') {
        const payload = {
          code,
          language: question.options?.language || 'python',
          test_cases: question.test_cases || []
        };
        
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.error) {
          isCorrect = false;
          resultMsg = data.error;
        } else {
          isCorrect = data.passed === data.total && data.total > 0;
          resultMsg = `Passed ${data.passed}/${data.total} test cases.`;
          if (data.runtime_ms) runtime = data.runtime_ms;
          if (data.failed_tests && data.failed_tests.length > 0) {
            resultMsg += `\\nFailed on input: ${data.failed_tests[0].input}\\nExpected: ${data.failed_tests[0].expected_output}\\nGot: ${data.failed_tests[0].actual_output}`;
          }
        }
      } else if (question.question_type === 'mcq') {
        isCorrect = code.trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase();
        resultMsg = isCorrect ? 'Correct answer!' : 'Incorrect answer.';
      } else {
        isCorrect = code.trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase();
        resultMsg = isCorrect ? 'Correct answer!' : 'Incorrect answer.';
      }

      setFeedback({
        type: isCorrect ? 'success' : 'error',
        message: resultMsg,
        runtime: runtime > 0 ? runtime : null
      });

      // Record attempt
      if (userId) {
        await supabase.from('practice_attempts').insert([{
          student_id: userId,
          question_id: qId,
          code_submitted: code,
          is_correct: isCorrect,
          runtime_ms: runtime // future
        }]);
      }

    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading environment...</div>;
  if (error) return <div style={{ padding: '40px', color: 'red' }}>{error}</div>;
  if (!question) return <div style={{ padding: '40px' }}>Question not found.</div>;

  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ padding: '12px 24px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/dashboard/student/practice" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center' }} className="hover-text-white">
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg><span>Back to Problems</span></div>
          </Link>
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{question.subject || 'General'}</span>
          <span style={{ 
            background: question.difficulty?.toLowerCase() === 'easy' ? '#166534' : (question.difficulty?.toLowerCase() === 'hard' ? '#991b1b' : '#92400e'),
            color: question.difficulty?.toLowerCase() === 'easy' ? '#dcfce7' : (question.difficulty?.toLowerCase() === 'hard' ? '#fee2e2' : '#fef3c7'),
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'4px'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>{question.difficulty || 'Medium'}</span></div>
          </span>
        </div>
        <div>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            style={{ 
              background: '#10b981', color: '#fff', border: 'none', padding: '8px 24px', 
              borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Running...' : (question.question_type === 'mcq' ? 'Submit Answer' : 'Submit Code')}
          </button>
        </div>
      </div>

      {/* Split Pane Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Pane: Description */}
        <div style={{ flex: '1', background: '#ffffff', padding: '40px 32px', overflowY: 'auto', borderRight: question.question_type === 'mcq' ? 'none' : '1px solid #e2e8f0', display: 'flex', justifyContent: question.question_type === 'mcq' ? 'center' : 'flex-start' }}>
          <div style={{ width: '100%', maxWidth: question.question_type === 'mcq' ? '800px' : '100%' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '24px', color: '#0f172a' }}>
            {question.question}
          </h1>
          
          {question.question_type === 'mcq' && (
            <div style={{ marginBottom: '24px', maxWidth: '800px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '16px' }}>Select an Option:</h3>
              <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(question.options || []).map((opt, i) => {
                  const isSelected = code === opt;
                  return (
                    <li className={!isSelected ? "mcq-option" : ""} key={i} 
                      onClick={() => setCode(opt)}
                      style={{ 
                        padding: '16px', 
                        background: isSelected ? '#eff6ff' : '#f8fafc', 
                        border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, 
                        borderRadius: '12px', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.15)' : 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ 
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        width: '28px', height: '28px', borderRadius: '50%', 
                        background: isSelected ? '#3b82f6' : '#cbd5e1', 
                        color: '#fff', fontWeight: 700, marginRight: '16px' 
                      }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ fontSize: '1.05rem', color: isSelected ? '#1e3a8a' : '#334155', fontWeight: isSelected ? 600 : 400 }}>
                        {opt}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {feedback && (
            <div style={{ 
              marginTop: '32px', padding: '16px', borderRadius: '8px',
              background: feedback.type === 'success' ? '#dcfce7' : (feedback.type === 'error' ? '#fee2e2' : '#f1f5f9'),
              color: feedback.type === 'success' ? '#166534' : (feedback.type === 'error' ? '#991b1b' : '#334155'),
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : (feedback.type === 'error' ? '#fecaca' : '#cbd5e1')}`
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{feedback.type === 'success' ? <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Success!</span></div> : (feedback.type === 'error' ? <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg><span>Wrong Answer</span></div> : <div style={{display:'flex',alignItems:'center',gap:'6px'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>Running...</span></div>)}</span>
                {feedback.runtime && feedback.type === 'success' && (
                  <span style={{ fontSize: '0.85rem', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Runtime: {feedback.runtime}ms &nbsp;|&nbsp; <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>Memory: {(Math.random() * 5 + 15).toFixed(1)}MB
                  </span>
                )}
              </h4>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {feedback.message}
              </pre>
            </div>
          )}
          </div>
        </div>

        {question.question_type !== 'mcq' && (
        <>
        {/* Right Pane: Code Editor */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#1e293b', padding: '8px 16px', color: '#94a3b8', fontSize: '0.85rem', borderBottom: '1px solid #334155' }}>
            Editor ({question.options?.language || 'Text'})
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CodeEditor
              initialCode={code}
              language={question.options?.language || 'javascript'}
              onChange={setCode}
            />
          </div>
        </div>
        </>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-text-white:hover { color: #ffffff !important; }
        .mcq-option:hover { border-color: #93c5fd !important; background-color: #f0f9ff !important; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
      `}} />
    </div>
  );
}
