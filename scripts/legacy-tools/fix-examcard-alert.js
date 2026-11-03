const fs = require('fs');
let c = fs.readFileSync('components/ExamCard.js', 'utf8');

c = c.replace(
  "import { getSubjectStyling } from '@/lib/subject-helpers';",
  "import { getSubjectStyling } from '@/lib/subject-helpers';\nimport { AlertModal } from '@/components/Modal';"
);

c = c.replace(
  "  const [deleting, setDeleting] = useState(false);",
  "  const [deleting, setDeleting] = useState(false);\n  const [errorMsg, setErrorMsg] = useState('');"
);

c = c.replace(
  "alert(`Failed to remove exam: ${err.message}`);",
  "setErrorMsg(`Failed to remove exam: ${err.message}`);"
);

const modalJSX = `
    {errorMsg && (
      <AlertModal 
        isOpen={!!errorMsg}
        title="Error"
        message={errorMsg}
        isError={true}
        onClose={() => setErrorMsg('')}
      />
    )}
    </>
  );
}`;

c = c.replace("    </>\n  );\n}", modalJSX);

fs.writeFileSync('components/ExamCard.js', c);
