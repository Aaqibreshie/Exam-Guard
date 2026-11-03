const fs = require('fs');
let c = fs.readFileSync('app/dashboard/student/exam/[id]/page.js', 'utf8');

const startIndex = c.indexOf('const gradedList = results?.graded_answers');
const endIndex = c.indexOf('setIsCompleted(true);', startIndex) + 'setIsCompleted(true);'.length;

if (startIndex !== -1 && endIndex !== -1) {
  const oldLogic = c.substring(startIndex, endIndex);
  const newLogic = `const response = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: subId,
          answers: currentAnswers,
          status: expelled ? 'expelled' : 'submitted',
          warning_count: warningCount,
          auto_submitted: auto
        })
      });
      
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Failed to submit exam');

      const gradedList = results?.graded_answers || results?.details || [];
      const reviewItems = qList.map(q => {
        const studentAns = currentAnswers[q.id] || '';
        const graded = gradedList.find(g => g.question_id === q.id);
        return {
          id: q.id,
          question_text: q.question_text,
          options: q.options || [],
          correct_answer: q.correct_answer,
          student_answer: studentAns,
          is_correct: graded?.is_correct,
          points_earned: graded?.points_earned
        };
      });

      setScoreData({
        percentage: responseData.submission.percentage,
        score: responseData.submission.score,
        total: responseData.submission.total_possible,
        status: responseData.submission.status
      });
      
      setReviewData(reviewItems);
      setIsCompleted(true);`;
      
  c = c.substring(0, startIndex) + newLogic + c.substring(endIndex);
  fs.writeFileSync('app/dashboard/student/exam/[id]/page.js', c);
  console.log('Success');
} else {
  console.log('Could not find block');
}
