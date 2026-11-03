const fs = require('fs');

let c = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

c = c.replace(
  "<h1 className=\"dashboard-title\" style={{ marginBottom: '8px' }}>{exam.title}</h1>",
  "<h1 className=\"dashboard-title\" style={{ marginBottom: '8px' }}>{exam.title?.replace(/^\\[(Coding Practical|Hybrid Assessment|Theory MCQ)\\]\\s*/i, '')}</h1>"
);

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', c);
