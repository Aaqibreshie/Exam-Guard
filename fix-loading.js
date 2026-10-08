const fs = require('fs');
let content = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

content = content.replace(
  '    try {\n      setLoading(true);',
  '    try {'
);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', content);
