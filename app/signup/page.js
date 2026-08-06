'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Signup() {
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'success'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [subject, setSubject] = useState('mern');
  const [batch, setBatch] = useState('Batch 1 (Morning)');
  
  // OTP state (6 digits)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef([]);

  // Timing and feedback
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const router = useRouter();
  const supabase = createClient();

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Email format validation helper
  const isValidEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address (e.g. student@example.com)');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!role) {
      setError('Please select your account type (Teacher or Student)');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: fullName.trim(),
          password,
          role,
          subject: role === 'student' ? subject : null,
          batch: role === 'student' ? batch : null
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setStep('otp');
      setResendCooldown(60);
      setInfoMessage(`A 6-digit security verification code has been dispatched to ${cleanEmail}`);

      // Auto-focus first OTP digit
      setTimeout(() => {
        if (otpInputsRef.current[0]) {
          otpInputsRef.current[0].focus();
        }
      }, 150);
    } catch (err) {
      console.error('Signup dispatch error:', err);
      setError(err.message || 'Failed to initiate signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    
    // If user pasted a multi-digit string
    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length, 5);
      if (otpInputsRef.current[nextIdx]) {
        otpInputsRef.current[nextIdx].focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      if (otpInputsRef.current[index + 1]) {
        otpInputsRef.current[index + 1].focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      if (otpInputsRef.current[index - 1]) {
        otpInputsRef.current[index - 1].focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pasted) {
      const digits = pasted.slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(digits.length, 5);
      if (otpInputsRef.current[nextFocus]) {
        otpInputsRef.current[nextFocus].focus();
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const token = otp.join('').trim();
    if (token.length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim();
      
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: token,
          password
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid verification code.');
      }

      // Sync browser client authentication
      try {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
      } catch (_) {}

      setStep('success');

      // Redirect after brief celebration
      setTimeout(() => {
        if (role === 'teacher') {
          router.push('/dashboard/teacher');
        } else {
          router.push('/dashboard/student');
        }
      }, 1000);
    } catch (err) {
      console.error('OTP Verification Error:', err);
      setError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim();
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: fullName.trim(),
          password,
          role,
          subject: role === 'student' ? subject : null,
          batch: role === 'student' ? batch : null
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      setResendCooldown(60);
      setInfoMessage(`A fresh 6-digit verification code has been dispatched to ${cleanEmail}`);
    } catch (err) {
      console.error('Resend OTP Error:', err);
      setError(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <div className="auth-logo-badge">
            <span>🛡️</span> {step === 'otp' ? 'Email Verification' : 'Get Started'}
          </div>
          <h1>{step === 'otp' ? 'Verify Your Email' : 'Create Your Account'}</h1>
          <p>
            {step === 'otp' 
              ? 'Enter the 6-digit security code sent to your email to complete registration'
              : 'Join ExamGuard to create or participate in secure examinations'}
          </p>
        </div>

        <div className="auth-card">
          {error && (
            <div className="error-message" style={{ marginBottom: '20px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {infoMessage && step === 'otp' && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <span>📩</span>
              <span>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: Registration Form */}
          {step === 'form' && (
            <form onSubmit={handleInitiateSignup}>
              {/* Role Selection */}
              <div className="form-group">
                <label>Select Your Account Type</label>
                <div className="auth-role-selector">
                  <div 
                    className={`auth-role-option ${role === 'teacher' ? 'selected' : ''}`}
                    onClick={() => setRole('teacher')}
                  >
                    <h3>
                      <span>👨‍🏫</span> Teacher
                    </h3>
                    <p>Create, manage & evaluate exams</p>
                  </div>
                  <div 
                    className={`auth-role-option ${role === 'student' ? 'selected' : ''}`}
                    onClick={() => setRole('student')}
                  >
                    <h3>
                      <span>👨‍🎓</span> Student
                    </h3>
                    <p>Attend exams & get instant scores</p>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              {/* Email */}
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
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  A 6-digit OTP code will be sent to this email for verification.
                </span>
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              {/* Subject & Batch (Only for students) */}
              {role === 'student' && (
                <>
                  <div className="form-group">
                    <label htmlFor="subject">Subject Track</label>
                    <select
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="mern">MERN Stack (MongoDB, Express, React, Node)</option>
                      <option value="git">Git & GitHub Version Control</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="batch">Student Batch / Cohort</label>
                    <select
                      id="batch"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="Batch 1 (Morning)">Batch 1 (Morning Cohort)</option>
                      <option value="Batch 2 (Afternoon)">Batch 2 (Afternoon Cohort)</option>
                      <option value="Batch 3 (Evening)">Batch 3 (Evening Cohort)</option>
                      <option value="Weekend Batch">Weekend Batch</option>
                      <option value="Fast-Track Batch">Fast-Track Batch</option>
                    </select>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                className="btn btn-primary btn-lg w-full" 
                disabled={loading}
                style={{ marginTop: '12px' }}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                    <span>Sending OTP Verification Code...</span>
                  </>
                ) : (
                  <span>Send OTP Verification Code →</span>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: 6-Digit OTP Verification */}
          {step === 'otp' && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '1rem' }}>✉️</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setError('');
                    setInfoMessage('');
                    setDevOtpHint('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change Email
                </button>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group" style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                    Enter 6-Digit Verification Code
                  </label>
                  
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      justifyContent: 'center',
                      maxWidth: '380px',
                      margin: '0 auto'
                    }}
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        style={{
                          width: '48px',
                          height: '56px',
                          fontSize: '1.4rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          borderRadius: '10px',
                          border: digit ? '2px solid #059669' : '1.5px solid #cbd5e1',
                          background: digit ? '#f0fdf4' : '#ffffff',
                          color: '#0f172a',
                          outline: 'none',
                          boxShadow: digit ? '0 0 0 3px rgba(5, 150, 105, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg w-full" 
                  disabled={loading || otp.join('').length !== 6}
                  style={{ marginBottom: '16px' }}
                >
                  {loading ? (
                    <>
                      <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <span>Verify Code & Complete Sign Up →</span>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  {resendCooldown > 0 ? (
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Resend code in <strong style={{ color: '#0f172a' }}>{resendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#059669',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🔄 Resend Verification Code</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Success State */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>
                Email Verified Successfully!
              </h3>
              <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
                Your account is verified and ready. Redirecting you to your dashboard...
              </p>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          )}

          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link href="/login">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
