const fs = require('fs');

let qb = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

qb = qb.replace(
  /className="btn btn-ghost" style=\{\{ color: '#0ea5e9' \}\}>\s*✏️\s*<\/button>/g,
  `className="btn btn-ghost" title="Edit" style={{ color: '#64748b', transition: 'color 0.2s', padding: '8px' }} onMouseEnter={e => e.currentTarget.style.color = '#059669'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                  </button>`
);

qb = qb.replace(
  /className="btn btn-ghost" style=\{\{ color: '#ef4444' \}\}>\s*🗑️\s*<\/button>/g,
  `className="btn btn-ghost" title="Delete" style={{ color: '#64748b', transition: 'color 0.2s', padding: '8px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>`
);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', qb);
