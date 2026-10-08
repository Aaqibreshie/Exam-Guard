'use client';n
export default function DashboardFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer style={{
      marginTop: 'auto',
      padding: '32px 40px',
      background: 'transparent',
      borderTop: '1px solid #e2e8f0',
      color: '#64748b',
      fontSize: '0.875rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        {/* Brand Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Exam<span style={{ color: '#059669' }}>Guard</span>
          </span>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
          <span style={{ fontWeight: 500 }}>Secure Examination Platform</span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: '24px', fontWeight: 500 }}>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#0f172a'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>Support</a>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#0f172a'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>Documentation</a>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#0f172a'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>Privacy Policy</a>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#0f172a'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>Terms</a>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: '1px dashed #e2e8f0'
      }}>
        <div>&copy; {currentYear} ExamGuard Inc. All rights reserved.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}></span>
          <span style={{ fontWeight: 600, color: '#10b981', fontSize: '0.8rem' }}>All Systems Operational</span>
        </div>
      </div>
    </footer>
  );
}
