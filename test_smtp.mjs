import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testSmtp() {
  console.log('Testing SMTP with:', process.env.SMTP_USER);
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "ExamGuard SMTP Test",
      text: "If you receive this, SMTP is working perfectly!"
    });
    console.log("Success! Message sent:", info.messageId);
  } catch (err) {
    console.error("SMTP Error:", err);
  }
}
testSmtp();
