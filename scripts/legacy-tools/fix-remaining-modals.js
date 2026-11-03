const fs = require('fs');

// Question Bank
let qb = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');
qb = qb.replace(
  /const handleDelete = async \(id\) => \{\n\s*if \(!confirm\("Remove this question from the bank\?"\)\) return;\n\s*try \{\n\s*const \{ error: delErr \} = await supabase\.from\('question_bank'\)\.delete\(\)\.eq\('id', id\);\n\s*if \(delErr\) throw delErr;\n\s*setQuestions\(q => q\.filter\(item => item\.id !== id\)\);\n\s*\} catch \(err\) \{\n\s*showAlert\(err\.message, 'Error', true\);\n\s*\}\n\s*\};/g,
  `const triggerDelete = (id) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Question',
      message: 'Remove this question from the bank? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const { error: delErr } = await supabase.from('question_bank').delete().eq('id', id);
          if (delErr) throw delErr;
          setQuestions(q => q.filter(item => item.id !== id));
        } catch (err) {
          showAlert(err.message, 'Error', true);
        }
      }
    });
  };`
);
qb = qb.replace(/onClick=\{\(\) => handleDelete\(q\.id\)\}/g, "onClick={() => triggerDelete(q.id)}");
fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', qb);

// Code Editor
let ce = fs.readFileSync('components/CodeEditor.js', 'utf8');
ce = ce.replace(
  /const handleReset = \(\) => \{\n\s*if \(confirm\('Reset your code to the original template\? Current changes will be overwritten\.'\)\) \{\n\s*const resetVal = starterCode \|\| '';\n\s*setCode\(resetVal\);\n\s*if \(onChange\) onChange\(resetVal\);\n\s*setTestResults\(null\);\n\s*\}\n\s*\};/g,
  `const handleReset = () => {
    setShowResetConfirm(true);
  };
  
  const confirmReset = () => {
    const resetVal = starterCode || '';
    setCode(resetVal);
    if (onChange) onChange(resetVal);
    setTestResults(null);
    setShowResetConfirm(false);
  };`
);
fs.writeFileSync('components/CodeEditor.js', ce);
