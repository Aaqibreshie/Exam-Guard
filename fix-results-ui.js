const fs = require('fs');

let c = fs.readFileSync('app/dashboard/teacher/results/[id]/page.js', 'utf8');

if (!c.includes('getSubjectStyling')) {
  c = c.replace(
    "import { createClient } from '@/lib/supabase/client';",
    "import { createClient } from '@/lib/supabase/client';\nimport { getSubjectStyling } from '@/lib/subject-helpers';"
  );
}

// 1. Back button
c = c.replace(
  /<Link href=\{\`\/dashboard\/teacher\/exam\/\$\{id\}\`\} className="btn btn-ghost btn-sm">\s*← Back to Exam Paper & Candidate Settings\s*<\/Link>/s,
  `<Link href={\`/dashboard/teacher/exam/\${id}\`} className="btn btn-ghost" style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px', 
            padding: '8px 16px', borderRadius: '8px', 
            border: '1px solid #e2e8f0', color: '#64748b', 
            fontWeight: 600, fontSize: '0.9rem',
            background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Exam Paper & Candidate Settings
        </Link>`
);

// 2. Subject tag
c = c.replace(
  '<span className="badge-subject">{exam.subject?.toUpperCase()}</span>',
  '<span className="badge-subject" style={{background: getSubjectStyling(exam.subject).bg, color: getSubjectStyling(exam.subject).color, borderColor: getSubjectStyling(exam.subject).border}}>{getSubjectStyling(exam.subject).label}</span>'
);

// 3. Title format strip
c = c.replace(
  '<h1 style={{ fontSize: \'1.85rem\', fontWeight: 800, color: \'#0f172a\' }}>{exam.title}</h1>',
  '<h1 style={{ fontSize: \'1.85rem\', fontWeight: 800, color: \'#0f172a\' }}>{exam.title?.replace(/^\\[.*?\\]\\s*/i, \'\')}</h1>'
);

// 4. ● AI Proctor Monitored
c = c.replace(
  '● AI Proctor Monitored',
  '<><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"2px"}}><circle cx="12" cy="12" r="10"></circle></svg> AI Proctor Monitored</>'
);

// 5. 📱 Sidecar
c = c.replace(
  '📱 Dual-Angle Sidecar Enforced',
  '<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display:"inline-block", verticalAlign:"text-top", marginTop:"1px"}}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg> Dual-Angle Sidecar Enforced</>'
);

// 6. 📝 Empty state
c = c.replace(
  '<div style={{ fontSize: \'2.5rem\', marginBottom: \'10px\' }}>📝</div>',
  '<div style={{ marginBottom: \'16px\', display: \'flex\', justifyContent: \'center\' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg></div>'
);

// 7. ❌ Expelled / ✅ Verified
c = c.replace(
  "{isExpelled ? '❌ Expelled' : '✅ Verified'}",
  "{isExpelled ? <><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"4px\", display:\"inline-block\", verticalAlign:\"text-top\", marginTop:\"2px\"}}><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"></line><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"></line></svg> Expelled</> : <><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"4px\", display:\"inline-block\", verticalAlign:\"text-top\", marginTop:\"2px\"}}><polyline points=\"20 6 9 17 4 12\"></polyline></svg> Verified</>}"
);

// 8. 🛡️ Integrity
c = c.replace(
  "🛡️ {integrityScore}%",
  "<><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"4px\", display:\"inline-block\", verticalAlign:\"text-top\", marginTop:\"2px\"}}><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"></path></svg> {integrityScore}%</>"
);

// 9. ✅ Clean Session
c = c.replace(
  "✅ Clean Session:",
  "<><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"6px\", display:\"inline-block\", verticalAlign:\"text-top\", marginTop:\"2px\"}}><polyline points=\"20 6 9 17 4 12\"></polyline></svg> Clean Session:</>"
);

// 10. 🔍 Audit trail
c = c.replace(
  "🔍 Sensor &",
  "<><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"6px\", display:\"inline-block\", verticalAlign:\"text-top\", marginTop:\"2px\", color: '#64748b'}}><circle cx=\"11\" cy=\"11\" r=\"8\"></circle><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"></line></svg> Sensor &</>"
);

// 11. Audit Logs button
c = c.replace(
  /<button\s*type="button"\s*className="btn btn-ghost btn-sm"\s*style=\{\{\s*fontSize:\s*'0\.8rem',\s*padding:\s*'4px 10px'\s*\}\}\s*>\s*\{isExpanded \? 'Hide Logs ▲' : 'Audit Logs ▼'\}\s*<\/button>/s,
  `<button
    type="button"
    className="btn btn-ghost"
    style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: isExpanded ? '#f1f5f9' : '#ffffff', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
  >
    {isExpanded ? <><span style={{marginRight: "2px"}}>Hide Logs</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block"}}><polyline points="18 15 12 9 6 15"></polyline></svg></> : <><span style={{marginRight: "2px"}}>Audit Logs</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block"}}><polyline points="6 9 12 15 18 9"></polyline></svg></>}
  </button>`
);

fs.writeFileSync('app/dashboard/teacher/results/[id]/page.js', c);
