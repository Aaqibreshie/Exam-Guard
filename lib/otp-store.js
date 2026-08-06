// In-memory OTP store with TTL for reliable OTP validation
const globalOtpStore = globalThis.__examguard_otp_store || new Map();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__examguard_otp_store = globalOtpStore;
}

export function saveOtp(email, otp, data = {}) {
  const cleanEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes TTL
  globalOtpStore.set(cleanEmail, {
    otp: String(otp).trim(),
    expiresAt,
    data,
    attempts: 0
  });
}

export function verifyStoredOtp(email, otp) {
  const cleanEmail = email.trim().toLowerCase();
  const entry = globalOtpStore.get(cleanEmail);

  if (!entry) {
    return { valid: false, message: 'No verification code found for this email. Please request a new code.' };
  }

  if (Date.now() > entry.expiresAt) {
    globalOtpStore.delete(cleanEmail);
    return { valid: false, message: 'Verification code has expired. Please request a new code.' };
  }

  if (entry.attempts >= 5) {
    globalOtpStore.delete(cleanEmail);
    return { valid: false, message: 'Too many incorrect attempts. Please request a new verification code.' };
  }

  if (entry.otp !== String(otp).trim()) {
    entry.attempts += 1;
    return { valid: false, message: `Incorrect verification code. Please check your code and try again (${5 - entry.attempts} attempts remaining).` };
  }

  // Code is valid
  const savedData = entry.data;
  globalOtpStore.delete(cleanEmail);
  return { valid: true, data: savedData };
}

export function getStoredOtp(email) {
  const cleanEmail = email.trim().toLowerCase();
  const entry = globalOtpStore.get(cleanEmail);
  if (entry && Date.now() <= entry.expiresAt) {
    return entry.otp;
  }
  return null;
}
