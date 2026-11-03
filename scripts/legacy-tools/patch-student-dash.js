const fs = require('fs');

const path = 'app/dashboard/student/page.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport PageWrapper from '@/components/PageWrapper';\nimport HoverCard from '@/components/HoverCard';");
content = content.replace("export default async function StudentDashboard() {", "export default async function StudentDashboard() {\n");

// Wrap main return with PageWrapper
content = content.replace(/return \([\s\S]*?<div className="dashboard-page">/, `return (
    <PageWrapper>
      <div className="dashboard-page">`);
      
content = content.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/, `</div>
      </div>
    </PageWrapper>
  );
}`);

fs.writeFileSync(path, content);
