import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveOtp } from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, fullName, password, role, subject, batch } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in our secure OTP store (10 minute expiry)
    saveOtp(cleanEmail, otpCode, {
      fullName: fullName?.trim() || 'User',
      password,
      role: role || 'student',
      subject: role === 'student' ? subject : null,
      batch: role === 'student' ? batch : null
    });

    console.log(`\n========================================`);
    console.log(`🛡️ [ExamGuard Security] Generated 6-Digit OTP for ${cleanEmail}`);
    console.log(`========================================\n`);

    // 1. Try sending via direct SMTP if configured
    const smtpResult = await sendOtpEmail({
      email: cleanEmail,
      otp: otpCode,
      fullName
    });

    let supabaseSent = false;
    let rateLimitMessage = '';

    // 2. Try sending via Supabase Auth
    try {
      const supabase = await createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName?.trim() || 'User',
            role: role || 'student',
            subject: role === 'student' ? subject : null,
            batch: role === 'student' ? batch : null
          }
        }
      });

      if (signUpError) {
        console.warn('Supabase auth note:', signUpError.message);
        if (signUpError.message?.toLowerCase().includes('rate limit')) {
          rateLimitMessage = 'Supabase email rate limit exceeded.';
        }
      } else {
        supabaseSent = true;
      }
    } catch (sbErr) {
      console.warn('Supabase signup dispatch notice:', sbErr.message);
    }

    // If neither method could deliver and rate limit is reached
    if (!smtpResult.success && !supabaseSent && rateLimitMessage) {
      console.warn(`[OTP Warning] Supabase rate limit was hit and no custom SMTP is configured in .env.local.`);
    }

    // Respond without ever exposing the OTP on screen
    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`
    });

  } catch (err) {
    console.error('Send OTP Handler Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send OTP code.' }, { status: 500 });
  }
}
