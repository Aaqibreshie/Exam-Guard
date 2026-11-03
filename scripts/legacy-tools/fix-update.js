const fs = require('fs');
let content = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

content = content.replace(
  "const { error: updErr } = await supabase\n        .from('question_bank')\n        .update(updatedQ)\n        .eq('id', editingQuestion.id);",
  `const { error: updErr, data: updData } = await supabase
        .from('question_bank')
        .update(updatedQ)
        .eq('id', editingQuestion.id)
        .select();
        
      if (updData && updData.length === 0) {
        alert("Warning: 0 rows were updated. You might not have permission to edit this question (e.g., if another teacher created it).");
      }`
);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', content);
