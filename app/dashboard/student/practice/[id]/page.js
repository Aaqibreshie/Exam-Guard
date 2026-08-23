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
        message: resultMsg
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
          <Link href="/dashboard/student/practice" style={{ color: '#94a3b8', textDecoration: 'none' }}>
            ← Back to Problems
          </Link>
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{question.subject || 'General'}</span>
          <span style={{ 
            background: question.difficulty?.toLowerCase() === 'easy' ? '#166534' : (question.difficulty?.toLowerCase() === 'hard' ? '#991b1b' : '#92400e'),
            color: question.difficulty?.toLowerCase() === 'easy' ? '#dcfce7' : (question.difficulty?.toLowerCase() === 'hard' ? '#fee2e2' : '#fef3c7'),
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 
          }}>
            {question.difficulty || 'Medium'}
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
            {submitting ? 'Running...' : 'Submit Code'}
          </button>
        </div>
      </div>

      {/* Split Pane Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Pane: Description */}
        <div style={{ flex: '1', background: '#ffffff', padding: '32px', overflowY: 'auto', borderRight: '1px solid #e2e8f0' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '24px', color: '#0f172a' }}>
            {question.question}
          </h1>
          
          {question.question_type === 'mcq' && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>Options:</h3>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {(question.options || []).map((opt, i) => (
                  <li key={i} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, marginRight: '12px', color: '#64748b' }}>{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '24px', color: '#64748b', fontSize: '0.9rem' }}>
                * Type your answer exactly (or the exact option text) into the editor on the right and click Submit.
              </p>
            </div>
          )}

          {feedback && (
            <div style={{ 
              marginTop: '32px', padding: '16px', borderRadius: '8px',
              background: feedback.type === 'success' ? '#dcfce7' : (feedback.type === 'error' ? '#fee2e2' : '#f1f5f9'),
              color: feedback.type === 'success' ? '#166534' : (feedback.type === 'error' ? '#991b1b' : '#334155'),
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : (feedback.type === 'error' ? '#fecaca' : '#cbd5e1')}`
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '1.1rem' }}>
                {feedback.type === 'success' ? '✅ Success!' : (feedback.type === 'error' ? '❌ Wrong Answer' : '⏳ Running...')}
              </h4>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {feedback.message}
              </pre>
            </div>
          )}
        </div>

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

      </div>
    </div>
  );
}
