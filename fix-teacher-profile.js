const fs = require('fs');
const path = 'app/dashboard/teacher/profile/page.js';
let content = fs.readFileSync(path, 'utf8');

const badStart = content.indexOf('  if (loading) {');
const goodContent = `  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Instructor Profile</h1>
          <p className="dashboard-subtitle">Manage your educator account settings and credentials</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Row 1: Profile Avatar & Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Avatar Card */}
          <div className="glass-card-static" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ 
              width: '96px', height: '96px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', 
              color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'T'}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{profile?.full_name}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{profile?.email}</p>
            <div style={{ marginTop: '16px' }}>
              <span style={{ display: 'inline-block', background: 'var(--primary-light)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Instructor / Admin
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-card-static" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent-cyan-light)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                📚
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.totalExams}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exams Created</div>
              </div>
            </div>
            
            <div className="glass-card-static" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                👨‍🎓
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.totalSubmissions}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Submissions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Account Settings */}
        <div className="glass-card-static" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', fontWeight: 700 }}>
            Security & Account Settings
          </h3>
          
          {message && <div style={{ padding: '12px 16px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '24px', border: '1px solid rgba(5, 150, 105, 0.2)', fontWeight: 500 }}>{message}</div>}
          {error && <div style={{ padding: '12px 16px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '24px', border: '1px solid rgba(225, 29, 72, 0.2)', fontWeight: 500 }}>{error}</div>}

          <form onSubmit={handleUpdateProfile} style={{ maxWidth: '600px' }}>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '8px', display: 'block' }}>Full Name</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '12px' }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '8px', display: 'block' }}>New Password <span style={{color: 'var(--text-muted)', fontWeight: 400}}>(optional)</span></label>
              <input
                type="password"
                className="form-input"
                style={{ padding: '12px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700 }} disabled={updating}>
              {updating ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
`;

const finalContent = content.substring(0, badStart) + goodContent;
fs.writeFileSync(path, finalContent);
