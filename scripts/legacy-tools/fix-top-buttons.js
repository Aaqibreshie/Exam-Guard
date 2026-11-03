const fs = require('fs');

let c = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

const oldBlock = `<div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard/teacher" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
        <Link href={\`/dashboard/teacher/results/\${id}\`} className="btn btn-ghost btn-sm">
          📊 View Candidate Results
        </Link>
      </div>`;

const newBlock = `<div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link 
          href="/dashboard/teacher" 
          className="btn btn-ghost" 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '8px 16px', borderRadius: '8px', 
            border: '1px solid #e2e8f0', color: '#64748b', 
            fontWeight: 600, fontSize: '0.9rem',
            background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Dashboard
        </Link>
        <Link 
          href={\`/dashboard/teacher/results/\${id}\`} 
          className="btn btn-ghost"
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '8px 16px', borderRadius: '8px', 
            border: '1px solid #e0e7ff', color: '#4f46e5', 
            fontWeight: 600, fontSize: '0.9rem',
            background: '#e0e7ff20', boxShadow: '0 1px 2px rgba(79,70,229,0.05)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          View Candidate Results
        </Link>
      </div>`;

c = c.replace(oldBlock, newBlock);

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', c);
