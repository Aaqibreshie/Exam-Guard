'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function TeacherProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalExams: 0, totalSubmissions: 0 });
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

      // Get stats
      const { data: exams } = await supabase
        .from('exams')
        .select('id, submissions(id)')
        .eq('created_by', user.id);

      if (exams) {
        const totalSubs = exams.reduce((acc, curr) => acc + (curr.submissions?.length || 0), 0);
        setStats({ totalExams: exams.length, totalSubmissions: totalSubs });
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

  return (
    <div className="dashboard-container" style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="dashboard-title">Teacher Profile</h1>
        <p className="dashboard-subtitle">Manage your educator account settings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Left Column: Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar Card */}
          <div className="glass-card-static" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: 'white', fontSize: '2.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}>
              {profile?.full_name?.charAt(0).toUpperCase() || 'T'}
            </div>
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>{profile?.full_name}</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>{profile?.email}</p>
            <div style={{ marginTop: '12px', display: 'inline-block', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
              Instructor
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="glass-card-static" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-cyan-light)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                📚
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', lineHeight: 1 }}>{stats.totalExams}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Exams Created</div>
              </div>
            </div>
            
            <div className="glass-card-static" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                👨‍🎓
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', lineHeight: 1 }}>{stats.totalSubmissions}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Total Submissions</div>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="glass-card-static" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#0f172a', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              Account Settings
            </h3>
            
            {message && <div style={{ padding: '8px 12px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid rgba(5, 150, 105, 0.2)' }}>{message}</div>}
            {error && <div style={{ padding: '8px 12px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>{error}</div>}

            <form onSubmit={handleUpdateProfile}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
