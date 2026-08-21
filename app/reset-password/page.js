'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // When coming from an email link, Supabase sets the session in the URL hash,
  // which the client library uses to establish the session.
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Ready to reset password
        console.log('Recovery mode active');
      }
    });
  }, [supabase]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div className="auth-logo">
              <span className="auth-logo-icon">🛡️</span>
              Exam<span style={{ color: '#059669' }}>Guard</span>
            </div>
          </Link>
          <h1 className="auth-title">Create New Password</h1>
          <p className="auth-subtitle">Enter your new secure password below</p>
        </div>

        <div className="glass-card-static auth-card">
          {error && <div className="error-message">⚠️ {error}</div>}
          {success && (
            <div className="success-message" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px', borderRadius: '8px', border: '1px solid #10b981', marginBottom: '20px', fontSize: '0.9rem' }}>
              ✅ Password updated successfully! Redirecting...
            </div>
          )}

          {!success && (
            <form onSubmit={handleUpdate} className="auth-form">
              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
