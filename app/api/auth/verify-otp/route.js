import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStoredOtp } from '@/lib/otp-store';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!cleanEmail || !cleanOtp || cleanOtp.length !== 6) {
      return NextResponse.json({ error: 'Please provide a valid email and 6-digit OTP code.' }, { status: 400 });
    }

    // 1. Verify against internal secure OTP store
    const storeResult = verifyStoredOtp(cleanEmail, cleanOtp);
    
    // Also try Supabase native verifyOtp in parallel
    const supabase = await createClient();
    let supabaseVerified = false;

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'signup'
      });
      if (!error && data?.user) {
        supabaseVerified = true;
      }
    } catch (_) {}

    if (!storeResult.valid && !supabaseVerified) {
      return NextResponse.json({ 
        error: storeResult.message || 'Invalid or expired 6-digit verification code.' 
      }, { status: 400 });
    }

    const userData = storeResult.data || {};
    const role = userData.role || 'student';
    const fullName = userData.fullName || 'User';
    const subject = userData.subject || null;
    const batch = userData.batch || 'Batch 1 (Morning)';
    const password = userData.password;

    // 2. Sign in or initialize session in Supabase
    let authUser = null;
    if (password) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });
      authUser = signInData?.user;
    }

    if (!authUser) {
      const { data: { user } } = await supabase.auth.getUser();
      authUser = user;
    }

    // 3. Upsert profile into public.profiles table
    if (authUser?.id) {
      await supabase.from('profiles').upsert({
        id: authUser.id,
        full_name: fullName,
        role: role,
        subject: role === 'student' ? subject : null,
        batch: role === 'student' ? batch : null
      });
    }

    return NextResponse.json({
      success: true,
      role: role,
      message: 'Email successfully verified!'
    });

  } catch (err) {
    console.error('Verify OTP Handler Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to verify OTP code.' }, { status: 500 });
  }
}
