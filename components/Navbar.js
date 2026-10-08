'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Navbar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getNavLinks = () => {
    if (user?.role === 'teacher') {
      return [
        { name: '📊 Dashboard', path: '/dashboard/teacher' },
        { name: '📂 Question Bank', path: '/dashboard/teacher/question-bank' },
        { name: '➕ Create Exam', path: '/dashboard/teacher/create-exam' },
      ];
    }
    return [
      { name: '📝 Available Exams', path: '/dashboard/student' },
      { name: '🌎 Practice Arena', path: '/dashboard/student/practice' },
      { name: '🏆 My Results', path: '/dashboard/student/results' },
    ];
  };

  const links = getNavLinks();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link href={`/dashboard/${user?.role || 'student'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      </div>
      
      <nav className="navbar-links">
        {links.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link 
              key={link.path} 
              href={link.path}
              className={`navbar-link-item ${isActive ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href={`/dashboard/${user?.role || 'student'}/profile`} style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 16px 6px 6px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '100px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '1rem',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              border: '2px solid #ffffff'
            }}>
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
                {user?.full_name || 'User'}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.role || 'Member'}
              </span>
            </div>
          </div>
        </Link>
        <button 
          onClick={handleLogout} 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.background = '#fef2f2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
          title="Sign Out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </header>
  );
}
