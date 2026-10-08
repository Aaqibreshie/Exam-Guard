const fs = require('fs');
let c = fs.readFileSync('components/TeacherGrader.js', 'utf8');

c = c.replace(
  "import { createClient } from '@/lib/supabase/client';",
  "import { createClient } from '@/lib/supabase/client';\nimport { AlertModal } from '@/components/Modal';"
);

c = c.replace(
  "  const [loading, setLoading] = useState(true);",
  "  const [loading, setLoading] = useState(true);\n  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', isError: false });\n  const showAlert = (message, title = 'Notification', isError = false) => setAlertConfig({ isOpen: true, title, message, isError });"
);

c = c.replace(
  "alert('Grades saved successfully!');",
  "showAlert('Grades saved successfully!', 'Success');"
);

c = c.replace(
  "alert('Error saving grades: ' + err.message);",
  "showAlert('Error saving grades: ' + err.message, 'Error', true);"
);

const modalJSX = `
      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        isError={alertConfig.isError}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </div>
  );
}`;

c = c.replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync('components/TeacherGrader.js', c);
