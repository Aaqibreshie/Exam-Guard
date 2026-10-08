const fs = require('fs');
const path = 'app/dashboard/teacher/page.js';
let content = fs.readFileSync(path, 'utf8');

// Find where subs is declared
content = content.replace("const { data: subs } = await supabase", "const { data: subsData } = await supabase");
content = content.replace("if (subs) {", "if (subsData) {\n      subs = subsData;");
content = content.replace("let totalPossible = 0;", "let totalPossible = 0;\n  let subs = [];");

fs.writeFileSync(path, content);
