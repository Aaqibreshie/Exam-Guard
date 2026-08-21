/**
 * Scoring Engine for ExamGuard
 * Auto-scores MCQ, Short Answer, and Coding/Project questions with automated test case evaluation.
 */

import { runTestCases } from './code-runner.js';

/**
 * Synchronous scoring for standard questions
 */
export function scoreAnswer(question, studentAnswer) {
  if (!studentAnswer || String(studentAnswer).trim() === '') {
    return { is_correct: false, points_earned: 0 };
  }

  switch (question.question_type) {
    case 'mcq':
      return scoreMCQ(question, studentAnswer);
    case 'short_answer':
      return scoreShortAnswer(question, studentAnswer);
    case 'coding':
    case 'project':
      // If no synchronous grading, mark as manual or 0 if empty
      return { is_correct: null, points_earned: 0, needs_manual_grading: true };
    default:
      return { is_correct: false, points_earned: 0 };
  }
}

/**
 * Asynchronous score evaluation (supporting automated sandboxed code execution)
 */
export async function scoreAnswerAsync(question, studentAnswer) {
  if (!studentAnswer || String(studentAnswer).trim() === '') {
    return { is_correct: false, points_earned: 0, test_results: null };
  }

  if (question.question_type === 'coding' || question.question_type === 'project') {
    let testCases = Array.isArray(question.test_cases) ? question.test_cases : [];
    let parsedOptions = question.options;
    if (typeof parsedOptions === 'string') {
      try { parsedOptions = JSON.parse(parsedOptions); } catch (e) {}
    }
    if (testCases.length === 0 && parsedOptions && typeof parsedOptions === 'object' && Array.isArray(parsedOptions.test_cases)) {
      testCases = parsedOptions.test_cases;
    }
    if (testCases.length > 0) {
      try {
        const language = parsedOptions?.language || 'javascript';
        const testReport = await runTestCases(studentAnswer, testCases, language);
        const maxPoints = parseInt(question.points) || 1;
        const pointsEarned = Math.round((testReport.passPercentage / 100) * maxPoints);
        const isCorrect = testReport.passPercentage === 100;

        return {
          is_correct: isCorrect,
          points_earned: pointsEarned,
          test_results: testReport,
          needs_manual_grading: false
        };
      } catch (err) {
        return {
          is_correct: false,
          points_earned: 0,
          test_results: null,
          needs_manual_grading: true
        };
      }
    } else {
      // AI Grading fallback for coding questions without test cases
      try {
        const response = await fetch('/api/ai-grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: question.question_text,
            student_answer: studentAnswer,
            correct_answer: question.correct_answer,
            points: parseInt(question.points) || 5
          })
        });

        if (response.ok) {
          const aiResult = await response.json();
          if (aiResult.success) {
            return {
              is_correct: aiResult.is_correct,
              points_earned: aiResult.points_earned,
              test_results: {
                ai_feedback: aiResult.feedback
              },
              needs_manual_grading: false
            };
          }
        }
      } catch (err) {
        console.warn('AI grading failed, falling back to manual grading:', err);
      }
    }
  }

  return scoreAnswer(question, studentAnswer);
}

/**
 * Score an MCQ answer
 */
function scoreMCQ(question, studentAnswer) {
  const correct = question.correct_answer?.trim().toLowerCase();
  const student = String(studentAnswer)?.trim().toLowerCase();
  const isCorrect = correct === student;
  
  return {
    is_correct: isCorrect,
    points_earned: isCorrect ? (question.points || 1) : 0,
  };
}

/**
 * Score a short answer
 */
function scoreShortAnswer(question, studentAnswer) {
  const correct = question.correct_answer?.trim().toLowerCase();
  const student = String(studentAnswer)?.trim().toLowerCase();
  const isCorrect = correct === student;
  
  return {
    is_correct: isCorrect,
    points_earned: isCorrect ? (question.points || 1) : 0,
  };
}

/**
 * Async calculation of complete exam score including automated test execution
 */
export async function calculateExamScoreAsync(questions = [], studentAnswers = {}) {
  let score = 0;
  let totalPossible = 0;
  let needsManualGrading = false;
  const gradedAnswers = [];

  const qList = Array.isArray(questions) ? questions : [];
  const ansMap = studentAnswers || {};

  for (const question of qList) {
    const pts = parseInt(question.points) || 1;
    totalPossible += pts;
    const studentAnswer = ansMap[question.id] || '';
    const result = await scoreAnswerAsync(question, studentAnswer);

    if (result.needs_manual_grading) {
      needsManualGrading = true;
    }

    score += result.points_earned;
    gradedAnswers.push({
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: result.is_correct,
      points_earned: result.points_earned,
      test_results: result.test_results || null
    });
  }

  const percentage = totalPossible > 0 ? ((score / totalPossible) * 100).toFixed(2) : 0;

  return {
    score,
    totalScore: score,
    total_possible: totalPossible,
    totalPossible,
    percentage: parseFloat(percentage),
    needs_manual_grading: needsManualGrading,
    graded_answers: gradedAnswers,
    details: gradedAnswers,
  };
}

/**
 * Synchronous backward-compatible fallback
 */
export function calculateExamScore(questions = [], studentAnswers = {}) {
  let score = 0;
  let totalPossible = 0;
  let needsManualGrading = false;
  const gradedAnswers = [];

  const qList = Array.isArray(questions) ? questions : [];
  const ansMap = studentAnswers || {};

  for (const question of qList) {
    const pts = parseInt(question.points) || 1;
    totalPossible += pts;
    const studentAnswer = ansMap[question.id] || '';
    const result = scoreAnswer(question, studentAnswer);

    if (result.needs_manual_grading) {
      needsManualGrading = true;
    }

    score += result.points_earned;
    gradedAnswers.push({
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: result.is_correct,
      points_earned: result.points_earned,
    });
  }

  const percentage = totalPossible > 0 ? ((score / totalPossible) * 100).toFixed(2) : 0;

  return {
    score,
    totalScore: score,
    total_possible: totalPossible,
    totalPossible,
    percentage: parseFloat(percentage),
    needs_manual_grading: needsManualGrading,
    graded_answers: gradedAnswers,
    details: gradedAnswers,
  };
}
