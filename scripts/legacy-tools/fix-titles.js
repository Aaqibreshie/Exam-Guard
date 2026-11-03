const fs = require('fs');

function replaceFile(path, oldText, newText) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(oldText, newText);
  fs.writeFileSync(path, content);
}

replaceFile(
  'app/dashboard/teacher/question-bank/page.js',
  '<h1 className="dashboard-title">📂 Global Question Bank</h1>',
  '<h1 className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#059669" }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Global Question Bank</h1>'
);

replaceFile(
  'app/dashboard/student/practice/page.js',
  '<h1 className="dashboard-title">🌎 Global Practice Arena</h1>',
  '<h1 className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#059669" }}><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Global Practice Arena</h1>'
);

