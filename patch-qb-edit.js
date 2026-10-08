const fs = require('fs');

let content = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

// Add edit state
const editState = `
  const [editingQuestion, setEditingQuestion] = useState(null);

  const startEdit = (q) => {
    setEditingQuestion(q);
    setQType(q.question_type);
    setQText(q.question);
    
    if (q.question_type === 'mcq') {
      const opts = q.options || [];
      setQOptions([opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || '']);
    } else {
      setQOptions(['', '', '', '']);
    }
    
    setQAnswer(q.correct_answer || '');
    setQPoints(q.points);
    setQSubject(q.subject || 'General');
    setShowAddModal(true);
    setCreationMode('single');
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      let finalOptions = null;
      if (qType === 'mcq') {
        const filledOptions = qOptions.filter(o => o.trim() !== '');
        if (filledOptions.length < 2) throw new Error("MCQ needs at least 2 options.");
        if (!qAnswer) throw new Error("Please select the correct answer.");
        finalOptions = filledOptions;
      } else if (qType === 'coding') {
        finalOptions = editingQuestion.options || { language: 'python' };
      }

      const updatedQ = {
        question: qText,
        question_type: qType,
        options: finalOptions,
        correct_answer: qType === 'mcq' ? qAnswer : (qType === 'short_answer' ? qAnswer : null),
        points: qPoints,
        subject: qSubject
      };

      const { error: updErr } = await supabase
        .from('question_bank')
        .update(updatedQ)
        .eq('id', editingQuestion.id);

      if (updErr) throw updErr;
      
      setShowAddModal(false);
      setEditingQuestion(null);
      setQText('');
      setQOptions(['', '', '', '']);
      setQAnswer('');
      
      fetchQuestions();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddLoading(false);
    }
  };
`;

content = content.replace("  const handleDelete", editState + "\n  const handleDelete");

// Replace onSubmit={handleAddQuestion} to conditionally call handleUpdateQuestion
content = content.replace("<form onSubmit={handleAddQuestion}>", "<form onSubmit={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>");

// Replace "New Question" with conditional title
content = content.replace(/<h3 style=\{\{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' \}\}>New Question<\/h3>/, "<h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{editingQuestion ? '✏️ Edit Question' : 'New Question'}</h3>");

// Replace "Save to Bank" conditionally
content = content.replace("{addLoading ? 'Saving...' : 'Save to Bank'}", "{addLoading ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Save to Bank')}");

// Add Edit Button in the card
const actionButtons = `
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => startEdit(q)} className="btn btn-ghost" style={{ color: '#0ea5e9' }}>
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="btn btn-ghost" style={{ color: '#ef4444' }}>
                    🗑️
                  </button>
                </div>
`;

content = content.replace(/<button onClick=\{\(\) => handleDelete\(q.id\)\} className="btn btn-ghost" style=\{\{ color: '#ef4444' \}\}>\s*🗑️\s*<\/button>/g, actionButtons);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', content);
