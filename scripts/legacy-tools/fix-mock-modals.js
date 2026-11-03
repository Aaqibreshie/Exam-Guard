const fs = require('fs');
let c = fs.readFileSync('app/dashboard/student/mock-test/page.js', 'utf8');

c = c.replace(
  "import { createClient } from '@/lib/supabase/client';",
  "import { createClient } from '@/lib/supabase/client';\nimport { ConfirmModal, AlertModal } from '@/components/Modal';"
);

c = c.replace(
  "  const [scoreData, setScoreData] = useState(null);",
  "  const [scoreData, setScoreData] = useState(null);\n  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', isError: false });\n  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });\n\n  const showAlert = (message, title = 'Notification', isError = false) => {\n    setAlertConfig({ isOpen: true, title, message, isError });\n  };\n"
);

// We need to rewrite handleSubmit to use ConfirmModal for the manual submission case.
const oldSubmit = /const handleSubmit = async \(auto = false\) => \{\n\s*if \(\!auto && \!confirm\('Are you ready to submit your AI Mock Test for evaluation\?'\)\) \{\n\s*return;\n\s*\}/s;

c = c.replace(oldSubmit, `const handleSubmit = async (auto = false) => {
    if (!auto) {
      setConfirmConfig({
        isOpen: true,
        title: 'Submit Mock Test',
        message: 'Are you ready to submit your AI Mock Test for evaluation?',
        isDanger: false,
        onConfirm: () => {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          executeSubmit(false);
        }
      });
      return;
    }
    executeSubmit(auto);
  };
  
  const executeSubmit = async (auto = false) => {`);

c = c.replace(
  "alert('Error scoring mock test: ' + err.message);",
  "showAlert('Error scoring mock test: ' + err.message, 'Error', true);"
);

const modalJSX = `
      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        isError={alertConfig.isError}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        confirmText="Submit"
      />
    </div>
  );
}`;

c = c.replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync('app/dashboard/student/mock-test/page.js', c);
