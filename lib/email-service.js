import nodemailer from 'nodemailer';

export async function sendOtpEmail({ email, otp, fullName }) {
  const cleanEmail = email.trim();
  const userName = fullName?.trim() || 'Candidate';

  // Check for custom SMTP configuration in environment
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const fromEmail = process.env.EMAIL_FROM || smtpUser || '"ExamGuard Security" <noreply@examguard.io>';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .logo { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
            .title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
            .text { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
            .code-box { background: #f0fdf4; border: 2px dashed #059669; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 24px; }
            .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #059669; font-family: monospace; }
            .footer { font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🛡️ ExamGuard</div>
            <div class="title">Verify Your Email Address</div>
            <p class="text">Hello ${userName},<br><br>Thank you for registering on ExamGuard. Please enter the following 6-digit security code to verify your account and complete your signup:</p>
            <div class="code-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p class="text" style="font-size: 13px; color: #64748b;">
              ⏱️ This code will expire in <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.
            </p>
            <div class="footer">
              ExamGuard Proctoring & Assessment Security System
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from: fromEmail,
        to: cleanEmail,
        subject: `Your ExamGuard Verification Code: ${otp}`,
        text: `Hello ${userName},\n\nYour ExamGuard 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.`,
        html: htmlContent
      });

      console.log(`✅ [Email Delivery] Sent OTP email to ${cleanEmail} via SMTP (MessageID: ${info.messageId})`);
      return { success: true, via: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.error('SMTP Delivery Error:', smtpErr);
      return { success: false, error: smtpErr.message };
    }
  }

  // If no direct SMTP configured, log note
  console.log(`ℹ️ [Email Dispatcher] No custom SMTP configured in .env.local (SMTP_HOST/SMTP_USER/SMTP_PASSWORD).`);
  return { success: false, error: 'NO_SMTP_CONFIGURED' };
}
