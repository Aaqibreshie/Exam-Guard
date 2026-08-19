import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      {/* Top Navigation */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        background: '#ffffff', 
        borderBottom: '1px solid #eaecf0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '16px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ 
                fontSize: '1.25rem', 
                background: '#ecfdf5', 
                border: '1px solid #a7f3d0',
                padding: '4px 8px', 
                borderRadius: '8px', 
                color: '#059669',
                display: 'flex' 
              }}>
                🛡️
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                Exam<span style={{ color: '#059669' }}>Guard</span>
              </span>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/login" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
              Login
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm" style={{ fontWeight: 600 }}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-page" style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <span>🛡️</span> The world's most secure online exam system
          </div>

          <h1 className="hero-title">
            The Ultimate Platform for <br />
            <span style={{ color: '#059669' }}>AI-Proctored Online Exams</span>
          </h1>

          <p className="hero-subtitle">
            Empower educators and hiring managers with AI-proctored online testing, 
            keystroke telemetry, automated grading, and multi-sensor cheating prevention.
          </p>

          <div className="hero-actions">
            <Link href="/signup" className="btn btn-primary btn-lg" style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
              Get started free →
            </Link>
            <Link href="/login" className="btn btn-ghost btn-lg" style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
              Candidate Login
            </Link>
          </div>

          {/* Testportal-style 3 Core Pillars */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '28px', 
            width: '100%', 
            marginTop: '30px',
            textAlign: 'left'
          }}>
            {/* Pillar 1 */}
            <div style={{ 
              padding: '32px', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)'
            }}>
              <div style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '10px', 
                background: '#ecfdf5', 
                color: '#059669', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.25rem',
                marginBottom: '20px'
              }}>
                📝
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Prepare an exam
              </h3>
              <p style={{ color: '#475569', fontSize: '0.938rem', lineHeight: 1.6 }}>
                Make online exam papers in seconds with an intuitive bulk question manager (JSON, CSV, or text). Set exact timers, multiple choice, and code challenges.
              </p>
            </div>

            {/* Pillar 2 */}
            <div style={{ 
              padding: '32px', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)'
            }}>
              <div style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '10px', 
                background: '#e0f2fe', 
                color: '#0284c7', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.25rem',
                marginBottom: '20px'
              }}>
                👤
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Give access
              </h3>
              <p style={{ color: '#475569', fontSize: '0.938rem', lineHeight: 1.6 }}>
                Experience full control over who takes your tests and when they do it. Share exams with specific cohorts or batches, or require dual-angle mobile phone cameras.
              </p>
            </div>

            {/* Pillar 3 */}
            <div style={{ 
              padding: '32px', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)'
            }}>
              <div style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '10px', 
                background: '#f5f3ff', 
                color: '#7c3aed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.25rem',
                marginBottom: '20px'
              }}>
                📊
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Get insights
              </h3>
              <p style={{ color: '#475569', fontSize: '0.938rem', lineHeight: 1.6 }}>
                Access real-time results during tests and detailed audit timelines. Measure training impact, automated scoring accuracy, and candidate integrity scores.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom Banner Card */}
        <section style={{ 
          marginTop: '60px', 
          padding: '48px 36px', 
          background: '#f8fafc', 
          border: '1px solid #eaecf0', 
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Create your online exam now
            </h2>
            <p style={{ color: '#475569', fontSize: '1rem' }}>
              Join thousands of educators and organizations running tamper-proof exams.
            </p>
          </div>

          <Link href="/signup" className="btn btn-primary btn-lg" style={{ background: '#003844', borderColor: '#003844' }}>
            Get started →
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid #eaecf0', 
        padding: '32px 24px', 
        background: '#ffffff',
        color: '#64748b', 
        fontSize: '0.875rem' 
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            🛡️ ExamGuard — Online Examination & Assessment Software
          </div>
          <div>© {new Date().getFullYear()} ExamGuard Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
