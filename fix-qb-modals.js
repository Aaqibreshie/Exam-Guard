const fs = require('fs');
let c = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

c = c.replace(
  "import { getSubjectStyling } from '@/lib/subject-helpers';",
  "import { getSubjectStyling } from '@/lib/subject-helpers';\nimport { ConfirmModal, AlertModal } from '@/components/Modal';"
);

c = c.replace(
  "  const [activeTab, setActiveTab] = useState('bank');",
  "  const [activeTab, setActiveTab] = useState('bank');\n  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', isError: false });\n  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });\n\n  const showAlert = (message, title = 'Notification', isError = false) => {\n    setAlertConfig({ isOpen: true, title, message, isError });\n  };\n"
);

c = c.replace(
  "if (!bulkInput.trim()) return alert('Please enter question data');",
  "if (!bulkInput.trim()) return showAlert('Please enter question data', 'Input Required', true);"
);

c = c.replace(
  "alert(`Successfully imported ${toInsert.length} questions into the bank!`);",
  "showAlert(`Successfully imported ${toInsert.length} questions into the bank!`, 'Success');"
);

c = c.replace(/alert\(err\.message\);/g, "showAlert(err.message, 'Error', true);");

c = c.replace(
  "alert(\"Warning: 0 rows were updated. You might not have permission to edit this question (e.g., if another teacher created it).\");",
  "showAlert(\"Warning: 0 rows were updated. You might not have permission to edit this question (e.g., if another teacher created it).\", 'Permission Denied', true);"
);

c = c.replace(
  /const handleDelete = async \(id\) => \{\n\s*if \(!confirm\("Remove this question from the bank\?"\)\) return;\n\s*try \{\n\s*const \{ error \} = await supabase\.from\('question_bank'\)\.delete\(\)\.eq\('id', id\);\n\s*if \(error\) throw error;\n\s*setQuestions\(questions\.filter\(q => q\.id !== id\)\);\n\s*setFilteredQuestions\(filteredQuestions\.filter\(q => q\.id !== id\)\);\n\s*\} catch \(err\) \{\n\s*showAlert\(err\.message, 'Error', true\);\n\s*\}\n\s*\};/g,
  `const triggerDelete = (id) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Question',
      message: 'Remove this question from the bank? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const { error } = await supabase.from('question_bank').delete().eq('id', id);
          if (error) throw error;
          setQuestions(questions.filter(q => q.id !== id));
          setFilteredQuestions(filteredQuestions.filter(q => q.id !== id));
        } catch (err) {
          showAlert(err.message, 'Error', true);
        }
      }
    });
  };`
);

c = c.replace(/onClick=\{\(\) => handleDelete\(q\.id\)\}/g, "onClick={() => triggerDelete(q.id)}");

const modalJSX = `
      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        isError={alertConfig.isError}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        confirmText="Confirm"
      />
    </div>
  );
}`;

c = c.replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', c);
