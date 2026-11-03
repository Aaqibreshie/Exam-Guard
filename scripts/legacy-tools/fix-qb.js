const fs = require('fs');
let content = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

// Replace the optimistic update & fetchQuestions with just using the returned data
content = content.replace(
  `      // Optimistic update
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...updatedQ } : q));
      fetchQuestions();`,
  `      // Update state with exact DB return to avoid cache issues
      if (updData && updData.length > 0) {
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? updData[0] : q));
      }`
);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', content);
