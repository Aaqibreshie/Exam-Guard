'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function StudentProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
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
        .order('created_at', { ascending: false });

      if (subs) {
        setSubmissions(subs);
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
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Calculate stats
  const completedSubs = submissions.filter(s => s.status === 'submitted' || s.status === 'graded');
  const avgScore = completedSubs.length > 0 
    ? Math.round(completedSubs.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedSubs.length)
    : 0;

  return (
    <div className="dashboard-container" style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="dashboard-title">My Profile</h1>
        <p className="dashboard-subtitle">Manage your account and view past performance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Left Column: Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar Card */}
          <div className="glass-card-static" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: 'white', fontSize: '2.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}>
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h3 style={{ margin: '0 0 4px 0', color: '#f8fafc' }}>{profile?.full_name}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>{profile?.email}</p>
            <div style={{ marginTop: '12px', display: 'inline-block', background: '#334155', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', color: '#cbd5e1' }}>
              Student • {profile?.subject === 'mern' ? 'MERN Stack' : 'Git & GitHub'}
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              Account Settings
            </h3>
            
            {message && <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>{message}</div>}
            {error && <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleUpdateProfile}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ background: '#0f172a', borderColor: '#334155' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>New Password (leave blank to keep)</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ background: '#0f172a', borderColor: '#334155' }}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }} disabled={updating}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Stats & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="glass-card-static" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                📝
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc', lineHeight: 1 }}>{submissions.length}</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Exams Taken</div>
              </div>
            </div>
            
            <div className="glass-card-static" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🎯
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc', lineHeight: 1 }}>{avgScore}<span style={{ fontSize: '1rem', color: '#64748b' }}>/100</span></div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Average Score</div>
              </div>
            </div>
          </div>

          {/* Exam History */}
          <div className="glass-card-static" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              Exam History
            </h3>

            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
                <p>No exams taken yet.</p>
                <Link href="/dashboard/student" className="btn btn-ghost btn-sm" style={{ marginTop: '12px' }}>
                  Browse Available Exams
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Exam</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Score</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const examDate = new Date(sub.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const isExpelled = sub.status === 'expelled';
                      
                      return (
                        <tr key={sub.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '16px 8px', color: '#f8fafc', fontWeight: 500 }}>
                            {sub.exams?.title || 'Unknown Exam'}
                          </td>
                          <td style={{ padding: '16px 8px', color: '#94a3b8' }}>{examDate}</td>
                          <td style={{ padding: '16px 8px' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                              background: isExpelled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: isExpelled ? '#ef4444' : '#10b981'
                            }}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '16px 8px', color: '#f8fafc', fontWeight: 600 }}>
                            {isExpelled ? '--' : (sub.score !== null ? `${sub.score}/${sub.exams?.total_marks || 100}` : 'Pending')}
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <Link 
                              href={`/dashboard/student/results?exam=${sub.exam_id}`} 
                              style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}
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
          </div>

        </div>
      </div>
    </div>
  );
}
