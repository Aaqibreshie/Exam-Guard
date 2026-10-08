const fs = require('fs');
let content = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

content = content.replace(
  `        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px' }}>
            DEBUG COLUMNS: {questions.length > 0 ? Object.keys(questions[0]).join(', ') : 'No questions'}
          </div>`,
  `        <div style={{ display: 'grid', gap: '16px' }}>`
);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', content);
