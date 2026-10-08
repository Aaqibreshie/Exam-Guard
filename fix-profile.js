const fs = require('fs');
const path = 'app/dashboard/student/profile/page.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  ".order('created_at', { ascending: false });", 
  ".order('started_at', { ascending: false });"
);

fs.writeFileSync(path, content);
