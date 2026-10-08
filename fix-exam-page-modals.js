const fs = require('fs');

let c = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

if (!c.includes('ConfirmModal')) {
  c = c.replace(
    "import { getSubjectStyling } from '@/lib/subject-helpers';",
    "import { getSubjectStyling } from '@/lib/subject-helpers';\nimport { ConfirmModal } from '@/components/Modal';"
  );
}

if (!c.includes('questionToDelete')) {
  c = c.replace(
    "  const [showDeleteModal, setShowDeleteModal] = useState(false);",
    "  const [showDeleteModal, setShowDeleteModal] = useState(false);\n  const [questionToDelete, setQuestionToDelete] = useState(null);"
  );
}

c = c.replace(
  /const handleDeleteQuestion = async \(qId, points\) => \{\n\s*if \(!confirm\('Are you sure you want to delete this question\?'\)\) return;\n\n\s*try \{\n\s*const \{ error \} = await supabase\.from\('questions'\)\.delete\(\)\.eq\('id', qId\);\n\s*if \(error\) throw error;\n\n\s*const updatedMarks = Math\.max\(0, \(exam\.total_marks \|\| 0\) - points\);\n\s*await supabase\.from\('exams'\)\.update\(\{ total_marks: updatedMarks \}\)\.eq\('id', id\);\n\s*\n\s*setExam\(\{ \.\.\.exam, total_marks: updatedMarks \}\);\n\s*setQuestions\(questions\.filter\(q => q\.id !== qId\)\);\n\s*showNotification\('Question deleted\.'\);\n\s*\} catch \(err\) \{\n\s*showNotification\(err\.message, 'error'\);\n\s*\}\n\s*\};/g,
  `const triggerDeleteQuestion = (qId, points) => {
    setQuestionToDelete({ id: qId, points });
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    const { id: qId, points } = questionToDelete;
    
    try {
      const { error } = await supabase.from('questions').delete().eq('id', qId);
      if (error) throw error;

      const updatedMarks = Math.max(0, (exam.total_marks || 0) - points);
      await supabase.from('exams').update({ total_marks: updatedMarks }).eq('id', id);
      
      setExam({ ...exam, total_marks: updatedMarks });
      setQuestions(questions.filter(q => q.id !== qId));
      showNotification('Question deleted.');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setQuestionToDelete(null);
    }
  };`
);

c = c.replace(/onClick=\{\(\) => handleDeleteQuestion\(q\.id, q\.points\)\}/g, "onClick={() => triggerDeleteQuestion(q.id, q.points)}");

if (!c.includes('<ConfirmModal isOpen={!!questionToDelete}')) {
  c = c.replace(
    "{/* Delete Exam Confirmation Modal */}",
    `<ConfirmModal 
        isOpen={!!questionToDelete} 
        title="Delete Question" 
        message="Are you sure you want to delete this question? This action cannot be undone." 
        onConfirm={confirmDeleteQuestion} 
        onCancel={() => setQuestionToDelete(null)} 
        confirmText="Delete" 
        isDanger={true} 
      />\n\n      {/* Delete Exam Confirmation Modal */}`
  );
}

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', c);
