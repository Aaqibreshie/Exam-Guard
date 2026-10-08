const fs = require('fs');

const path1 = 'app/dashboard/student/practice/[id]/page.js';
let content1 = fs.readFileSync(path1, 'utf8');

// The original issue was `\` before backticks and dollar signs inside the template literal.
content1 = content1.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync(path1, content1);
