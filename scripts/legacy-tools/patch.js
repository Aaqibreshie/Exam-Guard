const fs = require('fs');
let content = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

// 1. Add 'bank' mode button next to Bulk Import
const newButton = `
                <button
                  type="button"
                  onClick={() => setCreationMode('bank')}
                  className={\`btn btn-sm \${creationMode === 'bank' ? 'btn-primary' : 'btn-ghost'}\`}
                  style={{ borderRadius: '8px', background: creationMode === 'bank' ? '#4f46e5' : '#e0e7ff', color: creationMode === 'bank' ? '#ffffff' : '#4338ca', border: creationMode === 'bank' ? 'none' : '1px solid #c7d2fe' }}
                >
                  📂 Import from Bank
                </button>
`;
content = content.replace("⚡ Bulk Import\n                </button>", "⚡ Bulk Import\n                </button>" + newButton);

// 2. Add Bank Mode UI
const bankUI = `
            {/* BANK IMPORT MODE */}
            {creationMode === 'bank' && (
              <BankImportModal 
                examId={exam.id} 
                examSubject={exam.subject} 
                onImportSuccess={(newQuestions) => {
                  setQuestions([...questions, ...newQuestions]);
                  setCreationMode('single');
                  showNotification(\`🎉 Successfully imported \${newQuestions.length} questions from the bank!\`);
                }}
                onCancel={() => setCreationMode('single')}
              />
            )}
`;
content = content.replace("{/* BULK IMPORT MODE */}", bankUI + "\n            {/* BULK IMPORT MODE */}");

// 3. Import getSubjectStyling in BankImportModal (which we will define inside this file or another component)
// Let's create BankImportModal as a separate component to keep it clean!
content = content.replace("import { getSubjectStyling } from '@/lib/subject-helpers';", "import { getSubjectStyling } from '@/lib/subject-helpers';\nimport BankImportModal from '@/components/BankImportModal';");

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', content);
