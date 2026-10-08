const fs = require('fs');
let c = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

const oldButton = /<button\s*onClick=\{\(\) => triggerDeleteQuestion\(q\.id, q\.points\)\}\s*style=\{\{\s*position: 'absolute',\s*top: '20px',\s*right: '20px',\s*background: '#fff1f2',\s*border: '1px solid #fecdd3',\s*color: '#e11d48',\s*cursor: 'pointer',\s*width: '32px',\s*height: '32px',\s*borderRadius: '6px',\s*display: 'flex',\s*alignItems: 'center',\s*justifyContent: 'center',\s*fontWeight: 'bold'\s*\}\}\s*title="Delete question"\s*>\s*✕\s*<\/button>/s;

const newButtons = `<div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleEditQuestionClick(q)}
                        style={{ 
                          background: '#eff6ff', 
                          border: '1px solid #bfdbfe', 
                          color: '#3b82f6', 
                          cursor: 'pointer', 
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title="Edit question"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button 
                        onClick={() => triggerDeleteQuestion(q.id, q.points)}
                        style={{ 
                          background: '#fff1f2', 
                          border: '1px solid #fecdd3', 
                          color: '#e11d48', 
                          cursor: 'pointer', 
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title="Delete question"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>`;

c = c.replace(oldButton, newButtons);

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', c);
