const fs = require('fs');
let c = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

c = c.replace(
  "const [creationMode, setCreationMode] = useState('bulk'); // 'bulk' | 'single'",
  "const [creationMode, setCreationMode] = useState('bulk'); // 'bulk' | 'single'\n  const [editingQuestionId, setEditingQuestionId] = useState(null);"
);

const oldAddQuestion = /const handleAddSingleQuestion = async \(e\) => \{[\s\S]*?(?=const handleAddTestCase = \(\) =>)/;

const newAddQuestion = `const handleAddSingleQuestion = async (e) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      let options = null;
      let correctAnswer = null;
      let validTestCases = [];

      if (qType === 'mcq') {
        options = mcqOptions;
        correctAnswer = mcqOptions[mcqCorrect];
        if (options.some(o => !o.trim())) throw new Error("All 4 MCQ options must be filled.");
      } else if (qType === 'short_answer') {
        correctAnswer = shortAnswerCorrect.trim();
        if (!correctAnswer) throw new Error("Please specify the correct answer for automated scoring.");
      } else if (qType === 'project' || qType === 'coding') {
        validTestCases = testCases.filter(tc => tc.input.trim() || tc.expected_output.trim());
      }

      const points = parseInt(qPoints) || 1;
      const isCodeType = qType === 'project' || qType === 'coding';
      const newQ = {
        question_text: qText.trim(),
        question_type: qType,
        options: isCodeType ? { language: qLanguage } : options,
        correct_answer: correctAnswer,
        points,
        starter_code: isCodeType ? starterCode : null,
        test_cases: isCodeType ? validTestCases : []
      };

      if (editingQuestionId) {
        // UPDATE MODE
        let updatedData = null;
        try {
          const { data, error } = await supabase.from('questions').update(newQ).eq('id', editingQuestionId).select().single();
          if (error) throw error;
          updatedData = data;
        } catch (updateErr) {
          const fallbackQ = {
            question_text: qText.trim(),
            question_type: (qType === 'coding') ? 'project' : qType,
            options: isCodeType ? { is_coding: true, starter_code: starterCode, test_cases: validTestCases, language: qLanguage } : options,
            correct_answer: isCodeType ? null : correctAnswer,
            points
          };
          const { data: fbData, error: fbErr } = await supabase.from('questions').update(fallbackQ).eq('id', editingQuestionId).select().single();
          if (fbErr) throw fbErr;
          updatedData = { ...fbData, question_type: qType, starter_code: starterCode, test_cases: validTestCases };
        }
        
        const oldPoints = questions.find(q => q.id === editingQuestionId)?.points || 0;
        if (points !== oldPoints) {
            const updatedMarks = Math.max(0, (exam.total_marks || 0) - oldPoints + points);
            await supabase.from('exams').update({ total_marks: updatedMarks }).eq('id', id);
            setExam({ ...exam, total_marks: updatedMarks });
        }
        
        setQuestions(questions.map(q => q.id === editingQuestionId ? updatedData : q));
        showNotification('Question updated successfully!');
        setEditingQuestionId(null);
      } else {
        // INSERT MODE
        newQ.exam_id = id;
        newQ.order_index = questions.length;
        let insertedData = null;
        try {
          const { data, error } = await supabase.from('questions').insert([newQ]).select().single();
          if (error) throw error;
          insertedData = data;
        } catch (insertErr) {
          const fallbackQ = {
            exam_id: id,
            question_text: qText.trim(),
            question_type: (qType === 'coding') ? 'project' : qType,
            options: isCodeType ? { is_coding: true, starter_code: starterCode, test_cases: validTestCases, language: qLanguage } : options,
            correct_answer: isCodeType ? null : correctAnswer,
            points,
            order_index: questions.length
          };
          const { data: fbData, error: fbErr } = await supabase.from('questions').insert([fallbackQ]).select().single();
          if (fbErr) throw fbErr;
          insertedData = { ...fbData, question_type: qType, starter_code: starterCode, test_cases: validTestCases };
        }
  
        const updatedMarks = (exam.total_marks || 0) + points;
        await supabase.from('exams').update({ total_marks: updatedMarks }).eq('id', id);
        setExam({ ...exam, total_marks: updatedMarks });
        setQuestions([...questions, insertedData]);
        showNotification('Question added successfully!');
      }

      setQText('');
      setMcqOptions(['', '', '', '']);
      setMcqCorrect(0);
      setShortAnswerCorrect('');
      setStarterCode("function solution(arr) {\\n  // Write your code here\\n  return arr;\\n}");
      setTestCases([
        { input: '[1, 2, 3]', expected_output: '[3, 2, 1]', description: 'Sample Test Case 1', hidden: false }
      ]);
      setQPoints(1);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setQText('');
    setMcqOptions(['', '', '', '']);
    setMcqCorrect(0);
    setShortAnswerCorrect('');
    setQPoints(1);
  };

  const handleEditQuestionClick = (q) => {
    setEditingQuestionId(q.id);
    setActiveTab('questions');
    setCreationMode('single');
    setQType(q.question_type === 'project' ? (q.options?.is_coding ? 'coding' : 'project') : q.question_type);
    setQText(q.question_text);
    setQPoints(q.points || 1);
    
    if (q.question_type === 'mcq' && q.options) {
      const opts = [...q.options];
      while (opts.length < 4) opts.push('');
      setMcqOptions(opts.slice(0, 4));
      setMcqCorrect(Math.max(0, q.options.indexOf(q.correct_answer)));
    } else {
      setMcqOptions(['', '', '', '']);
      setMcqCorrect(0);
    }
    
    if (q.question_type === 'short_answer') {
      setShortAnswerCorrect(q.correct_answer || '');
    } else {
      setShortAnswerCorrect('');
    }
    
    if (q.question_type === 'project' && q.options?.is_coding) {
      setQLanguage(q.options?.language || 'javascript');
      setStarterCode(q.starter_code || '');
      setTestCases(q.test_cases || []);
    } else {
      setQLanguage('javascript');
      setStarterCode("function solution(arr) {\\n  // Write your code here\\n  return arr;\\n}");
      setTestCases([{ input: '[1, 2, 3]', expected_output: '[3, 2, 1]', description: 'Sample Test Case 1', hidden: false }]);
    }
    
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

`;

c = c.replace(oldAddQuestion, newAddQuestion);

c = c.replace(
  /Add Questions to Exam/,
  "{editingQuestionId ? 'Update Question' : 'Add Questions to Exam'}"
);

c = c.replace(
  /Import your question paper in bulk or compose individual questions/,
  "{editingQuestionId ? 'Modify the details of your question below' : 'Import your question paper in bulk or compose individual questions'}"
);

c = c.replace(
  /\{addLoading \? 'Saving\.\.\.' : '➕ Add Question'\}/,
  "{addLoading ? 'Saving...' : (editingQuestionId ? '✓ Update Question' : '➕ Add Question')}"
);

c = c.replace(
  /<button\s*onClick=\{\(\) => triggerDeleteQuestion\(q\.id, q\.points\)\}\s*className="btn btn-ghost"\s*style=\{\{\s*padding:\s*'8px',\s*color:\s*'#e11d48',\s*background:\s*'#fff1f2',\s*borderRadius:\s*'8px'\s*\}\}\s*>/,
  `<button onClick={() => handleEditQuestionClick(q)} className="btn btn-ghost" style={{ padding: '8px', color: '#3b82f6', background: '#eff6ff', borderRadius: '8px', marginRight: '8px' }} title="Edit Question">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
   </button>
   <button onClick={() => triggerDeleteQuestion(q.id, q.points)} className="btn btn-ghost" style={{ padding: '8px', color: '#e11d48', background: '#fff1f2', borderRadius: '8px' }} title="Delete Question">`
);

// Add Cancel button next to Update Question
c = c.replace(
  /<button\s*type="submit"\s*disabled=\{addLoading\}\s*className="btn btn-primary btn-md"\s*style=\{\{\s*marginTop:\s*'26px'\s*\}\}\s*>/,
  `{editingQuestionId && (
     <button
       type="button"
       onClick={handleCancelEdit}
       disabled={addLoading}
       className="btn btn-ghost btn-md"
       style={{ marginTop: '26px', marginRight: '12px', background: '#f1f5f9', color: '#475569' }}
     >
       Cancel Edit
     </button>
   )}
   <button
     type="submit" 
     disabled={addLoading}
     className="btn btn-primary btn-md"
     style={{ marginTop: '26px' }}
   >`
);

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', c);
