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
        { name: '➕ Create Exam', path: '/dashboard/teacher/create-exam' },
      ];
    }
    return [
      { name: '📝 Available Exams', path: '/dashboard/student' },
      { name: '✨ AI Practice Arena', path: '/dashboard/student/mock-test' },
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

      <div className="navbar-user">
        <div className="user-badge">
          <div className="user-avatar">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="user-name">{user?.full_name || 'User'}</span>
            <span className="user-role-tag">{user?.role || 'Member'}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </header>
  );
}
