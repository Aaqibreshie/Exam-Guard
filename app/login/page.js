'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const user = data?.user;
      const role = user?.user_metadata?.role;

      if (role === 'teacher' || role === 'admin') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. If you just registered, please ensure you completed your 6-digit email OTP verification.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Your email address has not been verified yet. Please complete OTP verification.');
      } else {
        setError(msg || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <span>🛡️</span> ExamGuard Portal
          </div>
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access your exam workspace</p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleLogin}>
            {error && (
              <div className="error-message">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
                autoComplete="current-password"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg w-full" 
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In →</span>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>Don't have an account?</span>
            <Link href="/signup">Create one now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
