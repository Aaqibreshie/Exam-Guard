'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CodeEditor from '@/components/CodeEditor';
import { runTestCases } from '@/lib/code-runner';

export default function MockTestPage() {
  const router = useRouter();

  // Configuration State
  const [selectedTopic, setSelectedTopic] = useState('js');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [format, setFormat] = useState('balanced');
  const [questionCount, setQuestionCount] = useState(5);
  const [duration, setDuration] = useState(15);
  const [mode, setMode] = useState('practice'); // 'practice' | 'proctored'
  const [userApiKey, setUserApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Test Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [activeTest, setActiveTest] = useState(null); // The generated mock test
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [hintsUnlocked, setHintsUnlocked] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStartTime, setTestStartTime] = useState(null);

  // Results State
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [mockHistory, setMockHistory] = useState([]);

  // Load past mock test history and saved API key from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('examguard_mock_history');
      if (saved) {
        setMockHistory(JSON.parse(saved));
      }
      const savedKey = localStorage.getItem('examguard_gemini_key');
      if (savedKey) {
        setUserApiKey(savedKey);
      }
    } catch (e) {
      console.warn('Could not load mock history:', e);
    }
  }, []);

  // Timer countdown during active test
  useEffect(() => {
    if (!activeTest || evaluationResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleFinishTest(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest, evaluationResult, timeLeft]);

  // Handle Generating Mock Test
  const handleGenerateTest = async () => {
    setIsGenerating(true);
    setGenError('');

    try {
      if (userApiKey) {
        try { localStorage.setItem('examguard_gemini_key', userApiKey.trim()); } catch (e) {}
      }

      const res = await fetch('/api/student/generate-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          customTopic,
          difficulty,
          format,
          count: questionCount,
          duration,
          userApiKey: userApiKey.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize mock test');
      }

      const mock = data.mockTest;
      setActiveTest(mock);
      setTimeLeft(mock.duration_minutes * 60);
      setTestStartTime(Date.now());
      setCurrentQIndex(0);
      setStudentAnswers({});
      setHintsUnlocked({});
      setEvaluationResult(null);
    } catch (err) {
      console.error('Error generating mock test:', err);
      setGenError(err.message || 'An error occurred while generating the test.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Answer recording
  const handleAnswerChange = (qId, val) => {
    setStudentAnswers(prev => ({
      ...prev,
      [qId]: val
    }));
  };

  const toggleHint = (qId) => {
    setHintsUnlocked(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  // Submit and Evaluate Mock Test
  const handleFinishTest = async (auto = false) => {
    if (!activeTest) return;
    if (!auto && !confirm('Are you ready to submit your AI Mock Test for evaluation?')) {
      return;
    }

    setIsEvaluating(true);

    try {
      const breakdown = [];
      let totalEarned = 0;
      let totalPossible = 0;
      let codingTestsPassed = 0;
      let totalCodingTests = 0;

      for (const q of activeTest.questions) {
        const qPoints = q.points || 1;
        totalPossible += qPoints;
        const studentAns = studentAnswers[q.id];
        let isCorrect = false;
        let pointsEarned = 0;
        let testCaseResults = null;

        if (q.question_type === 'mcq') {
          isCorrect = studentAns && String(studentAns).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
          pointsEarned = isCorrect ? qPoints : 0;
        } else if (q.question_type === 'short_answer') {
          isCorrect = studentAns && (
            String(studentAns).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase() ||
            String(studentAns).toLowerCase().includes(String(q.correct_answer).toLowerCase().split(' ')[0])
          );
          pointsEarned = isCorrect ? qPoints : (studentAns ? Math.round(qPoints * 0.5) : 0);
        } else if (q.question_type === 'coding' || q.question_type === 'project') {
          const codeToRun = studentAns || q.starter_code || '';
          if (q.test_cases && q.test_cases.length > 0) {
            totalCodingTests += q.test_cases.length;
            const evalRun = await runTestCases(codeToRun, q.test_cases);
            testCaseResults = evalRun;
            codingTestsPassed += evalRun.passedTests;
            const ratio = evalRun.totalTests > 0 ? evalRun.passedTests / evalRun.totalTests : 0;
            pointsEarned = Math.round(qPoints * ratio);
            isCorrect = evalRun.passPercentage === 100;
          } else {
            isCorrect = !!studentAns && studentAns.length > 10;
            pointsEarned = isCorrect ? qPoints : 0;
          }
        }

        totalEarned += pointsEarned;

        breakdown.push({
          ...q,
          student_answer: studentAns || '',
          is_correct: isCorrect,
          points_earned: pointsEarned,
          test_case_results: testCaseResults
        });
      }

      const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
      const timeSpentSec = Math.max(1, Math.round((Date.now() - (testStartTime || Date.now())) / 1000));
      const timeSpentFormatted = `${Math.floor(timeSpentSec / 60)}m ${timeSpentSec % 60}s`;

      // Generate AI Diagnostic feedback
      const feedback = generateAiDiagnostic(activeTest.topic, percentage, breakdown);

      const resultPayload = {
        testId: activeTest.id,
        title: activeTest.title,
        topic: activeTest.topic,
        difficulty: activeTest.difficulty,
        score: totalEarned,
        totalPossible,
        percentage,
        timeSpent: timeSpentFormatted,
        completedAt: new Date().toISOString(),
        feedback,
        breakdown
      };

      setEvaluationResult(resultPayload);

      // Save to local history
      const updatedHistory = [
        {
          id: resultPayload.testId,
          title: resultPayload.title,
          topic: resultPayload.topic,
          difficulty: resultPayload.difficulty,
          percentage: resultPayload.percentage,
          score: `${totalEarned}/${totalPossible}`,
          completedAt: resultPayload.completedAt
        },
        ...mockHistory
      ].slice(0, 10); // keep last 10

      setMockHistory(updatedHistory);
      localStorage.setItem('examguard_mock_history', JSON.stringify(updatedHistory));
    } catch (err) {
      console.error('Error evaluating mock test:', err);
      alert('Error scoring mock test: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper: AI Diagnostic Generator
  const generateAiDiagnostic = (topic, percentage, breakdown) => {
    let summary = '';
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];

    const mcqCorrect = breakdown.filter(b => b.question_type === 'mcq' && b.is_correct).length;
    const mcqTotal = breakdown.filter(b => b.question_type === 'mcq').length;
    const codeCorrect = breakdown.filter(b => (b.question_type === 'coding' || b.question_type === 'project') && b.is_correct).length;
    const codeTotal = breakdown.filter(b => b.question_type === 'coding' || b.question_type === 'project').length;

    if (percentage >= 85) {
      summary = `Outstanding mastery! You demonstrated sharp problem-solving skills and a solid grasp of ${topic}.`;
      strengths.push(`Flawless execution on conceptual syntax and problem logic.`);
      if (codeTotal > 0) strengths.push(`All algorithm test cases handled with high accuracy.`);
      recommendations.push(`Ready to attempt an Advanced level test or timed proctored exam.`);
    } else if (percentage >= 60) {
      summary = `Good performance! You have a solid conceptual foundation, with minor edge cases in coding and syntax.`;
      if (mcqCorrect > 0) strengths.push(`Solid understanding of core standard definitions.`);
      if (codeTotal > 0 && codeCorrect < codeTotal) weaknesses.push(`Some algorithm test cases failed due to edge condition handling.`);
      recommendations.push(`Review the reference code solutions and practice boundary test scenarios.`);
    } else {
      summary = `Practice makes perfect! Review the provided model solutions and retry with a foundational focus.`;
      weaknesses.push(`Struggled with multi-step problem transformations.`);
      recommendations.push(`Study the line-by-line model code in the review key below and re-test.`);
    }

    return { summary, strengths, weaknesses, recommendations };
  };

  // Format time remaining MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Preset Topics
  const PRESET_TOPICS = [
    { id: 'js', name: 'JavaScript & Algorithms', icon: '⚡', desc: 'ES6+, Closures, Array methods, DSA' },
    { id: 'mern', name: 'MERN Full-Stack', icon: '🚀', desc: 'React, Node, Express, MongoDB' },
    { id: 'git', name: 'Git & GitHub', icon: '🌿', desc: 'Branches, Merging, Rebase, Workflows' },
    { id: 'dsa', name: 'Data Structures', icon: '🧩', desc: 'Two Sum, BST, Stacks, Complexity' },
  ];

  // -------------------------------------------------------------
  // VIEW 1: EVALUATION RESULT / DIAGNOSTIC REPORT
  // -------------------------------------------------------------
  if (evaluationResult) {
    const isPassing = evaluationResult.percentage >= 60;
    const heroBg = isPassing
      ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
      : 'linear-gradient(135deg, #881337 0%, #be123c 100%)';

    return (
      <div className="dashboard-container" style={{ maxWidth: '1000px', margin: '30px auto' }}>
        {/* Hero Score Banner */}
        <div style={{
          background: heroBg,
          borderRadius: '16px',
          padding: '36px',
          color: '#ffffff',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px' }}>
              <span>✨ AI EVALUATION COMPLETE</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0' }}>
              {evaluationResult.title}
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
              {evaluationResult.feedback.summary}
            </p>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '20px 30px',
            textAlign: 'center',
            minWidth: '160px'
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>
              {evaluationResult.percentage}%
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '6px', fontWeight: 600 }}>
              {evaluationResult.score} / {evaluationResult.totalPossible} Marks • {evaluationResult.timeSpent}
            </div>
          </div>
        </div>

        {/* AI Diagnostic Highlights */}
        <div className="glass-card-static" style={{ padding: '28px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠</span> AI Diagnostic Breakdown & Study Insights
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Strengths */}
            {evaluationResult.feedback.strengths.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                <div style={{ color: '#15803d', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>
                  🌟 Strengths Identified
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#166534', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {evaluationResult.feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px' }}>
              <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>
                💡 Key Recommendations
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#1e40af', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {evaluationResult.feedback.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Question-by-Question Solution & Reference Key */}
        <div className="glass-card-static" style={{ padding: '28px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span> Detailed Answer Key & Model Implementations
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              {evaluationResult.breakdown.length} Questions Evaluated
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {evaluationResult.breakdown.map((q, idx) => {
              const hasAnswered = q.student_answer && String(q.student_answer).trim() !== '';

              return (
                <div
                  key={q.id || idx}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: `1px solid ${q.is_correct ? '#a7f3d0' : hasAnswered ? '#fecdd3' : '#e2e8f0'}`,
                    borderLeft: `5px solid ${q.is_correct ? '#059669' : hasAnswered ? '#e11d48' : '#94a3b8'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                        Q{idx + 1}.
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: '#e2e8f0', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>
                        {q.question_type}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: q.is_correct ? '#059669' : '#e11d48' }}>
                      {q.is_correct ? `+${q.points_earned}/${q.points} Pts (Correct)` : `${q.points_earned}/${q.points} Pts`}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    {q.question_text}
                  </h3>

                  {/* MCQ Breakdown */}
                  {q.question_type === 'mcq' && Array.isArray(q.options) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {q.options.map((opt, oIdx) => {
                        const isCorrectOpt = q.correct_answer && String(opt).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
                        const isStudentOpt = q.student_answer && String(opt).trim().toLowerCase() === String(q.student_answer).trim().toLowerCase();

                        return (
                          <div
                            key={oIdx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: isCorrectOpt ? '#ecfdf5' : isStudentOpt ? '#fff1f2' : '#ffffff',
                              border: `1px solid ${isCorrectOpt ? '#10b981' : isStudentOpt ? '#ef4444' : '#e2e8f0'}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span style={{ color: isCorrectOpt ? '#065f46' : isStudentOpt ? '#991b1b' : '#475569', fontWeight: isCorrectOpt || isStudentOpt ? 700 : 400 }}>
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {isStudentOpt && isCorrectOpt && (
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: '#059669', color: '#ffffff', fontWeight: 700 }}>
                                  ✓ Your Answer (Correct)
                                </span>
                              )}
                              {isStudentOpt && !isCorrectOpt && (
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: '#e11d48', color: '#ffffff', fontWeight: 700 }}>
                                  ✗ Your Answer (Incorrect)
                                </span>
                              )}
                              {!isStudentOpt && isCorrectOpt && (
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: '#10b981', color: '#ffffff', fontWeight: 700 }}>
                                  ✓ Correct Option
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer Breakdown */}
                  {q.question_type === 'short_answer' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '12px' }}>
                      <div style={{ padding: '12px', borderRadius: '8px', background: q.is_correct ? '#ecfdf5' : '#fff1f2', border: `1px solid ${q.is_correct ? '#a7f3d0' : '#fecdd3'}` }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: q.is_correct ? '#059669' : '#e11d48', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                          Your Submitted Answer
                        </span>
                        <span style={{ color: q.is_correct ? '#065f46' : hasAnswered ? '#991b1b' : '#64748b', fontWeight: 600 }}>
                          {hasAnswered ? q.student_answer : '⚠️ (Unanswered / Left blank)'}
                        </span>
                      </div>
                      <div style={{ padding: '12px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                          🎯 Model Answer
                        </span>
                        <span style={{ color: '#15803d', fontWeight: 600 }}>
                          {q.correct_answer}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Coding Breakdown */}
                  {(q.question_type === 'coding' || q.question_type === 'project') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ borderRadius: '10px', background: hasAnswered ? '#090d16' : '#fff1f2', border: `1px solid ${hasAnswered ? '#1e293b' : '#fecdd3'}`, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: hasAnswered ? '#94a3b8' : '#e11d48', fontWeight: 700, textTransform: 'uppercase' }}>
                            💻 Your Code Submission
                          </span>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: q.is_correct ? '#059669' : hasAnswered ? '#f59e0b' : '#cbd5e1', color: hasAnswered ? '#ffffff' : '#475569', fontWeight: 700 }}>
                            {q.is_correct ? '✅ Tests Passed' : hasAnswered ? '❌ Some Tests Failed' : '⚠️ No Code Submitted'}
                          </span>
                        </div>
                        {hasAnswered ? (
                          <pre style={{ margin: 0, padding: '12px', background: '#040711', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto', lineHeight: 1.5 }}>
                            {q.student_answer}
                          </pre>
                        ) : (
                          <div style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
                            ⚠️ You did not submit any code for this problem.
                          </div>
                        )}
                      </div>

                      {/* Model Implementation */}
                      {q.correct_answer && (
                        <div style={{ borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac', padding: '14px 16px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            🎯 Reference Model Solution
                          </span>
                          <pre style={{ margin: 0, padding: '12px', background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#4ade80', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto', lineHeight: 1.5 }}>
                            {q.correct_answer}
                          </pre>
                        </div>
                      )}

                      {/* Test Case Suite */}
                      {Array.isArray(q.test_cases) && q.test_cases.length > 0 && (
                        <div style={{ borderRadius: '10px', background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                            🧪 Test Case Results
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {q.test_cases.map((tc, tcIdx) => (
                              <div key={tcIdx} style={{ padding: '8px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                                <div style={{ fontFamily: 'monospace' }}><span style={{ color: '#64748b' }}>Input:</span> <code style={{ color: '#0284c7' }}>{tc.input}</code></div>
                                <div style={{ fontFamily: 'monospace' }}><span style={{ color: '#64748b' }}>Expected:</span> <code style={{ color: '#059669', fontWeight: 700 }}>{tc.expected}</code></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Concept Explanation */}
                  {q.explanation && (
                    <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#334155', borderLeft: '3px solid #0284c7' }}>
                      <strong>💡 Concept Note:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '50px' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTest(null);
              setEvaluationResult(null);
            }}
            className="btn btn-primary btn-lg"
            style={{ background: '#059669' }}
          >
            ✨ Generate Another Mock Test
          </button>
          <Link href="/dashboard/student" className="btn btn-ghost btn-lg">
            ← Back to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: ACTIVE MOCK TEST RUNNER
  // -------------------------------------------------------------
  if (activeTest) {
    const currentQ = activeTest.questions[currentQIndex];
    const isLastQ = currentQIndex === activeTest.questions.length - 1;
    const isHintUnlocked = hintsUnlocked[currentQ?.id];

    return (
      <div className="dashboard-container" style={{ maxWidth: '1100px', margin: '20px auto' }}>
        {/* Active Test Header Bar */}
        <div className="glass-card-static" style={{
          padding: '16px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: '20px',
          zIndex: 50,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-subject" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                ✨ AI MOCK EXAM
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {activeTest.difficulty.toUpperCase()} • {activeTest.topic}
              </span>
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
              {activeTest.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Countdown Clock */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '10px',
              background: timeLeft < 180 ? '#fff1f2' : '#f8fafc',
              border: `1px solid ${timeLeft < 180 ? '#fecdd3' : '#e2e8f0'}`
            }}>
              <span>⏱️</span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: timeLeft < 180 ? '#e11d48' : '#0f172a'
              }}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Finish & Evaluate Button */}
            <button
              type="button"
              onClick={() => handleFinishTest(false)}
              disabled={isEvaluating}
              className="btn btn-primary btn-sm"
              style={{ background: '#059669', padding: '8px 16px' }}
            >
              {isEvaluating ? 'Scoring...' : 'Finish & Evaluate Test'}
            </button>
          </div>
        </div>

        {/* Question Area & Navigator Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
          {/* Main Question Box */}
          <div className="glass-card-static" style={{ padding: '32px' }}>
            {currentQ ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge-subject" style={{
                      background: (currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '#ecfdf5' : '#f1f5f9',
                      color: (currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '#059669' : '#0284c7',
                      border: `1px solid ${(currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '#a7f3d0' : '#bae6fd'}`
                    }}>
                      {(currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '💻 LIVE CODING CHALLENGE' : currentQ.question_type === 'mcq' ? '🔘 MULTIPLE CHOICE' : '✍️ SHORT ANSWER'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      🎯 {currentQ.points || 1} Pt{(currentQ.points || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    Question {currentQIndex + 1} of {activeTest.questions.length}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.5, marginBottom: '20px' }}>
                  {currentQ.question_text}
                </h3>

                {/* MCQ Options */}
                {currentQ.question_type === 'mcq' && Array.isArray(currentQ.options) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentQ.options.map((opt, oIdx) => {
                      const isSelected = studentAnswers[currentQ.id] === opt;
                      return (
                        <label
                          key={oIdx}
                          onClick={() => handleAnswerChange(currentQ.id, opt)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 18px',
                            borderRadius: '12px',
                            background: isSelected ? '#ecfdf5' : '#f8fafc',
                            border: `2px solid ${isSelected ? '#059669' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="radio"
                            name={`q_${currentQ.id}`}
                            checked={isSelected}
                            onChange={() => handleAnswerChange(currentQ.id, opt)}
                            style={{ accentColor: '#059669', width: '18px', height: '18px' }}
                          />
                          <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: isSelected ? 700 : 400 }}>
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {currentQ.question_type === 'short_answer' && (
                  <div>
                    <textarea
                      rows={4}
                      value={studentAnswers[currentQ.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      placeholder="Type your concise answer here..."
                      className="form-input"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                )}

                {/* Live Coding Challenge */}
                {(currentQ.question_type === 'coding' || currentQ.question_type === 'project') && (
                  <div style={{ marginTop: '8px' }}>
                    <CodeEditor
                      initialCode={studentAnswers[currentQ.id] !== undefined ? studentAnswers[currentQ.id] : (currentQ.starter_code || '')}
                      starterCode={currentQ.starter_code || ''}
                      testCases={currentQ.test_cases || []}
                      language="javascript"
                      onChange={(newCode) => handleAnswerChange(currentQ.id, newCode)}
                      height="320px"
                    />
                  </div>
                )}

                {/* AI Hint Section */}
                {currentQ.hint && (
                  <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => toggleHint(currentQ.id)}
                      style={{
                        background: 'transparent',
                        border: '1px dashed #0284c7',
                        color: '#0284c7',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>💡</span>
                      <span>{isHintUnlocked ? 'Hide AI Practice Hint' : 'Need an AI Practice Hint?'}</span>
                    </button>

                    {isHintUnlocked && (
                      <div style={{
                        marginTop: '10px',
                        padding: '12px 16px',
                        background: '#f0f9ff',
                        borderRadius: '8px',
                        border: '1px solid #bae6fd',
                        color: '#0369a1',
                        fontSize: '0.85rem',
                        lineHeight: 1.5
                      }}>
                        <strong>AI Assistant Guidance:</strong> {currentQ.hint}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentQIndex(idx => Math.max(0, idx - 1))}
                    disabled={currentQIndex === 0}
                    className="btn btn-ghost btn-md"
                  >
                    ← Previous
                  </button>

                  {isLastQ ? (
                    <button
                      type="button"
                      onClick={() => handleFinishTest(false)}
                      className="btn btn-primary btn-md"
                      style={{ background: '#059669' }}
                    >
                      🚀 Finish & Score Test
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentQIndex(idx => Math.min(activeTest.questions.length - 1, idx + 1))}
                      className="btn btn-primary btn-md"
                    >
                      Next Question →
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Question Palette Sidebar */}
          <div className="glass-card-static" style={{ padding: '20px', height: 'fit-content' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              Question Palette
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {activeTest.questions.map((q, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = studentAnswers[q.id] !== undefined && studentAnswers[q.id] !== '';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    style={{
                      padding: '10px 0',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: isCurrent ? '2px solid #059669' : '1px solid #e2e8f0',
                      background: isCurrent ? '#ecfdf5' : isAnswered ? '#059669' : '#f8fafc',
                      color: isCurrent ? '#059669' : isAnswered ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }} /> Answered
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #cbd5e1' }} /> Unanswered
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: CONFIGURATOR / ARENA HOMEPAGE
  // -------------------------------------------------------------
  return (
    <div className="dashboard-container" style={{ maxWidth: '960px', margin: '30px auto' }}>
      {/* Studio Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge-subject" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
            ✨ AI PRACTICE ARENA
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Powered by Gemini & Synthetic Curriculums
          </span>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
          Automated AI Mock Examination
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', margin: 0 }}>
          Generate customized practice exams on any subject, execute code against live test suites, and receive instant AI diagnostics to accelerate your learning.
        </p>
      </div>

      {/* Generator Configuration Card */}
      <div className="glass-card-static" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
          1. Choose Your Assessment Subject
        </h2>

        {/* Preset Subject Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {PRESET_TOPICS.map((t) => {
            const isSelected = selectedTopic === t.id && !customTopic;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTopic(t.id);
                  setCustomTopic('');
                }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: isSelected ? '#ecfdf5' : '#f8fafc',
                  border: `2px solid ${isSelected ? '#059669' : '#e2e8f0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{t.icon}</div>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                  {t.name}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {t.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* Custom Subject Input */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
            Or enter a custom specialized topic (e.g. "React Custom Hooks & Performance", "Binary Trees", "Docker"):
          </label>
          <input
            type="text"
            value={customTopic}
            onChange={(e) => {
              setCustomTopic(e.target.value);
              if (e.target.value) setSelectedTopic('custom');
            }}
            placeholder="Type any programming or computer science topic..."
            className="form-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Difficulty & Format Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
          {/* Difficulty */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              2. Difficulty Level
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'beginner', label: '🟢 Beginner' },
                { id: 'intermediate', label: '🟡 Medium' },
                { id: 'advanced', label: '🔴 Hard' }
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: difficulty === d.id ? '2px solid #059669' : '1px solid #e2e8f0',
                    background: difficulty === d.id ? '#ecfdf5' : '#f8fafc',
                    color: difficulty === d.id ? '#059669' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              3. Assessment Structure
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'balanced', label: '⚖️ Mixed' },
                { id: 'coding', label: '💻 Coding Only' },
                { id: 'quiz', label: '⚡ Quiz Only' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: format === f.id ? '2px solid #059669' : '1px solid #e2e8f0',
                    background: format === f.id ? '#ecfdf5' : '#f8fafc',
                    color: format === f.id ? '#059669' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions & Duration Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                4. Question Count: <span style={{ color: '#059669' }}>{questionCount} Questions</span>
              </label>
            </div>
            
            {/* Quick Count Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {[3, 5, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  style={{
                    padding: '8px 0',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: questionCount === num ? '2px solid #059669' : '1px solid #e2e8f0',
                    background: questionCount === num ? '#ecfdf5' : '#f8fafc',
                    color: questionCount === num ? '#059669' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {num} Qs
                </button>
              ))}
            </div>

            <input
              type="range"
              min="3"
              max="12"
              step="1"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#059669' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                5. Time Limit: <span style={{ color: '#059669' }}>{duration} Minutes</span>
              </label>
            </div>

            {/* Quick Duration Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {[10, 15, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  style={{
                    padding: '8px 0',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: duration === mins ? '2px solid #059669' : '1px solid #e2e8f0',
                    background: duration === mins ? '#ecfdf5' : '#f8fafc',
                    color: duration === mins ? '#059669' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <input
              type="range"
              min="5"
              max="45"
              step="5"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#059669' }}
            />
          </div>
        </div>

        {/* Optional Gemini API Key Drawer */}
        <div style={{ marginBottom: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0
            }}
          >
            <span>⚙️</span>
            <span>{showApiKeyInput ? 'Hide Gemini AI Key Settings' : 'Custom Gemini AI Key (Optional)'}</span>
            <span style={{ fontSize: '0.7rem', color: userApiKey ? '#059669' : '#94a3b8' }}>
              {userApiKey ? '• Active Key Saved' : '• Using Dynamic Procedural Engine'}
            </span>
          </button>

          {showApiKeyInput && (
            <div style={{ marginTop: '12px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Google Gemini API Key (Optional):
              </label>
              <input
                type="password"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="form-input"
                style={{ width: '100%', fontSize: '0.85rem', marginBottom: '6px' }}
              />
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                When provided, ExamGuard will call Google's Gemini 2.0/1.5 Flash models to generate fresh questions for any custom topic. If omitted, ExamGuard uses its built-in procedural synthesis engine.
              </p>
            </div>
          )}
        </div>

        {genError && (
          <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
            ⚠️ {genError}
          </div>
        )}

        {/* Launch Button */}
        <button
          type="button"
          onClick={handleGenerateTest}
          disabled={isGenerating}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', padding: '16px', fontSize: '1.05rem', background: '#059669' }}
        >
          {isGenerating ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div className="spinner" style={{ width: '20px', height: '20px' }} />
              <span>Synthesizing Custom AI Assessment...</span>
            </div>
          ) : (
            '🚀 Generate & Start AI Mock Test'
          )}
        </button>
      </div>

      {/* Past Mock Test History */}
      {mockHistory.length > 0 && (
        <div className="glass-card-static" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📜</span> Recent AI Practice History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mockHistory.map((h, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{h.title}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {new Date(h.completedAt).toLocaleDateString()} • {h.difficulty} • Score: {h.score}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: h.percentage >= 60 ? '#ecfdf5' : '#fff1f2',
                  color: h.percentage >= 60 ? '#059669' : '#e11d48',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  {h.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
