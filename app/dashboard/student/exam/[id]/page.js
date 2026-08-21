'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { AntiCheatMonitor } from '@/lib/anti-cheat';
import { calculateExamScore, calculateExamScoreAsync } from '@/lib/scoring';
import { createClient } from '@/lib/supabase/client';
import WebcamProctor from '@/components/WebcamProctor';
import CodeEditor from '@/components/CodeEditor';
import Link from 'next/link';

export default function TakeExamPage({ params }) {
  const router = useRouter();
  const supabase = createClient();
  const resolvedParams = use(params);
  const examId = resolvedParams.id;

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submission, setSubmission] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [reviewData, setReviewData] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'correct' | 'incorrect'
  const [examStarted, setExamStarted] = useState(false);
  const [user, setUser] = useState(null);

  // Phone Sidecar State
  const [sidecarConnected, setSidecarConnected] = useState(false);
  const [showSidecarModal, setShowSidecarModal] = useState(false);
  const [originUrl, setOriginUrl] = useState('');
  
  const antiCheatRef = useRef(null);
  const submissionRef = useRef(null);
  const sidecarChannelRef = useRef(null);
  const answersRef = useRef(answers);
  const lastSavedAnswersRef = useRef({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      
      setExam(examData);

      const { data: subData } = await supabase
        .from('submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .single();

      if (subData) {
        setSubmission(subData);
        submissionRef.current = subData;
        setWarningCount(subData.warning_count || 0);

        if (subData.status === 'submitted' || subData.status === 'expelled') {
          setIsCompleted(true);
          setScoreData({
            percentage: subData.percentage,
            score: subData.score,
            total: subData.total_possible,
            status: subData.status
          });

          // Fetch questions and answers to render complete interactive review
          const { data: qData } = await supabase
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true });

          const { data: ansData } = await supabase
            .from('answers')
            .select('*')
            .eq('submission_id', subData.id);

          const ansMap = {};
          (ansData || []).forEach(a => {
            ansMap[a.question_id] = a;
          });

          const reviewItems = (qData || []).map(q => {
            const a = ansMap[q.id] || {};
            const studentAns = a.student_answer || '';
            const correctAns = q.correct_answer || '';
            const isCorrect = a.is_correct !== undefined && a.is_correct !== null
              ? a.is_correct
              : (correctAns && String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase());
            
            return {
              id: q.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              correct_answer: correctAns,
              points: q.points || 1,
              student_answer: studentAns,
              is_correct: isCorrect,
              points_earned: a.points_earned !== undefined ? a.points_earned : (isCorrect ? (q.points || 1) : 0),
            };
          });

          setReviewData(reviewItems);
          setQuestions(qData || []);
        } else if (subData.status === 'in_progress') {
          const { data: qData } = await supabase
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true });
          
          const normalizedQuestions = (qData || []).map(q => {
            let sc = q.starter_code || '';
            let tc = q.test_cases || [];
            let qType = q.question_type;
            let parsedOptions = q.options;
            if (typeof parsedOptions === 'string') {
              try { parsedOptions = JSON.parse(parsedOptions); } catch(e) {}
            }
            if (parsedOptions && typeof parsedOptions === 'object' && !Array.isArray(parsedOptions)) {
              if (parsedOptions.starter_code) sc = parsedOptions.starter_code;
              if (parsedOptions.test_cases) tc = parsedOptions.test_cases;
              if (parsedOptions.is_coding || parsedOptions.starter_code) qType = 'coding';
            }
            return { ...q, question_type: qType, starter_code: sc, test_cases: tc, options: parsedOptions };
          });
          setQuestions(normalizedQuestions);
          
          const { data: existingAnswers } = await supabase
            .from('answers')
            .select('question_id, student_answer')
            .eq('submission_id', subData.id);
          
          if (existingAnswers && existingAnswers.length > 0) {
            const answersMap = {};
            existingAnswers.forEach(a => {
              answersMap[a.question_id] = a.student_answer;
            });
            setAnswers(answersMap);
          }
          
          const startedAt = new Date(subData.started_at).getTime();
          const durationMs = examData.duration_minutes * 60 * 1000;
          const now = Date.now();
          const remainingSecs = Math.max(0, Math.floor((startedAt + durationMs - now) / 1000));
          
          setTimeLeft(remainingSecs);
          setExamStarted(true);
          initAntiCheat(subData.id, examData.max_warnings, subData.warning_count || 0);
          initSidecarListener(subData.id);
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // Realtime Sidecar Handshake Listener
  const initSidecarListener = (subId) => {
    const channel = supabase.channel(`proctor-sidecar-${subId}`);
    channel
      .on('broadcast', { event: 'sidecar_connected' }, () => {
        setSidecarConnected(true);
        setShowSidecarModal(false);
      })
      .on('broadcast', { event: 'sidecar_heartbeat' }, () => {
        // live heartbeat from phone
      })
      .on('broadcast', { event: 'sidecar_disconnected' }, () => {
        setSidecarConnected(false);
        if (exam?.require_phone_sidecar) {
          handleVisionViolation('sidecar_disconnected', 'Mobile phone camera sidecar disconnected.');
        }
      })
      .subscribe();

    sidecarChannelRef.current = channel;
  };

  useEffect(() => {
    let timer;
    if (examStarted && !isCompleted && timeLeft !== null) {
      if (timeLeft <= 0) {
        submitExamData(true, false);
      } else {
        timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      }
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, isCompleted, timeLeft]);

  useEffect(() => {
    return () => {
      if (antiCheatRef.current) {
        antiCheatRef.current.stop();
      }
      if (sidecarChannelRef.current) {
        supabase.removeChannel(sidecarChannelRef.current);
      }
    };
  }, []);

  // Background Auto-Save Heartbeat
  useEffect(() => {
    let saveTimer;
    if (examStarted && !isCompleted && submissionRef.current) {
      saveTimer = setInterval(async () => {
        const currentAnswers = answersRef.current;
        const lastSaved = lastSavedAnswersRef.current;
        
        // Check if anything has changed since last save
        let isDirty = false;
        for (const [qId, val] of Object.entries(currentAnswers)) {
          if (lastSaved[qId] !== val) {
            isDirty = true;
            break;
          }
        }
        
        if (isDirty) {
          try {
            const res = await fetch('/api/student/auto-save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submission_id: submissionRef.current.id,
                answers: currentAnswers
              })
            });
            if (res.ok) {
              lastSavedAnswersRef.current = { ...currentAnswers };
              console.log('Progress auto-saved');
            }
          } catch (e) {
            console.error('Auto-save failed', e);
          }
        }
      }, 30000); // Check every 30 seconds
    }
    return () => clearInterval(saveTimer);
  }, [examStarted, isCompleted]);

  const initAntiCheat = (subId, maxWarnings, initialWarnings = 0) => {
    antiCheatRef.current = new AntiCheatMonitor({
      maxWarnings,
      onViolation: async (type, details) => {
        await supabase.from('cheat_logs').insert({
          submission_id: subId,
          event_type: type,
          details
        });
      },
      onWarning: async (type, count, max) => {
        setShowWarning(true);
        setWarningMessage(`${type.replace(/_/g, ' ')} detected. This activity is recorded by AI Proctor.`);
        setWarningCount(count);
        await supabase
          .from('submissions')
          .update({ warning_count: count })
          .eq('id', subId);
      },
      onExpel: async () => {
        await submitExamData(true, true);
      }
    });
    antiCheatRef.current.start(initialWarnings);
  };

  const handleVisionViolation = async (type, details) => {
    if (!submissionRef.current || isCompleted) return;
    const subId = submissionRef.current.id;

    await supabase.from('cheat_logs').insert({
      submission_id: subId,
      event_type: type,
      details
    });

    const newCount = warningCount + 1;
    setWarningCount(newCount);
    setShowWarning(true);
    setWarningMessage(`AI Proctor Flag: ${details}`);

    await supabase
      .from('submissions')
      .update({ warning_count: newCount })
      .eq('id', subId);

    if (exam && newCount >= (exam.max_warnings || 3)) {
      await submitExamData(true, true);
    }
  };

  const startExam = async () => {
    try {
      document.documentElement.requestFullscreen().catch(() => {});
      
      const { data: subData, error } = await supabase
        .from('submissions')
        .insert({
          exam_id: examId,
          student_id: user.id,
          started_at: new Date().toISOString(),
          status: 'in_progress',
          warning_count: 0
        })
        .select()
        .single();
      
      if (error) throw error;
        
      setSubmission(subData);
      submissionRef.current = subData;
      
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });
        
      const normalizedQuestions = (qData || []).map(q => {
        let sc = q.starter_code || '';
        let tc = q.test_cases || [];
        let qType = q.question_type;
        if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
          if (q.options.starter_code) sc = q.options.starter_code;
          if (q.options.test_cases) tc = q.options.test_cases;
          if (q.options.is_coding || q.options.starter_code) qType = 'coding';
        }
        return { ...q, question_type: qType, starter_code: sc, test_cases: tc };
      });
      setQuestions(normalizedQuestions);
      setTimeLeft(exam.duration_minutes * 60);
      setExamStarted(true);
      
      initAntiCheat(subData.id, exam.max_warnings, 0);
      initSidecarListener(subData.id);
    } catch (err) {
      console.error('Failed to start exam:', err);
    }
  };

  const handleAnswerChange = (val) => {
    const qId = questions[currentQuestion]?.id;
    if (!qId) return;
    setAnswers(prev => ({
      ...prev,
      [qId]: val
    }));
  };

  const submitExamData = async (auto = false, expelled = false) => {
    if (isSubmitting || isCompleted) return;
    setIsSubmitting(true);
    
    if (antiCheatRef.current) {
      antiCheatRef.current.stop();
    }

    try {
      const { data: allQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });
        
      const qList = allQuestions && allQuestions.length > 0 ? allQuestions : questions;
      const currentAnswers = answersRef.current || answers || {};
      const results = await calculateExamScoreAsync(qList, currentAnswers);
      const subId = submissionRef.current?.id || submission?.id;

      if (!subId) {
        console.error('No active submission ID found.');
        return;
      }

      const gradedList = results?.graded_answers || results?.details || [];
      const answersToInsert = gradedList.map(res => ({
        submission_id: subId,
        question_id: res.question_id,
        student_answer: currentAnswers[res.question_id] || '',
        is_correct: res.is_correct,
        points_earned: res.points_earned
      }));

      if (answersToInsert.length > 0) {
        await supabase.from('answers').upsert(answersToInsert, { onConflict: 'submission_id,question_id' });
      }

      const status = expelled ? 'expelled' : 'submitted';
      const finalScore = results.score ?? results.totalScore ?? 0;
      const finalTotal = results.total_possible ?? results.totalPossible ?? (exam?.total_marks || 0);
      const finalPercentage = results.percentage ?? (finalTotal > 0 ? Math.round((finalScore / finalTotal) * 100) : 0);

      await supabase
        .from('submissions')
        .update({
          submitted_at: new Date().toISOString(),
          score: finalScore,
          total_possible: finalTotal,
          percentage: finalPercentage,
          status,
          auto_submitted: auto
        })
        .eq('id', subId);

      setScoreData({
        percentage: finalPercentage,
        score: finalScore,
        total: finalTotal,
        status
      });

      // Construct immediate review structure
      const reviewItems = qList.map(q => {
        const studentAns = answers[q.id] || '';
        const graded = gradedList.find(g => g.question_id === q.id) || {};
        const correctAns = q.correct_answer || '';
        const isCorrect = graded.is_correct !== undefined && graded.is_correct !== null
          ? graded.is_correct
          : (correctAns && String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase());
        
        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: correctAns,
          points: q.points || 1,
          student_answer: studentAns,
          is_correct: isCorrect,
          points_earned: graded.points_earned !== undefined ? graded.points_earned : (isCorrect ? (q.points || 1) : 0),
        };
      });

      setReviewData(reviewItems);
      setIsCompleted(true);
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Loading
  if (!exam) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Configuring AI Proctor Environment...</p>
      </div>
    );
  }

  // Render Completed / Results Screen with Full Question Paper & Answer Key Review
  if (isCompleted && scoreData) {
    const isExpelled = scoreData.status === 'expelled';
    const isPassed = scoreData.percentage >= 50;
    const correctQuestionsCount = reviewData.filter(q => q.is_correct).length;
    const incorrectQuestionsCount = reviewData.filter(q => !q.is_correct).length;

    const filteredReview = reviewData.filter(q => {
      if (reviewFilter === 'correct') return q.is_correct;
      if (reviewFilter === 'incorrect') return !q.is_correct;
      return true;
    });

    return (
      <div className="dashboard-container" style={{ maxWidth: '880px', margin: '30px auto' }}>
        {/* Score Summary Card */}
        <div className="glass-card-static" style={{ padding: '36px', marginBottom: '28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>
              {isExpelled ? '🚫' : scoreData.percentage >= 70 ? '🎉' : '📊'}
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              {isExpelled ? 'Examination Terminated (Expelled)' : 'Examination Completed!'}
            </h1>

            <p style={{ color: '#475569', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
              {isExpelled 
                ? 'Your session was flagged and automatically submitted due to excessive anti-cheat security violations.' 
                : 'Your responses have been recorded and evaluated. Review your detailed score breakdown and correct solutions below.'}
            </p>
          </div>

          {/* Metric Badges Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Final Score</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {scoreData.score} / {scoreData.total}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Points Earned</span>
            </div>

            <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Percentage</span>
              <div style={{ 
                fontSize: '1.65rem', 
                fontWeight: 800, 
                color: isExpelled ? '#e11d48' : isPassed ? '#059669' : '#d97706',
                marginTop: '4px' 
              }}>
                {scoreData.percentage}%
              </div>
              <span style={{ fontSize: '0.75rem', color: isPassed ? '#059669' : '#d97706', fontWeight: 600 }}>
                {isExpelled ? 'Expelled' : isPassed ? 'Passed' : 'Needs Improvement'}
              </span>
            </div>

            <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Accuracy Breakdown</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {correctQuestionsCount} / {reviewData.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                {correctQuestionsCount} Correct • {incorrectQuestionsCount} Incorrect
              </span>
            </div>

            <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Security Flags</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: warningCount > 0 ? '#d97706' : '#059669', marginTop: '4px' }}>
                {warningCount}
              </div>
              <span style={{ fontSize: '0.75rem', color: warningCount === 0 ? '#059669' : '#d97706', fontWeight: 600 }}>
                {warningCount === 0 ? 'Clean Proctor Record' : `${warningCount} warnings recorded`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/student" className="btn btn-primary btn-md">
              ← Return to Student Portal
            </Link>
            <Link href="/dashboard/student/results" className="btn btn-ghost btn-md">
              📊 View All My Results
            </Link>
          </div>
        </div>

        {/* Detailed Question Review & Answer Key Section */}
        <div className="glass-card-static" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #eaecf0' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                📝 Question Paper Review & Answer Key
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Review your submitted answers alongside verified solutions and point allocations.
              </p>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: reviewFilter === 'all' ? '#ffffff' : 'transparent',
                  color: reviewFilter === 'all' ? '#0f172a' : '#64748b',
                  boxShadow: reviewFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                All ({reviewData.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('correct')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: reviewFilter === 'correct' ? '#ffffff' : 'transparent',
                  color: reviewFilter === 'correct' ? '#059669' : '#64748b',
                  boxShadow: reviewFilter === 'correct' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                ✅ Correct ({correctQuestionsCount})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('incorrect')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: reviewFilter === 'incorrect' ? '#ffffff' : 'transparent',
                  color: reviewFilter === 'incorrect' ? '#e11d48' : '#64748b',
                  boxShadow: reviewFilter === 'incorrect' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                ❌ Incorrect ({incorrectQuestionsCount})
              </button>
            </div>
          </div>

          {/* Question List */}
          {filteredReview.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No questions found for the selected filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredReview.map((q, idx) => {
                const isCorrect = q.is_correct;
                const hasAnswered = q.student_answer && String(q.student_answer).trim() !== '';

                return (
                  <div
                    key={q.id || idx}
                    style={{
                      padding: '24px',
                      borderRadius: '14px',
                      background: '#ffffff',
                      border: `1px solid ${isCorrect ? '#a7f3d0' : hasAnswered ? '#fecdd3' : '#e2e8f0'}`,
                      borderLeft: `5px solid ${isCorrect ? '#059669' : hasAnswered ? '#e11d48' : '#94a3b8'}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* Question Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          Question {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>
                          {q.question_type}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                          {q.points} pt{q.points === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCorrect ? (
                          <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 700 }}>
                            ✅ Correct (+{q.points_earned || q.points} pts)
                          </span>
                        ) : hasAnswered ? (
                          <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontWeight: 700 }}>
                            ❌ Incorrect (0 pts)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                            ⚪ Unanswered (0 pts)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.6, marginBottom: '18px' }}>
                      {q.question_text}
                    </div>

                    {/* MCQ Options Display */}
                    {q.question_type === 'mcq' && Array.isArray(q.options) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        {q.options.map((opt, optIdx) => {
                          const isCorrectOption = q.correct_answer && String(opt).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
                          const isStudentOption = q.student_answer && String(opt).trim().toLowerCase() === String(q.student_answer).trim().toLowerCase();

                          let optBg = '#f8fafc';
                          let optBorder = '#e2e8f0';
                          let optColor = '#334155';

                          if (isCorrectOption) {
                            optBg = '#ecfdf5';
                            optBorder = '#10b981';
                            optColor = '#065f46';
                          } else if (isStudentOption && !isCorrectOption) {
                            optBg = '#fff1f2';
                            optBorder = '#ef4444';
                            optColor = '#991b1b';
                          }

                          return (
                            <div
                              key={optIdx}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                background: optBg,
                                border: `1.5px solid ${optBorder}`,
                                color: optColor,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.9rem',
                                fontWeight: (isCorrectOption || isStudentOption) ? 600 : 400
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: isCorrectOption ? '#10b981' : isStudentOption ? '#ef4444' : '#e2e8f0',
                                  color: (isCorrectOption || isStudentOption) ? '#ffffff' : '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 700
                                }}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>

                              <div style={{ display: 'flex', gap: '6px' }}>
                                {isStudentOption && isCorrectOption && (
                                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#059669', color: '#ffffff', fontWeight: 700 }}>
                                    ✓ Your Choice (Correct)
                                  </span>
                                )}
                                {isStudentOption && !isCorrectOption && (
                                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#e11d48', color: '#ffffff', fontWeight: 700 }}>
                                    ✗ Your Selection
                                  </span>
                                )}
                                {!isStudentOption && isCorrectOption && (
                                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#10b981', color: '#ffffff', fontWeight: 700 }}>
                                    ✓ Correct Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer Display */}
                    {q.question_type === 'short_answer' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '12px' }}>
                        <div style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          background: isCorrect === true ? '#ecfdf5' : isCorrect === null ? '#fffbeb' : '#fff1f2',
                          border: `1px solid ${isCorrect === true ? '#a7f3d0' : isCorrect === null ? '#fde68a' : '#fecdd3'}`
                        }}>
                          <span style={{ fontSize: '0.75rem', color: isCorrect === true ? '#059669' : isCorrect === null ? '#d97706' : '#e11d48', fontWeight: 700, textTransform: 'uppercase' }}>
                            Your Submitted Answer
                          </span>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isCorrect === true ? '#065f46' : isCorrect === null ? '#92400e' : '#991b1b', marginTop: '4px' }}>
                            {hasAnswered ? q.student_answer : '(No answer entered)'}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isCorrect === true ? '#059669' : isCorrect === null ? '#d97706' : '#e11d48' }}>
                            {isCorrect === true ? `+${q.points_earned || q.points} pts (Correct)` : isCorrect === null ? '⏳ Pending Manual Grade' : '0 pts (Incorrect)'}
                          </span>
                        </div>

                        <div style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                            🎯 Correct Answer
                          </span>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#15803d', marginTop: '4px' }}>
                            {q.correct_answer}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Project / Code Answer Display */}
                    {(q.question_type === 'project' || q.question_type === 'coding') && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ padding: '14px 16px', borderRadius: '10px', background: hasAnswered ? '#090d16' : '#fff1f2', border: `1px solid ${hasAnswered ? '#1e293b' : '#fecdd3'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: hasAnswered ? '#94a3b8' : '#e11d48', fontWeight: 700, textTransform: 'uppercase' }}>
                              💻 Your Code Submission
                            </span>
                            <span style={{ fontSize: '0.75rem', color: q.is_correct ? '#10b981' : hasAnswered ? '#f59e0b' : '#64748b', fontWeight: 700 }}>
                              {q.is_correct ? '✅ Tests Passed' : hasAnswered ? `${q.points_earned || 0}/${q.points} Points Earned` : '⚠️ No Code Submitted'}
                            </span>
                          </div>
                          {hasAnswered ? (
                            <pre style={{ margin: 0, padding: '12px', background: '#040711', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto', lineHeight: 1.5 }}>
                              {q.student_answer}
                            </pre>
                          ) : (
                            <div style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
                              ⚠️ You did not write or submit any code for this problem during the exam session.
                            </div>
                          )}
                        </div>

                        {/* Model / Reference Solution */}
                        {q.correct_answer && (
                          <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac' }}>
                            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                              🎯 Reference Solution / Model Code
                            </span>
                            <pre style={{ margin: 0, padding: '12px', background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#4ade80', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                              {q.correct_answer}
                            </pre>
                          </div>
                        )}

                        {/* Test Cases */}
                        {Array.isArray(q.test_cases) && q.test_cases.length > 0 && (
                          <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                              🧪 Test Cases & Expected Outputs
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Pre-Exam Start Screen
  if (!examStarted) {
    const sidecarUrl = `${originUrl}/proctor/sidecar/${submission?.id || user?.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(sidecarUrl)}`;

    return (
      <div className="dashboard-container" style={{ maxWidth: '780px', margin: '30px auto' }}>
        <div className="glass-card-static" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span className="badge-subject">{exam.subject?.toUpperCase()}</span>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '4px 10px', 
              borderRadius: '20px', 
              background: '#ecfdf5', 
              color: '#059669', 
              border: '1px solid #a7f3d0',
              fontWeight: 700
            }}>
              🛡️ AI PROCTOR SECURE ENVIRONMENT
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            {exam.title}
          </h1>

          <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' }}>
            {exam.description || 'Please review the examination parameters and anti-cheat requirements before beginning.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>⏱️ Time Limit</div>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{exam.duration_minutes} Minutes</strong>
            </div>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>🎯 Total Marks</div>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{exam.total_marks} Marks</strong>
            </div>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>🛡️ Security Max</div>
              <strong style={{ fontSize: '1.1rem', color: '#e11d48' }}>{exam.max_warnings || 3} Warnings</strong>
            </div>
          </div>

          {/* Anti-Cheat Protocols Breakdown */}
          <div style={{ padding: '20px', borderRadius: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#059669', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒</span> Mandatory Anti-Cheat Rules & Active Sensors
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '0.875rem', lineHeight: 1.8 }}>
              <li><strong>📸 Calibrated AI Face Tracking</strong>: Natural eye reading across your screen is permitted. Turning your head completely away (&gt;7s), sudden erratic head movements, or repeated off-screen glances will trigger proctor warnings.</li>
              <li><strong>⚡ Keystroke Dynamics</strong>: Automated text paste, extensions, and AI script injections are intercepted.</li>
              <li><strong>🖥️ Single Display Enforcement</strong>: Secondary monitors, screen mirroring, and virtual desktops must be disconnected.</li>
              <li><strong>🚫 No Tab Switching</strong>: Exiting fullscreen or navigating away counts as a monitored violation.</li>
            </ul>
          </div>

          {/* Optional Phone Camera Sidecar QR Modal */}
          {exam.require_phone_sidecar && (
            <div style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <img 
                src={qrCodeUrl} 
                alt="Scan to connect Phone Camera Sidecar" 
                style={{ width: '100px', height: '100px', borderRadius: '8px', background: '#ffffff', padding: '6px', border: '1px solid #e2e8f0' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#059669', fontSize: '0.95rem' }}>📱 Required: Dual-Angle Phone Sidecar</strong>
                <p style={{ color: '#475569', fontSize: '0.85rem', margin: '4px 0 8px 0' }}>
                  Scan the QR code with your mobile phone camera to start the desk & keyboard live stream.
                </p>
                <span style={{ fontSize: '0.8rem', color: sidecarConnected ? '#059669' : '#d97706', fontWeight: 700 }}>
                  {sidecarConnected ? '✅ Mobile Phone Sidecar Paired & Ready' : '⏳ Waiting for Phone Pairing...'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={startExam}
            className="btn btn-primary btn-lg w-full"
            style={{ fontSize: '1.05rem', padding: '16px' }}
          >
            🚀 Enter Fullscreen & Start Exam Session
          </button>
        </div>
      </div>
    );
  }

  // Active Exam View
  const currentQ = questions[currentQuestion];
  const minutes = Math.floor((timeLeft || 0) / 60);
  const seconds = (timeLeft || 0) % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const timerColor = (timeLeft || 0) < 300 ? '#e11d48' : (timeLeft || 0) < 900 ? '#d97706' : '#059669';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
      {/* Top Floating App Bar */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 20px auto',
        padding: '16px 24px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{exam.title}</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Question {currentQuestion + 1} of {questions.length} • {currentQ?.points || 1} Points
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Security Counter */}
          <div style={{
            padding: '6px 12px',
            borderRadius: '20px',
            background: warningCount > 0 ? '#fff1f2' : '#ecfdf5',
            border: `1px solid ${warningCount > 0 ? '#fecdd3' : '#a7f3d0'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '0.85rem' }}>{warningCount > 0 ? '⚠️' : '🛡️'}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: warningCount > 0 ? '#e11d48' : '#059669' }}>
              {warningCount} / {exam.max_warnings || 3} Warnings
            </span>
          </div>

          {/* Live Timer */}
          <div style={{
            padding: '8px 18px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1rem' }}>⏱️</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: timerColor, fontFamily: 'monospace' }}>
              {timeFormatted}
            </span>
          </div>

          {/* Finish Button */}
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to submit your examination now?')) {
                submitExamData(false, false);
              }
            }}
            disabled={isSubmitting}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {isSubmitting ? 'Submitting...' : 'Finish & Submit Exam'}
          </button>
        </div>
      </div>

      {/* Main Examination Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Question & Answer Paper */}
        <div className="glass-card-static" style={{ padding: '36px' }}>
          {currentQ ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge-subject" style={{
                    background: (currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '#ecfdf5' : '#f1f5f9',
                    color: (currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '#059669' : '#0284c7',
                    border: `1px solid ${(currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '#a7f3d0' : '#bae6fd'}`
                  }}>
                    {(currentQ.question_type === 'coding' || currentQ.question_type === 'project') ? '💻 CODING CHALLENGE' : currentQ.question_type === 'mcq' ? '🔘 MULTIPLE CHOICE' : '✍️ SHORT ANSWER'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    🎯 {currentQ.points || 1} Pt{(currentQ.points || 1) > 1 ? 's' : ''}
                  </span>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Question {currentQuestion + 1} of {questions.length}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.5, marginBottom: '20px' }}>
                {currentQ.question_text}
              </h3>

              {/* MCQ Options Form */}
              {currentQ.question_type === 'mcq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentQ.options?.map((opt, oIdx) => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <label
                        key={oIdx}
                        onClick={() => handleAnswerChange(opt)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
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
                          onChange={() => handleAnswerChange(opt)}
                          style={{ accentColor: '#059669', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: isSelected ? 600 : 400 }}>
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Short Answer Input */}
              {currentQ.question_type === 'short_answer' && (
                <div>
                  <textarea
                    rows={4}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Type your concise answer here..."
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              )}

              {/* Coding / Project Assessment Editor */}
              {(currentQ.question_type === 'project' || currentQ.question_type === 'coding') && (
                <div style={{ marginTop: '8px' }}>
                  <CodeEditor
                    initialCode={answers[currentQ.id] !== undefined ? answers[currentQ.id] : (currentQ.starter_code || '')}
                    starterCode={currentQ.starter_code || ''}
                    testCases={currentQ.test_cases || []}
                    language={currentQ.options?.language || "javascript"}
                    onChange={(newCode) => handleAnswerChange(newCode)}
                    height="320px"
                  />
                </div>
              )}

              {/* Navigation Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(q => Math.max(0, q - 1))}
                  disabled={currentQuestion === 0}
                  className="btn btn-ghost btn-md"
                >
                  ← Previous
                </button>

                {currentQuestion < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestion(q => Math.min(questions.length - 1, q + 1))}
                    className="btn btn-primary btn-md"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you ready to finalize and submit this exam?')) {
                        submitExamData(false, false);
                      }
                    }}
                    className="btn btn-primary btn-md"
                    style={{ background: '#059669' }}
                  >
                    🚀 Submit Exam
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No questions found in this examination paper.
            </div>
          )}
        </div>

        {/* Proctor Sidebar & Question Navigator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Webcam AI Vision Stream */}
          <div className="glass-card-static" style={{ padding: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                AI Vision Proctoring Active
              </span>
            </div>
            <WebcamProctor onViolation={handleVisionViolation} />
          </div>

          {/* Question Palette */}
          <div className="glass-card-static" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '14px' }}>
              Question Palette
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] && String(answers[q.id]).trim() !== '';
                const isCurrent = currentQuestion === idx;
                const isCoding = q.question_type === 'coding' || q.question_type === 'project';

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentQuestion(idx)}
                    style={{
                      height: '38px',
                      borderRadius: '8px',
                      border: isCurrent ? '2px solid #059669' : '1px solid #e2e8f0',
                      background: isCurrent ? '#ecfdf5' : isAnswered ? '#f0fdf4' : '#f8fafc',
                      color: isCurrent ? '#059669' : isAnswered ? '#15803d' : '#64748b',
                      fontWeight: isCurrent || isAnswered ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px'
                    }}
                    title={`Question ${idx + 1} (${isCoding ? 'Live Coding' : q.question_type})`}
                  >
                    <span>{idx + 1}</span>
                    {isCoding && <span style={{ fontSize: '0.7rem' }}>💻</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f0fdf4', border: '1px solid #15803d' }}></span>
                <span>Answered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f8fafc', border: '1px solid #e2e8f0' }}></span>
                <span>Unanswered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem' }}>💻</span>
                <span>Coding Problem</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proctor Violation Toast */}
      {showWarning && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(225, 29, 72, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          maxWidth: '400px'
        }}>
          <span style={{ fontSize: '1.4rem' }}>⚠️</span>
          <div>
            <strong style={{ color: '#e11d48', fontSize: '0.85rem', display: 'block' }}>Proctor Security Notice</strong>
            <p style={{ margin: 0, color: '#9f1239', fontSize: '0.8rem' }}>{warningMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowWarning(false)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9f1239', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
