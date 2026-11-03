const fs = require('fs');

let c = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

c = c.replace(
  `{exam.is_published ? '● Published (Live)' : '○ Draft Mode'}`,
  `{exam.is_published ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"middle", marginTop:"-2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Published (Live)</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"middle", marginTop:"-2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Draft Mode</>}`
);

c = c.replace(
  `🔒 {accessType === 'all' ? 'All Students'`,
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"middle", marginTop:"-2px"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> {accessType === 'all' ? 'All Students'`
);

c = c.replace(
  `<span style={{ fontSize: '1.25rem' }}>🌐</span>`,
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accessType === 'all' ? '#059669' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
);

c = c.replace(
  `<span style={{ fontSize: '1.25rem' }}>👥</span>`,
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accessType === 'batch' ? '#059669' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
);

c = c.replace(
  `<span style={{ fontSize: '1.25rem' }}>🎯</span>`,
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accessType === 'selected' ? '#059669' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`
);

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', c);
