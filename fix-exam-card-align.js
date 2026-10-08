const fs = require('fs');
let c = fs.readFileSync('components/ExamCard.js', 'utf8');

c = c.replace(
  "className=\"exam-card-header\" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}",
  "className=\"exam-card-header\" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}"
);

fs.writeFileSync('components/ExamCard.js', c);
