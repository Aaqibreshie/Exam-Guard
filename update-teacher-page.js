const fs = require('fs');
const path = 'app/dashboard/teacher/page.js';
let content = fs.readFileSync(path, 'utf8');

// Insert import
if (!content.includes('TeacherAnalytics')) {
  content = content.replace("import ExamCard from '@/components/ExamCard';", "import ExamCard from '@/components/ExamCard';\nimport TeacherAnalytics from '@/components/TeacherAnalytics';");
}

// Extract stats calculation area
const targetLine = "const averageScore = totalPossible > 0 ? Math.round((totalScores / totalPossible) * 100) : 0;";
const newStatsLogic = `
  const averageScore = totalPossible > 0 ? Math.round((totalScores / totalPossible) * 100) : 0;

  // Process Exam Stats for Recharts
  const examStats = [];
  if (totalExams > 0 && subs) {
    examList.forEach(exam => {
      const examSubs = subs.filter(s => s.exam_id === exam.id);
      if (examSubs.length > 0) {
        let eScores = 0;
        let ePossible = 0;
        examSubs.forEach(s => {
          eScores += (s.score || 0);
          ePossible += (s.total_possible || 0);
        });
        const eAvg = ePossible > 0 ? Math.round((eScores / ePossible) * 100) : 0;
        examStats.push({
          name: exam.title.length > 15 ? exam.title.substring(0, 15) + '...' : exam.title,
          average: eAvg,
          submissions: examSubs.length
        });
      }
    });
  }

  // Question Stats placeholder (we can fetch this if needed, but for now we will just use a mock or fetch if answers exist)
  let questionStats = [];
  if (totalExams > 0) {
    const { data: answers } = await supabase
      .from('answers')
      .select('is_correct, question_id, questions(question_text, exam_id)')
      .limit(1000);
      
    if (answers && answers.length > 0) {
      const qStats = {};
      answers.forEach(ans => {
        // filter out answers not belonging to teacher's exams
        if (ans.questions && examIds.includes(ans.questions.exam_id)) {
          const qid = ans.question_id;
          if (!qStats[qid]) {
            qStats[qid] = {
              text: ans.questions.question_text,
              total: 0,
              correct: 0
            };
          }
          qStats[qid].total += 1;
          if (ans.is_correct) qStats[qid].correct += 1;
        }
      });
      
      questionStats = Object.values(qStats).map(q => {
        const textStr = typeof q.text === 'string' ? q.text : 'Question';
        return {
          shortName: textStr.length > 20 ? textStr.substring(0, 20) + '...' : textStr,
          successRate: Math.round((q.correct / q.total) * 100),
          total: q.total
        };
      }).sort((a, b) => a.successRate - b.successRate).slice(0, 5); // Bottom 5 (hardest questions)
    }
  }
`;

content = content.replace(targetLine, newStatsLogic);

// Insert component above exam grid
const targetJSX = `<div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Your Examinations</h2>`;

const analyticsJSX = `<TeacherAnalytics examStats={examStats} questionStats={questionStats} />\n\n      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Your Examinations</h2>`;

content = content.replace(targetJSX, analyticsJSX);

fs.writeFileSync(path, content);
