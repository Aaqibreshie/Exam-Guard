const fs = require('fs');
let c = fs.readFileSync('app/dashboard/student/mock-test/page.js', 'utf8');

const oldSubmit = /const handleFinishTest = async \(auto = false\) => \{\n\s*if \(!activeTest\) return;\n\s*if \(\!auto && \!confirm\('Are you ready to submit your AI Mock Test for evaluation\?'\)\) \{\n\s*return;\n\s*\}/s;

c = c.replace(oldSubmit, `const handleFinishTest = async (auto = false) => {
    if (!activeTest) return;
    if (!auto) {
      setConfirmConfig({
        isOpen: true,
        title: 'Submit Mock Test',
        message: 'Are you ready to submit your AI Mock Test for evaluation?',
        isDanger: false,
        onConfirm: () => {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          executeFinishTest(false);
        }
      });
      return;
    }
    executeFinishTest(auto);
  };
  
  const executeFinishTest = async (auto = false) => {`);

fs.writeFileSync('app/dashboard/student/mock-test/page.js', c);
