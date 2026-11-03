const fs = require('fs');

let content = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

// 1. Import autoDetectAndParse
content = content.replace("import { getSubjectStyling } from '@/lib/subject-helpers';", "import { getSubjectStyling } from '@/lib/subject-helpers';\nimport { autoDetectAndParse } from '@/lib/question-parser';");

// 2. Replace JSON parsing with autoDetectAndParse
const newHandleBulkImport = `
  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return alert('Please enter question data');
    setBulkLoading(true);
    try {
      let parsed = [];
      try {
        parsed = autoDetectAndParse(bulkInput);
        if (!parsed || parsed.length === 0) throw new Error("Could not detect any valid questions.");
      } catch (err) {
        throw new Error("Failed to parse format: " + err.message);
      }

      const toInsert = parsed.map((q, i) => {
        let qLanguage = 'python';
        if (qSubject && qSubject.toLowerCase().includes('javascript')) qLanguage = 'javascript';
        if (qSubject && qSubject.toLowerCase().includes('java') && !qSubject.toLowerCase().includes('script')) qLanguage = 'java';
        
        const isCodeType = q.question_type === 'coding' || q.question_type === 'project';
        const finalOptions = isCodeType ? { language: qLanguage } : (q.options || null);

        return {
          created_by: userId,
          question: q.question_text || \`Imported Question \${i + 1}\`,
          question_type: q.question_type || 'mcq',
          options: finalOptions,
          correct_answer: q.correct_answer || null,
          points: q.points || 1,
          subject: qSubject || 'General',
          starter_code: q.starter_code || null,
          test_cases: q.test_cases || []
        };
      });

      const { error: insErr } = await supabase
        .from('question_bank')
        .insert(toInsert);

      if (insErr) throw insErr;
      
      alert(\`Successfully imported \${toInsert.length} questions into the bank!\`);
      setBulkInput('');
      setShowAddModal(false);
      fetchQuestions();
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setBulkInput(content);
      }
    };
    reader.readAsText(file);
  };
`;

const oldHandleBulkImportStart = "const handleBulkImport = async () => {";
const handleAddQuestionStart = "  const handleAddQuestion = async (e) => {";

// Regex replace handleBulkImport to handleAddQuestion
const regex = new RegExp("const handleBulkImport = async \\(\\) => \\{[\\s\\S]*?const handleAddQuestion = async \\(e\\) => \\{");
content = content.replace(regex, newHandleBulkImport.trim() + "\n\n" + handleAddQuestionStart);

// 3. Add UI elements for CSV/TXT and File Upload
const uiReplacement = `
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Load Template:</span>
                <button type="button" onClick={() => loadSampleTemplate('coding')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ecfdf5', color: '#059669' }}>
                  💻 Coding JSON
                </button>
                <button type="button" onClick={() => loadSampleTemplate('json')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#f5f3ff', color: '#7c3aed' }}>
                  🔘 MCQ JSON
                </button>
                <button type="button" onClick={() => loadSampleTemplate('csv')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fffbeb', color: '#b45309' }}>
                  📄 CSV
                </button>
                <button type="button" onClick={() => loadSampleTemplate('txt')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1' }}>
                  📝 Raw Text
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <input type="file" accept=".json,.csv,.txt" onChange={handleFileUpload} className="form-input" style={{ padding: '8px' }} />
              </div>
              <textarea 
                className="form-input" 
                rows="12" 
                value={bulkInput} 
                onChange={e => setBulkInput(e.target.value)} 
                placeholder="Paste your JSON, CSV, or Raw Text questions here..."
`;

content = content.replace(/<div>\s*<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>\s*<span style={{ fontSize: '0\.85rem', color: '#64748b' }}>Load Template:<\/span>\s*<button.*?<\/button>\s*<button.*?<\/button>\s*<\/div>\s*<textarea/g, uiReplacement + "\n<textarea");
content = content.replace(/<textarea([^>]+)placeholder="Paste your JSON array of questions here..."/g, '<textarea$1placeholder="Paste your JSON, CSV, or Raw Text questions here..."');

// 4. Update loadSampleTemplate function to include CSV and TXT
const addFormats = `
    } else if (format === 'csv') {
      setBulkInput("Question,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Points\\nWhat command creates a Git branch?,git branch -new,git checkout -b,git switch -c,git branch --create,git checkout -b,2\\nWhich middleware parses JSON?,express.urlencoded(),express.json(),bodyParser.text(),express.static(),express.json(),1");
    } else if (format === 'txt') {
      setBulkInput("1. What hook is used in React to manage state?\\nA) useEffect\\nB) useState\\nC) useContext\\nD) useReducer\\nAnswer: B\\nPoints: 1\\n\\n2. Explain what a closure is in JavaScript.\\nCorrect Answer: A function that remembers its outer lexical environment.\\nPoints: 2");
    }
  };
`;
content = content.replace(/  };\n\n  const handleBulkImport/g, addFormats + "\n  const handleBulkImport");

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', content);
