const fs = require('fs');

let c = fs.readFileSync('components/ExamCard.js', 'utf8');

c = c.replace(
  `'{exam.is_published ? \\'<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Published\\' : \\'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Draft\\'}'`,
  `{exam.is_published ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Published</> : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> Draft</>}`
);

// wait that might fail due to quotes. Let's just do standard replace using precise substring matching.
