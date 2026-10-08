const fs = require('fs');
let c = fs.readFileSync('app/dashboard/student/exam/[id]/page.js', 'utf8');

c = c.replace(
  /if \(confirm\('Are you sure you want to submit your examination now\?'\)\) \{\n\s*submitExamData\(false, false\);\n\s*\}/s,
  "setConfirmSubmit(true);"
);

c = c.replace(
  /if \(confirm\('Are you ready to finalize and submit this exam\?'\)\) \{\n\s*submitExamData\(false, false\);\n\s*\}/s,
  "setConfirmSubmit(true);"
);

c = c.replace(
  /handleSubmit\(false\)/s,
  "submitExamData(false, false)"
);

fs.writeFileSync('app/dashboard/student/exam/[id]/page.js', c);
