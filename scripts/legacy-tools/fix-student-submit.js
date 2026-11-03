const fs = require('fs');
let c = fs.readFileSync('app/dashboard/student/exam/[id]/page.js', 'utf8');

const oldLogic = /const gradedList = results\?\.graded_answers \|\| results\?\.details \|\| \[\];\s*const answersToInsert = gradedList\.map\(res => \(\{\s*submission_id: subId,\s*question_id: res\.question_id,\s*student_answer: currentAnswers\[res\.question_id\] \|\| '',\s*is_correct: res\.is_correct,\s*points_earned: res\.points_earned\s*\}\)\);\s*if \(answersToInsert\.length > 0\) \{\s*await supabase\.from\('answers'\)\.upsert\(answersToInsert, \{ onConflict: 'submission_id,question_id' \}\);\s*\}\s*const status = expelled \? 'expelled' : 'submitted';\s*const finalScore = results\.score \?\? results\.totalScore \?\? 0;\s*const finalTotal = results\.total_possible \?\? results\.totalPossible \?\? \(exam\?\.total_marks \|\| 0\);\s*const finalPercentage = results\.percentage \?\? \(finalTotal > 0 \? Math\.round\(\(finalScore \/ finalTotal\) \* 100\) : 0\);\s*await supabase\s*\.from\('submissions'\)\s*\.update\(\{\s*submitted_at: new Date\(\)\.toISOString\(\),\s*score: finalScore,\s*total_possible: finalTotal,\s*percentage: finalPercentage,\s*status,\s*auto_submitted: auto\s*\}\)\s*\.eq\('id', subId\);\s*setScoreData\(\{\s*percentage: finalPercentage,\s*score: finalScore,\s*total: finalTotal,\s*status\s*\}\);\s*const reviewItems = qList\.map\(q => \{\s*const studentAns = currentAnswers\[q\.id\] \|\| '';\s*const graded = gradedList\.find\(g => g\.question_id === q\.id\);\s*return \{\s*id: q\.id,\s*question_text: q\.question_text,\s*options: q\.options \|\| \[\],\s*correct_answer: q\.correct_answer,\s*student_answer: studentAns,\s*is_correct: graded\?\.is_correct,\s*points_earned: graded\?\.points_earned\s*\};\s*\}\);\s*setReviewData\(reviewItems\);\s*setIsCompleted\(true\);/s;

const newLogic = `      const response = await fetch('/api/submissions', {
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

c = c.replace(oldLogic, newLogic);
fs.writeFileSync('app/dashboard/student/exam/[id]/page.js', c);
