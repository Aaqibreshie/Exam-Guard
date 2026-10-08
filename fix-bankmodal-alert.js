const fs = require('fs');
let c = fs.readFileSync('components/BankImportModal.js', 'utf8');

c = c.replace(
  "import { getSubjectStyling } from '@/lib/subject-helpers';",
  "import { getSubjectStyling } from '@/lib/subject-helpers';\nimport { AlertModal } from '@/components/Modal';"
);

c = c.replace(
  "  const [filterSubject, setFilterSubject] = useState(examSubject || '');",
  "  const [filterSubject, setFilterSubject] = useState(examSubject || '');\n  const [errorMsg, setErrorMsg] = useState('');"
);

c = c.replace(/alert\(err\.message\);/g, "setErrorMsg(err.message);");

const modalJSX = `
      <AlertModal 
        isOpen={!!errorMsg}
        title="Error"
        message={errorMsg}
        isError={true}
        onClose={() => setErrorMsg('')}
      />
    </div>
  );
}`;

c = c.replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync('components/BankImportModal.js', c);
