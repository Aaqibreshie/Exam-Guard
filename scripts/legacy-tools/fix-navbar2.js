const fs = require('fs');
let content = fs.readFileSync('components/Navbar.js', 'utf8');

const regexGetNavLinks = /const getNavLinks = \(\) => \{[\s\S]*?return \[\s*\{[^\}]*\},\s*\{[^\}]*\},\s*\{[^\}]*\}\s*\];\s*\};\s*/;

const newGetNavLinks = `  const getNavLinks = () => {
    if (user?.role === 'teacher') {
      return [
        { name: 'Dashboard', path: '/dashboard/teacher', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg> },
        { name: 'Question Bank', path: '/dashboard/teacher/question-bank', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg> },
        { name: 'Create Exam', path: '/dashboard/teacher/create-exam', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg> },
      ];
    }
    return [
      { name: 'Available Exams', path: '/dashboard/student', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> },
      { name: 'Practice Arena', path: '/dashboard/student/practice', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> },
      { name: 'My Results', path: '/dashboard/student/results', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg> },
    ];
  };
`;

content = content.replace(regexGetNavLinks, newGetNavLinks);

const oldBrand = `<div className="navbar-brand">
        <Link href={\`/dashboard/\${user?.role || 'student'}\`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontSize: '1.2rem', 
            background: '#ecfdf5', 
            border: '1px solid #a7f3d0',
            padding: '4px 8px', 
            borderRadius: '8px', 
            display: 'flex',
            color: '#059669'
          }}>
            🛡️
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Exam<span style={{ color: '#059669' }}>Guard</span>
          </span>
        </Link>
      </div>`;

const newBrand = `      <div className="navbar-brand">
        <Link href={\`/dashboard/\${user?.role || 'student'}\`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>
            Exam<span style={{ color: '#059669' }}>Guard</span>
          </span>
        </Link>
      </div>`;

content = content.replace(oldBrand, newBrand);

const oldLinks = `<nav className="navbar-links">
        {links.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link 
              key={link.path} 
              href={link.path}
              className={\`navbar-link-item \${isActive ? 'active' : ''}\`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>`;

const newLinks = `      <nav className="navbar-links" style={{ display: 'flex', gap: '8px' }}>
        {links.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link 
              key={link.path} 
              href={link.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#059669' : '#64748b',
                background: isActive ? '#ecfdf5' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#0f172a';
                  e.currentTarget.style.background = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {link.icon}
              {link.name}
            </Link>
          );
        })}
      </nav>`;

content = content.replace(oldLinks, newLinks);

fs.writeFileSync('components/Navbar.js', content);
