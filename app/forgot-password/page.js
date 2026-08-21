'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Need origin for correct redirect URL
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });

      if (resetError) throw resetError;
      
      setMessage('Password reset instructions have been sent to your email.');
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
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email to receive recovery instructions</p>
        </div>

        <div className="glass-card-static auth-card">
          {error && <div className="error-message">⚠️ {error}</div>}
          {message && <div className="success-message" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px', borderRadius: '8px', border: '1px solid #10b981', marginBottom: '20px', fontSize: '0.9rem' }}>✅ {message}</div>}

          <form onSubmit={handleReset} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  Sending...
                </>
              ) : (
                'Send Instructions'
              )}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          Remembered your password? <Link href="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
