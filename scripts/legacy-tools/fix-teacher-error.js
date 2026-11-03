const fs = require('fs');
const path = 'app/dashboard/teacher/page.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the inner declaration with nothing, and move it outside
content = content.replace("const examIds = examList.map(e => e.id);", "");

// Find let totalSubmissions and insert const examIds above it
content = content.replace("let totalSubmissions = 0;", "const examIds = examList.map(e => e.id);\n  let totalSubmissions = 0;");

fs.writeFileSync(path, content);
