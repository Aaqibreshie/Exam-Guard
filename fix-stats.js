const fs = require('fs');
let content = fs.readFileSync('app/dashboard/teacher/page.js', 'utf8');

content = content.replace(
  "name: exam.title.length > 15 ? exam.title.substring(0, 15) + '...' : exam.title,",
  "name: exam.title.length > 15 ? exam.title.substring(0, 15) + '...' : exam.title,\n          fullName: exam.title,"
);

content = content.replace(
  "shortName: textStr.length > 20 ? textStr.substring(0, 20) + '...' : textStr,",
  "shortName: textStr.length > 20 ? textStr.substring(0, 20) + '...' : textStr,\n          fullName: textStr,"
);

fs.writeFileSync('app/dashboard/teacher/page.js', content);
