const fs = require('fs');
let c = fs.readFileSync('components/CodeEditor.js', 'utf8');

c = c.replace(
  "import { useState, useRef, useEffect } from 'react';",
  "import { useState, useRef, useEffect } from 'react';\nimport { ConfirmModal } from '@/components/Modal';"
);

c = c.replace(
  "  const [code, setCode] = useState(initialCode || '');",
  "  const [code, setCode] = useState(initialCode || '');\n  const [showResetConfirm, setShowResetConfirm] = useState(false);"
);

c = c.replace(
  /const handleReset = \(\) => \{\n\s*if \(confirm\('Reset your code to the original template\? Current changes will be overwritten\.'\)\) \{\n\s*setCode\(initialCode\);\n\s*if \(onChange\) onChange\(initialCode\);\n\s*\}\n\s*\};/g,
  `const handleReset = () => {
    setShowResetConfirm(true);
  };
  
  const confirmReset = () => {
    setCode(initialCode);
    if (onChange) onChange(initialCode);
    setShowResetConfirm(false);
  };`
);

const modalJSX = `
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset Code"
        message="Reset your code to the original template? Current changes will be overwritten."
        isDanger={true}
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
        confirmText="Reset Code"
      />
    </div>
  );
}`;

c = c.replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync('components/CodeEditor.js', c);
