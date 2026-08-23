'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import ActivityHeatmap from '@/components/ActivityHeatmap';

export default function StudentProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileData) {
        setProfile({ ...profileData, email: user.email });
        setFullName(profileData.full_name || '');
      }

      // Get past exams (submissions joined with exams)
      const { data: subs } = await supabase
        .from('submissions')
        .select(`
          id,
          exam_id,
          status,
          score,
          started_at,
          submitted_at,
          exams (
            title,
            subject,
            total_marks
          )
        `)
        .eq('student_id', user.id)
        .order('started_at', { ascending: false });

      if (subs) {
        setSubmissions(subs);
        
        // Also fetch practice attempts for heatmap
        const { data: practice } = await supabase
          .from('practice_attempts')
          .select('created_at')
          .eq('student_id', user.id);
          
        const dates = [];
        subs.forEach(s => dates.push(s.started_at));
        if (practice) {
          practice.forEach(p => dates.push(p.created_at));
        }
        setActivityData(dates);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setMessage('');

    try {
      if (fullName !== profile.full_name) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', profile.id);
      }

      if (password) {
        const { error: pwdError } = await supabase.auth.updateUser({ password });
        if (pwdError) throw pwdError;
      }

      setMessage('Profile updated successfully!');
      setPassword(''); // clear password field
      
      // Update local state
      setProfile({ ...profile, full_name: fullName });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">My Profile</h1>
            <p className="dashboard-subtitle">Manage your account and view past performance</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const avgScore = submissions.length > 0 
    ? Math.round(submissions.reduce((acc, sub) => acc + (sub.score || 0), 0) / submissions.length)
    : 0;

  return (
    <div className="dashboard-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">My Profile</h1>
          <p className="dashboard-subtitle">Manage your account and view past performance</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Row 1: Profile Avatar & Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Avatar Card */}
          <div className="glass-card-static" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ 
              width: '96px', height: '96px', borderRadius: '50%', background: 'var(--primary)', 
              color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{profile?.full_name}</h2>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>{profile?.email}</p>
            <div style={{ marginTop: '16px' }}>
              <span style={{ display: 'inline-block', background: 'var(--primary-light)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Student • {profile?.subject || 'Undecided'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-card-static" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent-cyan-light)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                📝
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{submissions.length}</div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exams Taken</div>
              </div>
            </div>
            
            <div className="glass-card-static" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                🎯
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{avgScore}<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/100</span></div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Full Width Gamer Hive */}
        <div className="glass-card-static" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <ActivityHeatmap activityData={activityData} />
        </div>

        {/* Row 3: Account Settings & Recent Exams */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Account Settings */}
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: '#0f172a', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', fontWeight: 700 }}>
              Account Settings
            </h3>
            
            {message && <div style={{ padding: '10px 14px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', border: '1px solid rgba(5, 150, 105, 0.2)', fontWeight: 500 }}>{message}</div>}
            {error && <div style={{ padding: '10px 14px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', border: '1px solid rgba(225, 29, 72, 0.2)', fontWeight: 500 }}>{error}</div>}

            <form onSubmit={handleUpdateProfile}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, marginBottom: '6px', display: 'block' }}>New Password <span style={{color: '#94a3b8', fontWeight: 400}}>(optional)</span></label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }} disabled={updating}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Recent Exams */}
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: '#0f172a', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', fontWeight: 700 }}>
              Recent Exams
            </h3>

            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📭</div>
                <p style={{ fontSize: '1.05rem', fontWeight: 500 }}>No exams taken yet.</p>
                <Link href="/dashboard/student" className="btn btn-ghost" style={{ marginTop: '16px' }}>
                  Browse Available Exams
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '12px 12px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Exam</th>
                      <th style={{ padding: '12px 12px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Date</th>
                      <th style={{ padding: '12px 12px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Status</th>
                      <th style={{ padding: '12px 12px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Score</th>
                      <th style={{ padding: '12px 12px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="table-row-hover">
                    {submissions.slice(0, 5).map((sub) => {
                      const examDate = new Date(sub.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const isExpelled = sub.status === 'expelled';
                      
                      return (
                        <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 12px', color: '#0f172a', fontWeight: 700 }}>
                            {sub.exams?.title || 'Unknown Exam'}
                          </td>
                          <td style={{ padding: '16px 12px', color: '#475569', fontWeight: 500 }}>{examDate}</td>
                          <td style={{ padding: '16px 12px' }}>
                            <span style={{ 
                              padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                              background: isExpelled ? 'var(--accent-red-light)' : 'var(--accent-emerald-light)',
                              color: isExpelled ? 'var(--accent-red)' : 'var(--accent-emerald)'
                            }}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px', color: '#0f172a', fontWeight: 800 }}>
                            {isExpelled ? '--' : (sub.score !== null ? `${sub.score}/${sub.exams?.total_marks || 100}` : 'Pending')}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                            <Link 
                              href={`/dashboard/student/results?exam=${sub.exam_id}`} 
                              style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}
                            >
                              View Details →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {submissions.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <Link href="/dashboard/student/results" className="btn btn-ghost" style={{ color: '#475569', fontWeight: 600 }}>
                  View All {submissions.length} Exams →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
