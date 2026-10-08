const fs = require('fs');
let c = fs.readFileSync('app/dashboard/student/exam/[id]/page.js', 'utf8');

if (!c.includes('ConfirmModal')) {
  c = c.replace(
    "import Link from 'next/link';",
    "import Link from 'next/link';\nimport { ConfirmModal } from '@/components/Modal';"
  );
  fs.writeFileSync('app/dashboard/student/exam/[id]/page.js', c);
  console.log("Import added!");
} else {
  console.log("Already imported.");
}
