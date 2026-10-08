const fs = require('fs');

const path = 'app/dashboard/student/practice/page.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport PageWrapper from '@/components/PageWrapper';");

content = content.replace(/return \([\s\n]*<div className="dashboard-page">/, "return (\n    <PageWrapper>\n      <div className=\"dashboard-page\">");
content = content.replace(/<\/div>\s*\);\s*\}\s*$/, "</div>\n    </PageWrapper>\n  );\n}");

fs.writeFileSync(path, content);
