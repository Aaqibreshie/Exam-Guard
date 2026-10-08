const fs = require('fs');

const path = 'app/dashboard/student/practice/[id]/page.js';
let content = fs.readFileSync(path, 'utf8');

// Replace Left Pane MCQ logic to be interactive
const mcqInteractive = `
          {question.question_type === 'mcq' && (
            <div style={{ marginBottom: '24px', maxWidth: '800px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '16px' }}>Select an Option:</h3>
              <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(question.options || []).map((opt, i) => {
                  const isSelected = code === opt;
                  return (
                    <li 
                      key={i} 
                      onClick={() => setCode(opt)}
                      style={{ 
                        padding: '16px', 
                        background: isSelected ? '#eff6ff' : '#f8fafc', 
                        border: \`2px solid \${isSelected ? '#3b82f6' : '#e2e8f0'}\`, 
                        borderRadius: '12px', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ 
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        width: '28px', height: '28px', borderRadius: '50%', 
                        background: isSelected ? '#3b82f6' : '#cbd5e1', 
                        color: '#fff', fontWeight: 700, marginRight: '16px' 
                      }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ fontSize: '1.05rem', color: isSelected ? '#1e3a8a' : '#334155', fontWeight: isSelected ? 600 : 400 }}>
                        {opt}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
`;

content = content.replace(/\{question\.question_type === 'mcq' && \([\s\S]*?\)\}/, mcqInteractive.trim());

// Wrap Right Pane with condition
content = content.replace("{/* Right Pane: Code Editor */}", `{question.question_type !== 'mcq' && (\n        <>\n        {/* Right Pane: Code Editor */}`);
content = content.replace(/<\/CodeEditor>\s*<\/div>\s*<\/div>/, "</CodeEditor>\n          </div>\n        </div>\n        </>\n      )}");

fs.writeFileSync(path, content);
