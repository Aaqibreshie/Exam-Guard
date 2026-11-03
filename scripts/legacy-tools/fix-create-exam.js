const fs = require('fs');

let c = fs.readFileSync('app/dashboard/teacher/create-exam/page.js', 'utf8');

c = c.replace(
  "const formatTag = examFormat === 'coding' ? '[Coding Practical]' : examFormat === 'hybrid' ? '[Hybrid Assessment]' : '[Theory MCQ]';\n      const formattedTitle = title.includes('[') ? title : `${formatTag} ${title}`;",
  "// No longer prepending bracket tags to titles\n      const formattedTitle = title;"
);

fs.writeFileSync('app/dashboard/teacher/create-exam/page.js', c);
