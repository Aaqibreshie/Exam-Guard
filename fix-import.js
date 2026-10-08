const fs = require('fs');
let content = fs.readFileSync('components/BankImportModal.js', 'utf8');

content = content.replace("question: q.question,", "question_text: q.question,");

fs.writeFileSync('components/BankImportModal.js', content);
