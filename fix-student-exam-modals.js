const fs = require('fs');
let c = fs.readFileSync('app/dashboard/student/exam/[id]/page.js', 'utf8');

c = c.replace(
  "import { calculateExamScore } from '@/lib/scoring';",
  "import { calculateExamScore } from '@/lib/scoring';\nimport { ConfirmModal } from '@/components/Modal';"
);

c = c.replace(
  "  const [scoreData, setScoreData] = useState(null);",
  "  const [scoreData, setScoreData] = useState(null);\n  const [confirmSubmit, setConfirmSubmit] = useState(false);"
);

c = c.replace(
  /if \(confirm\('Are you sure you want to submit your examination now\?'\)\) \{\n\s*handleSubmit\(false\);\n\s*\}/s,
  "setConfirmSubmit(true);"
);

c = c.replace(
  /if \(confirm\('Are you ready to finalize and submit this exam\?'\)\) \{\n\s*handleSubmit\(false\);\n\s*\}/s,
  "setConfirmSubmit(true);"
);

const modalJSX = `
      <ConfirmModal
        isOpen={confirmSubmit}
        title="Submit Examination"
        message="Are you ready to finalize and submit this exam? You will not be able to change your answers."
        isDanger={false}
        onConfirm={() => {
          setConfirmSubmit(false);
          handleSubmit(false);
        }}
        onCancel={() => setConfirmSubmit(false)}
        confirmText="Submit Exam"
      />
    </div>
  );
}`;

c = c.replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync('app/dashboard/student/exam/[id]/page.js', c);
