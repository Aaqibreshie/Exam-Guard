const fs = require('fs');

const path = 'app/dashboard/student/profile/page.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("import ActivityHeatmap from '@/components/ActivityHeatmap';", "import ActivityHeatmap from '@/components/ActivityHeatmap';\nimport PageWrapper from '@/components/PageWrapper';");

content = content.replace(/return \([\s\n]*<div style=\{\{/, "return (\n    <PageWrapper>\n      <div style={{");
content = content.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/, "</div>\n      </div>\n    </PageWrapper>\n  );\n}");

fs.writeFileSync(path, content);
